# Fase 2 — Redesenho de schema (plano)

Este documento descreve como fazer uma evolução estrutural do banco **sem quebrar produção**. Ele não muda permissões nem comportamento por si só — é um guia de rollout.

## Objetivo

- Evoluir o schema para melhorar **consistência**, **manutenibilidade** e **escala** (multi-membros).
- Manter compatibilidade com o app atual durante a migração.

## Premissas

- Produção já usa Supabase com RLS e Edge Functions.
- Alterações devem ser **incrementais** e com rollback possível.

## Estratégia recomendada (compatibilidade primeiro)

### 1) “Expandir antes de migrar”

- Adicionar novas tabelas/colunas **sem remover** as antigas.
- Adicionar índices necessários.
- Criar views e funções de compatibilidade quando fizer sentido.

### 2) Backfill (migração de dados)

- Rodar backfill em batches (por `couple_id` / por range de `created_at`).
- Validar consistência com queries de comparação (old vs new).

### 3) Dual-read / Dual-write (curto período)

- App/Edge Functions passam a escrever no novo modelo.\n
  Se necessário, também escrevem no antigo temporariamente (dual-write).
- Leituras passam a preferir o novo modelo, caindo para o antigo (fallback).

### 4) Cutover + limpeza

- Remover dependências do modelo antigo.
- Remover tabelas/colunas antigas **somente** quando:\n
  - métricas e auditoria confirmarem estabilidade;\n
  - houver janela de manutenção (se necessário);\n
  - PR/Deploy estiverem prontos para rollback.

## Alvos de redesenho (candidatos)

> Estes itens são “candidatos”. A seleção final depende do que você quer otimizar primeiro.

### A) Padronização de “space/couple”

Hoje `couples` representa o “espaço”. Em Fase 2, considerar:\n
- renomear conceitualmente para `spaces` (fisicamente ou via view `public.spaces` apontando para `public.couples`).\n
Isso melhora clareza do domínio e reduz ambiguidade.

### B) Multi-membros de forma explícita

- Consolidar relações (space ↔ profile ↔ role) e decisões de permissão.\n
- Garantir constraints e índices para operações comuns:
  - `space_roles(space_id, profile_id)` unique (já existe)
  - índices em `space_roles(space_id)` e `space_roles(profile_id)`

### C) Pagamentos e cartões

Hoje existe `expense_payments` e campos em `expenses`.\n
Em Fase 2, escolher um modelo consistente:

- **Modelo 1 (simples)**: `expenses` sempre tem 1 pagante e 0..1 `card_id`.\n
- **Modelo 2 (flexível)**: `expenses` e `expense_payments` sempre — e `expenses` não guarda “card_id” diretamente.\n

Recomendação: manter o modelo flexível (2) se o produto já usa splits por pagamento/cartão.

### D) Normalização de cores/tags

- Se tags são por space, garantir `tags(couple_id, name)` com índice.\n
- Se houver hardcodes de cor, padronizar defaults e constraints.

## RLS e permissões (sem regressão)

Durante Fase 2:

- Manter políticas existentes funcionando.\n
- Para novas tabelas, aplicar o padrão:\n
  - `... USING (couple_id = public.get_current_couple_id())`
- Evitar `USING (true)` em dados sensíveis.\n
- Quando necessário (fluxos públicos), usar Edge Functions com `service_role`.

## Plano de rollout (checklist)

1. **Design doc** com diagrama do novo modelo + decisões (Modelo 1 vs 2 etc.).\n
2. **Migration “expand”**: novas tabelas/colunas + índices.\n
3. **Backfill**: função SQL ou Edge Function admin para migrar dados existentes.\n
4. **Validação**: queries comparando contagens/somas por `couple_id`.\n
5. **Dual-write**: liberar gradualmente.\n
6. **Cutover**: leitura 100% no novo modelo.\n
7. **Cleanup**: remover legado e simplificar.

## Rollback

- Se algo der errado:\n
  - desligar dual-write (feature flag)\n
  - voltar reads para o modelo antigo\n
  - manter migrations “expand” (não quebram) e investigar

