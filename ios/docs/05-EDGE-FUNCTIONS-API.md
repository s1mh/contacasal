# ContaCasal iOS - Edge Functions API Reference

## Visao Geral

Todas as 17 edge functions sao compartilhadas entre web e iOS. O app iOS chama as mesmas funcoes via Supabase Swift SDK.

### Padrao de Chamada (Swift):

```swift
// Generico
struct Request: Encodable { /* campos */ }
struct Response: Decodable { let success: Bool; /* campos */ }

let response: Response = try await supabase.functions.invoke(
    "function-name",
    options: .init(body: Request(/* ... */))
)
```

## Catalogo de Edge Functions

### 1. create-couple
**Proposito:** Criar novo espaco para casal
```swift
// Request: vazio (auth obrigatoria via JWT)
// Response:
struct CreateCoupleResponse: Decodable {
    let success: Bool
    let couple_id: UUID
    let share_code: String  // 16 hex chars
}
```
**Efeitos:**
- Cria registro `couples`
- Cria 2 profiles default ("Pessoa 1", "Pessoa 2")
- Cria 6 tags default (Comida, Casa, Contas, Lazer, Transporte, Outros)
- Define `app_metadata.couple_id` no JWT
- Atribui role `admin` ao primeiro perfil

---

### 2. validate-share-code
**Proposito:** Validar share code antes de juntar-se
```swift
struct ValidateRequest: Encodable {
    let share_code: String
}
struct ValidateResponse: Decodable {
    let success: Bool
    let couple_id: UUID?
    let is_member: Bool?
}
```
**Notas:** Requer auth. Define `couple_id` no JWT.

---

### 3. validate-share-code-public
**Proposito:** Validar share code SEM autenticacao
```swift
struct ValidatePublicRequest: Encodable {
    let share_code: String
}
struct ValidatePublicResponse: Decodable {
    let success: Bool
    let couple_id: UUID?
}
```
**Notas:** Nao requer auth. Retorna apenas success/couple_id.

---

### 4. join-space
**Proposito:** Juntar-se a um espaco existente
```swift
struct JoinRequest: Encodable {
    let share_code: String
}
struct JoinResponse: Decodable {
    let success: Bool
    let couple_id: UUID?
    let profile_id: UUID?
    let position: Int?
    let is_returning: Bool?
}
```
**Efeitos:**
- Cria profile PENDING (expira em 30 min)
- Verifica se espaco nao esta cheio (`max_members`)
- Define `couple_id` no JWT

---

### 5. join-and-activate
**Proposito:** Juntar-se E ativar perfil em uma chamada
```swift
// Combina join-space + activate-profile
// Mesmo request/response que join-space mas ja ativa
```

---

### 6. activate-profile
**Proposito:** Ativar perfil pendente com dados do usuario
```swift
struct ActivateRequest: Encodable {
    let profile_id: UUID
    let name: String
    let avatar_index: Int       // 1-8
    let color: String           // Hex
    let pin_code: String        // Sera hashado server-side
    let email: String?
    let username: String?
}
struct ActivateResponse: Decodable {
    let success: Bool
    let couple_id: UUID?
    let profile_id: UUID?
}
```
**Efeitos:**
- Atualiza profile de `pending` → `active`
- Cria `space_roles` (member)
- Verifica expiracao de 30 min

---

### 7. cancel-pending-profile
**Proposito:** Cancelar perfil pendente expirado
```swift
// Deleta profiles expirados
```

---

### 8. verify-pin
**Proposito:** Verificar PIN para login
```swift
struct VerifyPINRequest: Encodable {
    let profile_id: UUID
    let pin: String             // Texto plano (hash feito server-side)
}
struct VerifyPINResponse: Decodable {
    let success: Bool
    let profile_name: String?
}
```
**Seguranca:**
- SHA-256 com salt `"couple_pin_salt_v1_"`
- Suporta PINs legados (texto plano) com upgrade automatico
- Max 5 tentativas → lockout 15 min
- Reset de tentativas no sucesso

---

### 9. login-with-username
**Proposito:** Login alternativo via username + PIN
```swift
struct UsernameLoginRequest: Encodable {
    let username: String        // Case-insensitive
    let pin: String
}
struct UsernameLoginResponse: Decodable {
    let success: Bool
    let profile: ProfileInfo?
    let share_code: String?
    let couple_id: UUID?

    struct ProfileInfo: Decodable {
        let id: UUID
        let name: String
        let avatar_index: Int
        let color: String
        let position: Int
    }
}
```
**Notas:** NAO requer auth (endpoint publico).

---

### 10. generate-username
**Proposito:** Gerar username unico baseado no nome
```swift
struct GenUsernameRequest: Encodable {
    let name: String
}
struct GenUsernameResponse: Decodable {
    let success: Bool
    let username: String?       // "joao_ab3f"
    let display: String?        // "@joao_ab3f"
}
```
**Logica:**
- Normaliza nome (remove acentos, lowercase, alfanumerico)
- Adiciona sufixo unico de 4 chars (base_xxxx)
- Fallback para timestamp se colisao

---

### 11. check-username
**Proposito:** Verificar disponibilidade de username
```swift
struct CheckUsernameRequest: Encodable {
    let username: String
    let exclude_profile_id: UUID?
}
struct CheckUsernameResponse: Decodable {
    let success: Bool
    let exists: Bool
}
```

---

### 12. check-email
**Proposito:** Verificar se email ja esta em uso
```swift
struct CheckEmailRequest: Encodable {
    let email: String
    let couple_id: UUID?
}
struct CheckEmailResponse: Decodable {
    let success: Bool
    let exists: Bool
    let same_couple: Bool?
    let can_recover: Bool?
    let masked_space: String?   // "****xxxx"
    let profile_name: String?
}
```

---

### 13. request-pin-recovery
**Proposito:** Solicitar email de recuperacao de PIN
```swift
struct RecoveryRequest: Encodable {
    let email: String
    let share_code: String?
}
struct RecoveryResponse: Decodable {
    let success: Bool
    let message: String
}
```
**Notas:** Sempre retorna success (nao revela se email existe). Envia email via Resend com token de 15 min.

---

### 14. reset-pin
**Proposito:** Resetar PIN usando token de recuperacao
```swift
// Token valida propriedade antes de permitir novo PIN
```

---

### 15. regenerate-share-code
**Proposito:** Gerar novo share code para o espaco
```swift
// Gera novo codigo hex de 16 chars
// Invalida o codigo anterior
```

---

### 16. manage-member
**Proposito:** Gerenciar membros (admin only)
```swift
struct ManageMemberRequest: Encodable {
    let action: String          // "promote" | "demote" | "remove"
    let target_profile_id: UUID
    let caller_profile_id: UUID
}
struct ManageMemberResponse: Decodable {
    let success: Bool
    let message: String?
}
```
**Validacoes:**
- Requer role `admin`
- Demote: garante >= 1 admin restante
- Remove: soft delete (reset para valores default)

---

### 17. generate-insights
**Proposito:** Gerar insights de IA baseados em gastos
```swift
// Requer auth (pega couple_id do JWT)
// Analisa despesas recentes, compara meses
// Salva insights na tabela ai_insights
struct InsightsResponse: Decodable {
    let insights: [Insight]?

    struct Insight: Decodable {
        let type: String
        let message: String
        let priority: Int
    }
}
```

## Wrapper Swift para Todas as Edge Functions

```swift
// EdgeFunctions.swift
actor EdgeFunctionClient {
    private let supabase = SupabaseManager.shared.client

    // Auth
    func createCouple() async throws -> (coupleId: UUID, shareCode: String) { ... }
    func validateShareCode(_ code: String) async throws -> (coupleId: UUID, isMember: Bool) { ... }
    func joinSpace(_ shareCode: String) async throws -> JoinResponse { ... }
    func activateProfile(_ request: ActivateRequest) async throws -> ActivateResponse { ... }

    // PIN
    func verifyPIN(_ pin: String, profileId: UUID) async throws -> Bool { ... }
    func loginWithUsername(_ username: String, pin: String) async throws -> UsernameLoginResponse { ... }
    func requestPINRecovery(email: String, shareCode: String?) async throws { ... }
    func resetPIN(token: String, newPIN: String) async throws { ... }

    // Utility
    func generateUsername(name: String) async throws -> String { ... }
    func checkUsername(_ username: String, exclude: UUID?) async throws -> Bool { ... }
    func checkEmail(_ email: String, coupleId: UUID?) async throws -> CheckEmailResponse { ... }
    func regenerateShareCode() async throws -> String { ... }

    // Admin
    func manageMember(action: String, targetId: UUID, callerId: UUID) async throws { ... }

    // AI
    func generateInsights() async throws -> [Insight] { ... }
}
```
