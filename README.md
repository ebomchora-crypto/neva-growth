# Neva Growth

Plataforma web completa: CRM (leads, funil, clientes, tarefas), vendas e produtos, academia (cursos),
prospecção, criação de sites/aplicações/sistemas e **IDE com IA** — identidade azul-gelo, branca e minimalista.
Documentos: `docs/IMPLEMENTACAO.md` (estado real de cada recurso), `docs/REFERENCIAS_VISUAIS.md` (análise das capturas), `docs/EXECUCAO_ISOLADA.md` (arquitetura proposta para terminal/back-end), `docs/INVENTARIO.md` (inventário inicial).

## Stack
- **Backend:** Node.js ≥ 22.13 + Express. **Banco:** SQLite (`node:sqlite`, arquivo em `data/neva.db`) — sem dependências nativas.
- **Auth:** senhas com scrypt, sessão por cookie HttpOnly (token aleatório guardado com hash), proteção CSRF por cabeçalho,
  limite de tentativas de login, perfis `admin` / `member` / `viewer`.
- **Frontend:** SPA em ES modules, sem build (`public/`). Editor Monaco via CDN (fallback automático).

## Rodar
```bash
npm install
cp .env.example .env   # opcional; exporte as variáveis ou use seu gerenciador
npm start              # http://localhost:3000
```
No primeiro acesso a tela pede para criar o **administrador** (não existe usuário/senha padrão). Depois o cadastro
público fecha; novos usuários são criados em *Administração → Usuários*.

Variáveis: `PORT`, `DATA_DIR`, `COOKIE_SECURE=1` (atrás de HTTPS), `ANTHROPIC_API_KEY`, `NEVA_AI_MODEL`, `GOOGLE_PLACES_API_KEY`, `PREVIEW_SECRET`.

## Testes
```bash
npm test            # 18 testes de API (auth, CRUD, planos, funil, vendas, dashboard, projetos, versões, permissões…)

# Interface (Chromium via playwright-core). Suba o servidor com banco VAZIO e rode:
DATA_DIR=$(mktemp -d) PORT=3111 npm start &
npm run test:e2e   # 31 verificações; CHROMIUM_PATH, BASE_URL e E2E_OUT opcionais
```

## Arquitetura
```
server/
  index.js            app Express, middlewares, roteamento
  lib/                db (schema), auth, crud (fábrica declarativa), templates (geradores), zip, ai, http
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
