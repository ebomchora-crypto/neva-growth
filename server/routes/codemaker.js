// Code Maker — sites gerados por IA (mesma lógica do Code-Seller: supabase/functions/code-maker/index.ts).
//
// POST /api/code-maker { action, ... }:
//   { action: 'usage' }                                → quantos sites/alterações hoje
//   { action: 'read_site', url }                       → lê o site atual do cliente (textos e contatos)
//   { action: 'create', brief }                        → cria o site (sem IA ainda)
//   { action: 'plan', site_id, partial? }              → IA planeja cores/fontes/seções (texto ao vivo)
//   { action: 'part', site_id, part_id, partial? }     → IA escreve uma parte (texto ao vivo)
//   { action: 'edit', site_id, instruction, partial? } → IA altera o site (texto ao vivo)
//   { action: 'restore', site_id, version_id }         → volta a uma versão
//   { action: 'finish', site_id }                      → marca pronto quando todas as partes já existem
// GET /api/code-maker/:id            → o site (plano, partes, arquivos, status)
// GET /api/code-maker/:id/versions   → histórico
// GET /api/code-maker/:id/document   → documento montado para a prévia (com partes pendentes)
//
// As respostas "ao vivo" são texto puro, terminando com uma linha:
//   <<<OK>>>  |  <<<CONTINUA>>> (tempo da chamada acabou: chame de novo com
//   partial = tudo o que chegou até agora)  |  <<<ERRO:mensagem>>>
//
// A chave e o modelo da IA ficam em app_settings (RIVER_API_KEY, RIVER_MODEL; CODE_MAKER_MAX_INPUT_CHARS opcional).
const express = require('express');
const crypto = require('node:crypto');
const dns = require('node:dns').promises;
const { all, get, run, tx } = require('../lib/db');
const { HttpError, bad } = require('../lib/http');
const config = require('../lib/config');
const E = require('../lib/codemaker/engine');
const ai = require('../lib/ai');
const DC = require('../lib/codemaker/design-context');
const refs = require('../lib/codemaker/references');

// SYSTEM_PROMPT.md + DESIGN.md (V2) são o system prompt do Builder (compilados em design-md.js). Cada etapa recebe só as seções
// que usa (design-context.js), e as regras técnicas do Code Maker abaixo delas são a forma de executar isso no Builder da Neva.
const BRIDGE = `COMO ESTE PROMPT SE APLICA NO BUILDER DA NEVA (leia antes de responder): o código do Builder monta o site a partir de blocos prontos; você decide a direção de arte, a estrutura e escreve o conteúdo no formato pedido abaixo. Nesta chamada você NÃO tem navegador, terminal nem arquivos: build e revisão visual valem "not_verified" e você nunca diz que verificou. Escreva em pt-BR. Hierarquia em conflito: pedido explícito do usuário > segurança, acessibilidade e verdade > design-spec > DESIGN.md. Siga o formato da resposta à risca.`;
const PLAN_BRIDGE = `${BRIDGE}\nNesta etapa você é o diretor de arte (estados BRIEFED → DIRECTED → SPECIFIED): decida a direção a partir do negócio, não de sorteio; o JSON do plano é o design-spec do site (campos "creative" e, em cada seção, "businessPurpose", "singleMessage" e "proofStatus"). No <acoes>, a primeira frase diz que tipo de site é e qual é a ação principal do visitante.`;
const systemFor = (stage, brief) => `${DC.contextFor(stage, brief).text}\n\n${stage === 'plan' ? PLAN_BRIDGE : BRIDGE}\n\n${stage === 'plan' ? E.PLAN_SYSTEM : stage === 'part' ? E.PART_SYSTEM : E.EDIT_SYSTEM}`;

const r = express.Router();

const AI_URL = () => `${(config.get('RIVER_BASE_URL') || 'https://api.river.ai/v1').replace(/\/$/, '')}/chat/completions`;
const CALLS_PER_DAY = 600;
// A função da Vercel tem tempo máximo por chamada; paramos antes e continuamos depois.
const CALL_BUDGET_MS = Number(process.env.CODE_MAKER_BUDGET_MS) || 115_000;
// Escolha dos arquivos que a alteração precisa ler inteiros (projeto grande).
const SELECT_SYSTEM = `Você escolhe quais arquivos de um projeto de site precisam ser lidos inteiros para fazer o pedido do usuário. Responda só JSON: {"arquivos":["caminho", ...]}. Inclua todo arquivo que o pedido pode mudar ou que serve de modelo (ex.: para criar uma página nova, a seção parecida que já existe e o cabeçalho com o menu; para responsividade, as seções com grades e textos grandes). Não invente caminhos.`;
// Orçamento de resposta por etapa e nível de esforço (o esforço também liga a análise prévia no plano e na alteração).
const MAX_TOKENS = {
  plan: { low: 7000, medium: 9000, high: 12000, xhigh: 16000 },
  part: { low: 4000, medium: 6000, high: 8000, xhigh: 10000 },
  edit: { low: 8000, medium: 9000, high: 12000, xhigh: 16000 }
};
const ANALYSIS = {
  plan: 'Você vai planejar este site. ANTES do plano, faça uma análise interna seguindo o DESIGN.md: contexto do site, objetivo primário, público, ação principal, proposta de valor, conteúdo disponível × o que falta (e que portanto NÃO pode ser inventado: preços, números, depoimentos, contatos), diferenciação visual tirada do mundo do negócio, anti-padrões que este pedido tende a cair e como evitar. Em tópicos curtos. Responda SÓ com a análise: sem <acoes>, sem <plano>, sem JSON.',
  edit: 'Você vai alterar este site. ANTES da alteração, faça uma análise interna: o que exatamente o usuário pediu, quais arquivos mudam, o que não pode mudar (identidade, fatos, o que não foi pedido), riscos para o DESIGN.md (contraste, mobile, acessibilidade, dados inventados) e a ordem das operações. Em tópicos curtos. Responda SÓ com a análise: sem <acoes> e sem as operações.'
};
const ANALYSIS_TOKENS = { medium: 900, high: 1500, xhigh: 3000 };
const CRITIQUE = 'Depois critique a própria análise: o que está genérico, o que contraria o DESIGN.md, o que falta. Corrija antes de terminar.';

const J = (v, fallback) => { if (v == null) return fallback; try { return JSON.parse(v); } catch { return fallback; } };
const S = (v) => JSON.stringify(v ?? null);

// Diagnóstico da alteração: só etapas, tamanhos, contagens e motivos — nunca o texto do site nem o pedido.
function logEdit(stage, data) { console.log(JSON.stringify({ event: 'code_maker_edit', stage, ...data })); }

function siteOf(row) {
  if (!row) return null;
  return {
    id: row.project_id, user_id: row.user_id, slug: row.slug, name: row.name, published: Boolean(row.published),
    brief: J(row.brief, {}), plan: J(row.plan, null), parts: J(row.parts, {}), files: J(row.files, {}),
    html: row.html, pages_html: J(row.pages_html, {}), status: row.status, rev: row.rev, updated_at: row.updated_at, created_at: row.created_at
  };
}
async function loadSite(id, req) {
  const row = await get('SELECT s.*, p.slug, p.name, p.published, p.owner_id, p.ws FROM code_sites s JOIN projects p ON p.id=s.project_id WHERE s.project_id=?', Number(id) || 0);
  if (!row || row.ws !== req.user.ws) return null;
  if (!(req.user.role === 'admin' || row.owner_id == null || row.owner_id === req.user.id)) throw new HttpError(403, 'Somente o responsável pelo site ou um administrador pode alterá-lo.', 'forbidden');
  return siteOf(row);
}
// Grava mudanças só se o site não mudou em outra operação (rev); devolve o site novo ou null (conflito).
async function saveSite(site, changes) {
  const cols = Object.keys(changes);
  const vals = cols.map((c) => (['brief', 'plan', 'parts', 'files', 'pages_html'].includes(c) ? S(changes[c]) : changes[c]));
  const info = await run(`UPDATE code_sites SET ${cols.map((c) => `${c}=?`).join(', ')}, rev=rev+1, updated_at=datetime('now') WHERE project_id=? AND rev=?`, ...vals, site.id, site.rev);
  if (!info.changes) return null;
  return { ...site, ...changes, rev: site.rev + 1 };
}
async function setStatus(id, to, from) {
  await run(`UPDATE code_sites SET status=?, rev=rev+1, updated_at=datetime('now') WHERE project_id=?${from ? ' AND status=?' : ''}`, ...(from ? [to, id, from] : [to, id]));
}
async function versionInsert(site, userId, v) {
  await run('INSERT INTO site_versions(project_id,user_id,kind,instruction,actions,plan,parts,files) VALUES (?,?,?,?,?,?,?,?)',
    site.id, userId, v.kind, v.instruction ?? null, S(v.actions ?? []), S(v.plan), S(v.parts), S(v.files ?? {}));
}
async function preserveCurrentVersion(site, userId) {
  const last = await get('SELECT plan, parts, files FROM site_versions WHERE project_id=? ORDER BY id DESC LIMIT 1', site.id);
  if (last && last.plan === S(site.plan) && last.parts === S(site.parts) && (last.files || '{}') === S(site.files ?? {})) return;
  await versionInsert(site, userId, { kind: 'create', actions: site.plan?.actions ?? [], plan: site.plan, parts: site.parts, files: site.files ?? {} });
}
// O HTML montado vira os arquivos do projeto: a prévia, a IDE, o ZIP e o site publicado (/s/apelido) usam estes.
async function syncProjectFiles(projectId, html, pagesHtml) {
  const put = (p, c) => run(`INSERT INTO project_files(project_id,path,content) VALUES (?,?,?)
    ON CONFLICT(project_id,path) DO UPDATE SET content=excluded.content, updated_at=datetime('now')`, projectId, p, c);
  if (html) await put('index.html', html);
  const keep = Object.keys(pagesHtml || {}).map((slug) => `paginas/${slug}.html`);
  for (const [slug, page] of Object.entries(pagesHtml || {})) await put(`paginas/${slug}.html`, page);
  for (const f of await all("SELECT path FROM project_files WHERE project_id=? AND path LIKE 'paginas/%'", projectId)) {
    if (!keep.includes(f.path)) await run('DELETE FROM project_files WHERE project_id=? AND path=?', projectId, f.path);
  }
  await run("UPDATE projects SET updated_at=datetime('now') WHERE id=?", projectId);
}
// Junta a parte nova às já salvas (sem perder as que outras chamadas gravaram ao mesmo tempo).
async function mergePart(siteId, partId, html) {
  return await tx(async () => {
    const row = await get('SELECT parts FROM code_sites WHERE project_id=? FOR UPDATE', siteId);
    const parts = { ...J(row?.parts, {}), [partId]: html };
    await run("UPDATE code_sites SET parts=?, rev=rev+1, updated_at=datetime('now') WHERE project_id=?", S(parts), siteId);
    return parts;
  });
}
// Marca pronto só uma vez (true = foi esta chamada que terminou o site).
async function markReady(siteId, html) {
  const info = await run("UPDATE code_sites SET status='ready', html=?, rev=rev+1, updated_at=datetime('now') WHERE project_id=? AND status='building'", html, siteId);
  return info.changes > 0;
}

// Início do dia no horário de Brasília (sem horário de verão desde 2019), no formato das datas do banco (UTC).
function startOfDaySaoPaulo(now = new Date()) {
  const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(now);
  return new Date(`${day}T00:00:00-03:00`).toISOString().slice(0, 19).replace('T', ' ');
}
async function countToday(userId, kind) {
  const row = kind
    ? await get('SELECT COUNT(*) n FROM ai_usage WHERE user_id=? AND kind=? AND created_at>=?', userId, `cm_${kind}`, startOfDaySaoPaulo())
    : await get("SELECT COUNT(*) n FROM ai_usage WHERE user_id=? AND kind LIKE 'cm\\_%' ESCAPE '\\' AND created_at>=?", userId, startOfDaySaoPaulo());
  return Number(row?.n || 0);
}
const recordCall = (userId, kind) => run('INSERT INTO ai_usage(user_id,kind) VALUES (?,?)', userId, `cm_${kind}`);

function slugify(value) {
  const base = String(value).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40).replace(/-+$/g, '');
  return base.length >= 3 ? base : `site-${base || 'novo'}`.slice(0, 40);
}
async function uniqueSlug(name, exceptId = 0) {
  const base = slugify(name);
  for (let attempt = 0; attempt < 30; attempt++) {
    const candidate = attempt === 0 ? base : `${base}-${attempt + 1}`;
    if (E.isReservedSlug(candidate)) continue;
    if (!await get('SELECT 1 x FROM projects WHERE slug=? AND id<>?', candidate, exceptId)) return candidate;
  }
  return `${base}-${crypto.randomUUID().slice(0, 6)}`;
}

function cleanBrief(input) {
  const text = (value, max) => (typeof value === 'string' ? value.trim().slice(0, max) : '');
  const businessName = text(input.businessName, 120);
  const details = E.cleanUserText(input.details);
  if (!businessName && !details) return null;
  const style = ['auto', 'dark', 'minimal', 'elegant', 'vibrant'].includes(String(input.style)) ? input.style : 'auto';
  const rating = Number(input.rating);
  const reviews = Number(input.reviews);
  return {
    businessName,
    niche: text(input.niche, 80) || null,
    city: text(input.city, 80) || null,
    phone: text(input.phone, 30) || null,
    style,
    details: details || null,
    rating: Number.isFinite(rating) && rating > 0 && rating <= 5 ? rating : null,
    reviews: Number.isFinite(reviews) && reviews > 0 ? Math.round(reviews) : null,
    // A Neva ainda não guarda imagens enviadas: o site usa as fotos de banco do Code Maker.
    assets: []
  };
}

// Chamada sem streaming (requisitos, escolha de arquivos, análise prévia). `meta` = { sel, kind, userId, maxTokens, raw }.
// JSON da IA: aceita cercas de código e texto antes/depois (sem raciocínio, o Nemotron às vezes abre com uma frase).
function parseJsonLoose(text) {
  const clean = String(text).trim().replace(/^\x60\x60\x60(?:json)?\s*|\s*\x60\x60\x60$/g, '');
  try { return JSON.parse(clean); } catch { /* tenta achar o objeto dentro do texto */ }
  const start = clean.indexOf('{');
  const end = clean.lastIndexOf('}');
  if (start < 0 || end <= start) return undefined;
  try { return JSON.parse(clean.slice(start, end + 1)); } catch { return undefined; }
}
// Revisão de uma seção: devolve o conteúdo corrigido; se a revisão falhar ou vier fora do formato, fica o texto original.
const REVIEW = {
  medium: 'Revise o rascunho abaixo como um editor exigente. Confira: (1) algum fato, número, preço, prazo, garantia ou nome que NÃO esteja no pedido do cliente (apague ou troque por algo verdadeiro); (2) algum texto de botão, mensagem ou frase que o pedido deu entre aspas e que foi trocado (devolva o texto exato); (3) frases genéricas que serviriam a qualquer negócio (troque por algo específico deste negócio); (4) ação clara e texto fácil de escanear.',
  high: 'Revise o rascunho abaixo como um editor exigente. Confira item por item o CONTRATO DE ENTREGA e o PORTÃO DE QUALIDADE do DESIGN.md: (1) fato, número, preço, prazo, garantia ou nome que NÃO esteja no pedido (apague ou troque por algo verdadeiro); (2) texto de botão, mensagem ou frase que o pedido deu entre aspas e foi trocado (devolva o texto exato); (3) frases genéricas (troque por algo específico deste negócio); (4) ação clara, texto escaneável, tom do pedido; (5) tamanho: nada que estoure o espaço do bloco.',
};
REVIEW.xhigh = `${REVIEW.high} Depois de corrigir, releia o resultado uma vez e corrija de novo se ainda houver algo vago, repetido ou que contrarie o pedido.`;
async function reviewContent(apiKey, model, partId, plan, brief, draft, sel, userId, signal) {
  try {
    const message = [
      E.buildPartMessage(partId, plan, brief),
      `RASCUNHO ESCRITO (JSON):\n${JSON.stringify(draft)}`,
      `${REVIEW[sel.effort] || REVIEW.medium}\n\nResponda SÓ com o JSON corrigido, no mesmo formato do rascunho (mantenha os campos; só mude o que precisa mudar).`
    ].join('\n\n');
    const fixed = await completeJson(apiKey, model, systemFor('part', brief), message, signal, { sel, kind: 'cm_review', userId, maxTokens: 4000 });
    const parsed = E.parseContent(JSON.stringify(fixed));
    return parsed || draft;
  } catch (error) {
    if (signal.aborted) throw error;
    return draft;
  }
}

const PLAN_REVIEW = {
  medium: 'Revise o PLANO ESCRITO abaixo como um diretor de arte exigente. Confira: (1) toda seção do pedido está no plano, na ordem pedida, com os blocos certos (formulário ou simulador pedidos viram os blocos "formulario" e "simulador"); (2) algum título, selo, brief ou item com fato, número, preço ou prazo que NÃO está no pedido (apague); (3) cores com contraste de texto legível e fontes que combinam com o negócio e NÃO com o visual genérico de "tecnologia azul e roxo"; (4) seções repetidas ou vagas (junte ou torne específicas); (5) título da página e descrição seguem o pedido de SEO.',
  high: 'Revise o PLANO ESCRITO abaixo como um diretor de arte exigente, conferindo item por item o CONTRATO DE ENTREGA e o PORTÃO DE QUALIDADE do DESIGN.md: (1) toda seção do pedido está no plano, na ordem pedida, com os blocos certos (formulário ou simulador pedidos viram os blocos "formulario" e "simulador"); (2) fato, número, preço ou prazo que NÃO está no pedido (apague); (3) cores com contraste de texto legível e fontes que combinam com o negócio, sem o visual genérico; (4) seções repetidas ou vagas; (5) título da página e descrição seguem o pedido de SEO; (6) cada seção tem um "brief" que diz o que escrever e o que NÃO inventar.'
};
PLAN_REVIEW.xhigh = `${PLAN_REVIEW.high} Depois de corrigir, releia o plano uma vez e corrija de novo o que ainda estiver vago ou contrariar o pedido.`;
async function reviewPlan(apiKey, model, full, brief, recipe, sel, userId, signal, emit) {
  const draft = String(full).match(/<plano>([\s\S]*?)<\/plano>/i)?.[1];
  if (!draft) return full;
  try {
    emit?.('<etapa>revisao</etapa>\n');
    const message = [
      E.buildPlanMessage(brief, true, recipe),
      `PLANO ESCRITO (JSON):\n${draft.trim().slice(0, 24000)}`,
      `${PLAN_REVIEW[sel.effort] || PLAN_REVIEW.medium}\n\nResponda SÓ com o JSON do plano corrigido, no mesmo formato do plano escrito (inclusive "business"). Mantenha o que está certo.`
    ].join('\n\n');
    const fixed = await completeJson(apiKey, model, systemFor('plan', brief), message, signal, { sel, kind: 'cm_plan:revisao', userId, maxTokens: 7000 });
    const next = `<plano>\n${JSON.stringify(fixed)}\n</plano>`;
    // Só vale se o plano revisado continua sendo um plano válido.
    return E.parsePlan(next, brief, recipe).plan ? String(full).replace(/<plano>[\s\S]*?<\/plano>/i, () => next) : full;
  } catch (error) {
    if (signal.aborted) throw error;
    return full;
  }
}

// Leitura dos requisitos: um deslize de formato tenta mais uma vez antes de parar o site inteiro.
async function specOnce(apiKey, model, chunk, signal, meta) {
  try { return await completeJson(apiKey, model, E.SPEC_SYSTEM, chunk, signal, meta); }
  catch (error) { if (signal.aborted) throw error; return completeJson(apiKey, model, E.SPEC_SYSTEM, chunk, signal, meta); }
}
async function completeJson(apiKey, model, system, content, signal, meta = {}) {
  let response;
  const started = Date.now();
  // Mínimo de raciocínio nativo em toda chamada daqui (análise em texto e extração de JSON); o pensar fica na análise.
  // Extração de JSON (requisitos) também: no Nemotron ela pensava 2.838 tokens por padrão (29 s) só para ler o pedido.
  const native = ai.streamParams(model);
  // Análise: orçamento do nível + folga pequena só para o raciocínio mínimo (ela é texto, não pensamento escondido).
  const maxTokens = meta.raw ? (meta.maxTokens || 900) + (Object.keys(native).length ? 1000 : 0) : ai.withHeadroom(meta.maxTokens || 9000, meta.sel?.effort, native);
  let body = { model, max_tokens: maxTokens, stream: false, temperature: meta.sel ? ai.temperatureOf(meta.sel.model) : undefined,
    ...native, messages: meta.messages || [{ role: 'system', content: system }, { role: 'user', content }] };
  for (let attempt = 0; attempt < 5; attempt++) {
    response = await fetch(AI_URL(), {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal
    });
    if (response.status === 400 && ai.hasNative(body)) { ai.markRefused(); body = ai.withoutNative(body); continue; }
    if (![429, 500, 502, 503, 504].includes(response.status) || attempt === 4) break;
    await new Promise((resolve) => setTimeout(resolve, 1500 * 2 ** attempt + Math.random() * 800));
  }
  if (!response.ok) {
    ai.logCall({ kind: meta.kind || 'cm_json', userId: meta.userId, model: meta.sel?.model, effort: meta.sel?.effort, providerModel: model, ms: Date.now() - started, ok: false, note: `HTTP ${response.status}` });
    throw new Error(meta.raw ? 'A análise não respondeu agora.' : 'Não foi possível interpretar os requisitos agora.');
  }
  const data = await response.json();
  ai.logCall({ kind: meta.kind || 'cm_json', userId: meta.userId, model: meta.sel?.model, effort: meta.sel?.effort, providerModel: model, ms: Date.now() - started, usage: data.usage });
  // Se o modelo pensou tudo e não escreveu, o próprio raciocínio é a análise.
  if (meta.raw) {
    const msg = data.choices?.[0]?.message || {};
    const text = String(msg.content || '').replace(/<(acoes|plano)>[\s\S]*?(<\/\1>|$)/gi, '').replace(/<\/?analise>/gi, '').trim();
    return text || String(msg.reasoning_content || msg.reasoning || '').trim();
  }
  if (data.choices?.[0]?.finish_reason === 'length') throw new Error('A leitura dos requisitos não terminou. Tente novamente.');
  const text = data.choices?.[0]?.message?.content;
  if (typeof text !== 'string') throw new Error('A IA não retornou uma especificação válida.');
  const parsed = parseJsonLoose(text);
  if (parsed !== undefined) return parsed;
  ai.logCall({ kind: `${meta.kind || 'cm_json'}:formato`, userId: meta.userId, model: meta.sel?.model, effort: meta.sel?.effort, providerModel: model, ok: false, note: text.slice(0, 280) });
  // A mensagem do JSON.parse é técnica (e em inglês): a tela recebe esta.
  throw new Error('A IA respondeu fora do formato esperado. Tente de novo.');
}
async function compactContext(content, budget, apiKey, model, signal) {
  if (content.length <= budget) return content;
  const summary = await E.prepareSpecificationContext(content, (chunk) => completeJson(apiKey, model, E.SPEC_SYSTEM, chunk, signal), Math.min(16000, budget));
  return JSON.stringify(summary);
}

// A DeepSeek às vezes escreve os marcadores internos de ferramenta dela (<｜DSML｜ parameter name="depois">,
// </｜DSML｜ parameter>) no lugar das tags pedidas, ou fecha <depois> com </antes>. Devolve as tags certas antes de ler a resposta.
const DSML = /<(\/?)\s*[|｜]\s*DSML\s*[|｜]\s*[a-z_]+(?:\s+name\s*=\s*"([^"]*)")?[^>]*>/gi;
function repairDsml(text) {
  if (!/DSML|<\/(?:antes|depois)>/i.test(text)) return text;
  const open = [];
  let out = '';
  let last = 0;
  // Tags normais abertas/fechadas, para saber qual está aberta quando chega um fechamento DSML.
  const TAG = /<(\/?)(antes|depois|editar|escrever|criar|apagar|bloco|acoes|arquivo|conteudo)\b[^>]*>/gi;
  const tokens = [];
  for (const m of text.matchAll(TAG)) tokens.push({ index: m.index, end: m.index + m[0].length, close: Boolean(m[1]), name: m[2].toLowerCase(), raw: m[0] });
  for (const m of text.matchAll(DSML)) tokens.push({ index: m.index, end: m.index + m[0].length, dsml: true, close: Boolean(m[1]), name: (m[2] || '').toLowerCase(), raw: m[0] });
  tokens.sort((a, b) => a.index - b.index);
  for (const t of tokens) {
    out += text.slice(last, t.index);
    last = t.end;
    if (!t.dsml) {
      const top = open[open.length - 1];
      if (t.close && (t.name === 'antes' || t.name === 'depois') && (top === 'antes' || top === 'depois') && top !== t.name) {
        open.pop(); out += `</${top}>`; continue;
      }
      // Fechamento repetido (</editar></editar>) de algo que não está aberto: some.
      if (t.close && !open.includes(t.name) && ['editar', 'escrever', 'bloco', 'antes', 'depois'].includes(t.name)) continue;
      if (t.close) { const i = open.lastIndexOf(t.name); if (i >= 0) open.splice(i); } else open.push(t.name);
      out += t.raw;
    } else if (!t.close && t.name) {
      // Abrir com DSML fecha a tag irmã que ficou aberta (antes → depois).
      const top = open[open.length - 1];
      if ((top === 'antes' || top === 'depois') && top !== t.name) { out += `</${top}>\n`; open.pop(); }
      open.push(t.name); out += `<${t.name}>`;
    } else if (t.close) {
      const top = open[open.length - 1];
      if (top && !["editar", "escrever", "criar", "bloco"].includes(top)) { open.pop(); out += `</${top}>`; }
    }
  }
  return out + text.slice(last);
}

function openStream(res) {
  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache, no-transform', 'X-Accel-Buffering': 'no' });
  res.flushHeaders?.();
}

// Chama a IA com streaming e repassa o texto ao cliente. Se o tempo da
// chamada acabar, avisa <<<CONTINUA>>>; se terminar, chama `finish` com o
// texto completo (juntando com o que veio antes) e manda <<<OK>>> ou erro.
async function streamAi(req, res, options) {
  const abort = new AbortController();
  let cancelled = false;
  res.on('close', () => { if (!res.writableFinished) { cancelled = true; abort.abort(); } });
  openStream(res);
  const send = (text) => { if (!cancelled) res.write(text); };
  const close = () => { if (!cancelled) res.end(); };
  const deadline = Date.now() + CALL_BUDGET_MS;
  const timer = setTimeout(() => abort.abort(), CALL_BUDGET_MS);
  let text = '';
  let timedOut = false;
  let preparing = true;
  let usage = null; let reasoningChars = 0; let lengthHit = false; const started = Date.now();
  const logUsage = (ok, note) => ai.logCall({ kind: options.kind || 'cm', userId: options.userId, model: options.sel?.model, effort: options.sel?.effort, providerModel: options.model,
    ms: Date.now() - started, usage, reasoningTokens: reasoningChars ? Math.round(reasoningChars / 4) : null, ok, note });
  const recordFailure = async () => {
    try { await options.onFailure?.(); } catch (error) { console.error('code-maker failure status', error); }
  };
  try {
    const baseMessages = options.prepare ? await options.prepare(abort.signal, send) : options.messages;
    preparing = false;
    const messages = options.partial
      ? [...baseMessages, { role: 'assistant', content: options.partial }, { role: 'user', content: E.CONTINUE_PROMPT }]
      : baseMessages;
    // A River limita pedidos por minuto: com várias partes ao mesmo tempo, espera e tenta de novo.
    const sel = options.sel || {};
    const native = ai.streamParams(options.model);
    let body = { model: options.model, max_tokens: ai.withHeadroom(options.maxTokens, sel.effort, native), stream: true, stream_options: { include_usage: true },
      ...(sel.model ? { temperature: ai.temperatureOf(sel.model) } : {}), ...native, messages };
    let response;
    for (let attempt = 0; attempt < 5; attempt++) {
      response = await fetch(AI_URL(), {
        method: 'POST',
        headers: { Authorization: `Bearer ${options.apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: abort.signal
      });
      // A River recusou o parâmetro nativo de raciocínio: tira e tenta de novo.
      if (response.status === 400 && ai.hasNative(body)) { ai.markRefused(); body = ai.withoutNative(body); await response.body?.cancel().catch(() => {}); continue; }
      if (![429, 500, 502, 503, 504].includes(response.status) || attempt === 4) break;
      await response.body?.cancel().catch(() => {});
      await new Promise((resolve) => setTimeout(resolve, 1500 * 2 ** attempt + Math.random() * 800));
    }
    if (!response.ok || !response.body) {
      console.error('code-maker ai', response.status, await response.text().catch(() => ''));
      await recordFailure();
      send('\n<<<ERRO:A IA não respondeu agora. Tente de novo em instantes.>>>');
      clearTimeout(timer);
      close();
      return;
    }
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let index;
      while ((index = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, index).trim();
        buffer = buffer.slice(index + 1);
        if (!line.startsWith('data:')) continue;
        const data = line.slice(5).trim();
        if (!data || data === '[DONE]') continue;
        try {
          const chunk = JSON.parse(data);
          if (chunk.usage) usage = chunk.usage;
          const choice = chunk.choices?.[0];
          if (choice?.delta?.reasoning_content) reasoningChars += choice.delta.reasoning_content.length;
          if (choice?.finish_reason === 'length') { timedOut = true; lengthHit = true; }
          const delta = choice?.delta?.content;
          if (delta) { text += delta; send(delta); }
        } catch {
          // pedaço incompleto: ignora
        }
      }
      if (Date.now() > deadline) { timedOut = true; abort.abort(); break; }
    }
  } catch (error) {
    if (error?.name === 'AbortError' || abort.signal.aborted) timedOut = true;
    else {
      console.error('code-maker stream', error);
      await recordFailure();
      send(`\n<<<ERRO:${preparing && error instanceof Error ? error.message.replace(/>>>/g, '') : 'A conexão com a IA caiu. Tente de novo.'}>>>`);
      close();
      clearTimeout(timer);
      return;
    }
  }
  if (cancelled) { clearTimeout(timer); return; }
  logUsage(!timedOut, timedOut ? (lengthHit && !text.trim() ? 'sem texto' : 'continua') : null);
  // A IA gastou o orçamento inteiro pensando e não escreveu nada: continuar só repetiria o mesmo.
  if (lengthHit && !text.trim()) {
    clearTimeout(timer);
    await recordFailure();
    send('\n<<<ERRO:A IA gastou o tempo pensando e não escreveu esta etapa. Tente de novo ou use um nível de esforço menor.>>>');
    close();
    return;
  }
  if (timedOut) {
    clearTimeout(timer);
    send('\n<<<CONTINUA>>>');
    close();
    return;
  }
  try {
    const full = repairDsml((options.partial ? E.joinContinuation(options.partial, text) : text).replace(/<etapa>[^<]*<\/etapa>\n?/g, ''));
    abort.signal.throwIfAborted();
    const problem = await options.finish(full, abort.signal, send);
    if (problem) await recordFailure();
    send(problem ? `\n<<<ERRO:${problem}>>>` : '\n<<<OK>>>');
  } catch (error) {
    console.error('code-maker finish', error);
    await recordFailure();
    const message = error instanceof Error && !/^(select|update|insert|delete)\b/i.test(error.message) ? error.message.replace(/>>>/g, '') : 'Não foi possível salvar. Tente de novo.';
    send(`\n<<<ERRO:${message}>>>`);
  }
  clearTimeout(timer);
  close();
}

// Parte montada sem IA (cabeçalho e rodapé): manda o HTML no mesmo formato
// do streaming, salva e fecha com <<<OK>>> ou erro.
async function instantStream(res, text, finish, onFailure) {
  const abort = new AbortController();
  res.on('close', () => { if (!res.writableFinished) abort.abort(); });
  openStream(res);
  res.write(text);
  try {
    const problem = await finish(abort.signal);
    if (problem) await onFailure().catch((error) => console.error('code-maker failure status', error));
    res.write(problem ? `\n<<<ERRO:${problem}>>>` : '\n<<<OK>>>');
  } catch (error) {
    console.error('code-maker finish', error);
    await onFailure().catch((failure) => console.error('code-maker failure status', failure));
    const message = error instanceof Error ? error.message.replace(/>>>/g, '') : 'Não foi possível salvar. Tente de novo.';
    res.write(`\n<<<ERRO:${message}>>>`);
  }
  res.end();
}

// Primeiro endereço do site do cliente: nunca um endereço interno.
async function assertPublicHost(url) {
  const answers = await dns.lookup(url.hostname, { all: true }).catch(() => []);
  if (answers.some((a) => E.isBlockedHost(String(a.address)))) throw new Error('Esse endereço não pode ser lido.');
}

r.get('/:id(\\d+)', async (req, res) => {
  const site = await loadSite(req.params.id, req);
  if (!site) throw new HttpError(404, 'Site não encontrado.');
  res.json({ site });
});
r.get('/:id(\\d+)/versions', async (req, res) => {
  const site = await loadSite(req.params.id, req);
  if (!site) throw new HttpError(404, 'Site não encontrado.');
  const rows = await all('SELECT id, kind, instruction, actions, created_at FROM site_versions WHERE project_id=? ORDER BY id DESC LIMIT 60', site.id);
  res.json({ items: rows.map((v) => ({ ...v, actions: J(v.actions, []) })) });
});
// Documento da prévia: as partes que ainda estão sendo escritas aparecem como bloco "carregando".
r.get('/:id(\\d+)/document', async (req, res) => {
  const site = await loadSite(req.params.id, req);
  if (!site) throw new HttpError(404, 'Site não encontrado.');
  if (!site.plan) return res.json({ html: null, pages: [] });
  const page = String(req.query.page || '').trim();
  const pages = E.pageSlugs(site.files);
  const html = E.assembleSite(site.plan, site.parts, { pending: site.status !== 'ready', files: site.files, page: pages.includes(page) ? page : null });
  res.json({ html, pages, status: site.status });
});

// ---- Revisão da última alteração da IA (aceitar / rejeitar por arquivo, como o AI Diff Review)
// Antes = a versão logo anterior à alteração; depois = a própria alteração. Rejeitar um arquivo volta só ele.
async function lastEdit(siteId) {
  const edit = await get("SELECT id, instruction, plan, parts, files, created_at FROM site_versions WHERE project_id=? AND kind='edit' ORDER BY id DESC LIMIT 1", siteId);
  if (!edit) return null;
  if (await get("SELECT 1 x FROM site_versions WHERE project_id=? AND id>? AND kind<>'review' LIMIT 1", siteId, edit.id)) return null;
  const before = await get('SELECT plan, parts, files FROM site_versions WHERE project_id=? AND id<? ORDER BY id DESC LIMIT 1', siteId, edit.id);
  if (!before) return null;
  const state = (row) => ({ plan: J(row.plan, null), parts: J(row.parts, {}), files: J(row.files, {}) });
  const b = state(before); const a = state(edit);
  if (!b.plan || !a.plan) return null;
  const tA = E.projectTree(b.plan, b.parts, b.files); const tB = E.projectTree(a.plan, a.parts, a.files);
  const paths = [...new Set([...Object.keys(tA), ...Object.keys(tB)])].filter((p) => (tA[p] ?? null) !== (tB[p] ?? null));
  return { edit, after: a, tA, tB, paths };
}
r.get('/:id(\\d+)/changes', async (req, res) => {
  const site = await loadSite(req.params.id, req);
  if (!site) throw new HttpError(404, 'Site não encontrado.');
  const le = site.plan && site.status === 'ready' ? await lastEdit(site.id) : null;
  if (!le || !le.paths.length) return res.json({ version_id: null, files: [] });
  const cur = E.projectTree(site.plan, site.parts, site.files);
  res.json({ version_id: le.edit.id, instruction: le.edit.instruction, created_at: le.edit.created_at,
    files: le.paths.map((p) => ({ path: p, created: !(p in le.tA), deleted: !(p in le.tB), before: le.tA[p] ?? '', after: le.tB[p] ?? '',
      state: (cur[p] ?? null) === (le.tA[p] ?? null) ? 'rejected' : (cur[p] ?? null) === (le.tB[p] ?? null) ? 'kept' : 'changed' })) });
});

r.post('/', async (req, res) => {
  const body = req.body || {};
  const user = req.user;
  const action = String(body.action ?? '');

  if (action === 'usage') {
    const [sites, edits] = await Promise.all([countToday(user.id, 'create'), countToday(user.id, 'edit')]);
    return res.json({ sites_today: sites, sites_limit: null, edits_today: edits, edits_limit: null });
  }

  if (action === 'read_site') {
    const start = E.normalizeSiteUrl(String(body.url ?? ''));
    if (!start) throw bad('Endereço inválido. Cole o endereço do site, como www.empresa.com.br.');
    try {
      await assertPublicHost(start);
      const { response, bytes, url } = await E.fetchLimited(start, 'text/html,application/xhtml+xml', 1_500_000, true);
      if (!/html|xml/i.test(response.headers.get('content-type') ?? 'text/html')) throw new HttpError(422, 'Esse endereço não é uma página de site.');
      const site = E.parseSitePage(new TextDecoder('utf-8').decode(bytes), url);
      if (!site.text && !site.title) throw new HttpError(422, 'Não encontrei conteúdo nessa página. Alguns sites só carregam o texto depois de abrir no navegador.');
      const name = site.title.split(/\s[-|–—·•:]\s/)[0].trim().slice(0, 80);
      return res.json({ details: E.importedSummary(site), assets: [], name, phone: site.whatsapp ?? site.phones[0]?.replace(/\D/g, '') ?? null });
    } catch (error) {
      if (error instanceof HttpError) throw error;
      const message = error instanceof Error ? error.message : '';
      throw new HttpError(422, /^(Esse endereço|O site|Arquivo)/.test(message) ? message : 'Não consegui abrir esse site. Confira o endereço e tente de novo.');
    }
  }

  if (action === 'create') {
    const brief = cleanBrief(body.brief ?? {});
    if (!brief) throw bad('Escreva o que você quer no site.');
    brief.ai = ai.selection(body);
    const created = await tx(async () => {
      // Sem nome ainda (pedido livre): link provisório até a IA ler o pedido.
      const slug = brief.businessName ? await uniqueSlug(brief.businessName) : `site-${crypto.randomUUID().slice(0, 8)}`;
      const info = await run('INSERT INTO projects(name,description,kind,slug,owner_id,ws) VALUES (?,?,?,?,?,?)', brief.businessName || 'Novo site', (brief.details || '').slice(0, 300) || null, 'site', slug, user.id, user.ws);
      const id = Number(info.lastInsertRowid);
      await run('INSERT INTO code_sites(project_id,user_id,brief,status) VALUES (?,?,?,?)', id, user.id, S(brief), 'planning');
      return { id, slug, name: brief.businessName || 'Novo site', status: 'planning' };
    });
    await recordCall(user.id, 'create');
    return res.json({ site: created });
  }

  if (!['plan', 'part', 'edit', 'restore', 'finish', 'review'].includes(action)) throw bad('Ação inválida.');

  const site = await loadSite(body.site_id, req);
  if (!site) throw new HttpError(404, 'Site não encontrado.');
  if (body.expected_rev != null && Number(body.expected_rev) !== site.rev) throw new HttpError(409, 'O site mudou em outra operação. Atualize e tente novamente.');

  if (action === 'restore') {
    if (site.status === 'planning' || site.status === 'building') throw new HttpError(409, 'Espere a geração terminar antes de restaurar.');
    const row = await get('SELECT id, plan, parts, files FROM site_versions WHERE id=? AND project_id=?', Number(body.version_id) || 0, site.id);
    if (!row) throw new HttpError(404, 'Versão não encontrada.');
    const version = { plan: J(row.plan, null), parts: J(row.parts, null), files: J(row.files, {}) };
    if (!version.plan || !Array.isArray(version.plan.sections) || !version.parts ||
        !version.plan.palette || !version.plan.fonts ||
        !E.partOrder(version.plan).every((id) => typeof version.parts[id] === 'string' && version.parts[id].trim())) {
      throw new HttpError(409, 'Esta versão está incompleta e não pode ser restaurada.');
    }
    const versionFiles = version.files ?? {};
    if (site.status === 'ready' && S(site.plan) === S(version.plan) && S(site.parts) === S(version.parts) && S(site.files ?? {}) === S(versionFiles)) {
      return res.json({ site });
    }
    if (site.plan && Object.values(site.parts).some(Boolean)) await preserveCurrentVersion(site, user.id);
    const html = E.assembleSite(version.plan, version.parts, { files: versionFiles });
    const pagesHtml = E.assemblePages(version.plan, version.parts, versionFiles);
    const restored = await saveSite(site, {
      plan: version.plan, parts: version.parts, files: versionFiles, status: 'ready', html, pages_html: pagesHtml,
      brief: { ...site.brief, specification: version.plan.specification ?? site.brief.specification }
    });
    if (!restored) throw new HttpError(409, 'O site mudou durante a restauração. Atualize e tente novamente.');
    await syncProjectFiles(site.id, html, pagesHtml);
    await versionInsert(site, user.id, { kind: 'restore', instruction: null, actions: [], plan: version.plan, parts: version.parts, files: versionFiles });
    return res.json({ site: await loadSite(site.id, req) });
  }

  // Decisões da revisão: o site fica igual à alteração, menos os arquivos rejeitados (que voltam ao que eram).
  if (action === 'review') {
    if (site.status !== 'ready') throw new HttpError(409, 'Espere o site terminar de ser gerado.');
    const le = await lastEdit(site.id);
    if (!le || le.edit.id !== Number(body.version_id)) throw new HttpError(409, 'Esta alteração não pode mais ser revisada (o site mudou depois dela).');
    const rejected = (Array.isArray(body.rejected) ? body.rejected : []).map(String).filter((p) => le.paths.includes(p));
    const operations = rejected.map((p) => (p in le.tA ? { kind: 'write', path: p, content: le.tA[p] } : { kind: 'delete', path: p }));
    const base = le.after;
    const applied = operations.length
      ? E.applyProjectEdit(base.plan, base.parts, base.files, { actions: [], operations, blocks: [], invalid: 0 }, { brief: site.brief, fresh: [] })
      : { plan: base.plan, parts: base.parts, files: base.files, results: [] };
    const failed = applied.results.filter((x) => !x.ok);
    if (failed.length) throw new HttpError(422, `Não consegui desfazer: ${failed.map((x) => `${x.path} (${x.reason})`).join('; ')}`);
    const html = E.assembleSite(applied.plan, applied.parts, { files: applied.files });
    const pagesHtml = E.assemblePages(applied.plan, applied.parts, applied.files);
    if (!/<main\b/.test(html)) throw new HttpError(422, 'A revisão deixaria o site sem montar. Nada foi salvo.');
    const nextPlan = { ...applied.plan, actions: site.plan.actions ?? [] };
    const saved = await tx(async () => {
      const next = await saveSite(site, { plan: nextPlan, parts: applied.parts, files: applied.files, html, pages_html: pagesHtml });
      if (!next) return null;
      await syncProjectFiles(site.id, html, pagesHtml);
      await versionInsert(site, user.id, { kind: 'review', instruction: null,
        actions: [`Revisão: ${le.paths.length - rejected.length} arquivo(s) mantido(s), ${rejected.length} desfeito(s)`, ...rejected.map((p) => `Desfeito: ${p}`)],
        plan: nextPlan, parts: applied.parts, files: applied.files });
      return next;
    });
    if (!saved) throw new HttpError(409, 'O site mudou durante a revisão. Atualize e tente novamente.');
    return res.json({ site: await loadSite(site.id, req), rejected });
  }

  // Todas as partes salvas, mas a conexão caiu antes de marcar pronto: o
  // site ficava em "construindo" para sempre. Termina sem chamar a IA.
  if (action === 'finish') {
    if (site.status === 'ready') return res.json({ site });
    const plan = site.plan;
    if (!plan || !E.partOrder(plan).every((id) => typeof site.parts[id] === 'string' && site.parts[id].trim())) {
      throw new HttpError(409, 'Ainda faltam partes do site. Clique em "Continuar criação".');
    }
    if (site.status !== 'building') await setStatus(site.id, 'building');
    const html = E.assembleSite(plan, site.parts, { files: site.files });
    if (await markReady(site.id, html)) {
      await syncProjectFiles(site.id, html, E.assemblePages(plan, site.parts, site.files));
      await versionInsert(site, user.id, { kind: 'create', actions: plan.actions ?? [], plan, parts: site.parts });
    }
    return res.json({ site: await loadSite(site.id, req) });
  }

  const partial = typeof body.partial === 'string' ? body.partial : '';
  if ((await countToday(user.id)) >= CALLS_PER_DAY) throw new HttpError(429, 'Limite de uso da IA de hoje atingido. Amanhã libera de novo.');

  const apiKey = config.get('RIVER_API_KEY');
  // Modelo e esforço escolhidos no seletor (ou os guardados na criação do site).
  const sel = ai.selection(body, site.brief?.ai);
  const model = ai.providerModelFor(sel.model);
  const metaOf = (kind) => ({ sel, kind, userId: user.id });
  const configuredBudget = Number(config.get('CODE_MAKER_MAX_INPUT_CHARS'));
  const inputBudget = Number.isFinite(configuredBudget) && configuredBudget >= 16000 ? configuredBudget : 90000;
  if (!apiKey) throw new HttpError(503, 'O Code Maker ainda não foi configurado (preencha RIVER_API_KEY na tabela app_settings).');

  if (action === 'plan') {
    if (site.plan) throw new HttpError(409, 'Este site já tem um plano. Continue as partes pendentes.');
    if (site.status === 'error') await setStatus(site.id, 'planning', 'error');
    if (!partial) await recordCall(user.id, 'plan');
    let planningBrief = site.brief;
    // Receita sorteada para este site, fugindo do que a pessoa usou nos
    // últimos sites (antes todos saíam com o mesmo topo, tema e seções).
    const recentRows = await all('SELECT plan FROM code_sites WHERE user_id=? AND project_id<>? AND plan IS NOT NULL ORDER BY created_at DESC LIMIT 6', user.id, site.id);
    const recipe = E.siteRecipe(site.brief, recentRows.map((row) => J(row.plan, {})), String(site.id));
    return streamAi(req, res, {
      apiKey, model, maxTokens: MAX_TOKENS.plan[sel.effort], partial, sel, kind: 'cm_plan', userId: user.id,
      onFailure: () => setStatus(site.id, 'error', 'planning'),
      prepare: async (signal, emit) => {
        if (!planningBrief.specification) {
          const prompt = planningBrief.details || JSON.stringify(planningBrief);
          const specification = await E.prepareSpecificationContext(
            prompt, (chunk) => specOnce(apiKey, model, chunk, signal, metaOf('cm_spec')), Math.min(24000, Math.floor(inputBudget / 2))
          );
          planningBrief = { ...planningBrief, specification };
          signal.throwIfAborted();
          await run("UPDATE code_sites SET brief=?, updated_at=datetime('now') WHERE project_id=?", S(planningBrief), site.id);
        }
        // Referências: escolhidas na biblioteca para este pedido e medidas nos sites reais (uma vez; a continuação reaproveita).
        if (!planningBrief.designRefs) {
          const built = await refs.buildReferences(planningBrief, { siteId: site.id }).catch((e) => ({ block: '', trace: { error: String(e.message).slice(0, 160) } }));
          planningBrief = { ...planningBrief, designRefs: built.block, designTrace: built.trace };
          await run("UPDATE code_sites SET brief=?, updated_at=datetime('now') WHERE project_id=?", S(planningBrief), site.id);
        }
        planningBrief = { ...planningBrief, designUsed: DC.contextFor('plan', planningBrief).used };
        const literal = E.buildPlanMessage(planningBrief, true, recipe);
        const system = systemFor('plan', planningBrief);
        let content = literal.length + system.length < inputBudget ? literal : E.buildPlanMessage(planningBrief, false, recipe);
        if (planningBrief.designRefs && content.length + system.length + planningBrief.designRefs.length < inputBudget) content += `\n\n${planningBrief.designRefs}`;
        // Esforço alto/máximo: análise prévia (guardada no brief para a continuação não pensar de novo).
        if (ANALYSIS_TOKENS[sel.effort]) {
          let notes = planningBrief.analysis?.effort === sel.effort ? planningBrief.analysis.notes : '';
          if (!notes) {
            emit('<etapa>analise</etapa>\n');
            try {
              notes = (await completeJson(apiKey, model, system, `${ANALYSIS.plan}${sel.effort === 'xhigh' ? ` ${CRITIQUE}` : ''}\n\n${content}`, signal,
                { ...metaOf('cm_plan:analise'), raw: true, native: true, maxTokens: ANALYSIS_TOKENS[sel.effort] })).slice(0, 9000);
              planningBrief = { ...planningBrief, analysis: { effort: sel.effort, notes } };
              await run("UPDATE code_sites SET brief=?, updated_at=datetime('now') WHERE project_id=?", S(planningBrief), site.id);
            } catch (error) { if (signal.aborted) throw error; notes = ''; }
            emit('<etapa>plano</etapa>\n');
          }
          if (notes) content += `\n\nSUA ANÁLISE PRÉVIA (interna; use para decidir o plano e não a repita):\n${notes}`;
        }
        return [{ role: 'system', content: system }, { role: 'user', content }];
      },
      finish: async (full, signal, emit) => {
        // Revisão do plano (todos os níveis menos o Baixo): o plano manda no site inteiro, então ele passa por uma segunda leitura crítica.
        if (sel.effort !== 'low') full = await reviewPlan(apiKey, model, full, planningBrief, recipe, sel, user.id, signal, emit);
        const { actions, plan: parsedPlan, business } = E.parsePlan(full, planningBrief, recipe);
        if (!parsedPlan) {
          await setStatus(site.id, 'error');
          return 'A IA não conseguiu planejar o site. Tente gerar de novo.';
        }
        // Requisito que a IA não encaixou em nenhuma seção vale para o site
        // todo (entra em todas as partes e na conferência final) em vez de
        // reprovar o plano inteiro.
        const coverage = E.validateRequirementCoverage(planningBrief.specification, parsedPlan);
        const plan = coverage.valid ? parsedPlan : {
          ...parsedPlan,
          globalRequirementIds: [...new Set([...(parsedPlan.globalRequirementIds ?? []), ...coverage.missing])]
        };
        const brief = E.fillBrief(planningBrief, business);
        const renamed = !site.brief.businessName && brief.businessName;
        signal.throwIfAborted();
        const contacts = E.contactsOf(brief);
        const bizInfo = brief.businessName ? { name: brief.businessName, city: brief.city || null, phone: E.briefPhone(brief) || null, niche: brief.niche || null,
          address: contacts.address, email: contacts.email, instagram: contacts.instagram, landline: E.phoneDigits(contacts.phone) } : undefined;
        await run("UPDATE code_sites SET plan=?, parts='{}', status='building', html=NULL, brief=?, rev=rev+1, updated_at=datetime('now') WHERE project_id=?",
          S({ ...plan, actions, ...(bizInfo ? { business: bizInfo } : {}), designSpec: DC.designSpec({ ...plan, ...(bizInfo ? { business: bizInfo } : {}) }, brief) }), S(brief), site.id);
        if (renamed) await run("UPDATE projects SET name=?, slug=?, updated_at=datetime('now') WHERE id=?", brief.businessName.slice(0, 80), await uniqueSlug(brief.businessName, site.id), site.id);
        return null;
      }
    });
  }

  if (!site.plan) throw new HttpError(409, 'O site ainda não foi planejado.');
  const plan = site.plan;
  // As ações do plano ficam guardadas junto, mas não precisam ir para a IA.
  const { actions: _planActions, ...planForAi } = plan;

  if (action === 'part') {
    if (site.status === 'ready') throw new HttpError(409, 'O site já está pronto. Use uma alteração para editá-lo.');
    const partId = String(body.part_id ?? '');
    if (!E.partOrder(plan).includes(partId)) throw bad('Parte inválida.');
    if (site.status === 'error') await setStatus(site.id, 'building', 'error');
    const markError = () => setStatus(site.id, 'error', 'building');
    // Salva a parte pronta; quando é a última, marca o site como pronto.
    const savePart = async (html, signal) => {
      signal.throwIfAborted();
      const parts = await mergePart(site.id, partId, html);
      if (E.partOrder(plan).every((id) => parts[id])) {
        const document = E.assembleSite(plan, parts);
        signal.throwIfAborted();
        if (await markReady(site.id, document)) {
          await syncProjectFiles(site.id, document, {});
          await versionInsert(site, user.id, { kind: 'create', actions: plan.actions ?? [], plan, parts });
        }
      }
      return null;
    };

    // Cabeçalho e rodapé saem prontos do plano, sem IA.
    const fixed = E.fixedPart(partId, planForAi, site.brief);
    if (fixed) return instantStream(res, `\`\`\`html\n${fixed}\n\`\`\``, (signal) => savePart(fixed, signal), markError);

    if (!partial) await recordCall(user.id, 'part');
    const partCheck = { high: '\n\nAntes de responder, confira o conteúdo contra o CONTRATO DE ENTREGA do DESIGN.md (nada inventado, ação clara, texto escaneável).',
      xhigh: '\n\nAntes de responder, confira item por item o CONTRATO DE ENTREGA e o PORTÃO DE QUALIDADE do DESIGN.md (nada inventado, nada genérico, ação clara, texto escaneável e específico deste negócio) e reescreva o que falhar.' }[sel.effort] || '';
    return streamAi(req, res, {
      apiKey, model, maxTokens: MAX_TOKENS.part[sel.effort], partial, sel, kind: 'cm_part', userId: user.id,
      onFailure: markError,
      messages: [
        { role: 'system', content: systemFor('part', site.brief) },
        { role: 'user', content: E.buildPartMessage(partId, planForAi, site.brief) + partCheck }
      ],
      finish: async (full, signal, emit) => {
        // A IA escreve o conteúdo (JSON) e o código monta o bloco. Se ela
        // mandar HTML em vez disso, aproveita como antes.
        let content = E.parseContent(full);
        // Revisão (todos os níveis menos o Baixo): segunda leitura crítica do que a IA escreveu, contra o pedido e o DESIGN.md.
        // Medido nos sites de teste: a revisão troca texto genérico, devolve a frase exata do pedido e tira o que foi inventado.
        if (content && sel.effort !== 'low') {
          emit('<etapa>revisao</etapa>\n');
          content = await reviewContent(apiKey, model, partId, planForAi, site.brief, content, sel, user.id, signal);
        }
        let html;
        if (content) {
          html = E.renderPart(partId, planForAi, site.brief, content);
          if (html) emit(`\n\`\`\`html\n${html}\n\`\`\``);
        } else {
          if (!/```html|<(?:section|header|footer)\b/i.test(full)) return 'A IA devolveu esta parte incompleta. Tente de novo.';
          const raw = E.parsePart(full).html;
          html = E.normalizePart(partId, site.brief.mode === 'lead_prototype' ? raw : E.stripMissingInfo(raw));
        }
        if (!html) return 'A IA devolveu esta parte vazia. Tente de novo.';
        return savePart(html, signal);
      }
    });
  }

  // action === 'edit': a IA altera os ARQUIVOS-FONTE do projeto (site.json,
  // secoes/*.html, paginas/*.html, estilos.css, script.js). O servidor aplica
  // cada operação conferindo o arquivo, monta as páginas, grava, confere o que
  // ficou gravado e só então diz que mudou — e diz exatamente o que mudou.
  const instruction = E.cleanUserText(body.instruction);
  if (!instruction) throw bad('Diga o que você quer mudar.');
  if (site.status !== 'ready') throw new HttpError(409, 'Espere o site terminar de ser gerado.');
  const editId = crypto.randomUUID().slice(0, 8);
  const files = site.files ?? {};
  const fresh = [];
  const brief = site.brief;
  if (!partial) await recordCall(user.id, 'edit');
  const versionRows = await all("SELECT instruction, actions FROM site_versions WHERE project_id=? AND kind='edit' AND instruction IS NOT NULL ORDER BY id DESC LIMIT 6", site.id);
  const recent = versionRows.map((v) => ({ instruction: v.instruction, actions: J(v.actions, []) }));
  let editSpecification = null;
  const tree = E.projectTree(plan, site.parts, files);
  const treeChars = Object.values(tree).reduce((sum, content) => sum + content.length, 0);

  const buildMessages = async (signal, emit = () => {}) => {
    editSpecification = await E.prepareSpecificationContext(instruction, (chunk) => specOnce(apiKey, model, chunk, signal, metaOf('cm_spec')), Math.min(24000, Math.floor(inputBudget / 2)));
    // Só o que precisa de servidor fica de fora (spec.ts filtra o resto).
    const limits = editSpecification.limitations.length
      ? `\n\nEstes itens normalmente pedem servidor: ${editSpecification.limitations.join('; ')}. Não recuse nem deixe de fora: entregue a versão funcional que roda no navegador (telas e fluxo completos, dados no localStorage, links de pagamento/WhatsApp/e-mail) e conte numa ação o que foi feito. Faça também todo o resto do pedido.`
      : '';
    const compacted = instruction.length > inputBudget / 4 ? await compactContext(instruction, Math.floor(inputBudget / 4), apiKey, model, signal) : instruction;
    // Arquivos que vão inteiros: todos, se cabem; senão a IA escolhe pelo índice.
    const filesBudget = Math.max(12000, Math.floor(inputBudget * 0.62) - compacted.length);
    let chosen = [];
    if (treeChars > filesBudget) {
      try {
        const picked = await completeJson(apiKey, model, SELECT_SYSTEM, `Pedido:\n${compacted.slice(0, 6000)}\n\nArquivos:\n${E.fileIndex(tree)}`, signal, metaOf('cm_select'));
        chosen = Array.isArray(picked?.arquivos) ? picked.arquivos.filter((p) => typeof p === 'string') : [];
      } catch (error) {
        logEdit('select_failed', { edit: editId, reason: error instanceof Error ? error.message : 'erro' });
      }
    }
    const selected = E.selectFiles(tree, compacted, filesBudget, chosen);
    const contents = Object.fromEntries(selected.map((p) => [p, tree[p]]));
    logEdit('read', {
      edit: editId, site: site.id, files: Object.keys(tree).length, chars: treeChars,
      sent: selected.length, sent_chars: selected.reduce((sum, p) => sum + tree[p].length, 0),
      ai_selected: chosen.length, budget: filesBudget, limitations: editSpecification.limitations.length
    });
    let content = E.buildEditMessage(planForAi, site.parts, compacted, brief, fresh, recent, { index: E.fileIndex(tree), contents }) + limits;
    const system = systemFor('edit', brief);
    if (ANALYSIS_TOKENS[sel.effort]) {
      const key = crypto.createHash('sha1').update(`${sel.effort}:${instruction}`).digest('hex').slice(0, 16);
      let notes = brief.edit_analysis?.key === key ? brief.edit_analysis.notes : '';
      if (!notes) {
        emit('<etapa>analise</etapa>\n');
        try {
          notes = (await completeJson(apiKey, model, system, `${ANALYSIS.edit}${sel.effort === 'xhigh' ? ` ${CRITIQUE}` : ''}\n\n${content}`, signal,
            { ...metaOf('cm_edit:analise'), raw: true, native: true, maxTokens: ANALYSIS_TOKENS[sel.effort] })).slice(0, 9000);
          await run("UPDATE code_sites SET brief=?, updated_at=datetime('now') WHERE project_id=?", S({ ...brief, edit_analysis: { key, notes } }), site.id);
        } catch (error) { if (signal.aborted) throw error; notes = ''; }
        emit('<etapa>alteracao</etapa>\n');
      }
      if (notes) content += `\n\nSUA ANÁLISE PRÉVIA (interna; use para fazer a alteração e não a repita):\n${notes}`;
    }
    editMessages = [{ role: 'system', content: system }, { role: 'user', content }];
    return editMessages;
  };
  let editMessages = null;

  return streamAi(req, res, {
    apiKey, model, maxTokens: MAX_TOKENS.edit[sel.effort], partial, sel, kind: 'cm_edit', userId: user.id,
    prepare: buildMessages,
    messages: [],
    finish: async (full, signal, emit) => {
      let edit = E.parseProjectEdit(full);
      logEdit('parsed', { edit: editId, operations: edit.operations.length, blocks: edit.blocks.length, invalid: edit.invalid, chars: full.length });
      // Formato quebrado (ex.: <antes> fechado com </depois>): em vez de devolver erro, pede ao modelo para reenviar as operações no formato certo.
      // Medido em produção: o Neva 1.5 errava o fechamento em 3 de 8 pedidos e a pessoa só via "Tente de novo".
      if (edit.invalid && edit.operations.length === 0 && edit.blocks.length === 0 && editMessages) {
        emit('<etapa>alteracao</etapa>\n');
        try {
          const retry = repairDsml(await completeJson(apiKey, model, '', '', signal, { ...metaOf('cm_edit:formato'), raw: true, maxTokens: MAX_TOKENS.edit[sel.effort], messages: [...editMessages, { role: 'assistant', content: full.slice(-30000) },
            { role: 'user', content: 'O formato da sua resposta veio quebrado e nada foi aplicado. Reenvie TODAS as operações de novo, no formato exato: cada <editar arquivo="..."> tem um <antes>...</antes> e um <depois>...</depois> e fecha com </editar>; <criar arquivo="..."> fecha com </criar>; <apagar arquivo="..."/> é de uma linha só. O <antes> fecha SEMPRE com </antes> (nunca com </depois>). Sem comentários fora das tags.' }] }));
          const again = E.parseProjectEdit(retry);
          logEdit('format_retry', { edit: editId, operations: again.operations.length, blocks: again.blocks.length, invalid: again.invalid });
          if (again.operations.length || again.blocks.length) { edit = again; full = retry; }
        } catch (error) { if (signal.aborted) throw error; }
      }
      if (edit.operations.length === 0 && edit.blocks.length === 0) {
        logEdit('no_operations', { edit: editId, actions: edit.actions.length });
        if (edit.invalid) return `Nenhum arquivo foi alterado: ${edit.invalid} operação(ões) vieram com formato quebrado. Tente de novo.`;
        return edit.actions.length
          ? `Nenhum arquivo foi alterado. ${edit.actions.join(' ').slice(0, 600)}`
          : 'A IA não devolveu nenhuma alteração nos arquivos. Tente explicar de outro jeito.';
      }
      const applied = E.applyProjectEdit(plan, site.parts, files, edit, { brief, fresh });
      const failed = applied.results.filter((result) => !result.ok);
      logEdit('applied', {
        edit: editId, ok: applied.results.length - failed.length, failed: failed.length,
        reasons: failed.map((result) => result.reason), changed: applied.changes.map((change) => `${change.change}:${change.path}`)
      });
      // Nada mudou nos arquivos = nada a dizer como feito.
      if (applied.changes.length === 0) {
        const why = failed.slice(0, 3).map((result) => `${result.path}: ${result.reason}`).join('; ');
        return `Nenhum arquivo foi alterado${why ? ` (${why})` : ''}. Tente de novo ou explique de outro jeito.`;
      }
      // Monta todas as páginas antes de gravar: se alguma não monta, nada é salvo.
      const html = E.assembleSite(applied.plan, applied.parts, { files: applied.files });
      const pagesHtml = E.assemblePages(applied.plan, applied.parts, applied.files);
      if (!/<main\b/.test(html) || Object.values(pagesHtml).some((page) => !/<main\b/.test(page))) {
        logEdit('assemble_failed', { edit: editId });
        return 'A alteração deixou o site sem montar. Nada foi salvo.';
      }
      const preserved = brief.specification;
      const nextBrief = preserved && editSpecification ? {
        ...brief, specification: {
          ...preserved,
          forbiddenChanges: [...new Set([...preserved.forbiddenChanges, ...editSpecification.forbiddenChanges])]
        }
      } : brief;
      const nextPlan = { ...applied.plan, actions: plan.actions ?? [], ...(nextBrief.specification ? { specification: nextBrief.specification } : {}) };
      const report = E.changeReport(applied.changes, applied.results, edit.invalid);
      signal.throwIfAborted();
      await preserveCurrentVersion(site, user.id);
      signal.throwIfAborted();
      // Grava site, arquivos do projeto e histórico juntos: se algo falha, nada muda.
      const saved = await tx(async () => {
        const next = await saveSite(site, { brief: nextBrief, plan: nextPlan, parts: applied.parts, files: applied.files, html, pages_html: pagesHtml });
        if (!next) return null;
        await syncProjectFiles(site.id, html, pagesHtml);
        await versionInsert(site, user.id, { kind: 'edit', instruction, actions: [...edit.actions, ...report], plan: nextPlan, parts: applied.parts, files: applied.files });
        return next;
      });
      if (!saved) {
        logEdit('persist_conflict', { edit: editId });
        return 'O site mudou durante a edição. Atualize e tente novamente.';
      }
      logEdit('persisted', { edit: editId, changed: applied.changes.length, pages: Object.keys(pagesHtml).length, html_chars: html.length });
      // O que a tela mostra como feito vem da comparação dos arquivos.
      emit(`\n<arquivos>\n${report.map((line) => `- ${line}`).join('\n')}\n</arquivos>`);
      return null;
    }
  });
});

module.exports = r;
module.exports.parseJsonLoose = parseJsonLoose;
module.exports.repairDsml = repairDsml;
