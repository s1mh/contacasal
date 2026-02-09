# Releases (Web + App)

## Objetivo

Padronizar versões e tags para evitar confusão entre deploy Web (Vercel) e builds App (Capacitor).

## Versão

Usar SemVer: `X.Y.Z`

## Tags

- Web: `web-vX.Y.Z`
- App: `app-vX.Y.Z`

## Processo sugerido

### Web

1. Branch `release/web-vX.Y.Z` a partir de `main` (opcional)\n
2. Ajustes finais\n
3. Merge em `main`\n
4. Criar tag `web-vX.Y.Z` no commit do merge\n
5. Vercel deploya `main`

### App

1. Branch `release/app-vX.Y.Z` a partir de `main`\n
2. Alterações específicas do Capacitor/iOS/Android\n
3. Criar tag `app-vX.Y.Z`\n
4. Build e submissão na store

