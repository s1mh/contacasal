
# Plano: Edição de Gastos, Acordos e Insights de IA

## Resumo das Alterações

1. **Remover delete do Summary** - Simples: remover `onDelete` prop
2. **Editar gastos** - Criar modal de edição + função `updateExpense`
3. **Editar acordos** - Expandir diálogo do AgreementManager
4. **Insights de IA** - Sistema de aprendizado + geração de insights

---

## PARTE 1: Remover Delete do Summary

### Arquivo: `src/pages/Summary.tsx`

Remover a prop `onDelete` do ExpenseCard (linha 106):

```tsx
// ANTES
<ExpenseCard
  expense={expense}
  profiles={couple.profiles}
  tags={couple.tags}
  onDelete={() => deleteExpense(expense.id)}
/>

// DEPOIS
<ExpenseCard
  expense={expense}
  profiles={couple.profiles}
  tags={couple.tags}
/>
```

---

## PARTE 2: Edição de Gastos

### 2.1 Adicionar `updateExpense` ao CoupleContext

**Arquivo**: `src/contexts/CoupleContext.tsx`

```typescript
// Adicionar ao CoupleContextType (interface)
updateExpense: (expenseId: string, updates: Partial<Expense>) => Promise<void>;

// Implementação
const updateExpense = async (expenseId: string, updates: Partial<Expense>) => {
  const previousExpenses = couple?.expenses || [];

  // Optimistic update
  setCouple(prev => {
    if (!prev) return prev;
    return {
      ...prev,
      expenses: prev.expenses.map(e => 
        e.id === expenseId ? { ...e, ...updates } : e
      ),
    };
  });

  try {
    const { error } = await supabase
      .from('expenses')
      .update(updates)
      .eq('id', expenseId);
    if (error) throw error;
    
    toast({ 
      title: 'Gasto atualizado! ✏️',
      description: 'Alterações salvas'
    });
  } catch (err) {
    console.error('Error updating expense:', err);
    toast({ 
      title: 'Ops! Algo deu errado',
      description: 'Não foi possível atualizar',
      variant: 'destructive' 
    });
    setCouple(prev => {
      if (!prev) return prev;
      return { ...prev, expenses: previousExpenses };
    });
  }
};
```

### 2.2 Criar `EditExpenseDialog.tsx`

**Arquivo**: `src/components/EditExpenseDialog.tsx`

Modal que permite editar:
- Valor (`total_amount`)
- Descrição (`description`)
- Data (`expense_date`)
- Quem pagou (`paid_by`)
- Tipo de divisão (`split_type`, `split_value`)
- Categoria (`tag_id`)

Layout similar ao NewExpense, mas em formato de diálogo compacto.

### 2.3 Adicionar `onEdit` ao ExpenseCard

**Arquivo**: `src/components/ExpenseCard.tsx`

```typescript
interface ExpenseCardProps {
  // ... existente
  onEdit?: () => void;  // NOVO
}

// Adicionar botão de editar ao lado do delete
{onEdit && (
  <button
    onClick={(e) => {
      e.stopPropagation();
      onEdit();
    }}
    className="opacity-0 group-hover:opacity-100 p-1.5 text-muted-foreground hover:text-primary transition-all rounded-lg hover:bg-primary/10"
  >
    <Pencil className="w-4 h-4" />
  </button>
)}
```

### 2.4 Integrar no History.tsx

**Arquivo**: `src/pages/History.tsx`

```typescript
const [editDialogOpen, setEditDialogOpen] = useState(false);
const [expenseToEdit, setExpenseToEdit] = useState<Expense | null>(null);

// No ExpenseCard
<ExpenseCard
  expense={expense}
  onEdit={() => {
    setExpenseToEdit(expense);
    setEditDialogOpen(true);
  }}
  onDelete={...}
/>

// Adicionar diálogo
{expenseToEdit && (
  <EditExpenseDialog
    expense={expenseToEdit}
    profiles={couple.profiles}
    tags={couple.tags}
    cards={couple.cards}
    open={editDialogOpen}
    onOpenChange={setEditDialogOpen}
    onSave={(updates) => updateExpense(expenseToEdit.id, updates)}
  />
)}
```

---

## PARTE 3: Edição de Acordos Recorrentes

### Arquivo: `src/components/AgreementManager.tsx`

Expandir para incluir botão de editar e diálogo de edição completo:

```typescript
// Adicionar estado
const [editingAgreement, setEditingAgreement] = useState<Agreement | null>(null);

// Adicionar botão de editar na lista
<Button
  variant="ghost"
  size="icon"
  className="h-5 w-5 sm:h-6 sm:w-6"
  onClick={() => setEditingAgreement(agreement)}
>
  <Pencil className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
</Button>

// Dialog de edição (reutilizando formulário do Dialog existente)
<Dialog open={!!editingAgreement} onOpenChange={() => setEditingAgreement(null)}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Editar Acordo</DialogTitle>
    </DialogHeader>
    {/* Formulário preenchido com dados do acordo */}
  </DialogContent>
</Dialog>
```

---

## PARTE 4: Insights de IA (Aprendizado Comportamental)

### 4.1 Criar Tabela para Armazenar Padrões

**Migração SQL**:

```sql
CREATE TABLE IF NOT EXISTS spending_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  pattern_type TEXT NOT NULL, -- 'category_trend', 'spending_peak', 'balance_drift', etc.
  pattern_data JSONB NOT NULL,
  confidence DECIMAL(3,2) DEFAULT 0.5,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  insight_type TEXT NOT NULL, -- 'tip', 'alert', 'celebration'
  message TEXT NOT NULL,
  priority INTEGER DEFAULT 5,
  is_read BOOLEAN DEFAULT FALSE,
  valid_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 4.2 Edge Function para Análise de Padrões

**Arquivo**: `supabase/functions/analyze-spending/index.ts`

```typescript
// Função que:
// 1. Busca gastos do último mês/trimestre
// 2. Identifica padrões (categorias mais usadas, picos de gasto, desvios)
// 3. Salva padrões na tabela spending_patterns
// 4. Gera insights baseados nos padrões

// Análises possíveis:
// - Categoria com maior crescimento
// - Dia da semana com mais gastos
// - Quem está pagando mais
// - Gastos acima da média
// - Categorias esquecidas (sem gasto há tempo)
```

### 4.3 Edge Function para Gerar Insights

**Arquivo**: `supabase/functions/generate-insights/index.ts`

```typescript
// Usa Lovable AI (google/gemini-2.5-flash) para:
// 1. Analisar padrões salvos
// 2. Comparar com mês anterior
// 3. Gerar insights personalizados em português
// 4. Salvar na tabela ai_insights
```

### 4.4 Componente de Insights no Summary

**Arquivo**: `src/components/AIInsightsCard.tsx`

```typescript
interface AIInsight {
  id: string;
  type: 'tip' | 'alert' | 'celebration';
  message: string;
  priority: number;
}

export function AIInsightsCard({ coupleId }: { coupleId: string }) {
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [minDataDays, setMinDataDays] = useState(0);

  // Verificar se tem dados suficientes (ex: 7 dias mínimo)
  // Se não tiver, mostrar "Ainda estou aprendendo..."
  
  // Buscar insights do banco
  // Mostrar top 3 insights por prioridade
}
```

### 4.5 Lógica de "Aprendizado Mínimo"

Para a IA começar a dar insights, precisamos de:
- **Mínimo de 7 dias** com pelo menos 1 gasto
- **Mínimo de 5 gastos** registrados
- **Pelo menos 2 categorias** diferentes usadas

Enquanto não atingir:
```
🧠 Ainda estou aprendendo...
Preciso de mais alguns dias para entender 
seus padrões de gastos e dar dicas úteis.

📊 Progresso: 3/7 dias • 4/5 gastos
```

---

## Resumo de Arquivos

| Arquivo | Ação |
|---------|------|
| `src/pages/Summary.tsx` | Remover `onDelete` do ExpenseCard |
| `src/contexts/CoupleContext.tsx` | Adicionar `updateExpense` |
| `src/components/ExpenseCard.tsx` | Adicionar botão de editar |
| `src/components/EditExpenseDialog.tsx` | **CRIAR** - Modal de edição |
| `src/pages/History.tsx` | Integrar diálogo de edição |
| `src/components/AgreementManager.tsx` | Adicionar edição completa |
| `supabase/functions/analyze-spending/index.ts` | **CRIAR** - Análise de padrões |
| `supabase/functions/generate-insights/index.ts` | **CRIAR** - Geração de insights |
| `src/components/AIInsightsCard.tsx` | **CRIAR** - Card de insights |
| **Migração SQL** | Tabelas `spending_patterns` e `ai_insights` |

---

## Fluxo dos Insights de IA

```text
1. Usuário adiciona gastos → Dados acumulam no banco

2. Após 7+ dias / 5+ gastos:
   - Sistema detecta dados suficientes
   - Chama analyze-spending (pode ser via cron ou on-demand)

3. analyze-spending:
   - Agrupa gastos por categoria, dia, pagador
   - Calcula médias, tendências, desvios
   - Salva em spending_patterns

4. generate-insights:
   - Lê padrões recentes
   - Envia para Lovable AI com prompt contextualizado
   - Recebe insights em português natural
   - Salva em ai_insights

5. Summary mostra:
   - "Você gastou 30% menos em Alimentação esse mês! 🎉"
   - "Atenção: Lazer passou da média. Quer revisar?"
   - "Dica: João tem pagado 60% dos gastos. Hora de equilibrar?"
```

---

## Seção Técnica

### Tipos para Insights

```typescript
interface SpendingPattern {
  id: string;
  couple_id: string;
  pattern_type: 'category_growth' | 'spending_peak' | 'payer_balance' | 'frequency';
  pattern_data: {
    category_id?: string;
    growth_percent?: number;
    peak_day?: number;
    payer_ratio?: { person1: number; person2: number };
    avg_per_day?: number;
  };
  confidence: number;
}

interface AIInsight {
  id: string;
  couple_id: string;
  insight_type: 'tip' | 'alert' | 'celebration';
  message: string;
  priority: number;
  is_read: boolean;
  valid_until: string | null;
}
```

### Prompt para Lovable AI

```typescript
const prompt = `
Você é um assistente financeiro simpático para casais brasileiros.

Dados do casal:
- Total gasto esse mês: ${totalMonth}
- Categorias mais usadas: ${topCategories}
- Pessoa 1 pagou: ${person1Percent}%
- Pessoa 2 pagou: ${person2Percent}%
- Tendência vs mês anterior: ${trend}

Gere 3 insights curtos (máx 100 caracteres) em português brasileiro.
Seja amigável, use emojis, evite ser crítico demais.

Formato JSON:
[
  { "type": "celebration", "message": "...", "priority": 8 },
  { "type": "tip", "message": "...", "priority": 5 },
  { "type": "alert", "message": "...", "priority": 3 }
]
`;
```
