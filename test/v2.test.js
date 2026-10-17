const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const os = require('node:os');
const fs = require('node:fs');
const path = require('node:path');

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'neva2-'));
process.env.DATA_DIR = dir;
const { createApp } = require('../server/index.js');
const { get: dbGet } = require('../server/lib/db');

let server, base; const jar = {};
const call = async (who, method, url, body) => {
  const res = await fetch(base + url, { method, redirect: 'manual', headers: { 'content-type': 'application/json', 'x-requested-with': 'neva', ...(jar[who] ? { cookie: jar[who] } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
  const sc = res.headers.get('set-cookie'); if (sc) jar[who] = sc.split(';')[0];
  const ct = res.headers.get('content-type') || '';
  return { status: res.status, body: ct.includes('json') ? await res.json() : Buffer.from(await res.arrayBuffer()) };
};
const A = (m, u, b) => call('admin', m, u, b); const M = (m, u, b) => call('member', m, u, b);
const day = (n) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);

before(async () => {
  await new Promise((r) => { server = createApp().listen(0, r); }); base = `http://127.0.0.1:${server.address().port}`;
  await A('POST', '/api/auth/setup', { name: 'Admin', email: 'admin@x.com', password: 'senha-forte-1' });
  await A('POST', '/api/users', { name: 'Membro', email: 'm@x.com', password: 'senha-forte-2', role: 'member' });
  await M('POST', '/api/auth/login', { email: 'm@x.com', password: 'senha-forte-2' });
});
after(() => { server.close(); fs.rmSync(dir, { recursive: true, force: true }); });

test('esquema Postgres aplicado, com seed de planos, etapas e biblioteca', async () => {
  assert.equal((await dbGet("SELECT value FROM meta WHERE key='schema_version'")).value, '2');
  assert.equal((await A('GET', '/api/pipeline/stages')).body.length, 6);
  assert.deepEqual((await A('GET', '/api/me')).body.plans.map((p) => p.key), ['member', 'creator', 'elite']);
  assert.ok((await A('GET', '/api/library?kind=prompt')).body.total >= 3);
});

test('vendas: custo, margem, entrega, visões com contadores e indicadores', async () => {
  const c = (await A('POST', '/api/clients', { name: 'Cliente A' })).body; assert.equal(c.stage, 'lead');
  assert.equal((await A('POST', '/api/sales', { description: 'x', amount: 100, cost: 200 })).status, 400);
  const s1 = (await A('POST', '/api/sales', { description: 'Site A', amount: 1000, cost: 400, status: 'pago', client_id: c.id, delivery_date: day(3) })).body;
  assert.equal(s1.profit, 600); assert.equal(s1.margin, 60);
  await A('POST', '/api/sales', { description: 'Site B', amount: 500, cost: 400, status: 'pago', delivery_date: day(-2) });
  await A('POST', '/api/sales', { description: 'Site C', amount: 300, delivery_status: 'entregue', status: 'pendente', client_id: c.id });
  assert.equal((await A('PUT', `/api/sales/${s1.id}`, { cost: 5000 })).status, 400);
  const sum = (await A('GET', '/api/sales/summary')).body;
  assert.deepEqual([sum.faturamento, sum.lucro, sum.margem, sum.ticket, sum.pagas, sum.pendente], [1500, 700, 46.7, 750, 2, 300]);
  assert.deepEqual([sum.counts.todas, sum.counts.atrasadas, sum.counts.proxima, sum.counts.entregues, sum.counts.sem_cliente], [3, 1, 1, 1, 1]);
  assert.equal((await A('GET', '/api/sales?view=atrasadas')).body.items[0].description, 'Site B');
  assert.equal((await A('GET', '/api/sales?view=margem')).body.items[0].description, 'Site C');   // 100% de margem (custo 0)
  assert.equal((await A('GET', '/api/sales?view=sem_cliente')).body.total, 1);
  await A('PUT', `/api/sales/${s1.id}`, { description: 'Site A (edit)' });
  // notificação só na transição para "pago" (membro recebe 2: Site A e Site B)
  const n = (await M('GET', '/api/me/notifications')).body; assert.equal(n.items.filter((x) => x.type === 'sale').length, 2);
});

test('dashboard por período com lucro, ticket e variação', async () => {
  const d = (await A('GET', '/api/dashboard?period=7d')).body.metrics;
  assert.deepEqual([d.revenue, d.profit, d.sales, d.ticket], [1500, 700, 2, 750]);
  assert.equal(d.series.length, 7); assert.equal(d.profitVariation, null);   // sem base de comparação
  assert.equal((await A('GET', '/api/dashboard?period=1a')).body.metrics.series.length >= 12, true);
  assert.equal((await A('POST', '/api/dashboard/summary', { period: '7d' })).body.code, 'ai_not_configured');
});

test('funil personalizável, arquivamento, prioridade, atraso e conversão', async () => {
  const stages = (await A('GET', '/api/pipeline/stages')).body;
  assert.equal((await M('PUT', '/api/pipeline/stages', { stages })).status, 403);
  const bad = stages.filter((s) => s.kind !== 'lost'); assert.equal((await A('PUT', '/api/pipeline/stages', { stages: bad })).status, 400);
  const lead = (await A('POST', '/api/leads', { name: 'Lead 1', priority: 'alta', due_date: day(-1), value: 700 })).body;
  assert.equal((await A('PUT', '/api/pipeline/stages', { stages: stages.filter((s) => s.key !== 'novo') })).status, 400);   // etapa com oportunidades
  const next = stages.map((s) => (s.key === 'contato' ? { ...s, label: 'Qualificados' } : s)).concat([{ label: 'Pós-venda', kind: 'open' }]);
  const out = (await A('PUT', '/api/pipeline/stages', { stages: next })).body;
  assert.equal(out.at(-1).key, 'pos-venda'); assert.equal(out.find((s) => s.key === 'contato').label, 'Qualificados');
  assert.equal((await A('POST', `/api/leads/${lead.id}/stage`, { status: 'pos-venda' })).body.status, 'pos-venda');
  assert.equal((await A('GET', '/api/leads?overdue=1')).body.total, 1);
  assert.equal((await A('GET', '/api/leads?priority=alta')).body.total, 1);
  await A('PUT', `/api/leads/${lead.id}`, { archived: true });
  assert.equal((await A('GET', '/api/leads?archived=0')).body.total, 0); assert.equal((await A('GET', '/api/leads?archived=1')).body.total, 1);
  assert.equal((await A('GET', '/api/leads?overdue=1')).body.total, 0);   // arquivado não conta como atrasado
  const conv = await A('POST', `/api/leads/${lead.id}/convert`, {}); assert.equal(conv.status, 201);
  assert.equal((await A('GET', `/api/leads/${lead.id}`)).body.status, 'ganho');
  const cs = (await A('GET', '/api/clients/summary')).body; assert.equal(cs.total, 2); assert.equal(cs.fechados, 1); assert.equal(cs.conversao, 50);
  assert.equal((await A('GET', '/api/clients?stage=cliente')).body.total, 1);
});

test('conta: username, sessões, senha, configurações, notificações', async () => {
  assert.equal((await M('PUT', '/api/me', { username: 'AB' })).status, 400);
  assert.equal((await M('PUT', '/api/me', { username: '@Membro.Teste', phone: '41999990000' })).body.user.username, 'membro.teste');
  assert.equal((await A('PUT', '/api/me', { username: 'membro.teste' })).status, 400);                 // único
  assert.equal((await M('PUT', '/api/me/settings', { hide_values: true, notify_sales: false })).body.hide_values, '1');
  assert.equal((await M('PUT', '/api/me/settings', { foo: 1 })).status, 400);
  assert.equal((await M('PUT', '/api/me/settings', { prospect_radius_km: 99 })).status, 400);
  await A('POST', '/api/sales', { description: 'Site D', amount: 50, status: 'pago' });
  assert.equal((await M('GET', '/api/me/notifications')).body.items.some((x) => x.text.includes('Site D')), false);  // preferência respeitada
  assert.equal((await A('GET', '/api/me/notifications')).body.items.some((x) => x.text.includes('Site D')), false);  // autor não é notificado
  const jar2 = jar.member; await call('m2', 'POST', '/api/auth/login', { email: 'm@x.com', password: 'senha-forte-2' });
  const ss = (await M('GET', '/api/me/sessions')).body; assert.equal(ss.length, 2); assert.equal(ss.filter((x) => x.current).length, 1);
  assert.equal((await M('DELETE', `/api/me/sessions/${ss.find((x) => x.current).id}`)).status, 400);
  await M('DELETE', `/api/me/sessions/${ss.find((x) => !x.current).id}`);
  assert.equal((await call('m2', 'GET', '/api/me')).status, 401);
  await call('m3', 'POST', '/api/auth/login', { email: 'm@x.com', password: 'senha-forte-2' });
  assert.equal((await M('PUT', '/api/me/password', { current: 'senha-forte-2', next: 'nova-senha-123' })).body.endedSessions, 1);
  assert.equal((await call('m3', 'GET', '/api/me')).status, 401); assert.equal((await M('GET', '/api/me')).status, 200);
  const n = (await M('GET', '/api/me/notifications')).body; assert.ok(n.unread > 0);
  await M('POST', '/api/me/notifications/read', {}); assert.equal((await M('GET', '/api/me/notifications')).body.unread, 0);
  assert.equal(jar2, jar.member);
});

test('planos: bloqueio de recursos no servidor, limites e créditos', async () => {
  const it = (await A('POST', '/api/library', { kind: 'prompt', title: 'Avançado', content: 'segredo', min_plan: 'elite' })).body;
  const list = (await M('GET', '/api/library?kind=prompt')).body.items.find((x) => x.id === it.id);
  assert.equal(list.locked, true); assert.equal('content' in list, false);
  assert.equal((await M('GET', `/api/library/${it.id}`)).status, 403);
  assert.equal((await A('GET', `/api/library/${it.id}`)).body.content, 'segredo');
  const mid = (await M('GET', '/api/me')).body.user.id;
  assert.equal((await M('POST', '/api/library', { kind: 'prompt', title: 'x' })).status, 403);
  await A('PUT', `/api/users/${mid}`, { plan: 'elite', credits: 5 });
  assert.equal((await M('GET', `/api/library/${it.id}`)).body.content, 'segredo');
  assert.equal((await M('GET', '/api/me')).body.user.credits, 5);
  assert.equal((await A('PUT', `/api/users/${mid}`, { credits: -1 })).status, 400);
  assert.equal((await M('PUT', '/api/me/plans/member', { ai_monthly_limit: 1 })).status, 403);
  assert.equal((await A('PUT', '/api/me/plans/member', { ai_monthly_limit: 1 })).body.ai_monthly_limit, 1);
  assert.equal((await A('GET', '/api/library?q=landing')).body.total >= 1, true);
});

test('criação de usuário aceita plano e créditos, com validação', async () => {
  const u = (await A('POST', '/api/users', { name: 'Eli', email: 'eli@x.com', password: 'senha-forte-9', role: 'member', plan: 'elite', credits: 7 })).body;
  assert.deepEqual([u.plan, u.credits], ['elite', 7]);
  assert.equal((await A('POST', '/api/users', { name: 'Zed', email: 'z@x.com', password: 'senha-forte-9', plan: 'xx' })).status, 400);
  assert.equal((await A('POST', '/api/users', { name: 'Zed', email: 'z@x.com', password: 'senha-forte-9', credits: -3 })).status, 400);
});

test('Play e prompts salvos', async () => {
  const p = (await A('POST', '/api/play', { title: 'Aula 1', video_url: 'https://youtu.be/abc123XYZ', category: 'Vendas' })).body;
  assert.equal((await A('POST', '/api/play', { title: 'x', video_url: 'javascript:alert(1)' })).status, 400);
  assert.equal((await M('GET', '/api/play')).body.stats.percent, 0);
  await M('POST', `/api/play/${p.id}/seen`, {}); assert.equal((await M('GET', '/api/play')).body.stats.percent, 100);
  assert.equal((await A('GET', '/api/play')).body.stats.percent, 0);                                  // progresso por usuário
  const sp = (await M('POST', '/api/prompts', { input: 'ideia', output: 'prompt pronto', title: 'Meu' })).body;
  assert.equal((await M('GET', '/api/prompts')).body.items.length, 1); assert.equal((await A('GET', '/api/prompts')).body.items.length, 0);
  assert.equal((await A('DELETE', `/api/prompts/${sp.id}`)).status, 404);                              // não apaga de outro usuário
  assert.equal((await M('POST', '/api/prompts/generate', { input: 'uma ideia longa o bastante' })).body.code, 'ai_not_configured');
});

test('projetos: domínio/cliente/arquivar, versões, substituir, importar, IA apply/undo e permissões', async () => {
  const cid = (await A('GET', '/api/clients')).body.items.find((c) => c.name === 'Cliente A').id;
  const p = (await M('POST', '/api/projects', { name: 'Site do Cliente', kind: 'site', tagline: 'Olá mundo' })).body;
  assert.equal((await M('PUT', `/api/projects/${p.id}`, { domain: 'https://Meu-Site.com.br/x', client_id: cid })).body.domain, 'meu-site.com.br');
  assert.equal((await M('PUT', `/api/projects/${p.id}`, { domain: 'invalido' })).status, 400);
  let list = (await M('GET', '/api/projects')).body; assert.equal(list.items[0].client_name, 'Cliente A'); assert.equal(list.stats.desenvolvimento, 1);
  // versões
  await M('PUT', `/api/projects/${p.id}/file`, { path: 'a.txt', content: 'v1' });
  await M('PUT', `/api/projects/${p.id}/file`, { path: 'a.txt', content: 'v2' });
  await M('PUT', `/api/projects/${p.id}/file`, { path: 'a.txt', content: 'v3' });
  const vs = (await M('GET', `/api/projects/${p.id}/versions?path=a.txt`)).body; assert.equal(vs.length, 2);
  assert.equal((await M('POST', `/api/projects/${p.id}/versions/${vs[1].id}/restore`)).body.content, 'v1');
  assert.equal((await M('GET', `/api/projects/${p.id}/file?path=a.txt`)).body.content, 'v1');
  // substituir
  await M('PUT', `/api/projects/${p.id}/file`, { path: 'b.txt', content: 'zzfoo Zzfoo ZZFOO' });
  const dry = (await M('POST', `/api/projects/${p.id}/replace`, { find: 'zzfoo', replace: 'bar', dryRun: true })).body; assert.equal(dry.total, 3); assert.equal(dry.applied, false);
  assert.equal((await M('GET', `/api/projects/${p.id}/file?path=b.txt`)).body.content, 'zzfoo Zzfoo ZZFOO');
  const rep = (await M('POST', `/api/projects/${p.id}/replace`, { find: 'zzfoo', replace: 'a.b$&', caseSensitive: true })).body; assert.equal(rep.total, 1);
  assert.equal((await M('GET', `/api/projects/${p.id}/file?path=b.txt`)).body.content, 'a.b$& Zzfoo ZZFOO');   // sem interpretar $& nem regex
  // importar
  const imp = (await M('POST', `/api/projects/${p.id}/import`, { files: [{ path: 'lib/x.js', content: '1' }, { path: '../evil', content: 'x' }, { path: 'a.txt', content: 'novo' }, { path: 'bin.dat', content: 'a\0b' }] })).body;
  assert.deepEqual([imp.created, imp.updated, imp.skipped.length], [1, 0, 3]);
  // IA: aplicar e desfazer
  const ap = (await M('POST', `/api/projects/${p.id}/ai-apply`, { files: [{ path: 'a.txt', content: 'IA' }, { path: 'novo.js', content: 'n' }] })).body;
  assert.equal((await M('GET', `/api/projects/${p.id}/file?path=a.txt`)).body.content, 'IA');
  await M('POST', `/api/projects/${p.id}/ai-undo`, { undo: ap.undo });
  assert.equal((await M('GET', `/api/projects/${p.id}/file?path=a.txt`)).body.content, 'v1');
  assert.equal((await M('GET', `/api/projects/${p.id}/file?path=novo.js`)).status, 404);
  // permissões: admin pode, outro membro não
  await A('POST', '/api/users', { name: 'Outro', email: 'o@x.com', password: 'senha-forte-3', role: 'member' }); await call('o', 'POST', '/api/auth/login', { email: 'o@x.com', password: 'senha-forte-3' });
  assert.equal((await call('o', 'GET', `/api/projects/${p.id}/files`)).status, 200);
  assert.equal((await call('o', 'PUT', `/api/projects/${p.id}/file`, { path: 'z', content: '1' })).status, 403);
  assert.equal((await call('o', 'POST', `/api/projects/${p.id}/replace`, { find: 'a', replace: 'b' })).status, 403);
  assert.equal((await call('o', 'DELETE', `/api/projects/${p.id}`)).status, 403);
  assert.equal((await A('PUT', `/api/projects/${p.id}`, { name: 'Renomeado pelo admin' })).status, 200);
  // arquivar tira do ar e do acervo
  await M('POST', `/api/projects/${p.id}/publish`, { published: true });
  await M('PUT', `/api/projects/${p.id}`, { archived: true });
  assert.equal((await call('anon', 'GET', `/s/${p.slug}/`)).status, 404);
  assert.equal((await M('POST', `/api/projects/${p.id}/publish`, { published: true })).status, 400);
  list = (await M('GET', '/api/projects')).body; assert.equal(list.items.length, 0); assert.equal(list.stats.arquivados, 1);
  assert.equal((await M('GET', '/api/projects?status=arquivado')).body.items.length, 1);
  assert.equal((await M('POST', '/api/projects/optimize-prompt', { brief: 'um site para uma pizzaria' })).body.code, 'ai_not_configured');
});

test('busca global, créditos de prospecção e histórico de IA sem chave', async () => {
  const g = (await A('GET', '/api/search?q=Site')).body.groups.map((x) => x.label); assert.ok(g.includes('Vendas') && g.includes('Projetos e sites'));
  assert.deepEqual((await A('GET', '/api/search?q=a')).body.groups, []);
  assert.equal((await A('POST', '/api/integrations/prospect/search', { areas: [{ lat: -23.5, lng: -46.6, radius_km: 10 }] })).body.code, 'places_not_configured');
  assert.equal((await A('GET', '/api/integrations/prospect/credits')).body.credits, 100);
  assert.equal((await A('GET', '/api/integrations/ai/history?projectId=999')).status, 404);
});

test('Play: sugestões de aula com limite semanal, painel do admin e notificação', async () => {
  let s = (await M('GET', '/api/play/suggestions')).body; assert.equal(s.limit, 3); assert.equal(s.remaining, 3); assert.equal(s.items.length, 0);
  assert.equal((await M('POST', '/api/play/suggestions', { topic: 'x' })).status, 400);
  const ok = await M('POST', '/api/play/suggestions', { topic: 'Como precificar sites', outcome: 'Fechar 3 clientes' }); assert.equal(ok.status, 201); assert.equal(ok.body.remaining, 2);
  await M('POST', '/api/play/suggestions', { topic: 'Prospecção no Instagram' }); await M('POST', '/api/play/suggestions', { topic: 'Pós-venda' });
  const blocked = await M('POST', '/api/play/suggestions', { topic: 'Mais uma' }); assert.equal(blocked.status, 429); assert.equal(blocked.body.code, 'suggestion_limit');
  s = (await M('GET', '/api/play/suggestions')).body; assert.equal(s.remaining, 0); assert.equal(s.items.length, 3);
  // admin vê todos, o membro só os seus; só admin altera situação
  assert.equal((await A('GET', '/api/play/suggestions?all=1')).body.items.length, 3);
  assert.equal((await A('GET', '/api/play/suggestions')).body.items.length, 0);
  assert.equal((await M('PUT', `/api/play/suggestions/${s.items[0].id}`, { status: 'publicado' })).status, 403);
  assert.equal((await A('PUT', `/api/play/suggestions/${s.items[0].id}`, { status: 'inexistente' })).status, 400);
  assert.equal((await A('PUT', `/api/play/suggestions/${s.items[0].id}`, { status: 'em_analise' })).status, 200);
  assert.equal((await A('GET', '/api/me/notifications')).body.items.some((n) => /sugeriu uma aula/.test(n.text)), true);
  assert.equal((await A('DELETE', `/api/play/suggestions/${s.items[0].id}`)).status, 200);
});

test('Prospecção: histórico de buscas é por usuário e pode ser apagado', async () => {
  const me = (await dbGet("SELECT id FROM users WHERE email='m@x.com'")).id;
  const { run: dbRun } = require('../server/lib/db');
  await dbRun("INSERT INTO prospect_searches(user_id,query,location,areas,radius_km,found,qualified,delivered,no_site,potential) VALUES (?,?,?,?,?,?,?,?,?,?)", me, 'clínicas', 'Curitiba', '[{"lat":-25.4,"lng":-49.2,"radius_km":10}]', 10, 20, 8, 8, 5, 40);
  const mine = (await M('GET', '/api/integrations/prospect/searches')).body.items; assert.equal(mine.length, 1); assert.equal(mine[0].areas[0].lat, -25.4); assert.equal(mine[0].potential, 40);
  assert.equal((await A('GET', '/api/integrations/prospect/searches')).body.items.length, 0);
  await A('DELETE', `/api/integrations/prospect/searches/${mine[0].id}`); assert.equal((await M('GET', '/api/integrations/prospect/searches')).body.items.length, 1);
  await M('DELETE', `/api/integrations/prospect/searches/${mine[0].id}`); assert.equal((await M('GET', '/api/integrations/prospect/searches')).body.items.length, 0);
});
