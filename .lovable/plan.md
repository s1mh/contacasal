
# Plano: Seletores de Idioma/Moeda e Correção de Erro de Criação

## Problemas Identificados

### 1. Seletores de Idioma/Moeda Não Aparecem
O componente `OnboardingModal.tsx` TEM o step `preferences` (linhas 637-683), mas a página `CreateSpace.tsx` NÃO tem esse step - vai direto de `profile` para `pin`.

### 2. Erro ao Criar Novo Usuário
Os logs mostram:
```
Failed to set user_id on profile: violates foreign key constraint "profiles_user_id_fkey"
Failed to update user metadata: User not found
```
A constraint de chave estrangeira `profiles_user_id_fkey` referencia `auth.users(id)`, mas quando o usuário anônimo é criado e depois algum processo o deleta (ou há uma condição de corrida), o `create-couple` tenta vincular o `user_id` a um usuário que não existe mais.

### 3. Excluir Todos os Usuários
Já excluímos os dados públicos. Os usuários anônimos na tabela `auth.users` precisam ser excluídos pelo painel do Cloud.

---

## Solução

### PARTE 1: Adicionar Bandeiras e Símbolos aos Seletores

Atualizar os `SelectItem` em ambos os arquivos com emojis de bandeira e símbolos de moeda:

**Idiomas:**
- `pt-BR` → `🇧🇷 Português (Brasil)`
- `en-US` → `🇺🇸 English (US)`
- `es-ES` → `🇪🇸 Español`

**Moedas:**
- `BRL` → `R$ Real Brasileiro`
- `USD` → `$ US Dollar`
- `EUR` → `€ Euro`

**Arquivos:**
- `src/components/OnboardingModal.tsx` (linhas 647-651 e 661-665)

### PARTE 2: Adicionar Step de Preferências no CreateSpace

A página `CreateSpace.tsx` precisa do mesmo step `preferences` que existe no `OnboardingModal`.

**Mudanças necessárias:**
1. Adicionar imports de preferências
2. Adicionar estados `preferredLocale` e `preferredCurrency`
3. Adicionar step `'preferences'` ao tipo de step
4. Criar função `handlePreferencesNext` para salvar e avançar
5. Renderizar o step de preferências entre profile e pin

### PARTE 3: Remover Foreign Key Constraint no user_id

O campo `user_id` na tabela `profiles` é nullable, mas tem uma FK para `auth.users` que falha quando o usuário não existe. Como não podemos garantir que o usuário anônimo sempre existirá, vamos remover essa constraint.

**Migração SQL:**
```sql
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_user_id_fkey;
```

### PARTE 4: Melhorar Edge Function create-couple

Adicionar verificação se o usuário existe antes de tentar vincular:

```typescript
// Verificar se usuário existe antes de atualizar
const { data: userExists } = await supabaseAdmin.auth.admin.getUserById(userId);

if (userExists?.user) {
  // Atualizar profile com user_id
  // Atualizar app_metadata
} else {
  console.log('User not found, skipping user_id assignment');
}
```

---

## Resumo de Arquivos

| Arquivo | Ação |
|---------|------|
| `src/components/OnboardingModal.tsx` | Adicionar bandeiras/símbolos aos seletores |
| `src/pages/CreateSpace.tsx` | Adicionar step de preferências completo |
| `supabase/functions/create-couple/index.ts` | Verificar se usuário existe antes de vincular |
| **Migração SQL** | Remover FK constraint `profiles_user_id_fkey` |

---

## Seção Técnica

### Código do Step de Preferências (para CreateSpace.tsx)

```typescript
// Imports adicionais
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getActivePreferences, setActivePreferences, SupportedCurrency, SupportedLocale } from '@/lib/preferences';

// Estados adicionais
const activePreferences = getActivePreferences();
const [preferredLocale, setPreferredLocale] = useState<SupportedLocale>(activePreferences.locale);
const [preferredCurrency, setPreferredCurrency] = useState<SupportedCurrency>(activePreferences.currency);

// Step type atualizado
type Step = 'profile' | 'preferences' | 'pin' | 'email';

// Navegação
const handleNextStep = () => {
  if (name.trim() && isValidName(name)) {
    setStep('preferences'); // Vai para preferences em vez de pin
  }
};

const handlePreferencesNext = () => {
  // Salva preferências (shareCode será definido depois, usar temporário)
  localStorage.setItem('app_preferences', JSON.stringify({
    locale: preferredLocale,
    currency: preferredCurrency,
  }));
  setStep('pin');
  generateUsername();
};
```

### Seletores com Bandeiras

```tsx
{/* Idioma */}
<SelectContent>
  <SelectItem value="pt-BR">🇧🇷 Português (Brasil)</SelectItem>
  <SelectItem value="en-US">🇺🇸 English (US)</SelectItem>
  <SelectItem value="es-ES">🇪🇸 Español</SelectItem>
</SelectContent>

{/* Moeda */}
<SelectContent>
  <SelectItem value="BRL">R$ Real Brasileiro</SelectItem>
  <SelectItem value="USD">$ US Dollar</SelectItem>
  <SelectItem value="EUR">€ Euro</SelectItem>
</SelectContent>
```

---

## Sobre Exclusão de Usuários

Os dados públicos já foram excluídos. Para excluir os usuários de autenticação:

1. Acesse **Cloud > Users** no painel do Lovable
2. Selecione os usuários anônimos
3. Exclua-os manualmente

Ou posso criar uma migração para deletar todos os auth.users via SQL (requer permissão especial).
