# Branding — Conta de Casal

Esta pasta contém **todo o branding** do app: identidade visual, tom de voz, paleta, tipografia e templates.

## Índice

- **Guidelines (uso da marca)**: `brand/guidelines/brand-guidelines.md`
- **Cores e acessibilidade**: `brand/colors/palette.md`
- **Tipografia**: `brand/typography/typography.md`
- **Tom de voz e mensagens**:
  - `brand/voice/tom-de-voz.md`
  - `brand/voice/mensagens-chave.md`
  - `brand/voice/glossario.md`
- **Templates (placeholders)**: `brand/templates/`
- **Press kit (assets exportáveis)**: `brand/press-kit/`
- **Landing page (HTML estático)**: `brand/landing-page/`

## Fonte de verdade (tokens)

As cores do produto vivem como **CSS variables** em `src/index.css` e são consumidas via Tailwind (`tailwind.config.ts`).

- O que estiver definido aqui (em `brand/`) deve refletir o que está em produção.
- Ao atualizar tokens no app, atualize também a documentação em `brand/colors/` e `brand/guidelines/`.

## Regras rápidas

- **Não inventar cores novas** sem passar pelos tokens.
- **Não hardcodar** HEX em componentes quando existir token equivalente.
- **Marca = empática e clara**: menos “fintech fria”, mais “organização leve para o casal”.

