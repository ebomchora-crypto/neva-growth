# Deploy na Vercel (Postgres/Supabase)

Endereço pretendido: **https://system-nevagrowth.vercel.app** (o nome `system.nevagrowth.vercel.app` não é possível: a Vercel não aceita dois níveis sob `vercel.app`).

## Arquitetura de produção
- **Frontend estático** (`public/`) servido pela CDN da Vercel.
- **API** (Express) como função serverless em `api/index.js`; `vercel.json` encaminha `/api/*`, `/s/*` (sites publicados), `/preview/*` e `/healthz` para ela. Região `gru1` (São Paulo), igual à do banco.
- **Banco:** Postgres do Supabase (projeto `neva-growth`, ref `chfducddgftnyxhdaxus`, sa-east-1). O esquema é criado/atualizado automaticamente na primeira requisição (migração versionada, sob *advisory lock*). **RLS ligado em todas as tabelas** e acesso revogado para `anon`/`authenticated`: a API pública do Supabase não enxerga nada; só o app, via `DATABASE_URL`.
- Sessões, notificações, histórico de IA e todo o resto ficam no banco (a função serverless não guarda estado).

## Passo a passo
1. **Senha do banco** — Supabase → *Project Settings → Database* → *Reset database password* (anote a nova senha).
2. **String de conexão** — Supabase → botão *Connect* → **Transaction pooler** (porta 6543). Formato:
   `postgresql://postgres.chfducddgftnyxhdaxus:<SENHA>@aws-0-sa-east-1.pooler.supabase.com:6543/postgres`
   (use exatamente o host que o painel mostrar; a conexão direta `db.<ref>.supabase.co` é IPv6 e não funciona na Vercel).
3. **Projeto na Vercel** — *Add New → Project* → importar `ebomchora-crypto/neva-growth`, branch `claude/inspiring-clarke-21i28h` (ou `main` após o merge). Nome do projeto: `system-nevagrowth`. Framework preset: **Other**. Não precisa de build command (o `vercel.json` já define tudo).
4. **Variáveis de ambiente** (Production e Preview):
   | Variável | Obrigatória | Para quê |
   |---|---|---|
   | `DATABASE_URL` | sim | string do passo 2 |
   | `SETUP_TOKEN` | **sim** | token (ex.: 32+ caracteres aleatórios) exigido para criar o 1º administrador; sem ele a instalação fica bloqueada |
   | `ANTHROPIC_API_KEY` | não | habilita IA (assistente, Builder, resumo, prompts) |
   | `NEVA_AI_MODEL` | não | modelo de IA (padrão `claude-sonnet-5-5`) |
   | `GOOGLE_PLACES_API_KEY` | não | habilita a busca da Prospecção |
   | `PREVIEW_SECRET` | não | segredo dos links de preview (padrão: derivado de `DATABASE_URL`) |
5. **Deploy**. Abra o site, informe nome/e-mail/senha **e o `SETUP_TOKEN`** para criar o administrador.
6. **Verificação**: `GET /healthz` deve responder `{"ok":true}`.

## Dados antigos (SQLite → Postgres)
Se você tinha dados da versão anterior (arquivo `data/neva.db`):
```bash
DATABASE_URL='<string do passo 2>' node scripts/sqlite-to-postgres.js data/neva.db
```
Só roda em banco de destino sem usuários; preserva ids e relacionamentos (sessões antigas não são migradas).

## Limitações em ambiente serverless
- Limite de tentativas de login é por instância (em memória): atenua, mas não é global.
- Funções têm limite de duração (60 s configurado); gerações longas de IA podem estourar — nesse caso o app mostra erro e nada é gravado pela metade.
- Backups: usar os do Supabase (o backup automático em arquivo existia só na versão SQLite).
- Desenvolvimento local sem `DATABASE_URL` usa PGlite (Postgres em WASM) em `data/pgdata`.
