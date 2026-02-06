# Plano de mensuração — Conta de Casal

## Objetivo

Mensurar aquisição/ativação/retenção com uma taxonomia simples, pronta para GTM + pixels + analytics, sem coleta desnecessária (LGPD).

## Naming conventions

### UTMs

- `utm_source`: `instagram`, `tiktok`, `google`, `meta`, `creator_<nome>`
- `utm_medium`: `organic`, `paid`, `referral`, `email`
- `utm_campaign`: `launch_mvp_<yyyymm>`, `evergreen_<tema>`
- `utm_content`: `hook_<X>__format_<Y>__v<1..n>`
- `utm_term`: (somente search)

### Eventos (snake_case)

Formato: `domain_action` (ex.: `space_created`)

## Eventos recomendados (MVP)

### Aquisição e entrada

- `landing_viewed`
- `waitlist_submitted`
  - props: `channel`, `utm_campaign`, `consent_analytics` (bool)

### Autenticação / sessão

- `auth_started`
- `auth_succeeded`
  - props: `method` (`pin`, `invite`, `anonymous`)

### Core (ativação)

- `space_created`
- `invite_sent`
- `invite_opened`
- `invite_accepted`
- `expense_created`
- `expense_edited`
- `expense_deleted`
- `settlement_created`

### Engajamento

- `insights_viewed`
- `insights_refreshed`
- `settings_opened`

### Fricções

- `error_shown`
  - props: `code`, `area`

## Propriedades (regras)

- Não enviar dados sensíveis (PIN, email completo em logs, etc.).
- Preferir IDs internos (ex.: `couple_id`, `profile_id`) **somente** no backend/servidor.\n
  No client, usar identificadores anonimizados quando necessário.

## Métricas (AARRR)

- **Acquisition**: sessions, waitlist_submitted, CTR por UTM
- **Activation**: space_created → invite_sent → expense_created
- **Retention**: weekly active couples, repeat expense_created
- **Referral**: invite_sent → invite_accepted rate
- **Revenue** (futuro): paywall events (se existir)

## Dashboards sugeridos

1. Funil MVP (da landing ao 1º gasto)
2. Conversão por UTM/canal/creator
3. Cohort de retenção semanal (por “space_created week”)
4. Erros por área (onboarding, create space, invite)

