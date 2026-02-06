# Convenções — Supabase (Conta de Casal)

Este documento define padrões para manter a base consistente, segura e fácil de evoluir.

## SQL / Migrations

- **Sempre idempotente**: usar `IF NOT EXISTS`, `DROP ... IF EXISTS` e/ou `DO $$ BEGIN ... EXCEPTION WHEN ... END $$;`.
- **Sempre qualificar schema**: preferir `public.<tabela>` e `public.<função>` para evitar ambiguidades.
- **Um assunto por migration**: manutenção de realtime/replica identity em uma migration; renomeação de policies em outra.
- **Comentários no topo**: o “porquê” da migration em 1–3 linhas.

## Nomes

### Tabelas e colunas

- **snake_case**.
- Chaves estrangeiras: `<entidade>_id` (ex.: `couple_id`, `profile_id`).

### Índices

- Padrão: `idx_<tabela>_<colunas>`\n
  Ex.: `idx_expenses_couple_id`, `idx_ai_insights_created_at`.

### Policies (RLS)

- Padrão: `"<Action> own <resource>"`, onde:\n
  - `<Action>`: `Read`, `Insert`, `Update`, `Delete`\n
  - `<resource>`: nome da tabela (ex.: `expenses`, `ai_insights`, `space_roles`)

Exemplos:

- `Read own expenses`
- `Insert own expense_payments`
- `Update own space_roles`

> Regra: **não mudar a lógica de acesso** numa migration de “padronização de nomes”. Apenas renomear.

## Realtime

- A publication `supabase_realtime` deve conter todas as tabelas que precisam atualizar “ao vivo”.
- Para updates/deletes mais consistentes, garantir `REPLICA IDENTITY FULL` nas tabelas publicadas (quando aplicável).

Tabelas padrão do produto:

- `public.expenses`
- `public.profiles`
- `public.tags`
- `public.cards`
- `public.agreements`
- `public.settlements`
- `public.expense_payments`
- `public.spending_patterns`
- `public.ai_insights`
- `public.space_roles`

## Funções

- Preferir funções em `public` com `SECURITY DEFINER` apenas quando necessário.\n
- **Sempre** definir `SET search_path = 'public'` em functions definer para reduzir riscos.

