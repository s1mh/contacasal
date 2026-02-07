# ContaCasal iOS - Autenticacao

## Visao Geral

O app iOS suporta 3 metodos de autenticacao:

1. **Anonimo + PIN** (igual ao web) - padrao
2. **Sign in with Apple** (NOVO, exclusivo iOS/Apple)
3. **Username + PIN** (login alternativo, igual ao web)

## 1. Auth Anonimo + PIN (Fluxo Padrao)

### Como funciona no web (referencia):
1. `supabase.auth.signInAnonymously()` → cria sessao anonima
2. Edge function `create-couple` ou `join-space` → configura `app_metadata.couple_id`
3. Usuario cria PIN de 4 digitos → hash SHA-256 com salt
4. Login subsequente: verificar PIN via edge function `verify-pin`

### Implementacao iOS:

```swift
// AuthManager.swift
@Observable
class AuthManager {
    var currentSession: Session?
    var currentProfile: Profile?
    var isAuthenticated = false
    var isLoading = false

    private let supabase = SupabaseManager.shared.client

    // 1. Auth anonimo
    func signInAnonymously() async throws {
        let session = try await supabase.auth.signInAnonymously()
        self.currentSession = session
    }

    // 2. Criar espaco
    func createSpace() async throws -> (coupleId: UUID, shareCode: String) {
        struct Response: Decodable {
            let success: Bool
            let couple_id: UUID
            let share_code: String
        }

        let response: Response = try await supabase.functions.invoke(
            "create-couple",
            options: .init()
        )

        return (response.couple_id, response.share_code)
    }

    // 3. Verificar PIN
    func verifyPIN(_ pin: String, profileId: UUID) async throws -> Bool {
        struct Request: Encodable {
            let profile_id: UUID
            let pin: String
        }

        struct Response: Decodable {
            let success: Bool
            let profile_name: String?
        }

        let response: Response = try await supabase.functions.invoke(
            "verify-pin",
            options: .init(body: Request(profile_id: profileId, pin: pin))
        )

        return response.success
    }
}
```

### Armazenamento Seguro do PIN (iOS):

```swift
// PINManager.swift
import CryptoKit
import Security

class PINManager {
    private static let salt = "couple_pin_salt_v1_"

    /// Hash identico ao usado no web (SHA-256 com salt)
    static func hashPIN(_ pin: String) -> String {
        let data = Data((salt + pin).utf8)
        let hash = SHA256.hash(data: data)
        return hash.compactMap { String(format: "%02x", $0) }.joined()
    }

    /// Salvar profile_id no Keychain para login rapido
    static func saveLastProfile(_ profileId: UUID, shareCode: String) throws {
        let data = try JSONEncoder().encode([
            "profileId": profileId.uuidString,
            "shareCode": shareCode
        ])

        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: "lastProfile",
            kSecAttrService as String: "com.contacasal.app",
            kSecValueData as String: data,
            kSecAttrAccessible as String: kSecAttrAccessibleWhenUnlockedThisDeviceOnly
        ]

        SecItemDelete(query as CFDictionary)
        let status = SecItemAdd(query as CFDictionary, nil)
        guard status == errSecSuccess else {
            throw KeychainError.saveFailed(status)
        }
    }
}
```

## 2. Sign in with Apple (NOVO)

### Pre-requisitos no Apple Developer Portal:
1. **App ID** com capability "Sign in with Apple" habilitada
2. **Services ID** (para callback web no Supabase)
   - Domains: `opvdclvrsrptgmllxjxh.supabase.co`
   - Return URL: `https://opvdclvrsrptgmllxjxh.supabase.co/auth/v1/callback`
3. **Private Key** (.p8) com Sign in with Apple habilitado
4. **Configurar no Supabase Dashboard**:
   - Authentication > Providers > Apple
   - Services ID, Team ID, Key ID, .p8 key contents

### Fluxo iOS Nativo:

```swift
// AppleSignIn.swift
import AuthenticationServices

@Observable
class AppleSignInManager: NSObject {
    var isProcessing = false
    var error: String?

    private let supabase = SupabaseManager.shared.client

    func signInWithApple() {
        let provider = ASAuthorizationAppleIDProvider()
        let request = provider.createRequest()
        request.requestedScopes = [.fullName, .email]

        let controller = ASAuthorizationController(authorizationRequests: [request])
        controller.delegate = self
        controller.performRequests()
    }
}

extension AppleSignInManager: ASAuthorizationControllerDelegate {

    func authorizationController(
        controller: ASAuthorizationController,
        didCompleteWithAuthorization authorization: ASAuthorization
    ) {
        guard let credential = authorization.credential as? ASAuthorizationAppleIDCredential,
              let identityToken = credential.identityToken,
              let idTokenString = String(data: identityToken, encoding: .utf8)
        else {
            error = "Falha ao obter credenciais Apple"
            return
        }

        Task {
            do {
                // Autenticar com Supabase usando o ID token da Apple
                let session = try await supabase.auth.signInWithIdToken(
                    credentials: .init(
                        provider: .apple,
                        idToken: idTokenString
                    )
                )

                // IMPORTANTE: Apple so envia nome no PRIMEIRO login
                if let fullName = credential.fullName {
                    let displayName = [fullName.givenName, fullName.familyName]
                        .compactMap { $0 }
                        .joined(separator: " ")

                    if !displayName.isEmpty {
                        try await supabase.auth.update(
                            user: UserAttributes(
                                data: ["full_name": .string(displayName)]
                            )
                        )
                    }
                }

                // Verificar se usuario ja tem espaco
                await checkExistingSpace()

            } catch {
                self.error = error.localizedDescription
            }
        }
    }

    private func checkExistingSpace() async {
        // Se JWT ja tem couple_id, usuario tem espaco
        // Senao, redirecionar para criar/juntar espaco
    }
}
```

### SwiftUI Button:

```swift
// AppleSignInButton.swift
struct AppleSignInButtonView: View {
    @State private var manager = AppleSignInManager()

    var body: some View {
        SignInWithAppleButton(.signIn) { request in
            request.requestedScopes = [.fullName, .email]
        } onCompletion: { result in
            switch result {
            case .success(let authorization):
                manager.handleAuthorization(authorization)
            case .failure(let error):
                manager.error = error.localizedDescription
            }
        }
        .signInWithAppleButtonStyle(.black)
        .frame(height: 50)
        .cornerRadius(12)
    }
}
```

### Vincular Apple ID a Conta Anonima:

**LIMITACAO IMPORTANTE:** A funcao `linkIdentity` do Supabase Swift SDK so funciona via fluxo web OAuth, nao com `signInWithIdToken`. Isso significa que ao vincular Apple ID a uma conta anonima, o usuario sera brevemente redirecionado para um web view.

```swift
// Para vincular Apple ID a usuario anonimo existente:
// Isso abre um ASWebAuthenticationSession (web view)
try await supabase.auth.linkIdentity(provider: .apple)
```

**Recomendacao:** Oferecer Sign in with Apple como opcao PRINCIPAL na tela inicial, nao como vinculacao posterior. Isso evita a limitacao do `linkIdentity`.

### Fluxo de Decisao:

```
Sign in with Apple
  │
  ├── Novo usuario (sem couple_id no JWT)
  │   └── Mostrar tela: "Criar Espaco" ou "Juntar-se"
  │       └── Onboarding normal (nome, avatar, cor, PIN)
  │
  └── Usuario existente (couple_id no JWT)
      └── Ir direto para Dashboard
          (opcionalmente pedir PIN se configurado)
```

## 3. Face ID / Touch ID (Bonus iOS)

Alem do PIN, oferecer biometria como alternativa:

```swift
import LocalAuthentication

class BiometricManager {
    static func authenticate() async -> Bool {
        let context = LAContext()
        var error: NSError?

        guard context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error) else {
            return false
        }

        do {
            return try await context.evaluatePolicy(
                .deviceOwnerAuthenticationWithBiometrics,
                localizedReason: "Desbloquear ContaCasal"
            )
        } catch {
            return false
        }
    }

    static var biometryType: LABiometryType {
        let context = LAContext()
        _ = context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: nil)
        return context.biometryType // .faceID, .touchID, .opticID, .none
    }
}
```

### Fluxo com Biometria:

```
App Launch (com sessao existente)
  │
  ├── Biometria habilitada?
  │   ├── Sim → Face ID / Touch ID → Sucesso → Dashboard
  │   │                             → Falha → Pedir PIN
  │   └── Nao → Pedir PIN → Dashboard
  │
  └── Sem sessao → WelcomeView
```

## Tabela Comparativa de Metodos de Auth

| Metodo | Web | iOS | Notas |
|---|---|---|---|
| Anonimo + PIN | Sim | Sim | Identico |
| Username + PIN | Sim | Sim | Identico (edge function) |
| Sign in with Apple | Nao | Sim | Nativo iOS, novo |
| Face ID / Touch ID | N/A | Sim | Alternativa ao PIN |
| Recovery Email | Sim | Sim | Via Resend (edge function) |
| Apple Web OAuth | Futuro | N/A | Possivel via Supabase |

## Configuracao Supabase Dashboard

### Habilitar Apple Provider:
1. Ir em Authentication > Providers > Apple
2. Ativar o provider
3. Preencher:
   - **Client ID**: Services ID do Apple Developer (ex: `com.contacasal.service`)
   - **Secret Key**: Conteudo do arquivo .p8
   - **Key ID**: ID da key no Apple Developer
   - **Team ID**: ID do time no Apple Developer
4. Salvar

### Habilitar Anonymous Auth (se ainda nao estiver):
1. Authentication > Settings
2. Ativar "Enable anonymous sign-ins"
