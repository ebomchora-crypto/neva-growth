import { api } from '../api.js';
import { h, mount, toast, fail, hero, icon, confirmBox } from '../ui.js';

const LEAFLET = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4';
let leafletP;
function loadLeaflet() {
  leafletP ||= new Promise((resolve, reject) => {
    const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = LEAFLET + '/leaflet.css'; document.head.append(css);
    const s = document.createElement('script'); s.src = LEAFLET + '/leaflet.js'; s.onload = () => resolve(window.L); s.onerror = () => reject(new Error('Biblioteca de mapas indisponível (verifique a conexão).')); document.head.append(s);
  });
  return leafletP;
}
const MAX_AREAS = 3;

export default {
  async render(box, ctx) {
    const canWrite = ctx.user.role !== 'viewer';
    const [st, me] = await Promise.all([api.get('/integrations/status'), api.get('/me')]);
    const cfg = me.settings; let credits = me.user.credits;
    const S = { areas: [], radius: Number(cfg.prospect_radius_km) || 10, onlyNoSite: cfg.prospect_only_no_site === '1', minRating: Number(cfg.prospect_min_rating) || 0, items: [], found: 0, qualified: 0, potential: null };
    let L, map; const layers = { areas: [], pins: [] };
    const band = h('section', { class: 'rband' }), savedBox = h('section', { class: 'card savedbar' }); let saved = [];
    const info = h('div', { class: 'card pad' }), potential = h('div', { class: 'card pad' }), resBox = h('div'), credBox = h('span', { class: 'badge' });
    const mapEl = h('div', { id: 'map', role: 'application', 'aria-label': 'Mapa de prospecção' });

    function drawInfo() {
      credBox.textContent = 'Google Maps via Apify';
      mount(info, h('div', { class: 'kicker' }, 'Território'), h('b', { style: 'font-size:1.3rem' }, `${S.areas.length} área${S.areas.length === 1 ? '' : 's'} selecionada${S.areas.length === 1 ? '' : 's'}`, h('span', { class: 'sm mut' }, `  ${S.areas.length}/${MAX_AREAS}`)),
        h('div', { class: 'sm mut' }, S.items.length ? `${S.radius} km · ${S.qualified} qualificadas de ${S.found} encontradas` : `${S.radius} km por área · clique no mapa para marcar`));
      mount(potential, h('div', { class: 'kicker' }, 'Potencial do território'), h('b', { style: 'font-size:1.6rem' }, S.potential === null ? '—' : `${S.potential}%`), h('div', { class: 'sm mut' }, S.potential === null ? 'Aguardando sinais (faça uma busca)' : 'Parte das empresas encontradas que atende à sua qualificação'));
    }
    function redrawAreas() {
      layers.areas.forEach((l) => map.removeLayer(l)); layers.areas = [];
      S.areas.forEach((a, i) => {
        const c = L.circle([a.lat, a.lng], { radius: S.radius * 1000, color: '#2f7bbd', weight: 2, fillColor: '#4a95d2', fillOpacity: 0.12, dashArray: '6 6' }).addTo(map);
        const m = L.marker([a.lat, a.lng], { draggable: true, title: `Área ${i + 1} — arraste para mover` }).addTo(map).bindTooltip(`P${i + 1}`, { permanent: true, direction: 'top' });
        m.on('dragend', () => { const p = m.getLatLng(); a.lat = p.lat; a.lng = p.lng; c.setLatLng(p); });
        m.on('contextmenu', () => { S.areas.splice(i, 1); redrawAreas(); drawInfo(); });
        layers.areas.push(c, m);
      });
      drawInfo();
    }
    function drawPins() {
      layers.pins.forEach((l) => map.removeLayer(l)); layers.pins = [];
      S.items.filter((i) => i.lat != null).forEach((i) => layers.pins.push(L.circleMarker([i.lat, i.lng], { radius: 7, color: i.website ? '#5b7087' : '#1f9d6b', fillOpacity: 0.85 }).addTo(map).bindPopup(`<b>${esc(i.name)}</b><br>${esc(i.address || '')}<br>${esc(i.phone || '')}${i.website ? '<br>tem site' : '<br><b>sem site</b>'}`)));
    }
    const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    function drawResults() {
      drawBand();
      mount(resBox, !S.items.length ? h('div', { class: 'card emptyart radar' }, h('span', { class: 'eico' }, icon('binoculars')), h('b', 'O radar está pronto.'), 'Marque uma ou mais áreas no mapa; o segmento é opcional.') : h('div', { class: 'card', style: 'margin-top:14px' },
        h('div', { class: 'toolbar' }, h('b', `${S.items.length} resultado(s)`), h('span', { class: 'sm mut' }, `${S.found} encontradas · ${S.qualified} qualificadas${S.imported ? ` · ${S.imported} enviadas ao CRM automaticamente` : ''}${S.partial ? ' · busca parcial (limite de gasto/tempo atingido)' : ''}`), h('span', { class: 'grow' }),
          canWrite && h('button', { class: 'btn', onclick: importSel }, 'Enviar selecionados ao CRM')),
        S.items.map((i, n) => h('div', { class: 'resitem' }, h('input', { type: 'checkbox', checked: i.sel, disabled: i.exists, 'aria-label': `Selecionar ${i.name}`, onchange: (e) => { S.items[n].sel = e.target.checked; } }),
          h('div', { class: 'grow' }, h('b', i.name), i.exists && h('span', { class: 'badge', style: 'margin-left:6px' }, 'já está no CRM'), h('div', { class: 'sm mut' }, i.address || ''), h('div', { class: 'sm' }, [i.category, i.phone, i.rating ? `${i.rating} ★ (${i.reviews})` : null].filter(Boolean).join(' · ')), (i.email || i.instagram || i.whatsapp) && h('div', { class: 'sm contacts' }, i.email && h('a', { href: 'mailto:' + i.email }, i.email), i.instagram && h('a', { href: i.instagram, target: '_blank', rel: 'noopener noreferrer' }, 'Instagram'), i.whatsapp && h('a', { href: i.whatsapp, target: '_blank', rel: 'noopener noreferrer' }, 'WhatsApp'))),
          h('div', { class: 'sm nowrap' }, i.website ? h('a', { href: i.website, target: '_blank', rel: 'noopener noreferrer' }, 'site') : h('span', { class: 'badge ok' }, 'sem site'), ' ', i.maps_url && h('a', { href: i.maps_url, target: '_blank', rel: 'noopener noreferrer' }, 'mapa'))))));
    }
    async function importSel() {
      const rows = S.items.filter((i) => i.sel && !i.exists).map((i) => ({ name: i.name, phone: i.phone, email: i.email, website: i.website, source: 'Prospecção (Google Maps)', notes: [i.category, i.address, i.instagram, i.maps_url].filter(Boolean).join(' · ') }));
      if (!rows.length) return toast('Selecione ao menos um resultado novo.', 'err');
      try { const r = await api.post('/leads/import', { rows }); toast(`${r.created} oportunidade(s) criada(s) no CRM.`, 'ok'); S.items.forEach((i) => { if (i.sel) { i.exists = true; i.sel = false; } }); drawResults(); } catch (e) { fail(e); }
    }
    async function geocode(q) {
      const r = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&accept-language=pt-BR&q=${encodeURIComponent(q)}`);
      if (!r.ok) throw new Error('Não foi possível localizar o endereço agora.'); const d = await r.json(); if (!d.length) throw new Error('Local não encontrado.'); return d[0];
    }
    const seg = h('input', { name: 'query', placeholder: 'Clínicas, restaurantes, academias…', 'aria-label': 'Segmento' });
    const loc = h('input', { name: 'location', placeholder: 'Cidade, bairro ou estado', 'aria-label': 'Localidade' });
    const goInput = h('input', { placeholder: 'Busque cidade, bairro ou endereço', 'aria-label': 'Explorar o mapa' });
    const radiusV = h('b', `${S.radius} km`);
    const radius = h('input', { type: 'range', min: 1, max: 50, value: S.radius, 'aria-label': 'Raio das áreas', oninput: () => { S.radius = Number(radius.value); radiusV.textContent = S.radius + ' km'; redrawAreas(); } });
    // a busca roda na Apify; aqui só acompanhamos o andamento até os resultados ficarem prontos
    async function follow(id) {
      const t0 = Date.now();
      for (;;) {
        const r = await api.get('/integrations/prospect/search/' + id);
        if (r.status === 'done') return showResult(r);
        if (r.status === 'failed') throw new Error(r.error || 'A busca falhou.');
        const sec = Math.round((Date.now() - t0) / 1000);
        searchBtn.textContent = `Buscando no Google Maps… ${r.found || 0} empresa(s) · ${sec}s`;
        await new Promise((ok) => setTimeout(ok, 4000));
      }
    }
    function showResult(r) {
      Object.assign(S, { items: r.items.map((i) => ({ ...i, sel: !i.exists })), found: r.found, qualified: r.qualified, noSite: r.noSite, potential: r.potential, imported: r.imported, partial: r.partial });
      drawPins(); drawInfo(); drawResults(); loadSaved();
      if (!r.items.length) toast('Nenhum resultado atende à qualificação.'); else if (r.imported) toast(`${r.imported} empresa(s) enviada(s) ao CRM automaticamente.`, 'ok');
      const pts = S.items.filter((i) => i.lat != null).map((i) => [i.lat, i.lng]); if (pts.length) map.fitBounds(pts, { padding: [30, 30], maxZoom: 15 });
    }
    const searchBtn = h('button', { class: 'btn', disabled: !st.places.configured || !canWrite, onclick: async () => {
      if (!S.areas.length && !loc.value.trim()) return toast('Marque ao menos uma área no mapa ou informe a localidade.', 'err');
      searchBtn.disabled = true; searchBtn.textContent = 'Iniciando busca…';
      try {
        const st0 = await api.post('/integrations/prospect/search', { query: seg.value, location: loc.value, areas: S.areas.map((a) => ({ lat: a.lat, lng: a.lng, radius_km: S.radius })), onlyNoSite: S.onlyNoSite, minRating: S.minRating });
        loadSaved(); await follow(st0.id);
      } catch (e) { fail(e); } finally { searchBtn.disabled = !st.places.configured; searchBtn.textContent = 'Buscar empresas'; }
    } }, 'Buscar empresas');
    const rating = h('select', { 'aria-label': 'Nota mínima', onchange: () => { S.minRating = Number(rating.value); } }, [0, 3, 3.5, 4, 4.5].map((v) => h('option', { value: v, selected: v === S.minRating }, v ? `${v}+ ★` : 'Qualquer nota')));
    const nosite = h('input', { type: 'checkbox', checked: S.onlyNoSite, onchange: () => { S.onlyNoSite = nosite.checked; } });

    function drawBand() {
      mount(band, h('div', { class: 'rb-l' }, h('span', { class: 'rb-i' }, icon('target')), h('div', h('div', { class: 'k' }, '/ Radar de oportunidades'), h('h2', 'Oportunidades capturadas'), h('p', 'Priorizadas por aderência comercial e presença digital.'))),
        h('div', { class: 'rb-s' }, [['Mapeados', S.found], ['Alta aderência', S.qualified], ['Sem website', S.noSite || 0]].map(([l, v]) => h('div', h('b', String(v)), h('small', l)))));
    }
    async function loadSaved() { try { saved = (await api.get('/integrations/prospect/searches')).items; } catch { saved = []; } drawSaved(); }
    function drawSaved() {
      const strip = h('div', { class: 'strip' }, saved.length ? saved.map((x) => h('div', { class: 'sv' }, h('div', h('b', x.query || 'Áreas no mapa'), h('small', ` ${x.location || `${x.areas.length} área(s)`}`)),
        h('small', { class: 'mut' }, `${new Date(String(x.created_at).replace(' ', 'T') + 'Z').toLocaleDateString('pt-BR')} · ${x.delivered} entregue(s) · ${x.potential ?? 0}% potencial`),
        h('div', { class: 'row' }, x.status === 'done' && x.delivered > 0 && h('button', { class: 'btn sm', onclick: async () => { try { showResult(await api.get('/integrations/prospect/search/' + x.id)); } catch (e) { fail(e); } } }, 'Ver resultados'), x.status === 'running' && h('button', { class: 'btn sm', onclick: () => follow(x.id).catch(fail) }, 'Acompanhar'), h('button', { class: 'btn ghost sm', onclick: () => reuse(x) }, 'Reusar parâmetros'), h('button', { class: 'btn ghost sm', 'aria-label': 'Excluir busca salva', onclick: async () => { if (!(await confirmBox('Excluir esta busca salva?'))) return; try { await api.del('/integrations/prospect/searches/' + x.id); loadSaved(); } catch (e) { fail(e); } } }, '✕')))) : h('div', { class: 'mut sm', style: 'padding:14px' }, 'Suas buscas aparecem aqui depois da primeira prospecção.'));
      mount(savedBox, h('div', { class: 'sb-l' }, h('span', { class: 'rb-i red' }, icon('archive')), h('div', h('b', 'Buscas salvas'), h('small', 'Seu histórico de prospecções')), h('span', { class: 'cnt2' }, String(saved.length).padStart(2, '0'))),
        h('div', { class: 'sb-r' }, h('div', { class: 'sb-h' }, h('span', { class: 'k' }, 'Biblioteca'), h('small', 'Mais recentes primeiro'), h('span', { class: 'grow' }),
          h('button', { class: 'iconbtn', 'aria-label': 'Anteriores', onclick: () => strip.scrollBy({ left: -280, behavior: 'smooth' }) }, '‹'), h('button', { class: 'iconbtn', 'aria-label': 'Próximas', onclick: () => strip.scrollBy({ left: 280, behavior: 'smooth' }) }, '›')), strip));
    }
    function reuse(x) {
      seg.value = x.query || ''; loc.value = x.location || ''; S.areas = x.areas.map((a) => ({ lat: a.lat, lng: a.lng })); if (x.radius_km) { S.radius = Number(x.radius_km); radius.value = S.radius; radiusV.textContent = S.radius + ' km'; }
      nosite.checked = S.onlyNoSite = !!x.only_no_site; S.minRating = Number(x.min_rating) || 0; rating.value = S.minRating; redrawAreas();
      if (S.areas.length) map.setView([S.areas[0].lat, S.areas[0].lng], 11); toast('Parâmetros carregados. Ajuste e busque quando quiser.', 'ok');
    }

    mount(box, hero({ kicker: 'Neva Growth / Prospecção', title: 'Encontre empresas pelo mapa.', art: 'prospect', subtitle: 'Marque até 3 áreas, defina o raio e filtre por empresas sem site. Resultados vão direto para o CRM. Cada empresa entregue consome 1 crédito.', actions: [credBox] }),
      !st.places.configured && h('div', { class: 'notice', style: 'margin-bottom:14px' }, h('b', 'Busca de empresas não configurada. '), `Preencha ${st.places.envVar} na tabela app_settings do banco (Supabase → Table Editor). O mapa já permite marcar as áreas.`),
      h('div', { class: 'hunter' }, h('div', { class: 'stack' },
        h('div', { class: 'step stack' }, h('div', { class: 'n' }, '01 · Defina o alvo'), h('label', { class: 'field' }, h('span', 'Segmento (opcional com áreas marcadas)'), seg), h('label', { class: 'field' }, h('span', 'Localidade'), loc), h('div', { class: 'sm mut' }, 'Com áreas no mapa, a busca considera somente os pins; sem áreas, usa a localidade.')),
        h('div', { class: 'step stack' }, h('div', { class: 'n' }, '02 · Qualificação'), h('label', { class: 'row' }, nosite, 'Somente empresas sem site'), h('label', { class: 'field' }, h('span', 'Nota mínima'), rating)),
        h('div', { class: 'step stack' }, h('div', { class: 'n' }, '03 · Território'), h('div', { class: 'range' }, h('span', 'Raio das áreas'), radius, radiusV), h('div', { class: 'sm mut' }, 'Clique no mapa para adicionar uma área (máx. 3). Arraste o pino para mover; clique com o botão direito para remover.'),
          h('div', { class: 'row' }, h('button', { class: 'btn ghost sm', onclick: () => { S.areas = []; redrawAreas(); } }, 'Limpar áreas'))), searchBtn),
        h('div', { class: 'stack' }, h('div', { class: 'grid g2' }, info, potential), h('div', { class: 'row' }, goInput, h('button', { class: 'btn ghost', onclick: async () => { try { const d = await geocode(goInput.value); map.setView([Number(d.lat), Number(d.lon)], 12); } catch (e) { fail(e); } } }, 'Ir ao local')), mapEl)), band, savedBox, resBox);
    try { L = await loadLeaflet(); } catch (e) { mount(mapEl, h('div', { class: 'empty' }, e.message)); return; }
    map = L.map(mapEl).setView([-14.2, -51.9], 4);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, referrerPolicy: 'origin', attribution: '&copy; contribuidores do OpenStreetMap' }).addTo(map);
    map.on('click', (e) => { if (S.areas.length >= MAX_AREAS) return toast(`Máximo de ${MAX_AREAS} áreas. Remova uma (botão direito no pino).`, 'err'); S.areas.push({ lat: e.latlng.lat, lng: e.latlng.lng }); redrawAreas(); });
    drawInfo(); drawResults(); loadSaved();
    return () => { try { map.remove(); } catch { /* ok */ } };
  }
};
