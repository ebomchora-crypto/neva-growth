// Entrada serverless da Vercel: toda requisição de /api, /s, /preview e /healthz chega aqui (ver vercel.json).
// Os arquivos estáticos (public/) são servidos direto pela CDN da Vercel.
const { createApp } = require('../server/index.js');
module.exports = createApp();
