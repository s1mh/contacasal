# Paleta de cores — Conta de Casal

## Fonte de verdade

- **App (produção)**: `src/index.css` (CSS vars em `:root` e `.dark`)
- **Classes**: `tailwind.config.ts` (mapeia tokens para `bg-primary`, `text-foreground`, etc.)

> Regra: **não** introduzir HEX hardcoded em componentes quando houver token equivalente.

## Tokens semânticos (tema claro)

Os valores abaixo estão em **HSL** (formato Tailwind/shadcn).

| Token | HSL | Uso |
|---|---:|---|
| `--background` | `30 30% 98%` | fundo principal |
| `--foreground` | `25 20% 20%` | texto principal |
| `--card` | `30 25% 99%` | superfícies (cards) |
| `--card-foreground` | `25 20% 20%` | texto em cards |
| `--primary` | `15 85% 65%` | CTA, ações primárias |
| `--primary-foreground` | `0 0% 100%` | texto em CTAs |
| `--secondary` | `145 30% 80%` | positivo, apoio |
| `--secondary-foreground` | `145 40% 20%` | texto em secundário |
| `--accent` | `270 40% 90%` | detalhes e variações |
| `--accent-foreground` | `270 40% 30%` | texto no accent |
| `--muted` | `30 15% 94%` | superfícies neutras |
| `--muted-foreground` | `25 10% 50%` | texto secundário |
| `--border` | `30 20% 90%` | bordas |
| `--input` | `30 20% 92%` | campos |
| `--ring` | `15 85% 65%` | foco |
| `--destructive` | `0 65% 55%` | ações destrutivas |
| `--destructive-foreground` | `0 0% 100%` | texto em destrutivo |

## Cores de pessoas

| Token | HSL | Uso |
|---|---:|---|
| `--person-1` | `350 70% 75%` | pessoa 1 (ênfase) |
| `--person-1-light` | `350 70% 92%` | fundo pessoa 1 |
| `--person-2` | `145 45% 70%` | pessoa 2 (ênfase) |
| `--person-2-light` | `145 45% 90%` | fundo pessoa 2 |

## Cores de categoria (tags)

| Token | HSL | Exemplo de uso |
|---|---:|---|
| `--tag-food` | `38 92% 50%` | Alimentação |
| `--tag-home` | `217 91% 60%` | Casa |
| `--tag-bills` | `0 84% 60%` | Contas |
| `--tag-leisure` | `262 83% 58%` | Lazer |
| `--tag-transport` | `189 94% 43%` | Transporte |
| `--tag-other` | `220 9% 46%` | Outros |

## Glass (efeito)

| Token | Valor | Uso |
|---|---:|---|
| `--glass-bg` | `0 0% 100% / 0.7` | fundo glass |
| `--glass-border` | `0 0% 100% / 0.3` | borda glass |
| `--glass-shadow` | `0 0% 0% / 0.05` | sombra glass |

## Acessibilidade (checklist rápida)

- **Contraste**: validar pares `foreground/background` e `primary-foreground/primary` em WCAG AA.
- **Estado de foco**: garantir `--ring` visível em inputs e botões.
- **Modo escuro**: manter contraste de texto em cards e popovers.

