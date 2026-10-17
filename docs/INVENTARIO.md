# Inventário de funcionalidades — referência e Neva Growth

## Como este inventário foi obtido (limitações)

O sistema de referência (`system.codemakers.com.br`) é uma SPA protegida por login. Esta sessão roda em um
contêiner na nuvem, **sem navegador interativo para você autenticar manualmente**, e você pediu para não
informar senha no chat. Portanto **não foi possível explorar as telas internas autenticadas**.

O que foi observado **sem login** (HTML público do endereço): título "Plataforma", meta-descrição
*"Crie sites, encontre clientes, organize oportunidades e acompanhe suas vendas. Aprenda e gerencie sua
operação digital"*, PWA (manifest/ícones), stack de front-end (React, Supabase, animações com motion).

Com base nisso e no seu briefing, os módulos abaixo foram definidos. **Nada foi copiado** (código, texto,
imagens ou identidade): tudo é implementação original com a identidade azul-gelo/branca da Neva Growth.
Se quiser paridade fina com telas específicas, exporte prints/gravação da tela autenticada para a pasta do
projeto e eu comparo e ajusto os módulos.

## Mapa de funcionalidades

| Eixo da referência (inferido do texto público) | Módulo Neva Growth | Estado |
|---|---|---|
| "Crie sites" | **Sites e sistemas**: modelos (site, app, sistema CRUD), geração com IA, publicação em `/s/<slug>/` | Real |
| "Encontre clientes" | **Prospecção** via Google Places API + importação de CSV | Real quando `GOOGLE_PLACES_API_KEY` existe; sem chave a tela explica e bloqueia |
| "Organize oportunidades" (CRM) | **Leads e funil** (kanban com arrastar-e-soltar, lista, atividades, conversão em cliente, import/export CSV), **Tarefas**, **Clientes** | Real |
| "Acompanhe suas vendas" | **Vendas**, **Produtos**, **Dashboard** (KPIs, receita mensal, funil) | Real |
| "Aprenda" | **Academia**: cursos, aulas, vídeo embutido (YouTube/Vimeo), progresso por usuário | Real |
| "Gerencie sua operação" | **Usuários** (perfis admin/membro/leitura), **Configurações** (perfil, senha, status de integrações) | Real |
| Pedido adicional | **IDE própria** | Real |

## IDE
Árvore de arquivos (criar/renomear/excluir arquivos e pastas), abas com indicador de alterações, editor Monaco
(com fallback para editor simples se o CDN estiver bloqueado), salvar com Ctrl+S, preview ao vivo em iframe
isolado (sandbox), console do preview (console.log/erros), console JavaScript isolado, busca em todos os
arquivos, download `.zip`, publicar/despublicar, assistente de IA com "aplicar no arquivo" (requer
`ANTHROPIC_API_KEY`).

## O que depende de credenciais (não é simulado)
- **IA** (assistente e geração de projetos): sem `ANTHROPIC_API_KEY`, a API responde 503 `ai_not_configured` e a UI mostra aviso.
- **Prospecção**: sem `GOOGLE_PLACES_API_KEY`, 503 `places_not_configured`.
Essas duas integrações **não puderam ser testadas contra os serviços reais** aqui (sem chaves); o código de
chamada existe, mas valide com suas chaves.

## Fora de escopo desta versão (honestidade)
Terminal/shell na IDE, execução de back-end dentro dos projetos criados (projetos são estáticos: HTML/CSS/JS),
pagamentos online, e-mail transacional, WhatsApp API, domínio próprio para sites publicados.
