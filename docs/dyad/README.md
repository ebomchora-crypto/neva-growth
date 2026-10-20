# Arquivos do Dyad usados no Builder

Origem: https://github.com/dyad-sh/dyad (commit b98e4f8), licença Apache 2.0 (arquivo LICENSE aqui; `src/pro/` não foi usado).
Copiados sem alteração: `system_prompt.ts`, `AI_RULES.md`, `LICENSE`, `NOTICE`.
`scripts/compile-dyad.js` extrai deles o texto das regras de código (BUILD_SYSTEM_PROMPT) e gera `server/lib/codemaker/dyad-rules.js`.
O Dyad gera apps React/Vite; o Builder da Neva publica HTML + Tailwind, então só as regras de escrita de código completo valem aqui (veja o modo livre em server/lib/codemaker).
