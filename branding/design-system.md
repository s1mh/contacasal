# Conta de Casal — Design System

> Documentação técnica completa de todos os design tokens, componentes e padrões.  
> Fonte de verdade para desenvolvimento.

---

## 1. Tokens de Cor

### 1.1 CSS Variables (HSL sem `hsl()`)

Definidas em `src/index.css` e consumidas via `tailwind.config.ts`.

#### Light Mode (`:root`)

```css
/* Fundos */
--background:          30 30% 98%;     /* #FDF8F6 */
--foreground:          25 20% 20%;     /* #3D3330 */
--card:                30 25% 99%;     /* #FEFCFB */
--card-foreground:     25 20% 20%;     /* #3D3330 */
--popover:             30 25% 99%;
--popover-foreground:  25 20% 20%;
--muted:               30 15% 94%;     /* #F0EDEB */
--muted-foreground:    25 10% 50%;     /* #8C8278 */

/* Semânticas */
--primary:             15 85% 65%;     /* #E8845A - Coral */
--primary-foreground:  0 0% 100%;      /* #FFFFFF */
--secondary:           145 30% 80%;    /* #B3D9C0 - Sage */
--secondary-foreground:145 40% 20%;    /* #1F3D28 */
--accent:              270 40% 90%;    /* #DDD0F0 - Lavender */
--accent-foreground:   270 40% 30%;    /* #4A3366 */
--destructive:         0 65% 55%;      /* #D43F3F */
--destructive-foreground: 0 0% 100%;

/* Utilidades */
--border:              30 20% 90%;     /* #EAE5E1 */
--input:               30 20% 92%;     /* #EDE9E6 */
--ring:                15 85% 65%;     /* Coral (focus) */
--radius:              1rem;           /* 16px */

/* Pessoas */
--person-1:            350 70% 75%;    /* Rosa/Pink */
--person-1-light:      350 70% 92%;
--person-2:            145 45% 70%;    /* Verde/Green */
--person-2-light:      145 45% 90%;

/* Categorias */
--tag-food:            38 92% 50%;     /* Amarelo/Laranja */
--tag-home:            217 91% 60%;    /* Azul */
--tag-bills:           0 84% 60%;      /* Vermelho */
--tag-leisure:         262 83% 58%;    /* Roxo */
--tag-transport:       189 94% 43%;    /* Ciano */
--tag-other:           220 9% 46%;     /* Cinza */

/* Glass */
--glass-bg:            0 0% 100% / 0.7;
--glass-border:        0 0% 100% / 0.3;
--glass-shadow:        0 0% 0% / 0.05;
```

#### Dark Mode (`.dark`)

```css
--background:          25 20% 8%;
--foreground:          30 20% 95%;
--card:                25 18% 12%;
--card-foreground:     30 20% 95%;
--primary:             15 85% 65%;     /* Mantém coral */
--secondary:           145 25% 25%;
--accent:              270 30% 25%;
--muted:               25 15% 18%;
--muted-foreground:    30 10% 60%;
--border:              25 15% 20%;
--input:               25 15% 22%;
--glass-bg:            25 18% 12% / 0.8;
--glass-border:        0 0% 100% / 0.1;
--glass-shadow:        0 0% 0% / 0.3;
```

### 1.2 Uso no Tailwind

```tsx
// Backgrounds
className="bg-background"         // Fundo da página
className="bg-card"               // Fundo de card
className="bg-muted"              // Fundo de input/seção secundária
className="bg-primary"            // Botão principal

// Texto
className="text-foreground"       // Texto primário
className="text-muted-foreground" // Texto secundário
className="text-primary"          // Texto de destaque

// Bordas
className="border-border"         // Borda padrão
className="border-primary"        // Borda de destaque
```

---

## 2. Tipografia

### 2.1 Font Stack

```css
font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
```

### 2.2 Escala

| Token | Classe Tailwind | Tamanho | Peso | Line Height |
|---|---|---|---|---|
| `display` | `text-3xl font-bold` | 30px | 700 | 1.2 |
| `h1` | `text-2xl font-bold` | 24px | 700 | 1.3 |
| `h2` | `text-xl font-semibold` | 20px | 600 | 1.35 |
| `h3` | `text-base font-semibold` | 16px | 600 | 1.4 |
| `body` | `text-sm` | 14px | 400 | 1.5 |
| `body-small` | `text-xs` | 12px | 400 | 1.5 |
| `caption` | `text-[10px] font-medium` | 10px | 500 | 1.4 |
| `button` | `text-sm font-semibold` | 14px | 600 | 1 |

---

## 3. Espaçamento

### 3.1 Escala base (Tailwind)

| Token | Valor | Uso |
|---|---|---|
| `0.5` | 2px | Micro ajustes |
| `1` | 4px | Gap mínimo |
| `1.5` | 6px | Padding interno de pills |
| `2` | 8px | Gap entre ícone e texto |
| `3` | 12px | Padding de tags, gaps menores |
| `4` | 16px | Padding padrão de cards |
| `5` | 20px | Padding de seções |
| `6` | 24px | Gap entre seções |
| `8` | 32px | Margin entre grupos |

### 3.2 Padrões de composição

```tsx
// Card padrão
className="bg-card rounded-3xl p-4 shadow-glass border border-border/50"

// Card com glass
className="glass-card p-4"

// Seção
className="space-y-4 px-4"

// Grid de itens
className="grid grid-cols-2 gap-3"
```

---

## 4. Border Radius

| Token | Valor | Classe Tailwind | Uso |
|---|---|---|---|
| `sm` | 12px | `rounded-sm` | Inputs internos |
| `md` | 14px | `rounded-md` | Badges, pills |
| `lg` | 16px | `rounded-lg` | Inputs, botões |
| `xl` | 12px | `rounded-xl` | Cards menores |
| `2xl` | 16px | `rounded-2xl` | Cards médios |
| `3xl` | 24px | `rounded-3xl` | Cards principais |
| `4xl` | 32px | `rounded-4xl` | Modais grandes |
| `full` | 50% | `rounded-full` | Avatares, pills |

---

## 5. Sombras

| Token | Valor | Classe Tailwind | Uso |
|---|---|---|---|
| `glass` | `0 8px 32px 0 rgba(0,0,0,0.04)` | `shadow-glass` | Cards |
| `glass-lg` | `0 12px 48px 0 rgba(0,0,0,0.06)` | `shadow-glass-lg` | Modais, destaque |
| `fab` | `0 8px 32px -4px rgba(0,0,0,0.15)` | `shadow-fab` | Botão flutuante |

---

## 6. Animações

### 6.1 Transições de página

| Nome | Duração | Timing | Uso |
|---|---|---|---|
| `fade-in` | 300ms | ease-out | Entrada de página |
| `slide-up` | 400ms | ease-out | Entrada com slide |
| `scale-in` | 200ms | ease-out | Entrada com escala |

### 6.2 Animações de gatinho

| Nome | Duração | Loop | Uso |
|---|---|---|---|
| `cat-idle` | 2s | ∞ | Estado padrão selecionado |
| `wiggle` | 0.6s | 1x | Hover sobre avatar |
| `bounce-gentle` | 0.8s | ∞ | Loading states |
| `cat-celebrate` | 0.5s | 1x | Seleção de avatar |
| `cat-playing` | 1.5s | ∞ | Interações lúdicas |
| `cat-sleeping` | 3s | ∞ | Estado inativo |
| `cat-licking` | 1.8s | ∞ | Auto-cuidado |
| `cat-rolling` | 2s | ∞ | Diversão |
| `cat-stretching` | 2.5s | ∞ | Espreguiçar |
| `cat-lying` | 4s | ∞ | Relaxado |
| `cat-purring` | 0.5s | ∞ | Ronronando (sutil) |
| `cat-tail-wag` | 0.8s | ∞ | Abanando rabo |

### 6.3 Animações de UI

| Nome | Duração | Loop | Uso |
|---|---|---|---|
| `bounce-soft` | 2s | ∞ | Elementos flutuantes |
| `pulse-subtle` | 2s | ∞ | Botões com atenção |
| `wave` | 1.5s | 1x | Aceno |
| `jump` | 0.6s | 1x | Salto de celebração |
| `spin-slow` | 3s | ∞ | Sparkles |
| `sync-pulse` | 1.2s | ∞ | Indicador de sync |
| `fade-slide-up` | 0.4s | 1x | Entrada suave |

### 6.4 Animações de AI

| Nome | Duração | Loop | Uso |
|---|---|---|---|
| `ai-gradient` | 8s | ∞ | Fundo gradiente AI |
| `ai-gradient-fast` | 3s | ∞ | Loading AI |
| `ai-blob-1` | 15s | ∞ | Blob decorativo 1 |
| `ai-blob-2` | 18s | ∞ | Blob decorativo 2 |
| `ai-blob-fast-*` | 2-5s | ∞ | Blobs de thinking |
| `ai-shimmer` | 2s | ∞ | Shimmer de loading |

### 6.5 Toast

| Nome | Duração | Uso |
|---|---|---|
| `toast-liquid-in` | 0.4s | Entrada de toast |
| `toast-liquid-out` | 0.3s | Saída de toast |
| `toast-progress` | 10s | Barra de progresso |

---

## 7. Componentes Base (shadcn/ui)

### 7.1 Biblioteca

Framework: **shadcn/ui** com Radix UI primitives  
Config: `components.json`

### 7.2 Catálogo de componentes UI

| Componente | Arquivo | Descrição |
|---|---|---|
| `Button` | `src/components/ui/button.tsx` | Botão com variantes |
| `Input` | `src/components/ui/input.tsx` | Campo de texto |
| `Textarea` | `src/components/ui/textarea.tsx` | Área de texto |
| `Dialog` | `src/components/ui/dialog.tsx` | Modal/diálogo |
| `Drawer` | `src/components/ui/drawer.tsx` | Drawer mobile |
| `Card` | `src/components/ui/card.tsx` | Container de card |
| `Badge` | `src/components/ui/badge.tsx` | Badge/label |
| `Tabs` | `src/components/ui/tabs.tsx` | Navegação por abas |
| `Select` | `src/components/ui/select.tsx` | Select/dropdown |
| `Switch` | `src/components/ui/switch.tsx` | Toggle switch |
| `Slider` | `src/components/ui/slider.tsx` | Range slider |
| `Calendar` | `src/components/ui/calendar.tsx` | Date picker |
| `Tooltip` | `src/components/ui/tooltip.tsx` | Tooltip |
| `ScrollArea` | `src/components/ui/scroll-area.tsx` | Scroll container |
| `Separator` | `src/components/ui/separator.tsx` | Linha divisória |
| `Skeleton` | `src/components/ui/skeleton.tsx` | Loading skeleton |
| `Progress` | `src/components/ui/progress.tsx` | Barra de progresso |

### 7.3 Componentes customizados

| Componente | Arquivo | Descrição |
|---|---|---|
| `Avatar` | `src/components/Avatar.tsx` | Avatar de gatinho (centralizado) |
| `CatAnimation` | `src/components/CatAnimation.tsx` | Controller de animação de gato |
| `TagPill` | `src/components/TagPill.tsx` | Pill de categoria |
| `AnimatedPage` | `src/components/AnimatedPage.tsx` | Wrapper de transição de página |
| `BottomNav` | `src/components/BottomNav.tsx` | Navegação inferior mobile |
| `SyncIndicator` | `src/components/SyncIndicator.tsx` | Indicador de sincronização |
| `AIInsightsCard` | `src/components/AIInsightsCard.tsx` | Card de insights de IA |
| `AIBackgroundBlob` | `src/components/AIBackgroundBlob.tsx` | Blobs decorativos |
| `BalanceCard` | `src/components/BalanceCard.tsx` | Card de saldo |
| `ExpenseCard` | `src/components/ExpenseCard.tsx` | Card de gasto |
| `SettlementModal` | `src/components/SettlementModal.tsx` | Modal de acerto |
| `OnboardingModal` | `src/components/OnboardingModal.tsx` | Modal de onboarding |
| `ReconnectModal` | `src/components/ReconnectModal.tsx` | Modal de reconexão |

---

## 8. Sistema de Avatar (Componente Centralizado)

### 8.1 API do componente `<Avatar />`

```tsx
import { Avatar } from '@/components/Avatar';

interface AvatarProps {
  avatarIndex: number;           // 1-8 (obrigatório)
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  ringColor?: string;            // Hex da cor do perfil
  animated?: boolean;            // Animação contínua (idle)
  animateOnHover?: boolean;      // Wiggle no hover (true por padrão)
  animateOnce?: boolean;         // Anima uma vez e para
  selected?: boolean;            // Estado selecionado
  showBackground?: boolean;      // Fundo colorido (true por padrão)
  animation?: CatAnimationType;  // Tipo de animação
  onClick?: () => void;
  className?: string;
}
```

### 8.2 Tamanhos

| Size | Classe | Pixels | Uso |
|---|---|---|---|
| `xs` | `w-6 h-6` | 24px | Inline em listas de gastos |
| `sm` | `w-8 h-8` | 32px | Listas, grids compactos |
| `md` | `w-12 h-12` | 48px | Padrão, cards, navegação |
| `lg` | `w-16 h-16` | 64px | Perfil, modais |
| `xl` | `w-24 h-24` | 96px | Configurações, onboarding |
| `2xl` | `w-32 h-32` | 128px | Destaque, hero |

### 8.3 Uso correto

```tsx
// ✅ Correto — usa o componente centralizado
<Avatar avatarIndex={profile.avatar_index} size="md" ringColor={profile.color} />

// ❌ Incorreto — img tag direto
<img src={CAT_AVATARS[profile.avatar_index - 1]} className="w-12 h-12 rounded-full" />
```

---

## 9. Padrões de Layout

### 9.1 Página

```tsx
<AnimatedPage>
  <div className="min-h-screen bg-background px-4 pt-4 pb-24 safe-bottom">
    {/* Conteúdo */}
  </div>
</AnimatedPage>
```

### 9.2 Card padrão

```tsx
<div className="bg-card rounded-3xl p-4 shadow-glass border border-border/50">
  {/* Conteúdo do card */}
</div>
```

### 9.3 Seção com título

```tsx
<div className="space-y-3">
  <div className="flex items-center gap-2">
    <Icon className="w-5 h-5 text-primary" />
    <h3 className="font-semibold text-base">{title}</h3>
  </div>
  {/* Conteúdo */}
</div>
```

### 9.4 Navegação inferior (mobile-first)

```tsx
<BottomNav />  // Sempre no CoupleLayout
// Padding bottom: pb-24 para compensar
```

---

## 10. Utilitários de Formatação

### 10.1 Moeda (FONTE DE VERDADE)

```tsx
import { formatCurrency } from '@/lib/constants';

formatCurrency(150.50);  // "R$ 150,50" (pt-BR)
```

### 10.2 Data (FONTE DE VERDADE)

```tsx
import { formatDate } from '@/lib/constants';

formatDate('2026-02-06');  // "06 fev." (pt-BR)
```

> **Regra**: NUNCA usar `date-fns format()` ou `toLocaleString()` diretamente.  
> Sempre usar as funções centralizadas de `constants.ts`.

---

## 11. Breakpoints

| Nome | Largura mínima | Uso |
|---|---|---|
| `sm` | 640px | Small tablets |
| `md` | 768px | Tablets |
| `lg` | 1024px | Desktop |
| `xl` | 1280px | Large desktop |
| `2xl` | 1400px | Container max |

> **Mobile-first**: O design é primariamente para mobile. Desktop é um bônus.

---

## 12. Acessibilidade

### Requisitos
- Contraste mínimo WCAG AA (4.5:1 para texto, 3:1 para elementos grandes)
- Focus rings visíveis em todos os elementos interativos
- Labels em todos os inputs
- Textos alternativos em todas as imagens
- Animações respeitam `prefers-reduced-motion`
- Navegação por teclado funcional

### Checklist
- [ ] `aria-label` em botões de ícone
- [ ] `alt` em todas as imagens de avatar
- [ ] `role` e `aria-*` em componentes customizados
- [ ] Contraste verificado com a paleta light e dark
