import { api } from '../api.js';
import { h, mount, toast, fail, hero } from '../ui.js';

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
    const info = h('div', { class: 'card pad' }), potential = h('div', { class: 'card pad' }), resBox = h('div'), credBox = h('span', { class: 'badge' });
    const mapEl = h('div', { id: 'map', role: 'application', 'aria-label': 'Mapa de prospecção' });

    function drawInfo() {
      credBox.textContent = `${credits} crédito(s)`;
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
      mount(resBox, !S.items.length ? null : h('div', { class: 'card', style: 'margin-top:14px' },
        h('div', { class: 'toolbar' }, h('b', `${S.items.length} resultado(s)`), h('span', { class: 'sm mut' }, `${S.found} encontradas · ${S.qualified} qualificadas${S.truncated ? ' · limitado pelo seu saldo de créditos' : ''}`), h('span', { class: 'grow' }),
          canWrite && h('button', { class: 'btn', onclick: importSel }, 'Enviar selecionados ao CRM')),
        S.items.map((i, n) => h('div', { class: 'resitem' }, h('input', { type: 'checkbox', checked: i.sel, disabled: i.exists, 'aria-label': `Selecionar ${i.name}`, onchange: (e) => { S.items[n].sel = e.target.checked; } }),
          h('div', { class: 'grow' }, h('b', i.name), i.exists && h('span', { class: 'badge', style: 'margin-left:6px' }, 'já está no CRM'), h('div', { class: 'sm mut' }, i.address || ''), h('div', { class: 'sm' }, [i.phone, i.rating ? `${i.rating} ★ (${i.reviews})` : null].filter(Boolean).join(' · '))),
          h('div', { class: 'sm nowrap' }, i.website ? h('a', { href: i.website, target: '_blank', rel: 'noopener noreferrer' }, 'site') : h('span', { class: 'badge ok' }, 'sem site'), ' ', i.maps_url && h('a', { href: i.maps_url, target: '_blank', rel: 'noopener noreferrer' }, 'mapa'))))));
    }
    async function importSel() {
      const rows = S.items.filter((i) => i.sel && !i.exists).map((i) => ({ name: i.name, phone: i.phone, website: i.website, source: 'Prospecção (Google Places)', notes: [i.address, i.maps_url].filter(Boolean).join(' · ') }));
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
    const searchBtn = h('button', { class: 'btn', disabled: !st.places.configured || !canWrite, onclick: async () => {
      if (!S.areas.length && !loc.value.trim()) return toast('Marque ao menos uma área no mapa ou informe a localidade.', 'err');
      searchBtn.disabled = true; searchBtn.textContent = 'Buscando…';
      try {
        const r = await api.post('/integrations/prospect/search', { query: seg.value, location: loc.value, areas: S.areas.map((a) => ({ lat: a.lat, lng: a.lng, radius_km: S.radius })), onlyNoSite: S.onlyNoSite, minRating: S.minRating });
        Object.assign(S, { items: r.items.map((i) => ({ ...i, sel: !i.exists })), found: r.found, qualified: r.qualified, potential: r.potential, truncated: r.truncated }); credits = r.credits;
        drawPins(); drawInfo(); drawResults(); if (!r.items.length) toast('Nenhum resultado atende à qualificação.');
        const pts = S.items.filter((i) => i.lat != null).map((i) => [i.lat, i.lng]); if (pts.length) map.fitBounds(pts, { padding: [30, 30], maxZoom: 15 });
      } catch (e) { fail(e); } finally { searchBtn.disabled = !st.places.configured; searchBtn.textContent = 'Buscar empresas'; }
    } }, 'Buscar empresas');
    const rating = h('select', { 'aria-label': 'Nota mínima', onchange: () => { S.minRating = Number(rating.value); } }, [0, 3, 3.5, 4, 4.5].map((v) => h('option', { value: v, selected: v === S.minRating }, v ? `${v}+ ★` : 'Qualquer nota')));
    const nosite = h('input', { type: 'checkbox', checked: S.onlyNoSite, onchange: () => { S.onlyNoSite = nosite.checked; } });

    mount(box, hero({ kicker: 'Neva Growth / Prospecção', title: 'Encontre empresas pelo mapa.', subtitle: 'Marque até 3 áreas, defina o raio e filtre por empresas sem site. Resultados vão direto para o CRM. Cada empresa entregue consome 1 crédito.', actions: [credBox] }),
      !st.places.configured && h('div', { class: 'notice', style: 'margin-bottom:14px' }, h('b', 'Busca de empresas não configurada. '), `Defina ${st.places.envVar} (Google Places API) no servidor e reinicie. O mapa já permite marcar as áreas.`),
      h('div', { class: 'hunter' }, h('div', { class: 'stack' },
        h('div', { class: 'step stack' }, h('div', { class: 'n' }, '01 · Defina o alvo'), h('label', { class: 'field' }, h('span', 'Segmento (opcional com áreas marcadas)'), seg), h('label', { class: 'field' }, h('span', 'Localidade'), loc), h('div', { class: 'sm mut' }, 'Com áreas no mapa, a busca considera somente os pins; sem áreas, usa a localidade.')),
        h('div', { class: 'step stack' }, h('div', { class: 'n' }, '02 · Qualificação'), h('label', { class: 'row' }, nosite, 'Somente empresas sem site'), h('label', { class: 'field' }, h('span', 'Nota mínima'), rating)),
        h('div', { class: 'step stack' }, h('div', { class: 'n' }, '03 · Território'), h('div', { class: 'range' }, h('span', 'Raio das áreas'), radius, radiusV), h('div', { class: 'sm mut' }, 'Clique no mapa para adicionar uma área (máx. 3). Arraste o pino para mover; clique com o botão direito para remover.'),
          h('div', { class: 'row' }, h('button', { class: 'btn ghost sm', onclick: () => { S.areas = []; redrawAreas(); } }, 'Limpar áreas'))), searchBtn),
        h('div', { class: 'stack' }, h('div', { class: 'grid g2' }, info, potential), h('div', { class: 'row' }, goInput, h('button', { class: 'btn ghost', onclick: async () => { try { const d = await geocode(goInput.value); map.setView([Number(d.lat), Number(d.lon)], 12); } catch (e) { fail(e); } } }, 'Ir ao local')), mapEl, resBox)));
    try { L = await loadLeaflet(); } catch (e) { mount(mapEl, h('div', { class: 'empty' }, e.message)); return; }
    map = L.map(mapEl).setView([-14.2, -51.9], 4);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; contribuidores do OpenStreetMap' }).addTo(map);
    map.on('click', (e) => { if (S.areas.length >= MAX_AREAS) return toast(`Máximo de ${MAX_AREAS} áreas. Remova uma (botão direito no pino).`, 'err'); S.areas.push({ lat: e.latlng.lat, lng: e.latlng.lng }); redrawAreas(); });
    drawInfo(); drawResults();
    return () => { try { map.remove(); } catch { /* ok */ } };
  }
};
