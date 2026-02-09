# Workflow do repositório (Web + App)

Este projeto é **um único codebase** que serve:

- **Web** (deploy na Vercel)
- **App iOS/Android** (via Capacitor)

O objetivo deste guia é reduzir bagunça: **branch certa**, **nome certo** e **tags** consistentes.

## Regra nº 1: o deploy da Vercel é sempre do `main`

- **Branch de produção (Vercel)**: `main`
- Preview deployments: PRs / branches de feature (se você quiser habilitar)

> Se o Vercel “não está deployando o main”, isso normalmente é:\n
> - configuração do projeto (Production Branch ≠ `main`)\n
> - erro de install (ex.: `npm E401` por token inválido)\n
> - cache de build

## Branches oficiais

### Web (Vercel)

- **`main`**: produção
- **`develop`** (recomendado criar): integração contínua (opcional)
- **`release/web-vX.Y.Z`**: preparar release web (opcional)
- **`hotfix/*`**: correção urgente direto a partir do `main`

### App (Capacitor)

- **`release/app-vX.Y.Z`**: preparar release de app (build de store)\n
  (mantém alterações específicas de app isoladas quando necessário)
- **`native/*`**: trabalhos específicos (plugins, iOS, Android)\n
  Ex.: `native/ios-splash`, `native/biometrics`

### Trabalhos do dia a dia

Use prefixes consistentes:

- `feat/*` nova funcionalidade
- `fix/*` correção
- `chore/*` manutenção/refactor
- `docs/*` documentação/branding/marketing (não afeta deploy)

## Política de PR

- Toda mudança entra via PR para `main`
- Ao mergear, **delete a branch** do PR (mantém o repo limpo)

## Tags (versões)

Crie tags separando Web e App:

- Web: `web-vX.Y.Z`
- App: `app-vX.Y.Z`

Exemplo:

- `web-v0.3.0`
- `app-v0.3.0`

## Onde ficam coisas “que não devem quebrar deploy”

Mesmo que esses diretórios existam no repo, o Vercel **não precisa** deles para buildar.
O `.vercelignore` ignora:

- `ios/` (Xcode)
- `supabase/` (migrations/functions)
- `brand/` e `docs/` (branding/marketing)

## Checklist rápido (quando algo “bagunçar”)

1. Vercel → Project → Settings → **Production Branch = `main`**
2. Vercel → Env Vars → remover tokens inválidos (ex.: `NPM_TOKEN` quando não usa pacote privado)
3. Redeploy sem cache (“Clear cache”)
4. No GitHub: deletar branches já mergeadas

