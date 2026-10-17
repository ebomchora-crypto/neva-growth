# Referências visuais — análise das capturas do sistema de referência

> Fonte: capturas de tela enviadas pelo usuário (conta autenticada dele). Cada captura é um **estado estático**:
> o que está marcado como **[Evidente]** aparece na imagem; **[Hipótese]** é inferência minha e **não** é comportamento
> confirmado do sistema de referência. Todas as telas estão **vazias (R$ 0, 0 registros)**, então não se vê como os dados
> preenchidos aparecem.
> Status: fase de **análise**. Nenhuma implementação foi iniciada (aguardando "FINALIZEI AS PRINTS").

## Estrutura global observada (comum às 5 capturas)

- **Navegação por trilho lateral de ícones** (sem rótulos de texto), item ativo destacado. **[Evidente]**
  Ordem, de cima para baixo: logo · cartão de contato · início/dashboard · clientes · carteira (vendas) · navegador (sites) ·
  quadro/kanban (CRM) · grade com "+" (apps/ferramentas?) · separador · **5 ícones circulares com selo** · engrenagem · sair.
  - **[Dúvida]** O ícone de cartão de contato (1º) e a grade "+" (7º) não têm destino identificável. Os 5 ícones com selo
    abaixo do separador não são identificáveis (podem ser cursos, ferramentas, mídia, IA…). **Preciso de capturas dessas telas.**
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

## Relações entre módulos (hipótese de modelo)

```
Prospecção → Empresa/Lead ──(estágio)──▶ CRM Kanban ──▶ Cliente ──▶ Venda/Projeto (custo, margem, entrega) ──▶ Dashboard (lucro, ticket, período)
                                                         └──────────▶ Site/Entrega digital (domínio, status)
```

## Pendências para a próxima rodada de capturas
Formulários (Novo cliente, Nova venda, Nova oportunidade, Adicionar site), os 5 módulos do grupo inferior do trilho, ícones 1 e 7, o botão amarelo/alerta,
Builder de Sites (25/10), Configurações, menu do usuário, estados **com dados**, versão mobile.
