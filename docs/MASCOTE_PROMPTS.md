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
