# Acompanhamento da implementação

Estados: **Não iniciado · Em desenvolvimento · Implementado · Testado · Bloqueado por dependência externa**.
"Testado" = coberto por teste automatizado executado nesta entrega: **18 testes de API** (`npm test`, Postgres) e **31 verificações de interface no Chromium** (`npm run test:e2e`, banco vazio).
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

## Interface v3 (capturas 11–15: Dashboard, Clientes, Vendas, Sites, CRM Kanban)
| Item | Estado |
|---|---|
| Menu lateral em trilho de ícones (rótulos em dica/tooltip; gaveta com rótulos no celular), topo com busca + atalho, indicador de sincronização, ocultar valores, atualizar, notificações e conta | Testado (e2e) |
| Blocos de abertura com indicadores em faixa/chips, ilustração geométrica própria | Testado (e2e) |
| Dashboard: lucro no período com períodos e resumo por IA, gráfico, "Sua próxima venda", "Lucro por período" com seletor, painel "Minha carteira" com cartão, Cliente/Venda e vendas recentes | Testado (e2e) |
| CRM Kanban: faixa de etapas, Editar funil/Importar/Nova oportunidade, abas, Arquivados com contagem, quadro/lista, busca, Filtros, exportação, colunas com valor previsto e "Adicionar oportunidade" | Testado (e2e) |
| Clientes (carteira com abas), Vendas (barra "Organizar projetos" com resumo), Sites (barra "Exibir", cota do Builder, contador) | Testado (e2e) |

| Mascotes sempre fixos (sem animação): só o texto ao redor entra; teste automático confere | Testado (e2e) |
| Mascote da Neva (raposa) nas aberturas, estados vazios, login e erros; Play (faixa "Entre no Play"), Acervo (barra de abas e chips), Design (filtros e atalhos) e Builder (compositor com modelos paginados), capturas 16–19 | Testado (e2e) |

## Animações e celular (GSAP)
| Item | Estado |
|---|---|
| GSAP 3 servido localmente (`public/vendor/gsap.min.js`, sem CDN); módulo `public/js/motion.js` | Testado (e2e) |
| Entrada: abertura (kicker, título palavra a palavra, ações, indicadores, mascote com flutuação, brilho), cartões/colunas/linhas em cascata, revelação ao rolar, contagem de valores em R$, barras de progresso, gráficos desenhados | Testado (e2e) |
| Transição entre páginas com barra de progresso; indicador deslizante no menu; modais e avisos com entrada/saída; pop ao soltar card no Kanban; botões magnéticos e inclinação 3D nas galerias (só com mouse) | Testado (e2e) |
| Fundo animado (manchas de luz com parallax) e neve na tela de entrada | Testado (e2e) |
| Respeita "reduzir movimento" do sistema; interruptor em Configurações → Privacidade (por navegador); sem GSAP nada fica escondido | Testado (e2e, execução normal e com `REDUCED=1`) |
| Celular: topo compacto, aberturas empilhadas, faixas de indicadores em grade, Kanban com rolagem por coluna, gráficos na largura real, modais como folha inferior, entradas em 16 px (sem zoom do iOS) | Testado em 390 px (sem rolagem horizontal) |

Licença: o GSAP é gratuito para uso comercial (licença padrão da GreenSock/Webflow); o pacote npm `gsap` traz o texto da licença.

## Play, Prospecção, Design e Builder (capturas 27–31)
| Item | Estado |
|---|---|
| Trilho: brilho e leve aumento (1,08×) ao passar o mouse, indicador deslizante, emblema "N" nas ferramentas (Prospecção, Design, Acervo, Prompts, Play) | Testado (e2e: navegação) |
| Play: pôsteres grandes por vídeo, faixa de progresso, "O que você quer aprender?" com limite de 3 sugestões por semana (servidor), painel editorial para admin (situação, exclusão) e aviso ao admin | Testado (API + e2e) |
| Prospecção: faixa "Oportunidades capturadas" (mapeados / alta aderência / sem website), "Buscas salvas" com histórico por usuário (reusar parâmetros, excluir), estado "O radar está pronto." | Histórico: Testado (API). Busca real: **bloqueado por dependência externa** (`GOOGLE_PLACES_API_KEY`) |
| Design: filtros em linha com rótulos, atalhos em abas, ordenação | Testado (e2e) |
| Builder: botão único "Criar site →" (com IA gera pelo pedido; sem IA cria do modelo escolhido), "+" abre os detalhes, paleta escolhe a cor, modelos paginados | Testado (e2e). Geração com IA: bloqueado (`ANTHROPIC_API_KEY`) |

Não copiados do original: seletor de modelo "Syre / Medium" e botão de microfone (sem função real aqui); miniaturas de sites de terceiros.

Fundo da plataforma: shader WebGL de ondas (port em JavaScript puro do componente "ShaderBackground" do 21st.dev, `public/js/shader-bg.js`), com a paleta clara azul-gelo. Anima a 30 fps só com animações ligadas; com "reduzir movimento" ou o interruptor desligado fica um quadro estático; sem WebGL fica a cor sólida. O projeto não usa React/Tailwind/TypeScript, por isso o componente foi portado em vez de copiado para `components/ui`.

Componentes de IA (KokonutUI/21st.dev, portados para JavaScript puro porque o projeto não usa React/Tailwind/TypeScript):
| Item | Estado |
|---|---|
| Builder: orbe "Neva Studio" no lugar do mascote; fundo Dot Field (meio-tom com esteira ao passar o mouse e onda de choque no clique) | Testado (e2e) |
| Seletor de modelo e esforço (Neva 1.0 / 1.2 / 1.5, que o servidor traduz para o modelo real; o navegador nunca vê o id real; Baixo/Médio/Alto/Máximo conforme o modelo; arrastável e por teclado) no Builder e no chat da IDE. O servidor valida modelo e esforço numa lista fixa e usa o esforço para escolher o limite de saída e as instruções | Lista/validação: Testado (API). Efeito na resposta real: bloqueado (`ANTHROPIC_API_KEY`) |
| Carregamento da IA em etapas (Builder e chat da IDE): etapas e tempos refletem estados reais (salvar, aguardar a IA, concluir) | Testado (e2e: Builder; componente isolado) |
| Revisão de diff por arquivo (aceitar/rejeitar/desfazer, blocos expansíveis, aplicar só as aceitas) na IDE | Componente verificado isolado; fluxo completo depende da IA |
| Mascote da Academia | Em uso |

Decisão registrada: layout, estrutura e fluxos seguem os prints; a identidade visual (azul-gelo, logo "N", ilustrações) é própria da Neva. Não foram copiados logo, mascote, arte nem a paleta vermelha do sistema de referência. O indicador "AO VIVO" do original aparece como "Sincronizado hh:mm" porque não há tempo real (atualização a cada 30 s).

## Deploy
| Item | Estado |
|---|---|
| Produção em https://neva-growth.vercel.app (função `api/index.js`, região gru1) com Postgres no Supabase (projeto dedicado, usuário `neva_app`, RLS ativo) | No ar; fumaça de produção (16 API + 24 UI) passou na versão anterior |
| Pushes **não** disparam deploy automático; publicar com `create_deployment` (Vercel) | Procedimento atual |
| Segredos (`DATABASE_URL`, `SETUP_TOKEN`) | Rotacionar: a senha do banco e o token passaram por conversas |

## Pendências conhecidas
- Capturas ainda não enviadas: formulários originais, seções 7–8 de Configurações, benefícios de cada plano, botão amarelo/alerta do dashboard, telas com dados. Onde a imagem não bastava, implementei hipóteses coerentes (marcadas em `REFERENCIAS_VISUAIS.md`).
- Integrações Anthropic e Google Places nunca foram exercitadas contra os serviços reais.
- Dados do workspace são compartilhados entre membros (modelo de equipe); só projetos têm dono com restrição de edição.

## Cadastro e recuperação de senha (somente interface)
`authScreen` em `public/js/app.js` tem os modos `login`, `signup`, `forgot` e `setup`. Login: "Salvar sessão", "Esqueci a senha" e "Criar minha conta". Cadastro: Nome, Nome de usuário, E-mail, Senha (medidor + dica). Recuperação: só e-mail.
**Backend pendente:** os envios de cadastro e recuperação passam por `authPending()` e mostram a mensagem "ainda não está ativo". Nada é criado nem enviado. O checkbox "Salvar sessão" é enviado como `remember`, que o servidor ainda ignora.

### Animações das telas de acesso
`authIn()` / `shake()` em `public/js/motion.js`: entrada dos dois painéis, títulos palavra a palavra, campos em cascata, partículas flutuantes, brilho no botão, paralaxe das ondas com o mouse e troca suave entre login/cadastro/recuperação. Respeitam "reduzir movimento"; o mascote continua fixo.

### Fundo de cortina (login / cadastro / recuperação)
`public/js/drape-bg.js`: porte em JS puro do "Drape Background" (KokonutUI, MIT) — tecido simulado (Verlet) renderizado em WebGL atrás dos painéis, com vento, empurrão do cursor e arrastar o tecido com o mouse. Cores no gelo da Neva. Fica estático com "reduzir movimento", toggle de movimento desligado ou navegador automatizado; sem WebGL o fundo CSS continua. Os painéis viraram vidro translúcido para a cortina aparecer.

### Telas de acesso v3 (igual à referência)
Painel grande + cartão interno com faixa de acento, rótulos com índice (01–04), Nome e Nome de usuário lado a lado, rodapé com texto à esquerda e link à direita, entalhe central com três pontos que navegam entre Entrar / Criar conta / Recuperar acesso. Sem mascote no painel de arte. Sem o widget Cloudflare da referência (não há verificação real por trás). Os títulos animados preservam o destaque em cor (`wordsOf` percorre os nós).

## Cadastro público, recuperação de senha e "Salvar sessão" (ativos)
- **Cadastro** (`POST /api/auth/signup`): cria uma conta **Membro com espaço de trabalho próprio e privado** (`users.ws = id`). Valida nome, `username` único, e-mail único, senha (≥ 8, sem senhas óbvias), campo-isca anti-robô e limite de 6 contas/hora por IP. Créditos: padrão da plataforma (100), sem regra especial por enquanto. `SIGNUP_OPEN=0` fecha o cadastro.
- **Isolamento por conta (migração v4):** `ws` em `leads, clients, tasks, products, sales, projects` e em `users`. Contas criadas pelo admin em Usuários entram no espaço do admin (equipe); contas do cadastro público têm o seu. Todo CRUD genérico (`server/lib/crud.js`), painel, busca, projetos/IDE/Builder, IA do projeto, prospecção (duplicados), notificações, exportação e opções de responsável filtram por `req.user.ws`; referências cruzadas (ex.: venda de outra conta) são recusadas. Biblioteca, Play, Academia e etapas do funil são conteúdo global: só admin altera. `test/auth.test.js` cobre o isolamento (listas, acesso por id, sub-recursos, referências, painel, busca, exportação).
- **Esqueci a senha** (`/api/auth/forgot` → e-mail → `#/redefinir-senha?token=…` → `/api/auth/reset`): token de 32 bytes guardado só como hash, 1 hora, uso único; resposta igual exista ou não a conta; ao redefinir, todas as sessões antigas são encerradas. **Exige e-mail configurado:** defina `RESEND_API_KEY` e `MAIL_FROM` (e, se o domínio público for outro, `PUBLIC_URL`). Sem isso a tela avisa que o envio não está configurado (o admin ainda redefine em Usuários).
- **Salvar sessão:** marcado = cookie persistente por 30 dias; desmarcado = cookie de sessão (some ao fechar o navegador) e validade de 1 dia no servidor.
- Migrações: v3 cria `password_resets` (com RLS); v4 cria as colunas `ws`. Testes: `test/auth.test.js` e e2e.
- **Ainda não existe:** verificação do e-mail no cadastro (a conta já entra ativa) e verificação anti-robô tipo Turnstile.

### Moldura dentro de moldura
Cards, modais e paleta têm borda externa + filete interno recuado (`inset box-shadow`); o hero ganhou uma moldura interna (`.hero::after`), igual à dos painéis de acesso. Variável `--frame-in` controla o recuo. Pôsteres do Play usam um filete próprio (`.pcard::after`) por cima da imagem; cards de site usam o filete padrão.

Acesso: moldura em volta da tela inteira (`.auth2::after`), com os dois painéis dentro, além do filete interno de cada painel.

Moldura no app todo: `.shell::after` (janela inteira), filete interno no rail, duplo contorno em painéis (cards, filtros, itens de biblioteca, dropdowns, busca). Colunas do kanban ficam só com a borda externa (o cabeçalho colorido cobre o filete).

### Configurações v2 (igual à referência)
Casca única `.setshell`: cabeçalho com "Configurações." e monograma NG/, botão × (volta ao Dashboard), navegação à esquerda com ícone/título/subtítulo e atalhos de gestão, e painel com "/ CONFIGURAÇÕES / 01 DE 08", título grande, número fantasma e cartões `01 / IDENTIDADE`. Meu perfil: Nome completo + Nome de usuário (+ Telefone) e **Acesso** com troca de e-mail (`PUT /api/me/email`, confirma pela senha atual e vale na hora — a referência confirma por e-mail, o que depende do envio de e-mail ainda não configurado). Sem o cartão de Discord da referência (não há integração).
