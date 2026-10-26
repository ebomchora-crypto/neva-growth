// Canvas WebGL2 com um fragment shader no estilo Shadertoy (iResolution, iTime, iFrame, iMouse), em JS puro.
// Mesma lógica do ShaderCanvas dos componentes phosphor-30 e gigabit: triângulo de tela cheia, ResizeObserver,
// perda/recuperação de contexto e limpeza completa. Extras: pausa fora da tela, "reduzir movimento" desenha um quadro só,
// e devolve null quando o navegador não tem WebGL2 (quem chama mostra a versão estática).

const VERT_SRC = `#version 300 es
precision highp float;
layout(location=0) in vec2 a_pos;
out vec2 v_uv;
void main(){
  v_uv = a_pos * 0.5 + 0.5;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`;

function compile(gl, type, src) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, src); gl.compileShader(sh);
  if (gl.getShaderParameter(sh, gl.COMPILE_STATUS)) return sh;
  console.error(gl.getShaderInfoLog(sh) || 'Erro ao compilar o shader'); gl.deleteShader(sh); return null;
}

/**
 * opts: { pixelRatio (teto do DPR; abaixo de 1 renderiza em resolução menor, bom para fundos), speed, className, onFirstFrame }
 * Devolve { el, destroy } ou null sem WebGL2 / se o shader não compilar.
 */
export function shaderCanvas(fragSource, opts = {}) {
  const canvas = document.createElement('canvas');
  canvas.className = opts.className || '';
  canvas.setAttribute('aria-hidden', 'true');
  const gl = canvas.getContext('webgl2', { premultipliedAlpha: false, alpha: true, antialias: false, powerPreference: 'low-power' });
  if (!gl) return null;

  const vs = compile(gl, gl.VERTEX_SHADER, VERT_SRC); const fs = vs && compile(gl, gl.FRAGMENT_SHADER, fragSource);
  if (!vs || !fs) return null;
  const program = gl.createProgram();
  gl.attachShader(program, vs); gl.attachShader(program, fs); gl.linkProgram(program);
  gl.deleteShader(vs); gl.deleteShader(fs);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) { console.error(gl.getProgramInfoLog(program)); return null; }

  const vao = gl.createVertexArray(); gl.bindVertexArray(vao);
  const vbo = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  const u = { res: gl.getUniformLocation(program, 'iResolution'), time: gl.getUniformLocation(program, 'iTime'), frame: gl.getUniformLocation(program, 'iFrame'), mouse: gl.getUniformLocation(program, 'iMouse') };

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const speed = opts.speed ?? 1;
  const dpr = () => Math.max(0.2, Math.min(opts.pixelRatio ?? 2, window.devicePixelRatio || 1) * scale);
  let raf = 0; let disposed = false; let visible = true; let frame = 0; let first = true; let resizeQueued = false;
  let scale = 1; let ema = 16; let last = 0; // qualidade adaptativa: quadros lentos baixam a resolução (até 40%)
  const start = performance.now();

  function applySize() {
    resizeQueued = false; if (disposed) return;
    const r = dpr(); const w = Math.max(1, Math.floor((canvas.clientWidth || 1) * r)); const h = Math.max(1, Math.floor((canvas.clientHeight || 1) * r));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; gl.viewport(0, 0, w, h); }
    if (reduce) draw(performance.now()); // sem animação: redesenha só quando muda de tamanho
  }
  const queueSize = () => { if (!resizeQueued) { resizeQueued = true; requestAnimationFrame(applySize); } };

  function draw(now) {
    if (disposed || gl.isContextLost()) return;
    if (resizeQueued) applySize();
    gl.useProgram(program);
    if (u.res) gl.uniform3f(u.res, canvas.width, canvas.height, dpr());
    if (u.time) gl.uniform1f(u.time, reduce ? 12 : ((now - start) / 1000) * speed);
    if (u.frame) gl.uniform1i(u.frame, frame++);
    if (u.mouse) gl.uniform4f(u.mouse, 0, 0, 0, 0);
    gl.bindVertexArray(vao); gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (first) { first = false; opts.onFirstFrame?.(); }
  }
  function tick(now) {
    raf = 0; if (disposed) return;
    if (last) { ema = ema * 0.92 + (now - last) * 0.08; if (frame > 30 && ema > 34 && scale > 0.4) { scale = Math.max(0.4, scale * 0.8); ema = 20; queueSize(); } }
    last = now; draw(now); if (!reduce && visible) raf = requestAnimationFrame(tick);
  }
  const play = () => { if (!raf && !disposed && !reduce && visible) { last = 0; raf = requestAnimationFrame(tick); } };

  const ro = new ResizeObserver(queueSize); ro.observe(canvas);
  // fora da tela não gasta GPU
  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) play(); else if (raf) { cancelAnimationFrame(raf); raf = 0; } });
  io.observe(canvas);
  const onLost = (e) => { e.preventDefault(); if (raf) cancelAnimationFrame(raf); raf = 0; };
  const onRestored = () => { queueSize(); play(); };
  canvas.addEventListener('webglcontextlost', onLost);
  canvas.addEventListener('webglcontextrestored', onRestored);
  queueSize();
  if (reduce) requestAnimationFrame((t) => draw(t)); else play();

  return {
    el: canvas,
    destroy() {
      disposed = true; if (raf) cancelAnimationFrame(raf);
      ro.disconnect(); io.disconnect();
      canvas.removeEventListener('webglcontextlost', onLost); canvas.removeEventListener('webglcontextrestored', onRestored);
      try { gl.deleteBuffer(vbo); gl.deleteVertexArray(vao); gl.deleteProgram(program); } catch { /* ok */ }
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    },
  };
}
