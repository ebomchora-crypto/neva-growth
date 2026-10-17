# Referências visuais — análise das capturas do sistema de referência

> Fonte: capturas de tela enviadas pelo usuário (conta autenticada dele). Cada captura é um **estado estático**:
> o que está marcado como **[Evidente]** aparece na imagem; **[Hipótese]** é inferência minha e **não** é comportamento
> confirmado do sistema de referência. Todas as telas estão **vazias (R$ 0, 0 registros)**, então não se vê como os dados
> preenchidos aparecem.
> Status: análise **consolidada** (13 capturas) e implementação feita — o estado real de cada recurso (implementado/testado/bloqueado) está em `docs/IMPLEMENTACAO.md`.
> Onde a imagem não bastava, a implementação seguiu a hipótese registrada aqui e **não** afirma ser o comportamento do sistema de referência.

## Estrutura global observada (comum às 5 capturas)

- **Navegação por trilho lateral de ícones** (sem rótulos de texto), item ativo destacado. **[Evidente]**
  Ordem, de cima para baixo: logo · cartão de contato · início/dashboard · clientes · carteira (vendas) · navegador (sites) ·
  quadro/kanban (CRM) · grade com "+" (apps/ferramentas?) · separador · **5 ícones circulares com selo** · engrenagem · sair.
  - **Mapa do menu (atualizado com as capturas 6–13):** grupo superior = **Associação/plano (cartão de contato, cap. 11)** · Dashboard · Clientes · Vendas ·
    Sites · CRM Kanban · **Builder de Sites** (grade "+", cap. 6). Grupo inferior (ícones com selo) = **Design Makers** (paleta, cap. 7) ·
    **Acervo** (prompts/skills/animações, cap. 8) · **Play** (vídeos, cap. 9) · **Prospecção "Code Hunter"** (alvo, cap. 10) · **Gerador de Prompts** (varinha, cap. 12). Engrenagem = **Configurações** (cap. 13).
- **Barra superior**: busca contextual (o placeholder muda por página: "Buscar cliente ou projeto", "Buscar cliente, empresa ou telefone",
  "Buscar venda, projeto ou cliente", "Buscar site, domínio ou cliente") + atalho **⌘ + Espaço** (paleta de comandos / busca global **[Hipótese]**) +
  botão de alerta (triângulo) + [só no dashboard] botão amarelo (ícone de cupom/ingresso, função desconhecida).
- **Canto direito**: indicador **"AO VIVO"** (sugere atualização em tempo real **[Hipótese]**), botão "olho" (ocultar valores **[Hipótese]**),
  botão de recarregar, menu do usuário (nome + @usuário).
- **Cabeçalho "hero"** nas páginas de listagem: título de efeito ("Clientes que viram resultado."), subtítulo, CTA principal, mini-indicadores.
- **Padrão de página de lista**: hero → barra de filtros em "pílulas" com contadores → conteúdo → **estado vazio com ilustração e CTA**.
- Estilo: fundo escuro com vermelho e mascote 3D. **Não será reproduzido** (a Neva mantém azul-gelo/branco e identidade própria).

---

## Captura 1 — Dashboard (início)

**Componentes [Evidente]**
- Card "Lucro no período": valor (R$ 0) + variação % (0%), botão **"Gerar resumo do período"**, seletor de período
  **Hoje · 7 dias · 1 mês · 3 meses · 6 meses (ativo) · 1 ano**, gráfico de linha com eixo Y em R$ e eixo X por mês (Mai–Out),
  rodapé com "Ticket médio R$ 0" e legenda **Lucro líquido / Receita total**.
- Card promocional "Sua próxima venda começa agora." — "0 empresas esperando seu próximo movimento" + botão "+" (CTA para prospectar/criar oportunidade **[Hipótese]**).
- Card "Lucro por período": valor, variação, seletor "6 meses", gráfico de barras com rótulos R$ 0 por mês.
- Painel direito **"Minha carteira"**: botão "+ Nova venda"; cartão visual com **"Lucro disponível R$ 0 · 0%"** e "Receita R$ 0";
  botões **Cliente** e **Venda** (atalhos de criação); lista **"Vendas recentes"** com link "Ver todas" e estado vazio "Registrar primeira venda".

**Interações possíveis**: trocar período (recalcula KPIs e gráficos), gerar resumo (**[Hipótese]** texto gerado por IA a partir dos dados do período), ocultar valores, criar cliente/venda, abrir vendas recentes.

**Dados necessários**: vendas com **receita e lucro líquido (custo)**, data, ticket médio = receita ÷ nº de vendas, variação vs. período anterior.

**Já existe na Neva**: dashboard com receita recebida, receita 6 meses (fixo), funil, tarefas, vendas recentes, sem seletor de período.
**Ausente**: seletor de período; **lucro** (hoje só há valor da venda, sem custo); variação % vs. período anterior; ticket médio; gráfico de linha receita×lucro; resumo por IA;
ocultar valores; cartão "carteira"; atalhos Cliente/Venda; paleta ⌘Espaço.
**Dúvidas**: o que é "Lucro disponível" (lucro já recebido? saldo?); função do botão amarelo e do alerta; o que "AO VIVO" faz de fato.

---

## Captura 2 — Clientes ("Relationship desk")

**Componentes [Evidente]**
- Hero "Clientes que viram resultado." + CTA **Novo cliente**.
- 4 indicadores: **Clientes cadastrados** (na sua carteira) · **Em negociação** (oportunidades abertas) · **Projetos fechados** (% de conversão) · **Receita gerada** (nº de vendas registradas).
- "Sua carteira — 0 de 0 empresas no radar", abas por estágio: **Todos · Lead · Negociação · Proposta enviada · Cliente**.
- Tabela com colunas **EMPRESA · CONTATO · ESTÁGIO · ENTREGA DIGITAL · RESULTADO**; estado vazio com ícone de "adicionar pessoa".

**Relações**: o estágio do cliente usa o **mesmo vocabulário do CRM** (captura 5) → cliente e oportunidade parecem compartilhar o ciclo (**[Hipótese]**: um cadastro único de empresa com estágio). "Entrega digital" **[Hipótese]** liga a cliente a sites/projetos entregues (captura 4). "Resultado" **[Hipótese]** = receita/lucro do cliente.

**Já existe na Neva**: clientes (CRUD, busca, total pago, nº de vendas); leads separados de clientes (conversão manual).
**Ausente**: estágio no cliente com abas por estágio; coluna entrega digital (vínculo cliente↔sites/projetos); indicador de conversão e "em negociação"; visão unificada empresa/lead/cliente; busca por telefone já existe.
**Dúvidas**: se "Lead/Negociação/Proposta" são clientes ou oportunidades filtradas; campos exatos do formulário "Novo cliente" (não visível).

---

## Captura 3 — Vendas ("Result room"; vendas = projetos)

**Componentes [Evidente]**
- Hero "Projetos que viraram resultado." + CTA **Nova venda**.
- Indicadores: **Faturamento · Lucro líquido · Margem média · Ticket médio**.
- Filtros em pílulas com contador: **Todas · Melhor margem · Entrega próxima · Atrasadas · Entregues · Sem cliente**; à direita "no recorte" e "atrasadas".
- Área de lista vazia (ilustração).

**Leitura**: cada venda é tratada como **projeto com margem, prazo de entrega e status de entrega**, e pode existir **sem cliente vinculado** (filtro "Sem cliente").

**Já existe na Neva**: vendas com cliente, produto, valor, status pendente/pago/cancelado, data.
**Ausente**: **custo/lucro e margem**; **data de entrega e status de entrega** (entregue/atrasada/próxima); filtros inteligentes com contadores; indicadores de margem/lucro/ticket; ordenação por margem.
**Dúvidas**: como o custo é informado (campo único? itens?); formulário "Nova venda" não visível; se há pagamentos parcelados.

---

## Captura 4 — Sites (portfólio)

**Componentes [Evidente]**
- Hero "Sites que falam por você." + CTA **Adicionar site**; contadores **NO ACERVO** e **PUBLICADOS**.
- Filtro: **Todos · Publicado · Em desenvolvimento · Arquivado**.
- Botão **"Builder de Sites 25/10"** (contador/cota; semântica "25/10" **ambígua**), "00 projetos encontrados".
- Busca por **site, domínio ou cliente**; estado vazio "Seu próximo site merece uma vitrine."

**Leitura**: é um **acervo de sites** (com domínio e cliente) + acesso a um **builder** com limite de uso (**[Hipótese]**: créditos de geração).

**Já existe na Neva**: projetos (site/app/sistema), publicação em `/s/slug`, IDE, geração com IA.
**Ausente**: status "em desenvolvimento/arquivado"; campos **domínio** e **cliente** no projeto; arquivar; cota de uso do builder; contadores acervo/publicados no topo.
**Dúvidas**: o que é "25/10"; se o acervo inclui sites externos já existentes ou só gerados na plataforma.

---

## Captura 5 — CRM Kanban ("Pipeline studio")

**Componentes [Evidente]**
- Hero "CRM Kanban." com contagem de oportunidades; botões **Editar funil · Importar carteira · Nova oportunidade**; "Minimizar header".
- Contadores por etapa: **Novos contatos · Qualificados · Proposta enviada · Em negociação · Conquistados**.
- Barra: abas **Todas · Minhas · Em atraso · Prioritárias**; **Arquivados (0)**; alternância quadro/lista; busca "Buscar no quadro"; **Filtros**; menu de exportação.
- Colunas com contagem, **valor previsto (R$)**, botão "+" e **"Adicionar oportunidade"**; rodapé "Sincronizado com sua conta · 0 arquivadas" e "Arraste os cards entre etapas".

**Já existe na Neva**: kanban com arrastar-e-soltar, lista, importação/exportação CSV, atividades, conversão em cliente, valor por etapa.
**Ausente**: **etapas personalizáveis ("Editar funil")** (hoje fixas); **arquivar**; abas Minhas/Em atraso/Prioritárias; prioridade e prazo na oportunidade; filtros avançados; "+" rápido por coluna; minimizar header; indicador de sincronização.
**Dúvidas**: critério de "Em atraso" (prazo? ausência de atividade?) e de "Prioritárias"; campos de uma "oportunidade" no formulário.

---

---

## Captura 6 — Builder de Sites (gerador por prompt) — marcado **"EM BREVE"**

**Componentes [Evidente]**: "← Voltar aos sites"; etiqueta "BUILDER DE SITES · EM BREVE"; título "O que vamos criar, {usuário}?"; campo de prompt
"Descreva o site que você quer criar…"; seletor de **modelo/nível ("Syre / Medium")**; botões **+** (anexar), **Otimizar prompt**, paleta (estilo/cores), microfone (**[Hipótese]** ditado por voz),
**Criar site**; galeria de **modelos iniciais** (Design de interiores, Estúdio de tecnologia, Operações com IA, Agência de IA) com carrossel e "Ver todos os modelos".
**Relações**: abre a partir de Sites (botão "Builder de Sites 25/10", cap. 4); o "25/10" provavelmente é a cota do builder. **O próprio sistema de referência o rotula "em breve" — não há como saber como ele realmente funciona.**
**Já existe na Neva**: geração de projeto por IA (brief + nome + tipo), modelos prontos de site/app/sistema, IDE.
**Ausente**: tela única de prompt com galeria de modelos visuais; otimizar prompt (IA); anexos/referências; escolha de estilo/paleta; nível de esforço do modelo; entrada por voz; cota de uso; mais modelos (hoje 3 tipos).
**Dúvidas**: o que "Syre" significa (provavelmente o nome do modelo/agente deles); o que o botão "+" anexa; se a geração é por etapas.

## Captura 7 — Design Makers (biblioteca de referências de design)

**Componentes [Evidente]**: hero "Identidades reais. DESIGN.md prontos."; texto: explorar sites do mundo, achar referência e **levar o DESIGN.md completo** para o projeto;
busca "Buscar referência, estilo ou categoria"; "24 referências"; ordenação "Nome: A→Z"; filtros **Nicho · Estilo visual · Tipo de site**; atalhos **Tudo · SaaS · Agências · E-commerce · IA · Fintech**; "Limpar filtros"; grade de cartões com miniatura do site.
**[Hipótese]** Cada cartão abre um detalhe com um arquivo **DESIGN.md** (tokens, tipografia, cores, componentes) para copiar/baixar e usar como contexto de IA ao gerar sites.
**Já existe na Neva**: nada equivalente.
**Ausente**: catálogo de referências com filtros e DESIGN.md; ligação com o gerador (usar DESIGN.md como contexto).
**Dúvidas / cuidado**: o conteúdo (24 sites reais e seus DESIGN.md) é **curadoria deles** — a Neva precisaria de acervo **próprio** (ex.: DESIGN.md originais e referências cadastradas por admins), sem copiar o catálogo.

## Captura 8 — Acervo (Prompt Lab · Skill Vault · Animações · Gerar com IA)

**Componentes [Evidente]**: faixa de abas **Prompt Lab** (prompts prontos para usar) · **Skill Vault** (métodos e instalação) · **Animações** (movimento para sites) · botão **"Gerar com IA" (VIP)**.
Prompt Lab: hero "Prompts para sair do rascunho." ("copie ou baixe e ajuste no seu próprio chat"); selos "2 recursos publicados · Texto completo · Sincronizado";
busca "por objetivo, área ou palavra-chave"; categorias (Todos / "Design e produto"); "02 encontrados"; lista "Explore os prompts" (01 "Direção de landing page") com painel de detalhe.
**Interações [Evidente/Hipótese]**: buscar, filtrar por categoria, abrir recurso, **copiar** e **baixar** o texto; "VIP" indica recurso restrito por plano (**[Hipótese]**).
**Já existe na Neva**: nada equivalente (a IDE tem assistente, mas sem biblioteca de prompts/skills).
**Ausente**: biblioteca de recursos (prompts, skills, animações) com CRUD admin, categorias, busca, copiar/baixar; níveis de acesso por plano.
**Dúvidas**: o que é "Skill Vault" (**[Hipótese]** pacotes de instruções para agentes de código com instruções de instalação); como "Animações" são entregues (trechos de código? demos?).

## Captura 9 — Play (vídeos e conteúdos)

**Componentes [Evidente]**: hero "Conhecimento para criar sem parar." (vídeos, análises e práticas, "sem etapas obrigatórias"); indicador **"Conteúdos vistos 0% — 0 de 1 conteúdo visto · 0s assistidos"**
(mede **itens vistos e tempo assistido**); bloco "Entre no Play" com botão **Explorar conteúdos**; cartões de categorias/coleções (ferramentas de IA, Venda, Estratégia).
**Já existe na Neva**: Academia (cursos → aulas, vídeo YouTube/Vimeo, progresso por aula).
**Ausente**: conteúdo avulso em coleções (sem trilha obrigatória); **tempo assistido**; capas/categorias; "continuar de onde parou".
**Dúvidas**: origem/hospedagem dos vídeos; como "assistido" é medido (**[Hipótese]** evento do player).

## Captura 10 — Prospecção "Code Hunter" (mapa)

**Componentes [Evidente]**: layout em duas colunas: painel de passos + **mapa escuro em tela cheia**.
- **01 Defina o alvo**: *Segmento* (opcional, "Clínicas, restaurantes, academias…") e *Localidade* ("Cidade, bairro ou estado"); dica "**em branco, a busca considera somente os pins do mapa**".
- **02 Qualificação**: resumo "**Sem site · 100 créditos · qualquer nota**" (filtros: apenas empresas **sem site**, **limite de 100 créditos** por busca, **nota mínima**) — expansível.
- **03 Território**: "1/3 áreas"; **raio das áreas** (slider, 10 km); botão de ação cortado no rodapé (provavelmente adicionar área/buscar).
- Mapa: pin **P1** com círculo do raio; cartão "**Território conectado — 1 área selecionada (01/03)** · 10 km sincronizados · 0 sinais encontrados"; cartão "**Potencial do território 0% — aguardando sinais**";
  busca "Explorar o mapa — cidade, bairro ou endereço" + **Ir ao local**; controles de zoom (12) e centralizar.
**Interações [Evidente/Hipótese]**: posicionar até 3 áreas no mapa, ajustar raio, buscar empresas dentro das áreas; resultados viram "sinais"; "potencial" = **[Hipótese]** proporção de empresas qualificadas (ex.: sem site) na área.
**Já existe na Neva**: busca textual por segmento + localização via Google Places (exige chave), com importação como leads e detecção de duplicata por nome+telefone.
**Ausente**: **mapa interativo**; áreas por **raio** (até 3); filtro **"sem site"** e **nota mínima**; **sistema de créditos/limite por busca**; indicador de potencial do território; resultados sobre o mapa.
**Dúvidas / limitações**: provedor do mapa e das empresas não identificável pela imagem; como "créditos" são consumidos (por resultado? por busca?). A API oficial Google Places permite restringir por círculo e retorna site/nota, então os filtros são viáveis **com chave**; mapa exige biblioteca de mapas (ex.: Leaflet/MapLibre com tiles autorizados).

## Captura 11 — Associação / planos ("Seu lugar dentro da Code Makers") — **primeira na ordem do menu**

> Observação: as capturas 11–13 chegaram só como imagem na conversa e **não foram gravadas como arquivo** em `docs/referencias/` (limitação do meu ambiente); a análise abaixo é a única cópia.

**Componentes [Evidente]**: "← Voltar à central"; faixa **"ASSOCIAÇÃO ATIVA — Acesso concedido pela Code Makers"** com "SEU CARTÃO: Code Member";
três cartões de nível: **01 Code Member (porta de entrada — "seu cartão")**, **02 Code Creator (círculo de criação — "acesso reservado")**, **03 Code Elite (círculo elite — "acesso reservado")**.
**Leitura**: sistema de **planos/níveis de acesso**; níveis superiores aparecem bloqueados ("reservado"). O texto "concedido pela Code Makers" sugere que o nível é **atribuído pelo administrador** (**[Hipótese]**), não comprado na tela.
Relações: "Meu plano — acesso e benefícios" em Configurações (cap. 13); selos "VIP" (cap. 8) e "Code Elite" (cap. 12) indicam recursos **condicionados ao plano**. Na cap. 12 o usuário Code Member abre uma tela marcada "Code Elite" — **não dá para saber** se o bloqueio é só visual ou se há limites (ex.: créditos).
**Já existe na Neva**: apenas perfis de permissão (admin/membro/leitura), sem planos/níveis nem benefícios.
**Ausente**: entidade **plano/nível** com benefícios, atribuição por admin, bloqueio de recursos por nível (no servidor), tela de associação.
**Dúvidas**: preços/pagamento existem? o que cada nível libera? (a parte inferior dos cartões, com benefícios, está cortada).

## Captura 12 — Gerador de Prompts ("Code Elite")

**Componentes [Evidente]**: hero "Gerador de Prompts." ("Descreva uma ideia ou cole seu prompt. A IA prepara uma versão pronta para usar."); abas **Criar prompt · Meus prompts** ("Salvos na sua conta");
modo **Criar a partir de uma ideia** / **Melhorar meu prompt** (colar um prompt existente); **Formato do prompt final: Texto | JSON** (aviso: "JSON organiza as instruções, mas não garante uma resposta melhor da IA");
campo "Qual é a sua ideia?" com exemplo; painel direito **PROMPT FINAL** com estado vazio ("Sua ideia entra aqui. O prompt sai pronto.").
**Interações [Hipótese]**: enviar a ideia à IA → prompt estruturado no painel; copiar/salvar em "Meus prompts" (histórico por conta).
**Já existe na Neva**: nada (a IDE tem chat de IA, mas não gerador/otimizador de prompts nem biblioteca pessoal). Parte da lógica serve ao "Otimizar prompt" do Builder (cap. 6).
**Ausente**: gerador/otimizador de prompts via IA (real, exige chave), formato texto/JSON, "Meus prompts" (CRUD por usuário), copiar/baixar.
**Dúvidas**: modelo usado e limites de uso; botão de ação abaixo do campo (cortado).

## Captura 13 — Configurações ("Central da conta")

**Componentes [Evidente]**: painel/modal com botão fechar; navegação lateral com **8 seções** ("01 de 08"), 6 visíveis:
**Meu perfil** (identidade e contato) · **Segurança** (senha e sessões) · **Notificações** (alertas de vendas) · **Privacidade** (valores no painel) · **CRM** (Code Hunter e funil) · **Meu plano** (acesso e benefícios) · +2 não visíveis.
Seção Perfil: **Nome completo**, **Nome de usuário** (@handle, "identifica sua conta no painel"), botão **Salvar perfil**.
**Relações [Hipótese]**: *Privacidade* controla o botão "olho" que oculta valores (cap. 1); *CRM* configura **etapas do funil** ("Editar funil", cap. 5) e **parâmetros do Code Hunter** (cap. 10: créditos, raio, qualificação); *Notificações* = alertas de vendas; *Segurança* = senha e **lista/encerramento de sessões**.
**Já existe na Neva**: perfil (nome), troca de senha, status de integrações.
**Ausente**: nome de usuário (@), contato (telefone etc.), sessões ativas com encerrar, preferências de notificação (e o que as dispararia), preferência de privacidade persistente, configurações de CRM/prospecção, tela Meu plano, 2 seções desconhecidas.
**Dúvidas**: seções 7 e 8 (talvez Integrações/Aparência/Dados — não há como saber); canais de notificação (e-mail, push, WhatsApp?).

## Relações entre módulos (hipótese de modelo)

```
Prospecção (mapa) → Empresa/Lead ──(estágio)──▶ CRM Kanban ──▶ Cliente ──▶ Venda/Projeto (custo, margem, entrega) ──▶ Dashboard (lucro, ticket, período)
                                                         └──────────▶ Site/Entrega digital (domínio, status)
```

## Pendências para a próxima rodada de capturas
Formulários (Novo cliente, Nova venda, Nova oportunidade, Adicionar site), botão amarelo/alerta do dashboard, seções 7–8 de Configurações, benefícios de cada plano,
detalhe de um item de Design Makers / Prompt Lab / Skill Vault / Animações / Play, tela "Gerar com IA (VIP)", Configurações, menu do usuário, estados **com dados**, versão mobile.

## Índice das capturas salvas (`docs/referencias/`)
11 Associação/planos (1ª do menu) · 12 Gerador de Prompts · 13 Configurações *(11–13 sem arquivo salvo)*
01 Dashboard · 02 Clientes · 03 Vendas · 04 Sites · 05 CRM Kanban · 06 Builder de Sites · 07 Design Makers · 08 Acervo/Prompt Lab · 09 Play · 10 Prospecção Code Hunter.
> São imagens de um produto de terceiros, usadas só como referência interna de análise.
