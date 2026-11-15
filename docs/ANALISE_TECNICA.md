# Conta de Casal - Documentação de Análise

## Visão Geral do Projeto

**Nome:** Conta de Casal
**Propósito:** Aplicativo de gestão de despesas compartilhadas para casais
**Idioma:** Português (pt-BR)

---

## Stack Tecnológica

### Frontend
- **Framework:** React 18.3.1 + TypeScript
- **Build:** Vite 7.3.1
- **Roteamento:** React Router DOM v6
- **UI:** shadcn/ui (Radix UI) + Tailwind CSS
- **Forms:** React Hook Form + Zod
- **Estado:** React Context + TanStack Query
- **Gráficos:** Recharts

### Backend
- **Database/Auth:** Supabase (PostgreSQL)
- **Functions:** Supabase Edge Functions (18 funções)

---

## Estrutura de Pastas Principal

```
src/
├── components/          # 21 componentes customizados
│   └── ui/              # 50+ componentes shadcn/ui
├── contexts/            # AuthContext, CoupleContext
├── hooks/               # useAuth, useCouple, use-toast
├── integrations/        # Cliente Supabase
├── lib/                 # Constantes, validação, utils
├── pages/               # 10 páginas de rota
└── assets/              # Avatares de gato

supabase/
├── functions/           # 18 Edge Functions
└── migrations/          # 18 migrações SQL
```

---

## Funcionalidades Principais

1. **Autenticação por PIN** - Acesso via código de compartilhamento + PIN
2. **Gestão de Despesas** - CRUD com categorias, divisão, parcelas
3. **Balanço em Tempo Real** - Cálculo automático de quem deve a quem
4. **Cartões de Crédito** - Rastreamento de parcelas e fechamento
5. **Acordos Recorrentes** - Despesas fixas mensais
6. **Estatísticas** - Gráficos e insights de gastos
7. **AI Insights** - Análise de padrões via IA (Lovable Gateway)

---

## Referências ao Lovable Encontradas

| Arquivo | Tipo de Referência |
|---------|-------------------|
| `package.json:77` | Dependência `lovable-tagger` |
| `vite.config.ts:4,12` | Import e uso do plugin |
| `index.html:13,18,21,22` | Meta tags de branding |
| `README.md` | Documentação completa da plataforma |
| `.lovable/plan.md` | Comentários sobre Lovable AI |
| `supabase/functions/request-pin-recovery/index.ts:147` | Fallback origin URL |
| `supabase/functions/generate-insights/index.ts:128,163` | API Key e Gateway AI |

---

## Padrões de Overengineering Identificados

### 1. Duplicação de Lógica de Fetch (ALTO IMPACTO)
**Local:** `src/contexts/CoupleContext.tsx:162-284`
**Problema:** ~70 linhas duplicadas entre `fetchCouple()` e `silentRefetch()`

### 2. Wrappers de Validação Repetidos (ALTO IMPACTO)
**Local:** `src/lib/validation.ts:79-113`
**Problema:** 6 funções idênticas (validateExpense, validateProfile, etc.)

### 3. Filtro de Profile Hardcoded (ALTO IMPACTO)
**Local:** 12 arquivos diferentes
**Problema:** Mesmo filtro `p.name !== 'Pessoa 1' && p.name !== 'Pessoa 2'` em 12 lugares

### 4. Padrão de Mutations Verboso (MÉDIO IMPACTO)
**Local:** `src/contexts/CoupleContext.tsx:288-854`
**Problema:** ~500 linhas com padrão repetitivo de optimistic updates

### 5. Wrapper NavLink Desnecessário (BAIXO IMPACTO)
**Local:** `src/components/NavLink.tsx`
**Problema:** Wrapper sem valor real sobre React Router NavLink

### 6. Re-export de Backward Compatibility (BAIXO IMPACTO)
**Local:** `src/hooks/useCouple.ts`
**Problema:** Arquivo só re-exporta do CoupleContext

### 7. devLog no Lugar Errado (BAIXO IMPACTO)
**Local:** `src/lib/validation.ts:71-76`
**Problema:** Função de log em arquivo de validação, usado em 1 lugar

### 8. Over-memoization (BAIXO IMPACTO)
**Local:** `src/components/Charts.tsx`
**Problema:** useMemo para operações simples com poucos itens

### 9. Subscriptions Duplicadas (MÉDIO IMPACTO)
**Local:** `src/contexts/CoupleContext.tsx:965-1027`
**Problema:** 6 handlers de realtime idênticos

---

## Tabelas do Banco de Dados

- **couples** - Espaços de casal com share codes
- **profiles** - Perfis dos usuários (máx 2 por casal)
- **expenses** - Registros de despesas
- **tags** - Categorias customizadas
- **cards** - Informações de cartões
- **agreements** - Despesas recorrentes
- **settlements** - Registros de acertos
- **space_roles** - Gestão de papéis (admin/member)

---

## Rotas da Aplicação

```
/                     → Login/Entrada
/create               → Criar novo espaço
/c/:shareCode         → Layout do casal
  ├── (index)         → Dashboard/Resumo
  ├── /novo           → Nova Despesa
  ├── /historico      → Histórico
  ├── /ajustes        → Configurações
  └── /estatisticas   → Estatísticas
/reset-pin/:token     → Recuperação de PIN
```

---

## Alterações Realizadas

### Referências ao Lovable Removidas
- ✅ `package.json` - Removido `lovable-tagger`
- ✅ `vite.config.ts` - Removido plugin componentTagger
- ✅ `index.html` - Removidas meta tags de branding
- ✅ `README.md` - Reescrito sem referências
- ✅ `.lovable/` - Diretório removido
- ✅ `request-pin-recovery/index.ts` - Fallback origin atualizado
- ⏸️ `generate-insights/index.ts` - Mantido temporariamente (AI Gateway)

### Overengineering Simplificado
- ✅ Fetch duplicado extraído para `fetchCoupleData()` helper
- ✅ Validadores refatorados com `createValidator()` genérico
- ✅ Filtro de profiles centralizado em `isConfiguredProfile()` (12 arquivos atualizados)
- ✅ Subscriptions realtime refatoradas para loop

### Arquivos Modificados
- `src/contexts/CoupleContext.tsx`
- `src/lib/validation.ts`
- `src/lib/utils.ts`
- `src/components/BalanceCard.tsx`
- `src/components/Charts.tsx`
- `src/components/MemberManagement.tsx`
- `src/components/OnboardingModal.tsx`
- `src/components/ReconnectModal.tsx`
- `src/pages/CoupleLayout.tsx`
- `src/pages/NewExpense.tsx`
- `src/pages/Settings.tsx`
- `src/pages/Statistics.tsx`
- `src/pages/Summary.tsx`

---

*Documento gerado para continuidade de análise com Claude Code*
