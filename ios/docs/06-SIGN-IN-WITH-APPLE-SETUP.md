# ContaCasal iOS - Sign in with Apple: Guia Completo de Setup

## Pre-requisitos

- Apple Developer Account (US$ 99/ano)
- Acesso ao Supabase Dashboard (projeto `opvdclvrsrptgmllxjxh`)
- Xcode 15+ instalado

## Passo 1: Apple Developer Portal

### 1.1 Criar/Configurar App ID

1. Acessar [Apple Developer Portal](https://developer.apple.com/account)
2. Ir em **Certificates, Identifiers & Profiles** > **Identifiers**
3. Clicar "+" para criar novo identifier
4. Selecionar **App IDs** > **App**
5. Preencher:
   - **Description:** ContaCasal
   - **Bundle ID:** Explicit → `com.contacasal.app`
6. Em **Capabilities**, marcar **Sign in with Apple**
7. Clicar **Continue** > **Register**

### 1.2 Criar Services ID (para web callback do Supabase)

1. Em **Identifiers**, clicar "+"
2. Selecionar **Services IDs**
3. Preencher:
   - **Description:** ContaCasal Web Service
   - **Identifier:** `com.contacasal.service`
4. Marcar **Sign in with Apple** > Clicar **Configure**
5. Preencher:
   - **Primary App ID:** selecionar `com.contacasal.app`
   - **Domains and Subdomains:** `opvdclvrsrptgmllxjxh.supabase.co`
   - **Return URLs:** `https://opvdclvrsrptgmllxjxh.supabase.co/auth/v1/callback`
6. Clicar **Save** > **Continue** > **Register**

### 1.3 Criar Private Key (.p8)

1. Ir em **Keys**
2. Clicar "+" para criar nova key
3. Preencher:
   - **Key Name:** ContaCasal Sign in with Apple
4. Marcar **Sign in with Apple** > **Configure**
   - Selecionar Primary App ID: `com.contacasal.app`
5. Clicar **Continue** > **Register**
6. **FAZER DOWNLOAD DO ARQUIVO .p8 IMEDIATAMENTE** (so pode baixar uma vez!)
7. Anotar o **Key ID** (ex: `ABC123DEFG`)
8. Anotar o **Team ID** (visivel no canto superior direito do portal)

## Passo 2: Configurar Supabase Dashboard

1. Acessar [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecionar projeto `opvdclvrsrptgmllxjxh`
3. Ir em **Authentication** > **Providers** > **Apple**
4. Ativar o toggle
5. Preencher:
   - **Client ID (for iOS):** `com.contacasal.app` (Bundle ID)
   - **Client ID (for Web):** `com.contacasal.service` (Services ID)
   - **Secret Key:** Colar conteudo COMPLETO do arquivo .p8
   - **Key ID:** O Key ID anotado (ex: `ABC123DEFG`)
   - **Team ID:** O Team ID anotado (ex: `TEAM1234`)
6. Clicar **Save**

## Passo 3: Configurar Xcode

### 3.1 Entitlements

1. Abrir projeto no Xcode
2. Selecionar target > **Signing & Capabilities**
3. Clicar **+ Capability** > **Sign in with Apple**
4. Isso cria/atualiza o arquivo `ContaCasal.entitlements`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>com.apple.developer.applesignin</key>
    <array>
        <string>Default</string>
    </array>
</dict>
</plist>
```

### 3.2 Info.plist

Adicionar URL scheme para callback:

```xml
<key>CFBundleURLTypes</key>
<array>
    <dict>
        <key>CFBundleTypeRole</key>
        <string>Editor</string>
        <key>CFBundleURLSchemes</key>
        <array>
            <string>com.contacasal.app</string>
        </array>
    </dict>
</array>
```

## Passo 4: Implementacao

### 4.1 SupabaseManager com Apple Auth

```swift
// SupabaseManager.swift
import Supabase

final class SupabaseManager {
    static let shared = SupabaseManager()

    let client: SupabaseClient

    private init() {
        client = SupabaseClient(
            supabaseURL: URL(string: "https://opvdclvrsrptgmllxjxh.supabase.co")!,
            supabaseKey: "ANON_KEY_AQUI" // Mesmo VITE_SUPABASE_PUBLISHABLE_KEY
        )
    }
}
```

### 4.2 Fluxo Completo

```swift
// AppleSignInManager.swift
import AuthenticationServices
import Supabase

@Observable
class AppleSignInManager: NSObject, ASAuthorizationControllerDelegate {
    var isProcessing = false
    var error: String?
    var session: Session?

    func signIn() {
        isProcessing = true
        let provider = ASAuthorizationAppleIDProvider()
        let request = provider.createRequest()
        request.requestedScopes = [.fullName, .email]

        let controller = ASAuthorizationController(authorizationRequests: [request])
        controller.delegate = self
        controller.performRequests()
    }

    func authorizationController(
        controller: ASAuthorizationController,
        didCompleteWithAuthorization authorization: ASAuthorization
    ) {
        guard let credential = authorization.credential as? ASAuthorizationAppleIDCredential,
              let identityToken = credential.identityToken,
              let idToken = String(data: identityToken, encoding: .utf8)
        else {
            error = "Falha na autenticacao Apple"
            isProcessing = false
            return
        }

        Task { @MainActor in
            do {
                // Autenticar no Supabase
                let session = try await SupabaseManager.shared.client.auth.signInWithIdToken(
                    credentials: .init(provider: .apple, idToken: idToken)
                )
                self.session = session

                // Capturar nome (Apple so envia uma vez)
                if let fullName = credential.fullName {
                    let name = [fullName.givenName, fullName.familyName]
                        .compactMap { $0 }
                        .joined(separator: " ")
                    if !name.isEmpty {
                        // Salvar nome localmente (para onboarding)
                        UserDefaults.standard.set(name, forKey: "apple_display_name")
                    }
                }

                isProcessing = false
            } catch {
                self.error = error.localizedDescription
                isProcessing = false
            }
        }
    }

    func authorizationController(
        controller: ASAuthorizationController,
        didCompleteWithError error: Error
    ) {
        self.error = error.localizedDescription
        isProcessing = false
    }
}
```

### 4.3 View

```swift
struct WelcomeView: View {
    @State private var appleSignIn = AppleSignInManager()

    var body: some View {
        VStack(spacing: 20) {
            // Logo e titulo
            Image("app-logo")
            Text("ContaCasal")
                .font(.largeTitle.bold())

            Spacer()

            // Sign in with Apple (destaque)
            SignInWithAppleButton(.signIn) { request in
                request.requestedScopes = [.fullName, .email]
            } onCompletion: { result in
                switch result {
                case .success(let auth):
                    appleSignIn.authorizationController(
                        controller: ASAuthorizationController(authorizationRequests: []),
                        didCompleteWithAuthorization: auth
                    )
                case .failure(let error):
                    appleSignIn.error = error.localizedDescription
                }
            }
            .signInWithAppleButtonStyle(.black)
            .frame(height: 50)

            // Separador
            HStack {
                Rectangle().frame(height: 1).foregroundColor(.gray.opacity(0.3))
                Text("ou").foregroundColor(.gray)
                Rectangle().frame(height: 1).foregroundColor(.gray.opacity(0.3))
            }

            // Opcoes alternativas
            Button("Criar Espaco") { /* navigate */ }
                .buttonStyle(.borderedProminent)

            Button("Juntar-se com Codigo") { /* navigate */ }
                .buttonStyle(.bordered)

            Button("Entrar com @username") { /* navigate */ }
                .foregroundColor(.secondary)
        }
        .padding()
    }
}
```

## Consideracoes Importantes

### 1. Apple Review Guidelines
- Sign in with Apple e **obrigatorio** se o app oferecer QUALQUER outro login social
- Como o app oferece login anonimo (sem social), Sign in with Apple e opcional mas **fortemente recomendado**
- Se adicionar Google Sign-In no futuro, Apple Sign-In se torna obrigatorio

### 2. Privacidade
- Apple pode fornecer email relay (email oculto tipo `xyz@privaterelay.appleid.com`)
- O app deve aceitar esse email normalmente
- O nome completo so e enviado no PRIMEIRO sign-in - salvar imediatamente

### 3. Revogacao
- Usuarios podem revogar acesso em Ajustes > Apple ID > Senha e Seguranca
- O app deve tratar `ASAuthorizationAppleIDProvider.CredentialState.revoked`
- Verificar status periodicamente:

```swift
let state = try await ASAuthorizationAppleIDProvider()
    .credentialState(forUserID: appleUserID)

switch state {
case .authorized: // OK
case .revoked: // Logout + limpar dados
case .notFound: // Nunca autenticou
case .transferred: // Conta transferida
}
```

### 4. Compatibilidade Web
- O MESMO Supabase project suporta Apple Sign-In no web E no iOS
- Web usa OAuth redirect flow
- iOS usa native AuthenticationServices + signInWithIdToken
- Ambos geram sessoes no mesmo sistema de auth
- Um usuario que faz Sign in with Apple no iOS pode acessar o MESMO espaco no web
