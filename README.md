# Neva Growth

Plataforma web completa: CRM (leads, funil, clientes, tarefas), vendas e produtos, academia (cursos),
prospecção, criação de sites/aplicações/sistemas e **IDE com IA** — identidade azul-gelo, branca e minimalista.
Documentos: `docs/DEPLOY_VERCEL.md` (publicação), `docs/IMPLEMENTACAO.md` (estado real de cada recurso), `docs/REFERENCIAS_VISUAIS.md` (análise das capturas), `docs/EXECUCAO_ISOLADA.md` (arquitetura proposta para terminal/back-end), `docs/INVENTARIO.md` (inventário inicial).

## Stack
- **Backend:** Node.js 22 + Express (função serverless na Vercel). **Banco:** PostgreSQL — Supabase em produção (`DATABASE_URL`) e PGlite (Postgres em WASM, `data/pgdata`) em desenvolvimento/testes.
- **Auth:** senhas com scrypt, sessão por cookie HttpOnly (token aleatório guardado com hash), proteção CSRF por cabeçalho,
  limite de tentativas de login, perfis `admin` / `member` / `viewer`.
- **Frontend:** SPA em ES modules, sem build (`public/`). Editor Monaco via CDN (fallback automático).

## Rodar (desenvolvimento)
```bash
npm install
cp .env.example .env   # opcional; exporte as variáveis ou use seu gerenciador
npm start              # http://localhost:3000
```
No primeiro acesso a tela pede para criar o **administrador** (não existe usuário/senha padrão). Depois o cadastro
público fecha; novos usuários são criados em *Administração → Usuários*.

Variáveis: `DATABASE_URL`, `SETUP_TOKEN`, `PORT`, `DATA_DIR`, `ANTHROPIC_API_KEY`, `NEVA_AI_MODEL`, `GOOGLE_PLACES_API_KEY`, `PREVIEW_SECRET`.

**Produção na Vercel + Supabase:** veja `docs/DEPLOY_VERCEL.md`.

## Testes
```bash
npm test            # 18 testes de API (Postgres via PGlite) (auth, CRUD, planos, funil, vendas, dashboard, projetos, versões, permissões…)

# Interface (Chromium via playwright-core). Suba o servidor com banco VAZIO e rode:
DATA_DIR=$(mktemp -d) PORT=3111 npm start &
npm run test:e2e   # 31 verificações; CHROMIUM_PATH, BASE_URL e E2E_OUT opcionais
```
Para testar o driver `pg` (produção): `node scripts/pg-test-server.js 5544 &` e `DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5544/postgres PG_POOL_MAX=1 node --test test/api.test.js`.

## Arquitetura
```
server/
  index.js            app Express, middlewares, roteamento
  lib/                db (Postgres: pg/PGlite, migrações), auth, crud (fábrica declarativa), templates (geradores), zip, ai, http
  routes/             auth, users, resources (leads/clientes/tarefas/produtos/vendas/cursos), dashboard,
                      projects (arquivos, preview, publicação), integrations (IA, prospecção)
public/
  js/app.js           shell, roteador (hash), telas de login/setup
  js/crud-page.js     página CRUD genérica (busca, filtros, paginação, CSV)
  js/pages/*          dashboard, leads (kanban), prospect, sites, ide, courses, settings, resources
```
Novas entidades: declare o esquema em `server/routes/resources.js` (`crud({...})`) e a tela em `public/js/pages/resources.js` (`crudPage({...})`).

## Segurança dos sites criados
Sites publicados e previews são servidos com `Content-Security-Policy: sandbox`, ou seja, rodam em origem opaca e não
acessam a API nem os cookies do app. Consequência: `localStorage` não persiste nesses sites (os modelos usam fallback em memória).
O preview na IDE usa token assinado (12 h) porque frames em sandbox não enviam cookies.
