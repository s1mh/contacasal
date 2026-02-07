# ContaCasal iOS

App nativo iOS do ContaCasal, construido com Swift/SwiftUI.

## Requisitos

- Xcode 15+
- iOS 17.0+
- Swift 5.9+
- Apple Developer Account (para Sign in with Apple e distribuicao)

## Setup

1. Abrir `ios/ContaCasal.xcodeproj` no Xcode
2. Configurar o Bundle ID: `com.contacasal.app`
3. Adicionar as environment variables do Supabase:
   - `SUPABASE_URL`: URL do projeto Supabase
   - `SUPABASE_ANON_KEY`: Chave anonima (mesma do web)
4. Configurar Sign in with Apple (ver `docs/06-SIGN-IN-WITH-APPLE-SETUP.md`)
5. Build & Run (Cmd+R)

## Dependencias

- [Supabase Swift SDK](https://github.com/supabase/supabase-swift) v2.39+ (via SPM)
- Frameworks nativos: SwiftUI, Swift Charts, CryptoKit, AuthenticationServices, LocalAuthentication, SwiftData

## Documentacao

| Documento | Conteudo |
|---|---|
| [01-VISAO-GERAL](docs/01-VISAO-GERAL.md) | Decisoes arquiteturais, stack, funcionalidades |
| [02-ARQUITETURA](docs/02-ARQUITETURA.md) | MVVM, estrutura de diretorios, navegacao, dependencias |
| [03-MODELOS-DE-DADOS](docs/03-MODELOS-DE-DADOS.md) | Models Swift, mapeamento de icones e avatares |
| [04-AUTENTICACAO](docs/04-AUTENTICACAO.md) | Auth anonimo, Sign in with Apple, Face ID, PIN |
| [05-EDGE-FUNCTIONS-API](docs/05-EDGE-FUNCTIONS-API.md) | Referencia de todas as 17 edge functions |
| [06-SIGN-IN-WITH-APPLE-SETUP](docs/06-SIGN-IN-WITH-APPLE-SETUP.md) | Guia passo-a-passo de configuracao |
| [07-ROADMAP-IMPLEMENTACAO](docs/07-ROADMAP-IMPLEMENTACAO.md) | Roadmap completo com fases e checklist |

## Backend

O app iOS compartilha o MESMO backend Supabase com o app web:
- Mesmas edge functions (17)
- Mesmo schema PostgreSQL (18 migrations)
- Mesmas RLS policies
- Mesma estrutura em `../supabase/`

## Estrutura

```
ios/
├── ContaCasal/
│   ├── App/              # Entry point, AppDelegate
│   ├── Core/             # Infra: network, auth, storage, sync
│   ├── Models/           # Codable models + SwiftData cache
│   ├── Features/         # Feature modules (Auth, Dashboard, etc.)
│   ├── Navigation/       # Coordinator + routes
│   ├── UI/               # Componentes compartilhados + tema
│   └── Resources/        # Assets, Info.plist, entitlements
├── ContaCasalTests/      # Testes unitarios
├── ContaCasalUITests/    # Testes de UI
└── docs/                 # Documentacao tecnica
```
