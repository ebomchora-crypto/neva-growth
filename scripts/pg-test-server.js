// Servidor Postgres (protocolo de rede) em memória para testar o driver `pg` sem instalar Postgres.
// Uso: node scripts/pg-test-server.js [porta]   →   DATABASE_URL=postgres://postgres:postgres@127.0.0.1:<porta>/postgres PG_POOL_MAX=1 npm test
const { PGlite } = require('@electric-sql/pglite');
const { PGLiteSocketServer } = require('@electric-sql/pglite-socket');
(async () => {
  const db = await PGlite.create();
  const port = Number(process.argv[2]) || 5544;
  const server = new PGLiteSocketServer({ db, port, host: '127.0.0.1' });
  await server.start();
  console.log(`pglite-socket em 127.0.0.1:${port}`);
})();
