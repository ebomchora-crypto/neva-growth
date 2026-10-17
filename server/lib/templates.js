// Geradores originais de projetos (sites, aplicações e sistemas). Sem dependência de IA.
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const hex = (c, d = '#3b82c4') => (/^#[0-9a-f]{6}$/i.test(c || '') ? c : d);

const SECTION_LIBRARY = {
  beneficios: { title: 'Por que escolher', items: ['Atendimento próximo', 'Resultados mensuráveis', 'Processo transparente'] },
  servicos: { title: 'Serviços', items: ['Diagnóstico inicial', 'Plano personalizado', 'Acompanhamento contínuo'] },
  depoimentos: { title: 'Quem já confiou', items: ['“Equipe atenciosa e eficiente.”', '“Superou nossas expectativas.”', '“Voltaremos a contratar.”'] },
  faq: { title: 'Perguntas frequentes', items: ['Como funciona?|Você entra em contato e montamos um plano.', 'Quanto tempo leva?|Depende do escopo; informamos o prazo na proposta.'] },
  contato: { title: 'Fale conosco', items: [] }
};

function siteFiles({ name, tagline, description, sections = ['beneficios', 'servicos', 'depoimentos', 'contato'], color, whatsapp, email }) {
  const c = hex(color);
  const body = sections.filter((s) => SECTION_LIBRARY[s]).map((key) => {
    const s = SECTION_LIBRARY[key];
    if (key === 'contato') return `<section id="contato" class="sec alt"><div class="wrap"><h2>${s.title}</h2>
  <p class="lead">Envie uma mensagem e retornamos em breve.</p>
  <form id="contact" class="card form"><input name="nome" placeholder="Seu nome" required><input name="email" type="email" placeholder="Seu e-mail" required>
  <textarea name="msg" rows="4" placeholder="Como podemos ajudar?" required></textarea><button class="btn" type="submit">Enviar mensagem</button><p id="ok" hidden>Mensagem preparada! ${email ? 'Abrimos seu app de e-mail.' : ''}</p></form></div></section>`;
    if (key === 'faq') return `<section id="faq" class="sec"><div class="wrap"><h2>${s.title}</h2>${s.items.map((i) => { const [q, a] = i.split('|'); return `<details class="card"><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`; }).join('')}</div></section>`;
    return `<section id="${key}" class="sec${key === 'depoimentos' ? ' alt' : ''}"><div class="wrap"><h2>${s.title}</h2><div class="grid">${s.items.map((i) => `<article class="card"><p>${esc(i)}</p></article>`).join('')}</div></div></section>`;
  }).join('\n');
  const nav = sections.filter((s) => SECTION_LIBRARY[s]).map((s) => `<a href="#${s}">${SECTION_LIBRARY[s].title}</a>`).join('');
  return {
    'index.html': `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(name)}</title><meta name="description" content="${esc(description || tagline)}">
<link rel="stylesheet" href="style.css"></head><body>
<header class="top"><div class="wrap bar"><strong class="logo">${esc(name)}</strong><nav>${nav}</nav>${whatsapp ? `<a class="btn sm" href="https://wa.me/${esc(String(whatsapp).replace(/\D/g, ''))}">WhatsApp</a>` : ''}</div></header>
<main><section class="hero"><div class="wrap"><h1>${esc(tagline || name)}</h1><p class="lead">${esc(description || '')}</p>
<a class="btn" href="#contato">Começar agora</a></div></section>
${body}</main>
<footer class="foot"><div class="wrap">© <span id="y"></span> ${esc(name)}. Todos os direitos reservados.</div></footer>
<script src="main.js"></script></body></html>`,
    'style.css': `:root{--c:${c};--bg:#f7fbff;--ink:#0f2236;--mut:#5b7087;--line:#dbe8f5}
*{box-sizing:border-box}body{margin:0;font-family:system-ui,sans-serif;color:var(--ink);background:#fff;line-height:1.6}
.wrap{max-width:1040px;margin:0 auto;padding:0 20px}.top{position:sticky;top:0;background:#ffffffd9;backdrop-filter:blur(8px);border-bottom:1px solid var(--line);z-index:5}
.bar{display:flex;align-items:center;gap:20px;height:64px}.logo{color:var(--c);font-size:1.15rem}nav{display:flex;gap:18px;margin-left:auto}nav a{color:var(--mut);text-decoration:none;font-size:.95rem}nav a:hover{color:var(--c)}
.hero{padding:96px 0;background:linear-gradient(180deg,var(--bg),#fff)}h1{font-size:clamp(2rem,5vw,3.4rem);line-height:1.1;margin:0 0 16px;max-width:18ch}
.lead{color:var(--mut);font-size:1.1rem;max-width:60ch}.btn{display:inline-block;background:var(--c);color:#fff;border:0;padding:12px 22px;border-radius:10px;font:inherit;text-decoration:none;cursor:pointer}.btn.sm{padding:8px 14px}
.sec{padding:72px 0}.alt{background:var(--bg)}h2{margin:0 0 24px;font-size:1.7rem}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:16px}
.card{background:#fff;border:1px solid var(--line);border-radius:14px;padding:20px;margin-bottom:12px}.form{display:grid;gap:12px;max-width:520px}
input,textarea{font:inherit;padding:12px;border:1px solid var(--line);border-radius:10px;width:100%}.foot{padding:28px 0;color:var(--mut);border-top:1px solid var(--line);font-size:.9rem}
@media(max-width:700px){nav{display:none}.hero{padding:56px 0}}`,
    'main.js': `document.getElementById('y').textContent = new Date().getFullYear();
const form = document.getElementById('contact');
if (form) form.addEventListener('submit', (e) => {
  e.preventDefault();
  const d = Object.fromEntries(new FormData(form));
  ${email ? `location.href = 'mailto:${esc(email)}?subject=' + encodeURIComponent('Contato de ' + d.nome) + '&body=' + encodeURIComponent(d.msg + '\\n\\n' + d.email);` : ''}
  document.getElementById('ok').hidden = false; form.reset();
});`
  };
}

function appFiles({ name, description, color }) {
  const c = hex(color);
  return {
    'index.html': `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(name)}</title><link rel="stylesheet" href="style.css"></head><body>
<main class="app"><h1>${esc(name)}</h1><p class="mut">${esc(description || 'Lista de tarefas com persistência local.')}</p>
<form id="f"><input id="t" placeholder="Nova tarefa…" required autocomplete="off"><button>Adicionar</button></form>
<ul id="list"></ul><p class="mut" id="count"></p></main><script src="app.js"></script></body></html>`,
    'style.css': `body{margin:0;font-family:system-ui,sans-serif;background:#f4f9ff;color:#0f2236}.app{max-width:520px;margin:48px auto;padding:24px;background:#fff;border:1px solid #dbe8f5;border-radius:16px}
h1{margin:0 0 4px;color:${c}}.mut{color:#5b7087}form{display:flex;gap:8px;margin:16px 0}input{flex:1;padding:10px;border:1px solid #dbe8f5;border-radius:8px;font:inherit}
button{background:${c};color:#fff;border:0;border-radius:8px;padding:10px 16px;cursor:pointer}ul{list-style:none;padding:0}li{display:flex;gap:10px;align-items:center;padding:10px 0;border-bottom:1px solid #eef4fb}
li.done span{text-decoration:line-through;color:#8aa0b6}li span{flex:1}li button{background:transparent;color:#c0392b;padding:4px 8px}`,
    'app.js': `const KEY = 'tasks:${name.toLowerCase().replace(/\W+/g, '-')}';
let items = []; try { items = JSON.parse(localStorage.getItem(KEY)) || []; } catch {}
const $ = (id) => document.getElementById(id);
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(items)); } catch {} render(); };
function render() {
  $('list').innerHTML = '';
  items.forEach((it, i) => {
    const li = document.createElement('li'); li.className = it.done ? 'done' : '';
    const cb = Object.assign(document.createElement('input'), { type: 'checkbox', checked: it.done });
    cb.onchange = () => { it.done = cb.checked; save(); };
    const sp = document.createElement('span'); sp.textContent = it.text;
    const del = document.createElement('button'); del.textContent = '✕'; del.onclick = () => { items.splice(i, 1); save(); };
    li.append(cb, sp, del); $('list').append(li);
  });
  $('count').textContent = items.filter((x) => !x.done).length + ' pendente(s) de ' + items.length;
}
$('f').onsubmit = (e) => { e.preventDefault(); items.push({ text: $('t').value.trim(), done: false }); $('t').value = ''; save(); };
render();`
  };
}

function systemFiles({ name, description, color }) {
  const c = hex(color);
  return {
    'index.html': `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(name)}</title><link rel="stylesheet" href="style.css"></head><body>
<aside><h2>${esc(name)}</h2><nav id="nav"></nav></aside>
<main><header><h1 id="title"></h1><button id="new">+ Novo registro</button></header>
<input id="q" placeholder="Buscar…"><table><thead id="head"></thead><tbody id="rows"></tbody></table>
<dialog id="dlg"><form method="dialog" id="form"></form></dialog></main>
<script src="schema.js"></script><script src="app.js"></script></body></html>`,
    'schema.js': `// Edite aqui as entidades do seu sistema. A interface de CRUD é gerada a partir deste esquema.
window.SCHEMA = {
  clientes: { label: 'Clientes', fields: [{ k: 'nome', l: 'Nome', req: true }, { k: 'email', l: 'E-mail', type: 'email' }, { k: 'telefone', l: 'Telefone' }] },
  pedidos: { label: 'Pedidos', fields: [{ k: 'descricao', l: 'Descrição', req: true }, { k: 'valor', l: 'Valor', type: 'number' }, { k: 'status', l: 'Status', type: 'select', opts: ['aberto', 'pago', 'cancelado'] }] }
};`,
    'style.css': `*{box-sizing:border-box}body{margin:0;display:grid;grid-template-columns:220px 1fr;min-height:100vh;font-family:system-ui,sans-serif;background:#f4f9ff;color:#0f2236}
aside{background:#fff;border-right:1px solid #dbe8f5;padding:20px}aside h2{margin:0 0 16px;color:${c}}nav button{display:block;width:100%;text-align:left;background:none;border:0;padding:10px;border-radius:8px;cursor:pointer;font:inherit}
nav button.on,nav button:hover{background:#e8f2fc;color:${c}}main{padding:24px}header{display:flex;justify-content:space-between;align-items:center}h1{margin:0}
button#new,dialog button{background:${c};color:#fff;border:0;border-radius:8px;padding:10px 16px;cursor:pointer}input,select{padding:10px;border:1px solid #dbe8f5;border-radius:8px;font:inherit;width:100%;margin:6px 0}
#q{max-width:320px;margin:16px 0}table{width:100%;background:#fff;border-collapse:collapse;border-radius:12px;overflow:hidden;border:1px solid #dbe8f5}th,td{padding:10px 14px;text-align:left;border-bottom:1px solid #eef4fb}
td button{background:none;color:#c0392b;padding:2px 8px}dialog{border:1px solid #dbe8f5;border-radius:14px;min-width:min(420px,90vw)}label{font-size:.85rem;color:#5b7087}
@media(max-width:700px){body{grid-template-columns:1fr}aside{border-right:0;border-bottom:1px solid #dbe8f5}}`,
    'app.js': `const S = window.SCHEMA; let cur = Object.keys(S)[0];
const mem = {}; // fallback quando o navegador bloqueia localStorage (ex.: preview em sandbox)
const load = (e) => { try { return JSON.parse(localStorage.getItem('db:' + e)) || []; } catch { return mem[e] || []; } };
const store = (e, v) => { mem[e] = v; try { localStorage.setItem('db:' + e, JSON.stringify(v)); } catch {} };
const $ = (id) => document.getElementById(id);
function nav() {
  $('nav').innerHTML = '';
  for (const k in S) { const b = document.createElement('button'); b.textContent = S[k].label; b.className = k === cur ? 'on' : ''; b.onclick = () => { cur = k; render(); }; $('nav').append(b); }
}
function render() {
  nav(); const sc = S[cur]; $('title').textContent = sc.label; const q = $('q').value.toLowerCase();
  $('head').innerHTML = '<tr>' + sc.fields.map((f) => '<th>' + f.l + '</th>').join('') + '<th></th></tr>';
  const rows = load(cur).filter((r) => !q || JSON.stringify(r).toLowerCase().includes(q));
  $('rows').innerHTML = '';
  rows.forEach((r) => {
    const tr = document.createElement('tr');
    sc.fields.forEach((f) => { const td = document.createElement('td'); td.textContent = r[f.k] ?? ''; tr.append(td); });
    const td = document.createElement('td');
    const ed = document.createElement('button'); ed.textContent = 'Editar'; ed.style.color = '${c}'; ed.onclick = () => openForm(r);
    const del = document.createElement('button'); del.textContent = 'Excluir'; del.onclick = () => { store(cur, load(cur).filter((x) => x.id !== r.id)); render(); };
    td.append(ed, del); tr.append(td); $('rows').append(tr);
  });
}
function openForm(rec) {
  const sc = S[cur]; const f = $('form'); f.innerHTML = '<h3>' + (rec ? 'Editar' : 'Novo') + ' registro</h3>';
  sc.fields.forEach((fl) => {
    const lab = document.createElement('label'); lab.textContent = fl.l;
    let inp; if (fl.type === 'select') { inp = document.createElement('select'); fl.opts.forEach((o) => inp.add(new Option(o, o))); } else { inp = document.createElement('input'); inp.type = fl.type || 'text'; }
    inp.name = fl.k; inp.required = !!fl.req; inp.value = rec?.[fl.k] ?? ''; lab.append(inp); f.append(lab);
  });
  const ok = document.createElement('button'); ok.textContent = 'Salvar'; f.append(ok);
  f.onsubmit = () => {
    const data = Object.fromEntries(new FormData(f)); const list = load(cur);
    if (rec) Object.assign(list.find((x) => x.id === rec.id), data); else list.push({ id: Date.now(), ...data });
    store(cur, list); render();
  };
  $('dlg').showModal();
}
$('new').onclick = () => openForm(null); $('q').oninput = render; render();`
  };
}

const KINDS = { site: siteFiles, app: appFiles, system: systemFiles };
function blankFiles({ name }) {
  return { 'index.html': `<!doctype html>\n<html lang="pt-BR">\n<head>\n  <meta charset="utf-8">\n  <title>${esc(name)}</title>\n  <link rel="stylesheet" href="style.css">\n</head>\n<body>\n  <h1>${esc(name)}</h1>\n  <script src="main.js"></script>\n</body>\n</html>`, 'style.css': 'body { font-family: system-ui, sans-serif; margin: 2rem; }\n', 'main.js': "console.log('Olá, mundo!');\n" };
}
function generate(kind, input) { return (input.blank ? blankFiles : KINDS[kind] || siteFiles)(input); }
module.exports = { generate, SECTION_LIBRARY, KINDS: Object.keys(KINDS) };
