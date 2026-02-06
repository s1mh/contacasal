# Brand Guidelines — Conta de Casal

## Essência da marca

- **Promessa**: ajudar o casal a dividir gastos com clareza, sem fricção e sem clima ruim.
- **Personalidade**: leve, acolhedora, prática, transparente.
- **Princípios**:
  - **Clareza > complexidade** (explicar de forma simples).
  - **Gentileza** (sem tom punitivo/culpabilizante).
  - **Cooperação** (duas pessoas, um espaço).

## Identidade visual (alto nível)

- **Estilo**: minimalista com “soft glass” (transparências sutis, bordas suaves e sombras leves).
- **Arredondamentos**: generosos (o produto usa `--radius: 1rem`).
- **Motion**: microanimações gentis (ex.: “cat-idle”, “wiggle”) para reforçar carinho, não infantilizar.

## Cores

As cores oficiais estão em `brand/colors/palette.md` e no app em `src/index.css` (CSS vars).

- **Primária (coral/pêssego)**: ações principais e destaque.
- **Secundária (sálvia)**: estados positivos, equilíbrio, apoio.
- **Accent (lavanda)**: detalhes e variação visual.
- **Neutros quentes**: base do “calor” da marca.

### Uso (do/don’t)

- **Do**: usar `bg-primary text-primary-foreground` para CTAs.
- **Do**: usar “glass” em áreas elevadas/overlays.
- **Don’t**: usar preto puro como fundo primário no tema claro.
- **Don’t**: introduzir tons saturados sem token.

## Tipografia

- **Fonte**: Plus Jakarta Sans.
- **Tom**: moderno, simples e humano.
- Guia detalhado em `brand/typography/typography.md`.

## Logo (pendente)

Ainda não existe um logo oficial versionado nesta base. Quando houver, padronizar:

- **Formatos**: SVG (principal), PNG (fallback), ícone.
- **Variações**: claro, escuro, monocromático.
- **Tamanhos**: 16/32/64/128/256/512 e 1024 (stores).

## Escrita (microcopy)

Regras de ouro:

- Preferir frases curtas e concretas.
- Explicar “o que acontece agora” (feedback e próximos passos).
- Evitar termos financeiros técnicos quando não necessários.

Exemplos:

- “Criar espaço” em vez de “Criar instância”.
- “Convide seu par” em vez de “Compartilhe o código”.

