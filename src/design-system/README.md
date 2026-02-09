# Design System (código)

## Objetivo

Centralizar **tokens** e **patterns** para reduzir hardcodes e garantir consistência visual.

## Fonte de verdade

- Tokens semânticos (tema): `src/index.css` (CSS vars)\n
- Consumo via Tailwind: `tailwind.config.ts`

## Estrutura

- `src/design-system/tokens/` — valores e helpers (cores, tipografia, sombras, etc.)
- `src/design-system/patterns/` — padrões reutilizáveis (gradientes, superfícies)\n
- `src/design-system/components/` — (quando necessário) componentes “base” que encapsulam padrões

## Regras

- Preferir `bg-primary`, `text-foreground` etc.\n
- Quando precisar de cor dinâmica (ex.: tags), usar `tokens/color-utils`.\n
- Evitar strings de gradiente e cores hardcoded em componentes; mover para `patterns/`.

