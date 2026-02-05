
# Plano: Ajustes de UX e Novas Funcionalidades

## 1. Renomear "Acordos recorrentes" → "Gastos fixos" + Somar no Total

### Alterações
- Renomear todas as referências de "Acordos recorrentes" para "Gastos fixos" nos arquivos de tradução
- Em `History.tsx`: Somar o total dos gastos fixos ativos ao `totalAmount` do mês

### Arquivos
| Arquivo | Ação |
|---------|------|
| `src/lib/i18n/translations/pt-BR.ts` | `Acordos recorrentes` → `Gastos fixos` |
| `src/lib/i18n/translations/en-US.ts` | `Recurring agreements` → `Fixed expenses` |
| `src/lib/i18n/translations/es-ES.ts` | `Acuerdos recurrentes` → `Gastos fijos` |
| `src/pages/History.tsx` | Incluir acordos ativos no cálculo de `totalAmount` |

---

## 2. Simplificar Progresso da IA

### Design Atual vs Novo

```text
ATUAL:
┌─────────────────────────────────┐
│ 🧠 Aprendendo...                │
│ Preciso de mais dados...        │
│                                 │
│ Dias com gastos      3/7        │
│ ████████░░░░░░░░░░   42%        │
│                                 │
│ Gastos registrados   2/5        │
│ █████░░░░░░░░░░░░░   40%        │
└─────────────────────────────────┘

NOVO:
┌─────────────────────────────────┐
│ 🧠 Ainda estou aprendendo...    │
│                                 │
│ ████████████░░░░░░░   41%       │
│                                 │
│ "Adicione mais alguns gastos    │
│  para eu te conhecer melhor!"   │
└─────────────────────────────────┘
```

### Frases de Incentivo por Percentual
- 0-25%: "Estou começando a te conhecer! 👀"
- 26-50%: "Adicione mais alguns gastos! 📝"
- 51-75%: "Tá quase lá! Continue assim! 🔥"
- 76-99%: "Falta pouquinho! 🎉"

### Arquivos
| Arquivo | Ação |
|---------|------|
| `src/components/AIInsightsCard.tsx` | Simplificar UI do learning state |
| `src/lib/i18n/translations/*.ts` | Adicionar frases de incentivo |

---

## 3. Esconder/Revelar Valores (Privacidade)

### Comportamento
- Ícone de olho (Eye/EyeOff) no header do Summary
- Estado salvo em localStorage para persistir entre sessões
- Animação suave de blur/desfoque (não apenas "***")
- Afeta: BalanceCard, ExpenseCard, AIInsightsCard (se houver valores)

### Implementação
```typescript
// Novo contexto para privacidade
const [valuesHidden, setValuesHidden] = useState(() => 
  localStorage.getItem('values_hidden') === 'true'
);

// Componente para valores
<span className={cn(
  "transition-all duration-300",
  valuesHidden && "blur-md select-none"
)}>
  {formatCurrency(amount)}
</span>
```

### Arquivos
| Arquivo | Ação |
|---------|------|
| `src/contexts/PreferencesContext.tsx` | Adicionar estado `valuesHidden` |
| `src/pages/Summary.tsx` | Adicionar ícone Eye no header |
| `src/components/BalanceCard.tsx` | Aplicar blur quando hidden |
| `src/components/ExpenseCard.tsx` | Aplicar blur quando hidden |
| `src/pages/History.tsx` | Aplicar blur no total do mês |

---

## 4. Novos Widgets na Tela de Resumo

### Comparativo com Mês Anterior
```text
┌─────────────────────────────────┐
│ 📊 Comparado ao mês passado     │
│                                 │
│ ▲ 12% a mais                    │
│   R$ 1.234 → R$ 1.382           │
│                                 │
│ ou                              │
│                                 │
│ ▼ 8% a menos  🎉                │
│   R$ 1.500 → R$ 1.380           │
└─────────────────────────────────┘
```

### Top 3 Categorias do Mês
```text
┌─────────────────────────────────┐
│ 🏷️ Mais gastaram esse mês       │
│                                 │
│ 🍔 Alimentação      R$ 450      │
│ ████████████████░░   45%        │
│                                 │
│ 🏠 Casa             R$ 300      │
│ ██████████░░░░░░░░   30%        │
│                                 │
│ 🎮 Lazer            R$ 250      │
│ ████████░░░░░░░░░░   25%        │
└─────────────────────────────────┘
```

### Arquivos
| Arquivo | Ação |
|---------|------|
| `src/components/MonthComparisonCard.tsx` (novo) | Card de comparativo |
| `src/components/TopCategoriesCard.tsx` (novo) | Card de top categorias |
| `src/pages/Summary.tsx` | Integrar novos cards |

---

## 5. Animação dos Gatinhos com Lottie

### Abordagem
Lottie é a melhor escolha para animações fluidas e leves. Precisa:
1. Criar/encontrar arquivos JSON de animação para cada gatinho
2. Integrar biblioteca lottie-react
3. Separar a imagem do fundo colorido

### Nova Estrutura do Avatar
```tsx
<div className="relative">
  {/* Fundo colorido circular */}
  <div 
    className="absolute inset-0 rounded-full"
    style={{ backgroundColor: bgColor }}
  />
  
  {/* Gatinho animado por cima */}
  <Lottie 
    animationData={catAnimation} 
    className="relative z-10 w-full h-full"
    loop={true}
  />
</div>
```

### Cores de Fundo por Gatinho
| Gatinho | Cor de Fundo |
|---------|-------------|
| 1 (Malhado) | Rosa claro `#FFE4EC` |
| 2 (Siamês) | Azul claro `#E4F0FF` |
| 3 (Tigrado) | Laranja claro `#FFF4E4` |
| 4 (Preto) | Roxo claro `#F0E4FF` |
| 5 (Laranja) | Pêssego `#FFE8D9` |
| 6 (Cinza) | Verde claro `#E4FFE8` |
| 7 (Branco) | Amarelo claro `#FFFBE4` |
| 8 (Rajado) | Menta `#E4FFF0` |

### Arquivos
| Arquivo | Ação |
|---------|------|
| `package.json` | Adicionar `lottie-react` |
| `src/components/Avatar.tsx` | Reestruturar com Lottie |
| `src/assets/lottie/cat-*.json` (8 arquivos) | Animações dos gatinhos |
| `src/lib/constants.ts` | Mapear cores de fundo |
| `src/index.css` | Remover `animate-cat-idle` do círculo |

### Observação Importante
Criar animações Lottie de gatinhos personalizados requer:
- **Opção A**: Usar animações prontas do LottieFiles (buscar "cat" ou "kitten")
- **Opção B**: Criar animações simples com After Effects + Bodymovin
- **Opção C**: Converter os PNGs atuais em sprites animados com CSS

Recomendo começar com **Opção A** (animações prontas) para validar o conceito, depois criar personalizadas se necessário.

---

## Resumo de Alterações

| Prioridade | Tarefa | Complexidade |
|------------|--------|--------------|
| 1 | Renomear acordos → gastos fixos | Baixa |
| 2 | Somar gastos fixos no total | Baixa |
| 3 | Simplificar progresso da IA | Baixa |
| 4 | Botão esconder valores | Média |
| 5 | Card comparativo mês anterior | Média |
| 6 | Card top 3 categorias | Média |
| 7 | Separar fundo colorido do avatar | Média |
| 8 | Integrar Lottie para gatinhos | Alta |

---

## Seção Técnica

### Dependências a Adicionar
```bash
npm install lottie-react
```

### Cálculo do Comparativo Mensal
```typescript
const getCurrentMonthTotal = () => {
  const now = new Date();
  return expenses
    .filter(e => isWithinInterval(parseISO(e.billing_month || e.expense_date), {
      start: startOfMonth(now),
      end: endOfMonth(now)
    }))
    .reduce((sum, e) => sum + e.total_amount, 0);
};

const getPreviousMonthTotal = () => {
  const prev = subMonths(new Date(), 1);
  return expenses
    .filter(e => isWithinInterval(parseISO(e.billing_month || e.expense_date), {
      start: startOfMonth(prev),
      end: endOfMonth(prev)
    }))
    .reduce((sum, e) => sum + e.total_amount, 0);
};

const percentChange = ((current - previous) / previous) * 100;
```

### Animação de Blur Suave
```css
.value-hidden {
  filter: blur(8px);
  transition: filter 0.3s ease-out;
  user-select: none;
}

.value-visible {
  filter: blur(0);
  transition: filter 0.3s ease-out;
}
```

### Estrutura dos Arquivos Lottie
Os arquivos JSON do Lottie devem ser colocados em `src/assets/lottie/` e importados no constants:
```typescript
export const CAT_LOTTIE_ANIMATIONS = {
  1: catLottie1,
  2: catLottie2,
  // ...
};

export const CAT_BG_COLORS = {
  1: '#FFE4EC',
  2: '#E4F0FF',
  // ...
};
```
