# Mascote da Neva Growth: prompts por tela

Personagem de referência: `docs/mascote/referencia-raposa.png` (raposa-do-ártico branca, olhos azuis, jaqueta azul-marinho com detalhes em ciano e logo "N", cauda com ponta azul-gelo, cenário de montanhas nevadas).

Total: **11 prompts** (1 folha do personagem + 6 poses de abertura + 4 estados vazios). A primeira é obrigatória: ela fixa o personagem. As outras 10 devem ser geradas anexando o resultado dela como referência.

## Bloco fixo (cole no início de TODOS os prompts)
```
Character: the same white Arctic fox mascot from the reference image. White fluffy fur, large expressive blue eyes, pointed ears with light-blue inner ear, friendly confident smile, bushy tail with ice-blue tip. Wears a navy-blue tech hoodie jacket with cyan glowing trim and a small "N" logo on the chest, black inner shirt, navy pants. Style: premium 3D animated-film render, soft studio lighting, clean cel-like shading, consistent proportions and colors with the reference. Palette: ice blue, white, navy, cyan accents only. No red. No text except the "N" logo. No watermark.
```

## Formato de saída (vale para todos)
- Fundo transparente (PNG ou WebP). Se o gerador não suportar, fundo azul-gelo liso `#d3e6f6`, para eu recortar.
- Quadrado 1:1, mínimo 1024 px, personagem inteiro dentro do quadro com margem.
- Nome do arquivo na lista abaixo; salvar em `public/img/mascote/`.

## Prompts

**00 · `folha.png` · Folha do personagem (gerar primeiro)**
`[Bloco fixo] Character turnaround sheet: front view, three-quarter view, side view and back view, full body, neutral standing pose, plus 4 face expressions (happy, thinking, surprised, determined). Plain light background.`

**01 · `dashboard.png` · Dashboard, card "Sua próxima venda começa agora"**
`[Bloco fixo] Full body, standing at a slight angle, pointing one hand toward the upper right as if showing the way forward, other hand holding a small tablet with the "N" logo. Behind him a translucent glass panel with a rising ice-blue bar chart and an upward arrow (no readable numbers).`

**02 · `clientes.png` · Clientes, "Clientes que viram resultado"**
`[Bloco fixo] Full body, waving with one hand, other hand holding a tablet that shows a list of four round contact avatars with lines (no readable text). Warm welcoming smile.`

**03 · `vendas.png` · Vendas, "Projetos que viraram resultado"**
`[Bloco fixo] Full body, one fist raised in celebration, other arm holding a dark tablet showing an ascending bar chart with an arrow (no readable numbers). Proud, energetic expression.`

**04 · `sites.png` · Sites, "Sites que falam por você"**
`[Bloco fixo] Full body, holding an open laptop toward the viewer; the laptop screen shows a modern website with a snowy mountain hero image and cards (no readable text). Friendly, presenting pose.`

**05 · `crm.png` · CRM Kanban**
`[Bloco fixo] Full body, leaning on a standing kanban board with three columns and small white cards, one hand moving a card from one column to the next. Focused, smart expression.`

**06 · `boas-vindas.png` · Login e primeiro acesso**
`[Bloco fixo] Half body from the waist up, both arms open in a welcoming gesture, big smile, an ice-blue glowing sphere with the "N" logo floating between his hands.`

**07 · `vazio-vendas.png` · Estado vazio: "Nenhuma venda registrada"**
`[Bloco fixo] Full body, looking at a small empty glass chart panel, hand on chin, curious and optimistic expression, slightly smaller composition with lots of empty space around.`

**08 · `vazio-sites.png` · Estado vazio: "Seu próximo site merece uma vitrine"**
`[Bloco fixo] Full body, sitting on a snowy block holding a laptop with a blank browser window on the screen, relaxed, inviting expression.`

**09 · `vazio-clientes.png` · Estado vazio: carteira sem clientes**
`[Bloco fixo] Full body, holding a tablet with an empty contact list and a glowing plus symbol, encouraging gesture toward the viewer.`

**10 · `erro.png` · Erros e página não encontrada**
`[Bloco fixo] Full body, shrugging with open palms and a puzzled but friendly face, a small broken-link icon floating beside him.`

## Como eu uso depois que você enviar
Cada arquivo entra no bloco de abertura da tela correspondente (no lugar da ilustração geométrica atual) e nos estados vazios. Se faltar algum, a tela continua usando a ilustração geométrica atual.

## Estado dos arquivos
| # | Arquivo | Estado |
|---|---|---|
| 00 | folha | Recebida |
| 01 | dashboard | Em uso (card "Sua próxima venda") |
| 02 | clientes | Em uso (raposa acenando com o tablet de contatos), abertura de Clientes |
| 03 | vendas | Em uso |
| 04 | sites | Em uso |
| 05 | crm | Em uso |
| 06 | boas-vindas | Em uso na tela de login/primeiro acesso |
| 07 | vazio-vendas | Em uso no estado vazio de Vendas |
| 08 | vazio-sites | Em uso no estado vazio de Sites |
| 09 | vazio-clientes | Em uso no estado vazio de Clientes |
| 10 | erro | Em uso nas telas de erro de carregamento |

Originais com fundo: `docs/mascote/original-*.webp`. Versões em `public/img/mascote/`: recorte com fundo transparente (hero, clientes, erro) ou imagem original com cantos arredondados quando o recorte automático perdia partes do cenário (login, vazio-vendas, vazio-sites).

## Regra: mascotes sempre fixos
Os mascotes não têm nenhuma animação no site (sem flutuar, sem entrada, sem inclinação). Só o texto e os indicadores ao redor do mascote animam. O teste de interface verifica isso.

## Segunda leva: 11 poses para as demais telas
Mesmo bloco fixo e mesmo formato de saída da primeira leva. Anexe a folha do personagem (00) como referência em todos.

**11 · `play.png` · Play**
`[Bloco fixo] Full body, one arm holding a closed book against the chest, other hand opening an inviting palm toward the viewer, a slim laptop under the arm. Friendly, encouraging smile.`

**12 · `acervo.png` · Acervo**
`[Bloco fixo] Full body, holding three floating glass cards in both hands like a fan, each card with a tiny icon (image, speech bubble, curly braces), surprised and delighted expression.`

**13 · `design.png` · Design**
`[Bloco fixo] Full body, crouching slightly, holding several printed design reference sheets with color swatches and layout wireframes, one finger on chin, thoughtful curious look.`

**14 · `prospeccao.png` · Prospecção**
`[Bloco fixo] Full body, holding binoculars up to the eyes with one hand and pointing forward with the other, a small floating map pin glowing ice-blue next to him. Adventurous, focused.`

**15 · `prompts.png` · Gerador de Prompts**
`[Bloco fixo] Full body, writing on a floating translucent glass panel with one finger, tiny glowing sparks and a small star icon appearing from the fingertip, inspired smile.`

**16 · `configuracoes.png` · Configurações**
`[Bloco fixo] Full body, holding a large adjustable wrench in one hand and a small glowing gear in the other, relaxed confident stance, slight smirk.`

**17 · `associacao.png` · Associação**
`[Bloco fixo] Full body, proudly presenting a glowing membership card with the "N" logo in one hand, other hand on the chest, a small medal ribbon on the jacket, warm proud smile.`

**18 · `tarefas.png` · Tarefas**
`[Bloco fixo] Full body, holding a tall glass checklist panel with four items and the first two checked, giving a thumbs-up with the other hand. Satisfied, energetic.`

**19 · `produtos.png` · Produtos**
`[Bloco fixo] Full body, carrying an open cardboard box with a few small product shapes and a floating price tag with a generic currency symbol (no readable numbers), cheerful pose.`

**20 · `usuarios.png` · Usuários**
`[Bloco fixo] Full body, waving with one hand, three small round avatar bubbles floating behind in a row, welcoming expression.`

**21 · `academia.png` · Academia**
`[Bloco fixo] Full body, wearing a small graduation cap over the ears, holding an open book in one hand and a rolled diploma in the other, proud and bright smile.`

Ao receber cada arquivo, eu recorto o fundo, coloco na abertura da tela correspondente (já no visual novo, com o resto da tela redesenhada) e publico.

## Estado da segunda leva
Recebidos e em uso (fixos): 11 play, 12 acervo, 13 design, 14 prospeccao, 15 prompts. Faltam 16 configuracoes, 17 associacao, 18 tarefas, 19 produtos, 20 usuarios, 21 academia.
