# Tipografia — Conta de Casal

## Fonte

- **Família**: Plus Jakarta Sans
- **Fallbacks**: system-ui, sans-serif
- **Onde é configurada**:
  - Import: `src/index.css`
  - Tailwind: `tailwind.config.ts` (`theme.extend.fontFamily.sans`)

## Objetivo tipográfico

- Ser **muito legível** em telas pequenas.
- Passar **calma e clareza** (sem “gritar fintech”).

## Hierarquia sugerida (mapa)

> Observação: o projeto usa Tailwind, então esta seção descreve padrões de classes (não valores fixos).

- **H1 (headline de marketing)**: `text-3xl sm:text-4xl font-bold tracking-tight`
- **H2 (seções)**: `text-2xl font-semibold tracking-tight`
- **H3 (cards/títulos)**: `text-lg font-semibold`
- **Body (padrão)**: `text-sm sm:text-base`
- **Small (labels/metadados)**: `text-xs text-muted-foreground`
- **Micro (evitar)**: evitar `text-[9px]` e `text-[10px]`; preferir escala definida (no design system).

## Tom de escrita (tipografia + copy)

- Preferir frases curtas, com pontuação simples.
- Evitar caixa alta integral (usa mal contraste e “agressividade”).

## Regras de uso

- **Números e moeda**: usar `tabular-nums` quando disponível (ou padrão no componente de valor).
- **Acessibilidade**: tamanho mínimo recomendado para texto: 12px equivalente (evitar micro-texto).

