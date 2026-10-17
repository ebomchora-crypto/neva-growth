# Acompanhamento da implementação

Estados: **Não iniciado · Em desenvolvimento · Implementado · Testado · Bloqueado por dependência externa**.
"Testado" = coberto por teste automatizado executado nesta entrega: **18 testes de API** (`npm test`, Postgres) e **31 verificações de interface no Chromium** (`npm run test:e2e`).
Nada abaixo usa dados fictícios: indicadores vêm do banco; o conteúdo inicial da biblioteca é original da Neva e editável/removível por administradores.

## Plataforma e segurança
| Recurso | Estado | Observações |
|---|---|---|
| Banco PostgreSQL (Supabase em produção, PGlite em dev) com migração versionada sob advisory lock; RLS ativo em todas as tabelas | Testado | 18 testes de API em PGlite; suíte `api.test.js` também executada pelo driver `pg` (rede); esquema aplicado e verificado no Supabase real (advisor: só avisos INFO de "RLS sem política", intencionais) |
| Importador SQLite → Postgres (preserva ids, não migra sessões) | Testado | Verificado com banco da versão anterior com dados |
| Auth, sessões, CSRF, perfis admin/membro/leitura; autorização no servidor | Testado | Viewer só lê; projetos só editáveis por dono/admin; dados pessoais por usuário |
| Planos Member/Creator/Elite (benefícios e limites editáveis por admin; atribuição por admin) | Testado | Bloqueio de conteúdo **no servidor** (403 `plan_required`) |
| Limites mensais de IA/Builder + proteção contra rajadas (8/min) | Testado (lógica) | Chamada real à IA não testada (sem chave) |
| Créditos de prospecção (1 por empresa entregue, ledger, ajuste por admin) | Testado (lógica) | Consumo real depende da busca |
| Notificações in-app (vendas pagas, conquistas, novos leads, tarefas atribuídas) + preferências | Testado | Canais externos (e-mail/push/WhatsApp) **não existem** |
| Sessões ativas (listar/encerrar), troca de senha encerra outras sessões | Testado | |
| Busca global / paleta de comandos (Ctrl/⌘+Espaço) | Testado | |
| Ocultar valores (preferência persistente por usuário) | Testado | |
| "AO VIVO" | Parcial | **Não há tempo real.** Polling de notificações a cada 30 s e botão atualizar; o topo mostra "Sincronizado hh:mm" |
| Exportação de dados (JSON, sem senhas) | Testado | |

## Módulos comerciais (a partir das capturas 1–5, 10)
| Recurso | Estado |
|---|---|
| Dashboard: períodos (hoje…1 ano), lucro, receita, ticket médio, variação vs. período anterior, gráficos, carteira, funil | Testado |
| Resumo do período por IA | Bloqueado por dependência externa (`ANTHROPIC_API_KEY`); botão desabilitado com aviso |
| Vendas: custo, lucro, margem, prazo/status de entrega, pílulas com contadores, indicadores, CSV | Testado |
| Clientes: estágio, abas, indicadores, entrega digital (sites vinculados), resultado | Testado |
| CRM: funil editável (admin), arquivar, prioridade, prazo, abas Minhas/Em atraso/Prioritárias, filtros, quick-add, minimizar header, lista/quadro, CSV | Testado |
| Prospecção por mapa: até 3 áreas por raio, filtros sem site/nota, créditos, potencial, envio ao CRM | Mapa e áreas: Testado. Busca real: **Bloqueado por dependência externa** (`GOOGLE_PLACES_API_KEY`) |
| Sites: status, domínio, cliente, arquivar (tira do ar), filtros, contadores | Testado |

## Criação, IA e conteúdo (capturas 6–9, 11–13)
| Recurso | Estado |
|---|---|
| Builder: galeria de modelos originais, criação a partir do modelo | Testado |
| Builder com IA, otimizar prompt, estilo/cor/referência DESIGN.md | Bloqueado por dependência externa (IA) |
| Referências de design com DESIGN.md (acervo próprio, filtros, CRUD admin) | Testado |
| Acervo: Prompt Lab / Skill Vault / Animações (CRUD admin, copiar/baixar, plano mínimo) | Testado |
| Play: vídeos YouTube/Vimeo, progresso por usuário, CRUD admin | Testado. **"Tempo assistido" não implementado** (não dá para medir com segurança em embeds) |
| Gerador de prompts + Meus prompts | Salvar/listar: Testado. Geração: Bloqueado por dependência externa (IA) |
| Associação/planos; Configurações com 8 seções | Testado |

## IDE
| Recurso | Estado |
|---|---|
| Arquivos/pastas, abas, Monaco, preview isolado com token, console do preview, busca, zip | Testado |
| Substituir em todos os arquivos (com confirmação e histórico) | Testado |
| Histórico de versões por arquivo (30), diff e restauração | Testado |
| Autosave (1,5 s, opcional) | Testado |
| Importar arquivos e pastas (texto até 1 MB) | Testado. **Importar .zip não implementado** |
| Assistente de IA: histórico por projeto/usuário, contexto do projeto, revisão por diff, aplicar, desfazer, limites | Lógica de aplicar/desfazer/histórico: Testado. Respostas da IA: Bloqueado por dependência externa |
| Terminal e execução de back-end | **Não iniciado — arquitetura em `docs/EXECUCAO_ISOLADA.md`** (exige infraestrutura isolada; não executamos código de usuário no servidor) |

## Deploy
| Item | Estado |
|---|---|
| Configuração Vercel (`vercel.json`, função `api/index.js`, região gru1) | Implementado; **não testado na Vercel real** |
| Publicação em system-nevagrowth.vercel.app | **Bloqueado por dependência externa**: a conexão desta sessão com a Vercel retorna 403 para a conta; veja `docs/DEPLOY_VERCEL.md` |
| `DATABASE_URL` (Transaction pooler) e `SETUP_TOKEN` | Pendente: dependem de segredos que só o dono tem (senha do banco) |

## Pendências conhecidas
- Capturas ainda não enviadas: formulários originais, seções 7–8 de Configurações, benefícios de cada plano, botão amarelo/alerta do dashboard, telas com dados. Onde a imagem não bastava, implementei hipóteses coerentes (marcadas em `REFERENCIAS_VISUAIS.md`).
- Integrações Anthropic e Google Places nunca foram exercitadas contra os serviços reais.
- Dados do workspace são compartilhados entre membros (modelo de equipe); só projetos têm dono com restrição de edição.
