
# Plano: Corrigir Erros de Build do Sistema i18n

## Diagnóstico do Problema

A tela branca é causada por **erros de TypeScript em tempo de build** que impedem a aplicação de funcionar. O problema principal é uma **inconsistência entre dois sistemas de tradução**:

### Sistema Original (`src/lib/i18n.ts`)
- `t` é uma **função**: `t('chave')` → retorna string traduzida
- Exemplo: `t('Novo gasto')` → "New expense"

### Sistema Tentado nos Componentes
- `t` como **objeto aninhado**: `t.nav.summary` → retorna string
- Exemplo: `t.nav.summary` → "Resumo"

Esta inconsistência causa todos os erros de build.

---

## Erros Identificados por Arquivo

| Arquivo | Problema |
|---------|----------|
| `Settings.tsx` | Falta import de `useI18n`, `Select`, `SelectTrigger`, etc. Usa `t.settings.preferences` mas `t` é função |
| `BalanceCard.tsx` | Usa `formatCurrency` sem importar do contexto |
| `BottomNav.tsx` | Usa `t.nav.summary` mas `t` é função |
| `OnboardingModal.tsx` | Usa `t` sem declarar, e `reason` inexistente no tipo |
| `AIInsightsCard.tsx` | Usa `t.ai.insights` mas `t.ai` não existe |
| `SettlementModal.tsx` | Usa `t.settlement` e `t.common` que não existem |
| `DeleteExpenseDialog.tsx` | Import duplicado de `useI18n`, desestruturação errada |

---

## Solução

### Estratégia: Manter o sistema original de função `t('key')`

O sistema de **função** é mais simples e já tem ~300 traduções. Vamos corrigir os componentes para usarem a sintaxe correta.

### Alterações Necessárias

#### 1. `src/pages/Settings.tsx`
- Adicionar imports: `useI18n`, `Select`, `SelectTrigger`, `SelectValue`, `SelectContent`, `SelectItem`
- Adicionar import de tipos: `SupportedLocale`, `SupportedCurrency`
- Obter `t`, `locale`, `currency`, `setLocale`, `setCurrency` do `useI18n()`
- Substituir `t.settings.preferences` por `t('Preferências')`
- Substituir `t.settings.language` por `t('Idioma')`
- Substituir `t.languages[locale]` por texto literal baseado no locale
- Substituir `t.settings.currency` por `t('Moeda')`
- Substituir `t.currencies[currency]` por texto literal baseado na currency

#### 2. `src/components/BalanceCard.tsx`
- Importar `useI18n` e obter `formatCurrency` dele
- Já usa `prefT('string')` corretamente para textos

#### 3. `src/components/BottomNav.tsx`
- Substituir `t.nav.summary` por `t('Resumo')`
- Substituir `t.nav.newExpense` por `t('Novo gasto')`
- Substituir `t.nav.history` por `t('Histórico')`
- Substituir `t.nav.settings` por `t('Ajustes')`

#### 4. `src/components/OnboardingModal.tsx`
- Verificar se `t` está declarado corretamente
- Corrigir acesso a `reason` → usar `reasonKey`
- Garantir que todas as referências a `t` usem a sintaxe de função

#### 5. `src/components/AIInsightsCard.tsx`
- Substituir `t.ai.insights` por `t('Insights')`
- Substituir `t.ai.stillLearning` por `t('Ainda estou aprendendo...')`
- Substituir `t.ai.needMoreDays` por `t('Preciso de mais alguns dias...')`
- E todas as outras referências `t.ai.*`

#### 6. `src/components/SettlementModal.tsx`
- Substituir `t.settlement.title` por `t('Acertar as Contas')`
- Substituir `t.settlement.description` por `t('Registre o pagamento...')`
- Substituir `t.common.cancel` por `t('Cancelar')`
- E todas as outras referências `t.settlement.*` e `t.common.*`

#### 7. `src/components/DeleteExpenseDialog.tsx`
- Remover import duplicado/incorreto
- Usar apenas `usePreferences` para `t` (função)

---

## Padrão de Uso Correto

```typescript
// ✅ CORRETO - Sistema atual
import { usePreferences } from '@/contexts/PreferencesContext';
import { useI18n } from '@/contexts/I18nContext';

export function Component() {
  const { t: prefT } = usePreferences();  // Função de tradução
  const { formatCurrency } = useI18n();    // Formatação de moeda
  
  return (
    <div>
      <h1>{prefT('Novo gasto')}</h1>
      <span>{formatCurrency(100)}</span>
    </div>
  );
}

// ❌ ERRADO - O que foi implementado incorretamente
const { t } = useI18n();
return <h1>{t.nav.summary}</h1>; // t não é objeto!
```

---

## Resumo de Arquivos a Corrigir

| Arquivo | Ação |
|---------|------|
| `src/pages/Settings.tsx` | Adicionar imports faltantes + corrigir uso de `t` |
| `src/components/BalanceCard.tsx` | Importar `formatCurrency` de `useI18n` |
| `src/components/BottomNav.tsx` | Mudar `t.nav.*` para `t('string')` |
| `src/components/OnboardingModal.tsx` | Corrigir declaração de `t` e `reasonKey` |
| `src/components/AIInsightsCard.tsx` | Mudar `t.ai.*` para `t('string')` |
| `src/components/SettlementModal.tsx` | Mudar `t.settlement.*` e `t.common.*` para `t('string')` |
| `src/components/DeleteExpenseDialog.tsx` | Remover import duplicado |

---

## Seção Técnica

### Por que a tela fica branca?

Quando há erros de TypeScript, o Vite (bundler) falha ao compilar o código. O navegador recebe um bundle JavaScript incompleto ou com erros, causando:
1. Crash no carregamento do React
2. Tela branca sem mensagem de erro visível
3. Erros no console do desenvolvedor

### Tipo `TranslationKeys` atual

```typescript
// src/lib/i18n.ts
export type TranslationKeys = (key: string, variables?: TranslationValues) => string;
```

Este tipo define `t` como **função**, não objeto. Para usar objetos aninhados seria necessário:
- Reescrever completamente o sistema i18n
- Criar interfaces TypeScript para cada seção
- Migrar ~300 traduções para o novo formato

A solução mais rápida e segura é **manter o sistema de função** e corrigir os componentes.
