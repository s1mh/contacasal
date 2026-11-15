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

1. Branch `release/web-vX.Y.Z` a partir de `main` (opcional)
2. Ajustes finais
3. Merge em `main`
4. Criar tag `web-vX.Y.Z` no commit do merge
5. Vercel deploya `main`

### App

1. Branch `release/app-vX.Y.Z` a partir de `main`
2. Alterações específicas do Capacitor/iOS/Android
3. Criar tag `app-vX.Y.Z`
4. Build e submissão na store

