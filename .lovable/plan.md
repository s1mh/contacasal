
# Plano: Corrigir Erro 404 no Vercel + Completar Internacionalização

## Problema 1: Erro 404 no Vercel

O Vercel não sabe como rotear uma SPA (Single Page Application). Quando alguém acessa diretamente `/c/1f162d13c5431b28`, o Vercel procura um arquivo físico nesse caminho e retorna 404.

### Solução: Criar `vercel.json`

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/" }
  ]
}
```

Este arquivo instrui o Vercel a redirecionar todas as rotas para `index.html`, permitindo que o React Router gerencie as rotas.

---

## Problema 2: Traduções Incompletas

O sistema i18n foi criado, mas muitas strings ainda estão hardcoded em português. A lista completa de arquivos e strings que precisam ser traduzidas:

### Arquivos a Atualizar

| Arquivo | Strings Hardcoded |
|---------|-------------------|
| `src/pages/Index.tsx` | ~30 strings |
| `src/pages/Summary.tsx` | ~8 strings |
| `src/pages/History.tsx` | ~15 strings |
| `src/pages/Statistics.tsx` | ~12 strings |
| `src/pages/NewExpense.tsx` | ~25 strings |
| `src/pages/CreateSpace.tsx` | ~20 strings |
| `src/components/BalanceCard.tsx` | ~8 strings |
| `src/components/AIInsightsCard.tsx` | ~6 strings |
| `src/components/SettlementModal.tsx` | ~10 strings |
| `src/components/EditExpenseDialog.tsx` | ~10 strings |
| `src/components/DeleteExpenseDialog.tsx` | ~10 strings |
| `src/components/OnboardingModal.tsx` | ~5 strings restantes |
| `src/pages/Settings.tsx` | ~8 strings restantes |

### Novas Traduções a Adicionar

Expandir os arquivos de tradução com:

```typescript
// Em pt-BR.ts, en-US.ts, es-ES.ts
{
  // Balance Card
  balance: {
    waitingPartner: 'Aguardando parceiro(a) 💕',
    shareToStart: 'Compartilhe o link para começarem juntos',
    useShareButton: 'Use o botão "Compartilhar" para convidar',
  },

  // Settlement
  settlement: {
    title: 'Acertar as Contas',
    description: 'Registre o pagamento para zerar o saldo atual',
    allBalanced: 'Tudo equilibrado!',
    youAreEven: 'Vocês estão quites. Não há saldo a acertar.',
    settlementRecorded: 'Acerto registrado!',
    balanceZeroed: 'O saldo foi zerado. Comecem um novo período!',
    noteOptional: 'Observação (opcional)',
    notePlaceholder: 'Ex: Pix enviado, dinheiro vivo...',
    confirmSettle: 'Confirmar Acerto',
    registering: 'Registrando...',
  },

  // Delete Expense
  deleteExpense: {
    title: 'Apagar gasto?',
    titleInstallment: 'Apagar parcelamento?',
    willBeRemoved: '{description} de {amount} será removido.',
    hasInstallments: 'Este gasto tem {count} parcelas. O que deseja fazer?',
    deleteAll: 'Apagar todas as parcelas',
    deleteAllDesc: 'Remove todas as {count} parcelas encontradas',
    selectInstallments: 'Selecionar parcelas',
    selectInstallmentsDesc: 'Escolher quais meses apagar',
    selectTitle: 'Selecionar parcelas',
    selectDesc: 'Marque as parcelas que deseja apagar',
    installment: 'Parcela',
    deleteCount: 'Apagar {count} parcela(s)',
  },

  // Edit Expense
  editExpense: {
    title: 'Editar Gasto',
    amount: 'Valor',
    description: 'Descrição',
    descriptionPlaceholder: 'Descrição do gasto',
    date: 'Data',
    whoPaid: 'Quem pagou',
    category: 'Categoria',
    selectCategory: 'Selecione...',
    split: 'Divisão',
    percentage: 'Percentual',
    oneHundredPercent: '100% de um',
    saving: 'Salvando...',
    saveChanges: 'Salvar Alterações',
  },

  // Index/Home
  home: {
    preparingLove: 'Preparando o amor...',
    sharedAccount: 'Conta Compartilhada',
    splitWithClarity: 'Dividam gastos com clareza',
    continueAs: 'Continuar como',
    loginWithAt: 'Entrar com @',
    useYourUsername: 'Use seu username pessoal',
    personalCode: 'Código pessoal',
    verifying: 'Verificando...',
    invalidCredentials: 'Credenciais inválidas',
    attemptsRemaining: '{count} tentativa(s) restante(s)',
    accountLocked: 'Conta bloqueada por {time}',
    enter: 'Entrar',
    entering: 'Entrando...',
    forgotCode: 'Esqueci meu código',
    newSpace: 'Novo espaço',
    createSpaceFor5: 'Crie um espaço para até 5 pessoas',
    createSpace: 'Criar espaço',
    creating: 'Criando...',
    joinExistingSpace: 'Entrar em espaço existente',
    haveInviteCode: 'Tem um código de convite?',
    enterInviteCode: 'Digite o código',
    joinSpace: 'Entrar no espaço',
    orLoginWith: 'ou entre com seu @',
    welcomeBack: 'Bem-vindo de volta, {name}! 🎉',
    niceToSeeYou: 'Bom te ver novamente',
    loginError: 'Erro ao fazer login. Tente novamente.',
    joinOurSpace: 'Entre no nosso espaço compartilhado!',
    linkCopied: 'Link copiado!',
    shareWithPartner: 'Compartilhe com seu parceiro(a).',
  },

  // New Expense
  newExpense: {
    title: 'Novo gasto',
    totalAmount: 'Valor total',
    descriptionOptional: 'Descrição (opcional)',
    purchaseDate: 'Data da compra',
    paymentMethod: 'Forma de pagamento',
    debit: 'Débito',
    credit: 'Crédito',
    noCardRegistered: 'Nenhum cartão de crédito cadastrado para {name}.',
    registerInSettings: 'Cadastre em Ajustes → Cartões',
    selectCard: 'Selecione o cartão',
    installments: 'Parcelas',
    willEnterBill: 'Entrará na fatura de {month}',
    closingDay: 'Fechamento dia {day} • Vencimento dia {due}',
    lastInstallment: 'Última parcela: {date}',
    whoPaid: 'Quem pagou?',
    configureProfileFirst: 'Configure seu perfil em Ajustes primeiro',
    split: 'Divisão',
    paysRest: '{name} paga o resto: {amount}',
    selectCategory: 'Selecione uma categoria',
    reviewExpense: 'Revisar gasto',
    total: 'Total',
    splitBetween: 'Dividido entre',
    addExpense: 'Adicionar gasto',
    adding: 'Adicionando...',
  },

  // History
  history: {
    title: 'Histórico',
    monthTotal: 'Total do mês',
    expensesCount: '{count} gastos',
    filterByCategory: 'Filtrar por categoria',
    all: 'Todos',
    recurringAgreements: 'Acordos recorrentes',
    dayOfMonth: 'Dia {day} de cada mês',
    totalAgreements: 'Total acordos',
    noExpensesFound: 'Nenhum gasto encontrado',
    tryRemoveFilter: 'Tente remover o filtro',
    inThisPeriod: 'Neste período',
  },

  // Statistics
  statistics: {
    title: 'Estatísticas',
    currentMonth: 'Mês atual',
    threeMonths: '3 meses',
    sixMonths: '6 meses',
    twelveMonths: '12 meses',
    allTime: 'Tudo',
    allCategories: 'Todas categorias',
    totalSpent: 'Total gasto',
    expensesCount: '{count} despesa(s)',
    averagePerExpense: 'Média por gasto',
    byCategory: 'Por Categoria',
    byPerson: 'Por Pessoa',
    monthlyEvolution: 'Evolução Mensal',
  },

  // AI Insights
  aiInsights: {
    insights: 'Insights',
    stillLearning: 'Ainda estou aprendendo...',
    needMoreDays: 'Preciso de mais alguns dias para entender seus padrões e dar dicas úteis.',
    daysWithExpenses: 'Dias com gastos',
    registeredExpenses: 'Gastos registrados',
    noInsightsAvailable: 'Nenhum insight disponível no momento',
    couldNotGenerate: 'Não foi possível gerar insights',
    connectionError: 'Erro ao conectar',
  },

  // Create Space
  createSpace: {
    createProfile: 'Crie seu perfil',
    customizeAppearance: 'Personalize como você aparecerá no app',
    yourName: 'Seu nome',
    namePlaceholder: 'Como você quer ser chamado(a)?',
    chooseKitty: 'Escolha seu gatinho',
    yourColor: 'Sua cor',
    createCode: 'Crie seu código',
    codeFor4Digits: 'Código de 4 dígitos para entrar em outros dispositivos',
    addEmail: 'Adicione seu e-mail',
    emailRecovery: 'Para recuperar seu código se esquecer (opcional)',
    spaceCreated: 'Espaço criado! 🎉',
    yourAtIs: 'Seu @ é @{username}',
    yourCornerReady: 'Seu cantinho está pronto',
    errorCreating: 'Erro ao criar espaço',
    tryAgain: 'Tente novamente',
  },
}
```

---

## Resumo de Alterações

| Arquivo | Ação |
|---------|------|
| `vercel.json` (novo) | Criar com rewrites para SPA |
| `src/lib/i18n/translations/pt-BR.ts` | Adicionar ~80 novas traduções |
| `src/lib/i18n/translations/en-US.ts` | Adicionar ~80 novas traduções |
| `src/lib/i18n/translations/es-ES.ts` | Adicionar ~80 novas traduções |
| `src/pages/Index.tsx` | Integrar i18n com `useI18n()` |
| `src/pages/Summary.tsx` | Integrar i18n |
| `src/pages/History.tsx` | Integrar i18n |
| `src/pages/Statistics.tsx` | Integrar i18n |
| `src/pages/NewExpense.tsx` | Integrar i18n |
| `src/pages/CreateSpace.tsx` | Integrar i18n |
| `src/components/BalanceCard.tsx` | Integrar i18n |
| `src/components/AIInsightsCard.tsx` | Integrar i18n |
| `src/components/SettlementModal.tsx` | Integrar i18n |
| `src/components/EditExpenseDialog.tsx` | Integrar i18n |
| `src/components/DeleteExpenseDialog.tsx` | Integrar i18n |

---

## Seção Técnica

### Padrão de Integração i18n

Em cada componente, adicionar:

```typescript
import { useI18n } from '@/contexts/I18nContext';

export function ComponentName() {
  const { t, interpolate, formatCurrency } = useI18n();
  
  // Usar t.section.key para strings estáticas
  // Usar interpolate(t.section.key, { var: value }) para strings com variáveis
}
```

### Componentes fora do CoupleLayout

Os componentes `Index.tsx` e `CreateSpace.tsx` estão fora do `CoupleLayout` onde o `I18nProvider` é montado. Precisam de tratamento especial:

**Opção 1:** Mover o `I18nProvider` para o `App.tsx` (recomendado)
**Opção 2:** Usar `getTranslations()` diretamente sem contexto

### Ordem de Implementação Sugerida

1. Criar `vercel.json` (resolve o 404 imediatamente)
2. Mover `I18nProvider` para `App.tsx`
3. Expandir arquivos de tradução
4. Atualizar componentes um a um, começando pelos mais usados
