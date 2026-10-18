// Envio de e-mail transacional pela API da Resend (https://resend.com).
// Configure RESEND_API_KEY e MAIL_FROM (ex.: "Neva Growth <no-reply@seudominio.com>") nas variáveis de ambiente.
// Sem a chave, nada é enviado: quem chama recebe `configured() === false` e informa isso ao usuário.
const outbox = []; // só em testes (NODE_ENV=test): guarda o que seria enviado
const configured = () => Boolean(process.env.RESEND_API_KEY && process.env.MAIL_FROM) || process.env.NODE_ENV === 'test';

async function send({ to, subject, html, text }) {
  if (!process.env.RESEND_API_KEY || !process.env.MAIL_FROM) {
    if (process.env.NODE_ENV === 'test') { outbox.push({ to, subject, html, text }); return { ok: true }; }
    throw new Error('mail_not_configured');
  }
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST', headers: { authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({ from: process.env.MAIL_FROM, to: [to], subject, html, text }), signal: AbortSignal.timeout(10000)
  });
  if (!r.ok) throw new Error(`mail_failed_${r.status}`);
  return { ok: true };
}
module.exports = { send, configured, outbox };
