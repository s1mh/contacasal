
# Plano: Corrigir Scroll e Atualização dos Seletores no Onboarding

## Problemas Identificados

### 1. Modal não permite scroll
O `DialogContent` no `OnboardingModal.tsx` (linha 390) tem a classe `overflow-hidden`, que bloqueia o scroll. O componente `Dialog` base já tem `overflow-y-auto`, mas está sendo sobrescrito.

### 2. Seletores de idioma/moeda não atualizam
O `SelectValue` não está mostrando o texto correspondente à opção selecionada. Precisa ter um `placeholder` ou usar renderização condicional para mostrar o valor correto.

---

## Solução

### PARTE 1: Habilitar Scroll no Modal

Remover `overflow-hidden` da classe do `DialogContent` no `OnboardingModal.tsx`.

**Arquivo:** `src/components/OnboardingModal.tsx` (linha 390)

```tsx
// ANTES
<DialogContent 
  className="sm:max-w-md overflow-hidden" 
  ...
>

// DEPOIS  
<DialogContent 
  className="sm:max-w-md" 
  ...
>
```

### PARTE 2: Corrigir Exibição dos Seletores

Adicionar um `placeholder` descritivo ao `SelectValue` e garantir que o texto do item selecionado seja exibido corretamente. O Radix Select requer que o `SelectValue` tenha conteúdo explícito ou um placeholder para funcionar bem.

**Arquivo:** `src/components/OnboardingModal.tsx` (linhas 643-665)

```tsx
{/* Idioma */}
<Select value={preferredLocale} onValueChange={(value) => setPreferredLocale(value as SupportedLocale)}>
  <SelectTrigger>
    <SelectValue placeholder="Selecione o idioma">
      {preferredLocale === 'pt-BR' && '🇧🇷 Português (Brasil)'}
      {preferredLocale === 'en-US' && '🇺🇸 English (US)'}
      {preferredLocale === 'es-ES' && '🇪🇸 Español'}
    </SelectValue>
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="pt-BR">🇧🇷 Português (Brasil)</SelectItem>
    <SelectItem value="en-US">🇺🇸 English (US)</SelectItem>
    <SelectItem value="es-ES">🇪🇸 Español</SelectItem>
  </SelectContent>
</Select>

{/* Moeda */}
<Select value={preferredCurrency} onValueChange={(value) => setPreferredCurrency(value as SupportedCurrency)}>
  <SelectTrigger>
    <SelectValue placeholder="Selecione a moeda">
      {preferredCurrency === 'BRL' && 'R$ Real Brasileiro'}
      {preferredCurrency === 'USD' && '$ US Dollar'}
      {preferredCurrency === 'EUR' && '€ Euro'}
    </SelectValue>
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="BRL">R$ Real Brasileiro</SelectItem>
    <SelectItem value="USD">$ US Dollar</SelectItem>
    <SelectItem value="EUR">€ Euro</SelectItem>
  </SelectContent>
</Select>
```

---

## Resumo de Alterações

| Arquivo | Alteração |
|---------|-----------|
| `src/components/OnboardingModal.tsx` | Remover `overflow-hidden` da linha 390 |
| `src/components/OnboardingModal.tsx` | Adicionar renderização explícita do valor selecionado no `SelectValue` para idioma e moeda |

---

## Seção Técnica

### Por que o scroll não funciona?
O componente `Dialog` base (em `dialog.tsx`) já tem `max-h-[calc(100vh-2rem)] overflow-y-auto`, mas quando o `OnboardingModal` adiciona `overflow-hidden`, essa propriedade tem prioridade e impede qualquer scroll.

### Por que os seletores não atualizam?
O componente `SelectValue` do Radix UI pode não re-renderizar o texto corretamente em alguns casos. Ao passar o conteúdo como children do `SelectValue` baseado no estado atual, garantimos que o React force a atualização visual quando o valor muda.
