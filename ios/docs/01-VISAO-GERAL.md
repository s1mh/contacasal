# ContaCasal iOS - Visao Geral do Projeto

## Sobre

Porta nativa do app web ContaCasal (contacasal.vercel.app) para iOS usando Swift/SwiftUI. O app e um rastreador de despesas para casais que permite dividir gastos, gerenciar cartoes, criar acordos recorrentes e visualizar estatisticas financeiras.

## Decisao Arquitetural: Monorepo

**Escolha: Manter no mesmo repositorio, pasta `ios/` separada.**

### Motivos:
1. A pasta `supabase/` (migrations + edge functions) e compartilhada entre web e iOS
2. O Vercel ignora a pasta `ios/` via Ignored Build Step + `.vercelignore`
3. Mantem tudo unificado - sem duplicacao de config do Supabase
4. Branch separado divergiria do main e complicaria merges de edge functions compartilhadas
5. Historico Git unico para rastreabilidade

### Estrutura do Repositorio:
```
contacasal/
├── src/                          # App web React (existente)
├── supabase/                     # COMPARTILHADO: migrations + edge functions
│   ├── migrations/               # Schema do banco (compartilhado)
│   ├── functions/                # Edge functions (compartilhado)
│   └── config.toml
├── ios/                          # NOVO: App iOS
│   ├── ContaCasal.xcodeproj      # Projeto Xcode
│   ├── ContaCasal/               # Codigo-fonte Swift
│   ├── ContaCasalTests/          # Testes unitarios
│   ├── ContaCasalUITests/        # Testes de UI
│   └── docs/                     # Documentacao iOS
├── .vercelignore                 # Ignora ios/ no deploy
├── vercel.json                   # Config Vercel (web)
└── package.json                  # Dependencias web
```

## Stack Tecnologica iOS

| Componente | Tecnologia |
|---|---|
| Linguagem | Swift 5.9+ |
| UI Framework | SwiftUI (iOS 17+) |
| Backend | Supabase Swift SDK v2.39+ |
| Auth | Anonymous + Sign in with Apple |
| State | @Observable macro (Observation framework) |
| Navigation | NavigationStack + Coordinator Pattern |
| Local Storage | SwiftData (cache offline) |
| Seguranca | Keychain (PIN), CryptoKit (hashing) |
| Networking | Supabase SDK (PostgREST + Edge Functions) |
| Realtime | Supabase Realtime (AsyncStream) |
| Charts | Swift Charts framework |
| Animations | SwiftUI animations nativas |
| Target minimo | iOS 17.0 |

## Funcionalidades a Portar

### Core (Prioridade 1 - MVP)
- [ ] Login anonimo + PIN
- [ ] Sign in with Apple (NOVO - apenas iOS)
- [ ] Criar espaco / Juntar-se via share code
- [ ] Onboarding (nome, avatar, cor, PIN)
- [ ] Dashboard com saldo e despesas recentes
- [ ] Adicionar/editar/excluir despesas
- [ ] Tipos de divisao: 50/50, percentual, fixo, 100%
- [ ] Historico de despesas com filtros
- [ ] Acertos (settlements)

### Complementar (Prioridade 2)
- [ ] Gerenciamento de cartoes (credito/debito)
- [ ] Acordos recorrentes (agreements)
- [ ] Categorias/tags customizaveis
- [ ] Estatisticas e graficos
- [ ] Multi-idioma (PT-BR, EN-US, ES-ES)
- [ ] Multi-moeda (BRL, USD, EUR)

### Avancado (Prioridade 3)
- [ ] AI Insights (dicas baseadas em gastos)
- [ ] Gerenciamento de membros (admin/membro)
- [ ] Recuperacao de PIN por email
- [ ] Sincronizacao offline-first com SwiftData
- [ ] Notificacoes push
- [ ] Widgets iOS

### Exclusivo iOS (NOVO)
- [ ] Sign in with Apple (autenticacao nativa)
- [ ] Face ID / Touch ID como alternativa ao PIN
- [ ] Widgets na Home Screen
- [ ] Shortcuts (Siri)
- [ ] Haptic feedback
- [ ] Notificacoes push nativas

## Backend Compartilhado

O app iOS usa EXATAMENTE o mesmo backend Supabase:
- Mesmo projeto: `opvdclvrsrptgmllxjxh`
- Mesmas 17 edge functions
- Mesmo schema PostgreSQL (18 migrations)
- Mesmas RLS policies
- Mesmo sistema de JWT claims

Nenhuma alteracao no backend e necessaria para o MVP. As unicas alteracoes futuras serao:
1. Habilitar provider Apple no Supabase Auth
2. Possivelmente adicionar edge function para push notifications
