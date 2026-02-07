# ContaCasal iOS - Arquitetura

## Padrao: Modern MVVM + Coordinator

```
┌──────────────────────────────────────────────────┐
│                    SwiftUI Views                  │
│         (declarativo, reativo, composavel)        │
├──────────────────────────────────────────────────┤
│                   ViewModels                      │
│  (@Observable, logica de negocio, async/await)    │
├──────────────────────────────────────────────────┤
│                  Repositories                     │
│    (abstrai fonte de dados: local vs remoto)      │
├──────────┬───────────────────────────────────────┤
│ SwiftData│           Supabase SDK                 │
│ (cache)  │  (PostgREST + Edge Functions + Auth)   │
└──────────┴───────────────────────────────────────┘
```

## Estrutura de Diretorios

```
ios/
├── ContaCasal.xcodeproj
├── ContaCasal/
│   ├── App/
│   │   ├── ContaCasalApp.swift          # Entry point, setup providers
│   │   └── AppDelegate.swift            # Push notifications, lifecycle
│   │
│   ├── Core/
│   │   ├── Network/
│   │   │   ├── SupabaseManager.swift    # Singleton Supabase client
│   │   │   └── EdgeFunctions.swift      # Typed edge function calls
│   │   ├── Auth/
│   │   │   ├── AuthManager.swift        # Auth state machine
│   │   │   ├── AppleSignIn.swift        # Sign in with Apple handler
│   │   │   └── PINManager.swift         # PIN hash/verify via Keychain
│   │   ├── Storage/
│   │   │   ├── KeychainService.swift    # Keychain wrapper
│   │   │   └── PreferencesStore.swift   # UserDefaults (non-sensitive)
│   │   ├── Sync/
│   │   │   ├── SyncManager.swift        # Offline-first sync actor
│   │   │   └── ConflictResolver.swift   # Last-write-wins strategy
│   │   ├── Localization/
│   │   │   ├── L10n.swift               # Translation keys
│   │   │   ├── Localizable.xcstrings    # PT-BR, EN-US, ES-ES
│   │   │   └── CurrencyFormatter.swift  # Intl formatting
│   │   └── Extensions/
│   │       ├── Date+Extensions.swift
│   │       ├── Color+Hex.swift
│   │       └── View+Extensions.swift
│   │
│   ├── Models/
│   │   ├── Couple.swift                 # Couple + ShareCode
│   │   ├── Profile.swift                # Profile + status, position
│   │   ├── Expense.swift                # Expense + split logic
│   │   ├── Tag.swift                    # Category/tag
│   │   ├── Card.swift                   # Credit/debit card
│   │   ├── Agreement.swift              # Recurring expense
│   │   ├── Settlement.swift             # Payment record
│   │   ├── SpaceRole.swift              # Admin/member role
│   │   └── CachedModels/               # SwiftData @Model versions
│   │       ├── CachedExpense.swift
│   │       ├── CachedProfile.swift
│   │       └── CachedCouple.swift
│   │
│   ├── Features/
│   │   ├── Auth/
│   │   │   ├── Views/
│   │   │   │   ├── WelcomeView.swift        # Landing screen
│   │   │   │   ├── CreateSpaceView.swift     # Create new space
│   │   │   │   ├── JoinSpaceView.swift       # Enter share code
│   │   │   │   ├── OnboardingView.swift      # Name, avatar, color, PIN
│   │   │   │   ├── PINEntryView.swift        # 4-digit PIN input
│   │   │   │   └── AppleSignInButton.swift   # Apple auth button
│   │   │   └── ViewModels/
│   │   │       ├── AuthViewModel.swift
│   │   │       └── OnboardingViewModel.swift
│   │   │
│   │   ├── Dashboard/
│   │   │   ├── Views/
│   │   │   │   ├── DashboardView.swift       # Main summary
│   │   │   │   ├── BalanceCard.swift          # Who owes whom
│   │   │   │   ├── RecentExpensesList.swift   # Last 5 expenses
│   │   │   │   └── QuickActionsBar.swift      # Add expense, share
│   │   │   └── ViewModels/
│   │   │       └── DashboardViewModel.swift
│   │   │
│   │   ├── Expenses/
│   │   │   ├── Views/
│   │   │   │   ├── AddExpenseView.swift      # New expense form
│   │   │   │   ├── ExpenseDetailView.swift   # View/edit expense
│   │   │   │   ├── ExpenseRow.swift          # List row component
│   │   │   │   └── SplitPickerView.swift     # Split type selector
│   │   │   └── ViewModels/
│   │   │       ├── AddExpenseViewModel.swift
│   │   │       └── ExpenseListViewModel.swift
│   │   │
│   │   ├── History/
│   │   │   ├── Views/
│   │   │   │   ├── HistoryView.swift         # Monthly history
│   │   │   │   ├── MonthPickerView.swift     # Month selector
│   │   │   │   └── SettlementRow.swift       # Who paid whom
│   │   │   └── ViewModels/
│   │   │       └── HistoryViewModel.swift
│   │   │
│   │   ├── Statistics/
│   │   │   ├── Views/
│   │   │   │   ├── StatisticsView.swift      # Charts dashboard
│   │   │   │   ├── CategoryChart.swift       # Spending by category
│   │   │   │   ├── PersonChart.swift         # Spending per person
│   │   │   │   └── TrendChart.swift          # Monthly trend
│   │   │   └── ViewModels/
│   │   │       └── StatisticsViewModel.swift
│   │   │
│   │   ├── Settings/
│   │   │   ├── Views/
│   │   │   │   ├── SettingsView.swift        # Main settings
│   │   │   │   ├── ProfileEditView.swift     # Edit profile
│   │   │   │   ├── CardManagerView.swift     # Manage cards
│   │   │   │   ├── AgreementManagerView.swift # Recurring expenses
│   │   │   │   ├── MemberListView.swift      # Manage members
│   │   │   │   └── PreferencesView.swift     # Language, currency
│   │   │   └── ViewModels/
│   │   │       └── SettingsViewModel.swift
│   │   │
│   │   └── Onboarding/
│   │       ├── Views/
│   │       │   ├── OnboardingGuideView.swift  # Step-by-step tour
│   │       │   └── WaitingForPartnerView.swift # Wait for 2nd member
│   │       └── ViewModels/
│   │           └── OnboardingGuideViewModel.swift
│   │
│   ├── Navigation/
│   │   ├── AppCoordinator.swift         # Root coordinator
│   │   ├── Routes.swift                 # Route enum definitions
│   │   └── TabBarView.swift             # Main tab navigation
│   │
│   ├── UI/
│   │   ├── Components/
│   │   │   ├── CatAvatarView.swift      # Cat avatar image
│   │   │   ├── PINKeypad.swift          # Custom PIN input
│   │   │   ├── CurrencyTextField.swift  # Formatted amount input
│   │   │   ├── LoadingOverlay.swift     # Sync indicator
│   │   │   └── EmptyStateView.swift     # Empty list placeholder
│   │   └── Theme/
│   │       ├── AppTheme.swift           # Colors, fonts, spacing
│   │       └── ColorExtensions.swift    # Hex to SwiftUI Color
│   │
│   └── Resources/
│       ├── Assets.xcassets/             # App icon, cat avatars
│       ├── Info.plist
│       └── Entitlements.plist           # Sign in with Apple
│
├── ContaCasalTests/
│   ├── ViewModelTests/
│   ├── RepositoryTests/
│   └── UtilityTests/
│
└── ContaCasalUITests/
    └── FlowTests/
```

## Fluxo de Navegacao

```
App Launch
  │
  ├── Has Session? ──No──→ WelcomeView
  │                         ├── "Criar Espaco" → CreateSpaceView → OnboardingView → PIN → Dashboard
  │                         ├── "Juntar-se"    → JoinSpaceView → OnboardingView → PIN → Dashboard
  │                         ├── "Sign in with Apple" → Apple Auth → Dashboard (ou Onboarding)
  │                         └── "Entrar com @"  → Username + PIN → Dashboard
  │
  └── Has Session? ──Yes──→ PIN Entry (se configurado)
                             │
                             └── TabBarView
                                  ├── Tab 1: DashboardView (Resumo)
                                  ├── Tab 2: AddExpenseView (Novo Gasto)
                                  ├── Tab 3: HistoryView (Historico)
                                  ├── Tab 4: StatisticsView (Estatisticas)
                                  └── Tab 5: SettingsView (Configuracoes)
```

## Diagramas de Estado

### AuthManager State Machine
```
┌──────────┐   signInAnonymously()   ┌──────────────┐
│  Initial │ ───────────────────────→ │  Anonymous    │
└──────────┘                          └──────┬───────┘
                                             │
                        joinSpace()          │  createSpace()
                    ┌───────────────┐        │  ┌──────────────┐
                    │  Pending      │←───────┤  │  Creator     │
                    │  (30 min)     │        │  │  (admin)     │
                    └───────┬───────┘        │  └──────┬───────┘
                            │                │         │
                    activateProfile()        │  verifyPIN()
                            │                │         │
                            ▼                ▼         ▼
                    ┌──────────────────────────────────┐
                    │        Authenticated              │
                    │  (couple_id in JWT claims)        │
                    └──────────────┬───────────────────┘
                                   │
                        linkIdentity(apple)
                                   │
                                   ▼
                    ┌──────────────────────────────────┐
                    │    Authenticated + Apple ID       │
                    │  (linked identity, not anonymous) │
                    └──────────────────────────────────┘
```

### SyncManager States
```
┌────────┐   network available   ┌─────────┐   changes detected   ┌─────────┐
│ Idle   │ ────────────────────→ │ Syncing │ ───────────────────→ │ Pushing │
└────────┘                       └────┬────┘                      └────┬────┘
    ▲                                 │                                │
    │           no changes            │          sync complete         │
    └─────────────────────────────────┴────────────────────────────────┘
```

## Dependencias Swift (Swift Package Manager)

```swift
// Package.swift ou via Xcode SPM
dependencies: [
    // Supabase
    .package(url: "https://github.com/supabase/supabase-swift.git", from: "2.39.0"),

    // (SwiftUI nativo - sem dependencias extras para UI)
    // (CryptoKit nativo - sem dependencias extras para hashing)
    // (Swift Charts nativo - sem dependencias extras para graficos)
    // (AuthenticationServices nativo - Sign in with Apple)
]
```

**Filosofia: Minimo de dependencias externas.** O iOS tem frameworks nativos para quase tudo:
- SwiftUI → UI (substitui React + shadcn/ui + Radix)
- Swift Charts → Graficos (substitui Recharts)
- CryptoKit → Hashing SHA-256 (substitui crypto manual)
- AuthenticationServices → Sign in with Apple
- SwiftData → Cache local (substitui localStorage)
- Keychain → Armazenamento seguro (substitui localStorage para dados sensiveis)
- LocalAuthentication → Face ID / Touch ID
- StoreKit → (futuro) In-app purchases
