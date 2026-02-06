# Ads readiness (Meta/Google/TikTok) + LGPD — Conta de Casal

## Objetivo

Estar pronto para rodar campanhas com:

- UTMs padronizadas
- Pixels via GTM
- Eventos consistentes
- Consentimento (LGPD)

## Ferramentas alvo

- **Google Tag Manager (GTM)**: orquestrar tags
- **Meta Pixel**: remarketing/conversões
- **Google Ads**: conversões (search/display)
- **TikTok Pixel**: teste de criativos UGC

## Checklist técnico

### 1) Data Layer

Criar um padrão (exemplo):

- `event`: nome do evento (ex.: `space_created`)
- `properties`: objeto com props não sensíveis
- `utm`: objeto com utms parseadas (se existirem)

### 2) Consentimento (LGPD)

Regras:

- Eventos/pixels só disparam **após consentimento** de analytics/marketing.
- Guardar consentimento localmente + (opcional) no backend (auditoria).
- Permitir revogação.

O que coletar (mínimo):

- `consent_analytics`: bool
- `consent_marketing`: bool
- `consent_updated_at`: timestamp

### 3) Eventos de conversão (MVP)

Priorizar:

- `waitlist_submitted` (top of funnel)
- `space_created` (ativação)
- `invite_sent` (loop)
- `expense_created` (core value)

## Estrutura de campanhas (sugestão)

### Meta (UGC/Creators)

- Campanha: `launch_mvp_<yyyymm>`
- Conjuntos:
  - Broad (interesses leves: relacionamento/organização/finanças pessoais)
  - Lookalike (futuro)
  - Remarketing (visitou landing, não converteu)
- Anúncios:
  - 5 hooks × 2 formatos × 2 variações de CTA

### Google (Search)

- Palavras de intenção:
  - “dividir gastos casal”
  - “planilha gastos casal”
  - “como dividir aluguel”
- Conversão: `space_created` (ou `waitlist_submitted` se for waitlist-first)

### TikTok (teste de criativos)

- Público amplo + criativos como variável principal

## Segurança e privacidade

- Não enviar para pixels: PIN, email completo, nomes completos.\n
- Não gravar campos de input (autocapture) sem revisão.
- Documentar o que é coletado e por quê (transparência).

