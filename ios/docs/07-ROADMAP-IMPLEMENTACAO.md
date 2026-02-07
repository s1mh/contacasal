# ContaCasal iOS - Roadmap de Implementacao

## Fase 1: Fundacao (Semana 1-2)

### 1.1 Setup do Projeto
- [ ] Criar projeto Xcode em `ios/ContaCasal.xcodeproj`
- [ ] Configurar target iOS 17.0+
- [ ] Adicionar Supabase Swift SDK via SPM (v2.39+)
- [ ] Configurar `.vercelignore` e Ignored Build Step
- [ ] Configurar `.gitignore` para arquivos Xcode
- [ ] Criar estrutura de diretorios (Features/, Core/, Models/, etc.)
- [ ] Configurar `SupabaseManager.swift` com URL e anon key
- [ ] Configurar scheme de build (Debug/Release)
- [ ] Adicionar entitlements para Sign in with Apple

### 1.2 Core Infrastructure
- [ ] `SupabaseManager.swift` - Singleton do client Supabase
- [ ] `EdgeFunctionClient.swift` - Wrapper tipado para edge functions
- [ ] `KeychainService.swift` - CRUD seguro no Keychain
- [ ] `PINManager.swift` - Hash SHA-256, verificacao, storage
- [ ] `AuthManager.swift` - State machine de autenticacao
- [ ] `PreferencesStore.swift` - UserDefaults para prefs nao-sensiveis
- [ ] `Color+Hex.swift` - Extensao para converter hex → Color

### 1.3 Modelos de Dados
- [ ] Todos os models Codable (Couple, Profile, Expense, Tag, Card, etc.)
- [ ] Enums (SplitType, PaymentType, ProfileStatus, CardType, SpaceRole)
- [ ] Mapeamento Lucide → SF Symbols (TagIcon)
- [ ] CatAvatar enum com imagens e cores de fundo

## Fase 2: Autenticacao (Semana 2-3)

### 2.1 Fluxo de Auth
- [ ] `WelcomeView.swift` - Tela inicial com opcoes de login
- [ ] `AppleSignInManager.swift` - Sign in with Apple completo
- [ ] Auth anonimo via Supabase
- [ ] `PINEntryView.swift` - Teclado numerico custom para PIN
- [ ] Verificacao de PIN via edge function
- [ ] Login com username via edge function
- [ ] Face ID / Touch ID como alternativa ao PIN

### 2.2 Onboarding
- [ ] `CreateSpaceView.swift` - Fluxo de criar espaco
- [ ] `JoinSpaceView.swift` - Entrar com share code
- [ ] `OnboardingView.swift` - Nome, avatar, cor, PIN
- [ ] Selecao de avatar (8 gatos)
- [ ] Selecao de cor (6 opcoes)
- [ ] Validacao de PIN (nao sequencial, nao comum)
- [ ] `WaitingForPartnerView.swift` - Aguardar parceiro(a)

## Fase 3: Features Core (Semana 3-5)

### 3.1 Dashboard
- [ ] `DashboardView.swift` - Tela principal (Resumo)
- [ ] `BalanceCard.swift` - Saldo entre os dois
- [ ] `RecentExpensesList.swift` - Ultimas 5 despesas
- [ ] Saudacao por horario do dia
- [ ] Botao de compartilhar espaco (ShareLink nativo)
- [ ] Pull-to-refresh

### 3.2 Adicionar Despesa
- [ ] `AddExpenseView.swift` - Formulario completo
- [ ] `CurrencyTextField.swift` - Input formatado (R$ 0,00)
- [ ] `SplitPickerView.swift` - Selecao de tipo de divisao
- [ ] Selecao de categoria (tags)
- [ ] Selecao de quem pagou
- [ ] Selecao de data
- [ ] Tipo de pagamento (debito/credito)
- [ ] Selecao de cartao (se credito)
- [ ] Parcelamento (1-12x)
- [ ] Calculo automatico de billing month
- [ ] Validacao do formulario

### 3.3 Historico
- [ ] `HistoryView.swift` - Lista de despesas por mes
- [ ] `MonthPickerView.swift` - Seletor de mes
- [ ] Filtro por categoria
- [ ] `SettlementRow.swift` - Resumo mensal (quem deve a quem)
- [ ] Editar/excluir despesa (swipe actions)
- [ ] Excluir parcelas em lote

### 3.4 Acertos (Settlements)
- [ ] Adicionar acerto manual
- [ ] Historico de acertos
- [ ] Calcular saldo automaticamente

## Fase 4: Features Complementares (Semana 5-7)

### 4.1 Cartoes
- [ ] `CardManagerView.swift` - Lista de cartoes
- [ ] Adicionar cartao (credito/debito)
- [ ] Configurar dia de fechamento e vencimento
- [ ] Selecionar cor do cartao
- [ ] Excluir cartao

### 4.2 Acordos Recorrentes
- [ ] `AgreementManagerView.swift` - Lista de acordos
- [ ] Criar acordo (nome, valor, divisao, dia do mes)
- [ ] Editar/excluir acordo
- [ ] Toggle ativo/inativo

### 4.3 Estatisticas
- [ ] `StatisticsView.swift` - Dashboard de graficos
- [ ] `CategoryChart.swift` - Swift Charts (pizza/barra por categoria)
- [ ] `PersonChart.swift` - Gastos por pessoa
- [ ] `TrendChart.swift` - Tendencia mensal (linha)
- [ ] Selecao de periodo (1, 3, 6, 12 meses, tudo)

### 4.4 Configuracoes
- [ ] `SettingsView.swift` - Tela de configuracoes
- [ ] `ProfileEditView.swift` - Editar nome, avatar, cor
- [ ] Idioma (PT-BR, EN-US, ES-ES)
- [ ] Moeda (BRL, USD, EUR)
- [ ] Toggle ocultar valores
- [ ] Visualizar share code + copiar
- [ ] Regenerar share code

### 4.5 Gerenciamento de Membros
- [ ] `MemberListView.swift` - Lista de membros com roles
- [ ] Promover/rebaixar (admin)
- [ ] Remover membro (admin)

## Fase 5: Polimento (Semana 7-8)

### 5.1 Internacionalizacao
- [ ] `Localizable.xcstrings` com todas as strings
- [ ] PT-BR (padrao)
- [ ] EN-US
- [ ] ES-ES
- [ ] Formatacao de moeda por locale
- [ ] Formatacao de data por locale

### 5.2 Offline-First
- [ ] SwiftData models (CachedExpense, CachedProfile, etc.)
- [ ] `SyncManager.swift` - Sincronizacao bidirecional
- [ ] Fila de operacoes pendentes
- [ ] Deteccao de conectividade (NWPathMonitor)
- [ ] Resolucao de conflitos (last-write-wins)
- [ ] Indicador de sincronizacao na UI

### 5.3 UX & Polish
- [ ] Haptic feedback em acoes principais
- [ ] Animacoes de transicao entre telas
- [ ] Skeleton loading states
- [ ] Empty states com ilustracoes
- [ ] Error handling com alertas claros
- [ ] Acessibilidade (VoiceOver, Dynamic Type)

### 5.4 Seguranca
- [ ] App Transport Security (HTTPS only)
- [ ] Certificate pinning para Supabase (opcional)
- [ ] Jailbreak detection (opcional)
- [ ] Obfuscar anon key (nao eh secret, mas boa pratica)
- [ ] Limpar dados sensiveis em background (app snapshot)

## Fase 6: Avancado (Pos-lancamento)

### 6.1 AI Insights
- [ ] Integrar edge function `generate-insights`
- [ ] Cards de insights na Dashboard
- [ ] Notificacoes de insights

### 6.2 Notificacoes Push
- [ ] APNs setup
- [ ] Edge function para enviar push
- [ ] Notificar quando parceiro adiciona despesa
- [ ] Notificar quando acordo recorrente vence
- [ ] Resumo semanal/mensal

### 6.3 Widgets iOS
- [ ] Widget de saldo atual (pequeno)
- [ ] Widget de despesas recentes (medio)
- [ ] Widget de acesso rapido a adicionar despesa

### 6.4 Siri Shortcuts
- [ ] "Adicionar despesa de R$ X"
- [ ] "Qual meu saldo?"
- [ ] App Intents framework

### 6.5 Apple Watch (Futuro)
- [ ] Ver saldo
- [ ] Adicionar despesa rapida
- [ ] Complicacoes

## Estimativa por Fase

| Fase | Escopo | Complexidade |
|---|---|---|
| 1. Fundacao | Setup + infra | Media |
| 2. Auth | Login + onboarding | Alta |
| 3. Core | Dashboard + despesas + historico | Alta |
| 4. Complementar | Cartoes + acordos + stats + settings | Media |
| 5. Polimento | i18n + offline + UX + seguranca | Alta |
| 6. Avancado | Push + widgets + Siri + Watch | Media |

## Criterios de Lancamento (MVP)

Para lancar na App Store, o MVP precisa de:
- [x] Fases 1-3 completas
- [ ] Fase 4 parcial (pelo menos settings + cartoes)
- [ ] Testes em dispositivos reais
- [ ] App Store Connect configurado
- [ ] Screenshots para App Store (6.7", 6.1", iPad)
- [ ] Descricao em PT-BR e EN-US
- [ ] Politica de privacidade
- [ ] Termos de uso
- [ ] App Review Guidelines compliance
