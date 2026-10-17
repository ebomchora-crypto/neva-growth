require('express-async-errors');
const express = require('express');
const path = require('node:path');
const A = require('./lib/auth');
const { HttpError } = require('./lib/http');

function createApp() {
  const db = require('./lib/db');
  // A inicialização roda na primeira requisição (e é repetida se falhar). Nunca deixa uma rejeição sem tratamento:
  // isso derrubaria a função serverless com FUNCTION_INVOCATION_FAILED em vez de devolver um erro legível.
  let initP = null;
  const ready = () => (initP ||= db.ready().then(() => require('./lib/seed').seedLibrary()).catch((e) => { initP = null; throw e; }));
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(express.json({ limit: '3mb' }));
  app.use((req, res, next) => {
    res.set({ 'x-frame-options': 'SAMEORIGIN', 'referrer-policy': 'same-origin', 'x-content-type-options': 'nosniff' });
    next();
  });
  // Garante esquema/migrações e seed antes da primeira requisição (necessário em serverless)
  app.use(async (_req, res, next) => {
    try { await ready(); next(); }
    catch (e) {
      console.error('[init]', e.message);
      const missing = /DATABASE_URL/.test(e.message);
      res.status(503).json({ error: missing ? e.message : 'Banco de dados indisponível. Verifique DATABASE_URL (use a string do Transaction pooler do Supabase) e a senha do banco.', code: missing ? 'db_not_configured' : 'db_unavailable', detail: missing ? undefined : String(e.code || e.name || '') });
    }
  });
  app.use(A.loadUser);
  if (process.env.LOG_REQUESTS === '1') app.use((req, res, next) => { const t = Date.now(); res.on('finish', () => { if (req.path.startsWith('/api')) console.log(`${req.method} ${req.originalUrl.split('?')[0]} ${res.statusCode} ${Date.now() - t}ms ${req.user ? 'u' + req.user.id : '-'}`); }); next(); });

  app.get('/healthz', (_req, res) => res.json({ ok: true }));
  // Sites publicados (públicos) e preview (autenticado)
  const { router: projects, previewRouter, publicRouter } = require('./routes/projects');
  app.use('/s', publicRouter);
  app.use('/preview', previewRouter);

  const api = express.Router();
  api.use(A.csrfGuard);
  api.use('/auth', require('./routes/auth'));
  api.use(A.requireAuth, A.blockViewerWrites);
  api.use('/me', require('./routes/me'));
  api.use('/users', require('./routes/users'));
  api.use('/dashboard', require('./routes/dashboard'));
  api.use('/library', require('./routes/library'));
  api.use('/play', require('./routes/play'));
  api.use('/prompts', require('./routes/prompts'));
  api.use('/search', require('./routes/search'));
  api.use('/projects', projects);
  api.use('/integrations', require('./routes/integrations'));
  api.use(require('./routes/resources').router);
  api.use((_req, _res, next) => next(new HttpError(404, 'Rota não encontrada.')));
  app.use('/api', api);

  app.use(express.static(path.join(__dirname, '..', 'public'), { extensions: ['html'] }));
  app.get('*', (req, res, next) => (req.path.startsWith('/api') ? next() : res.sendFile(path.join(__dirname, '..', 'public', 'index.html'))));

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, _next) => {
    if (err.type === 'entity.parse.failed') err = new HttpError(400, 'JSON inválido.');
    if (err.type === 'entity.too.large') err = new HttpError(413, 'Conteúdo grande demais.');
    const status = err instanceof HttpError ? err.status : err.code === '23505' ? 409 : 500;
    if (status === 500) console.error(err);
    const message = status === 409 ? 'Registro duplicado.' : status === 500 ? 'Erro interno do servidor.' : err.message;
    res.status(status).json({ error: message, code: err.code });
  });
  return app;
}

if (require.main === module) {
  const port = Number(process.env.PORT) || 3000;
  createApp().listen(port, () => console.log(`Neva Growth rodando em http://localhost:${port}`));
}
module.exports = { createApp };
