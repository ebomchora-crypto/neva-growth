# Acompanhamento da implementação

Estados: **Não iniciado · Em desenvolvimento · Implementado · Testado · Bloqueado por dependência externa**.
Só marco "Testado" após executar teste. **Fase atual: análise de referências — nenhuma mudança de código desde a v1.**

## Base existente (v1)
| Recurso | Estado | Evidência |
|---|---|---|
| Auth, sessões, CSRF, perfis admin/membro/leitura | Testado | `npm test` (8 testes) + UI |
| CRUD leads/clientes/tarefas/produtos/vendas/cursos/aulas | Testado | API + UI automatizada (18 fluxos) |
| Funil kanban (6 etapas fixas), atividades, conversão, CSV | Testado | UI automatizada |
| Dashboard com dados reais (período fixo de 6 meses) | Testado | API + UI |
| Sites/projetos, IDE (Monaco, abas, busca, preview, console, zip), publicação | Testado | API + UI |
| Assistente de IA e geração com IA | Bloqueado por dependência externa (`ANTHROPIC_API_KEY`) — não testado contra o serviço real |
| Prospecção (Google Places) | Bloqueado por dependência externa (`GOOGLE_PLACES_API_KEY`) — não testado contra o serviço real |

## Lacunas identificadas nas capturas (candidatas — ainda não priorizadas)
| # | Recurso | Origem | Estado |
|---|---|---|---|
| 1 | Seletor de período + variação % + ticket médio no dashboard | Cap. 1 | Não iniciado |
| 2 | Lucro/custo e margem em vendas; entrega (prazo/status); filtros com contadores | Cap. 1, 3 | Não iniciado |
| 3 | Estágio no cliente, abas por estágio, vínculo cliente↔entrega digital | Cap. 2 | Não iniciado |
| 4 | Status de projeto (desenvolvimento/arquivado), domínio, cliente, arquivar | Cap. 4 | Não iniciado |
| 5 | Etapas de funil personalizáveis, arquivar, prioridade/prazo, abas Minhas/Atraso/Prioritárias, filtros | Cap. 5 | Não iniciado |
| 6 | Resumo do período por IA | Cap. 1 | Não iniciado (dependeria de chave de IA) |
| 7 | Busca global / paleta de comandos, ocultar valores, tempo real | Cap. 1–5 | Não iniciado |
| 8 | IDE: substituir em arquivos, histórico/versões, autosave, importação, execução isolada | Briefing | Não iniciado |
| 9 | IA com edição de arquivos, diff, desfazer, histórico, limites de uso | Briefing | Não iniciado (dependeria de chave de IA) |

Aguardando: "FINALIZEI AS PRINTS" para consolidar, priorizar e implementar.
