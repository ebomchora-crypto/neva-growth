import { h, icon } from './ui.js';

const DEFAULT_VIDEO = 'MX-iaTDEyGI';
const VIDEO_KEY = 'neva-music-video';
const VOLUME_KEY = 'neva-music-volume';
const YOUTUBE_ORIGIN = 'https://www.youtube-nocookie.com';

function videoId(link) {
  try {
    const url = new URL(link.trim());
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    const host = url.hostname.toLowerCase().replace(/^www\./, '');
    let id;
    if (host === 'youtu.be') id = url.pathname.split('/')[1];
    else if (['youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtube-nocookie.com'].includes(host)) {
      id = url.pathname === '/watch' ? url.searchParams.get('v') : url.pathname.match(/^\/(?:embed|shorts|live)\/([^/]+)/)?.[1];
    }
    return /^[A-Za-z0-9_-]{11}$/.test(id || '') ? id : null;
  } catch { return null; }
}

const saved = (key, fallback) => { try { return localStorage.getItem(key) || fallback; } catch { return fallback; } };
const save = (key, value) => { try { localStorage.setItem(key, value); } catch { /* armazenamento indisponível */ } };

export function musicPlayer() {
  const storedVideo = saved(VIDEO_KEY, '');
  let current = /^[A-Za-z0-9_-]{11}$/.test(storedVideo) ? storedVideo : DEFAULT_VIDEO;
  let volume = Math.max(0, Math.min(100, Number(saved(VOLUME_KEY, '55')) || 0));
  let frame = null; let ready = false; let playing = false; let opened = false;
  const status = h('span', { class: 'music-status', role: 'status' }, 'Escolha uma música e aperte Tocar.');
  const frameBox = h('div', { class: 'music-video' });
  const playButton = h('button', { type: 'button', class: 'music-play', disabled: true, 'aria-label': 'Tocar música' }, icon('play'), h('span', 'Tocar'));
  const volumeInput = h('input', { type: 'range', min: 0, max: 100, value: volume, 'aria-label': 'Volume da música' });
  const volumeValue = h('output', { class: 'music-volume-value' }, `${volume}%`);
  const paint = () => { volumeInput.style.setProperty('--p', volume + '%'); volumeValue.classList.remove('pop'); void volumeValue.offsetWidth; volumeValue.classList.add('pop'); volumeInput.closest('.music-volume')?.classList.toggle('muted', volume === 0); };
  volumeInput.style.setProperty('--p', volume + '%');
  const linkInput = h('input', { type: 'url', inputmode: 'url', placeholder: 'Cole um link do YouTube', 'aria-label': 'Link de outra música do YouTube' });
  const linkError = h('small', { class: 'music-error', role: 'alert', hidden: true });
  const external = h('a', { href: `https://www.youtube.com/watch?v=${current}`, target: '_blank', rel: 'noopener noreferrer' }, 'Abrir no YouTube', icon('arrow'));
  const panel = h('section', { class: 'music-panel', role: 'dialog', 'aria-label': 'Controles de música', 'aria-hidden': 'true', inert: true },
    h('div', { class: 'music-head' }, h('div', h('b', 'Música do site'), h('small', 'YouTube · toca enquanto você navega')), h('button', { type: 'button', class: 'music-close', 'aria-label': 'Fechar controles de música' }, '×')),
    frameBox,
    h('div', { class: 'music-actions' }, playButton, external),
    h('label', { class: 'music-volume' }, h('span', 'Volume'), volumeInput, volumeValue),
    h('form', { class: 'music-change' }, h('label', { for: 'music-link' }, 'Trocar música'), h('div', linkInput, h('button', { type: 'submit' }, 'Usar link')), linkError),
    status);
  linkInput.id = 'music-link';
  const toggle = h('button', { type: 'button', class: 'iconbtn music-toggle', title: 'Música do site', 'aria-label': 'Abrir controles de música', 'aria-expanded': 'false' },
    icon('music'), h('span', { class: 'music-eq', 'aria-hidden': 'true' }, h('i'), h('i'), h('i')));
  const root = h('div', { class: 'music-widget' }, toggle, panel);

  const send = (func, args = []) => frame?.contentWindow?.postMessage(JSON.stringify({ event: 'command', func, args }), YOUTUBE_ORIGIN);
  const syncPlay = () => { playButton.replaceChildren(icon(playing ? 'pause' : 'play'), h('span', playing ? 'Pausar' : 'Tocar')); playButton.setAttribute('aria-label', playing ? 'Pausar música' : 'Tocar música'); toggle.classList.toggle('playing', playing); };
  const loadVideo = () => {
    ready = false; playing = false; syncPlay(); playButton.disabled = true;
    status.textContent = 'Carregando vídeo…';
    const src = `${YOUTUBE_ORIGIN}/embed/${current}?enablejsapi=1&origin=${encodeURIComponent(location.origin)}&playsinline=1&rel=0`;
    frame = h('iframe', { src, title: 'Música do site no YouTube', allow: 'autoplay; encrypted-media; picture-in-picture', referrerpolicy: 'strict-origin-when-cross-origin', allowfullscreen: true });
    frame.addEventListener('load', () => {
      ready = true; playButton.disabled = false; send('setVolume', [volume]); status.textContent = 'Pronto para tocar.';
      frame.contentWindow?.postMessage(JSON.stringify({ event: 'listening', id: 'neva-music' }), YOUTUBE_ORIGIN);
    });
    frameBox.replaceChildren(frame);
    external.href = `https://www.youtube.com/watch?v=${current}`;
  };
  const setOpen = (value) => {
    opened = value;
    panel.classList.toggle('open', value); panel.inert = !value; panel.setAttribute('aria-hidden', String(!value));
    toggle.setAttribute('aria-expanded', String(value));
    if (value && !frame) loadVideo();
  };
  toggle.addEventListener('click', () => setOpen(!opened));
  panel.querySelector('.music-close').addEventListener('click', () => setOpen(false));
  playButton.addEventListener('click', () => {
    if (!ready) return;
    send(playing ? 'pauseVideo' : 'playVideo');
    playing = !playing; syncPlay(); status.textContent = playing ? 'Tocando agora.' : 'Música pausada.';
  });
  volumeInput.addEventListener('input', () => { volume = Number(volumeInput.value); volumeValue.textContent = `${volume}%`; paint(); save(VOLUME_KEY, volume); if (ready) send('setVolume', [volume]); });
  panel.querySelector('form').addEventListener('submit', (event) => {
    event.preventDefault();
    const next = videoId(linkInput.value);
    if (!next) { linkError.textContent = 'Cole um link válido de vídeo do YouTube.'; linkError.hidden = false; return; }
    linkError.hidden = true; current = next; save(VIDEO_KEY, next); linkInput.value = ''; loadVideo();
  });
  const onMessage = (event) => {
    if (!frame || event.source !== frame.contentWindow || !['https://www.youtube.com', YOUTUBE_ORIGIN].includes(event.origin)) return;
    let message; try { message = typeof event.data === 'string' ? JSON.parse(event.data) : event.data; } catch { return; }
    if (message?.event === 'onReady') {
      ready = true; playButton.disabled = false; send('setVolume', [volume]); status.textContent = 'Pronto para tocar.';
    } else if (message?.event === 'onStateChange') {
      if ([0, 1, 2, 5].includes(message.info)) { playing = message.info === 1; syncPlay(); }
      if (message.info === 0) status.textContent = 'Música encerrada.';
      else if (message.info === 2) status.textContent = 'Música pausada.';
    } else if (message?.event === 'onError') {
      playing = false; syncPlay(); status.textContent = 'Vídeo indisponível. Abra no YouTube ou escolha outro link.';
    }
  };
  const onOutside = (event) => { if (opened && !root.contains(event.target)) setOpen(false); };
  const onEscape = (event) => { if (opened && event.key === 'Escape') { setOpen(false); toggle.focus(); } };
  window.addEventListener('message', onMessage);
  document.addEventListener('pointerdown', onOutside);
  document.addEventListener('keydown', onEscape);
  return { el: root, destroy() { window.removeEventListener('message', onMessage); document.removeEventListener('pointerdown', onOutside); document.removeEventListener('keydown', onEscape); } };
}
