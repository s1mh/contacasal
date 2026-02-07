# ContaCasal iOS - Modelos de Dados

## Mapeamento Web → iOS

O app iOS usa o MESMO banco PostgreSQL. Abaixo estao os modelos Swift correspondentes a cada tabela.

## Models (Codable - para comunicacao com Supabase)

### Couple
```swift
struct Couple: Codable, Identifiable {
    let id: UUID
    let shareCode: String
    let maxMembers: Int
    let createdAt: Date
    let updatedAt: Date

    enum CodingKeys: String, CodingKey {
        case id
        case shareCode = "share_code"
        case maxMembers = "max_members"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}
```

### Profile
```swift
struct Profile: Codable, Identifiable {
    let id: UUID
    let coupleId: UUID
    var name: String
    var color: String              // Hex: "#F5A9B8"
    var avatarIndex: Int           // 1-8
    let position: Int              // 1-5
    var email: String?
    var username: String?
    var pinCode: String?           // SHA-256 hash
    var pinAttempts: Int
    var pinLockedUntil: Date?
    let status: ProfileStatus
    var pendingExpiresAt: Date?
    let userId: UUID?
    var recoveryToken: String?
    var recoveryTokenExpiresAt: Date?
    let createdAt: Date
    let updatedAt: Date

    enum ProfileStatus: String, Codable {
        case active
        case pending
    }

    enum CodingKeys: String, CodingKey {
        case id, name, color, email, username, position, status
        case coupleId = "couple_id"
        case avatarIndex = "avatar_index"
        case pinCode = "pin_code"
        case pinAttempts = "pin_attempts"
        case pinLockedUntil = "pin_locked_until"
        case pendingExpiresAt = "pending_expires_at"
        case userId = "user_id"
        case recoveryToken = "recovery_token"
        case recoveryTokenExpiresAt = "recovery_token_expires_at"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}
```

### Expense
```swift
struct Expense: Codable, Identifiable {
    let id: UUID
    let coupleId: UUID
    var description: String?
    var totalAmount: Decimal        // numeric(10,2)
    var paidBy: Int                 // position 1-5
    var paidByProfileId: UUID?
    var splitType: SplitType
    var splitValue: [String: Double] // {"person1": 50, "person2": 50}
    var tagId: UUID?
    var expenseDate: Date
    var paymentType: PaymentType
    var cardId: UUID?
    var billingMonth: Date?
    var installments: Int
    var installmentNumber: Int
    let createdAt: Date

    enum SplitType: String, Codable {
        case equal, percentage, fixed, full
    }

    enum PaymentType: String, Codable {
        case debit, credit
    }

    enum CodingKeys: String, CodingKey {
        case id, description, installments
        case coupleId = "couple_id"
        case totalAmount = "total_amount"
        case paidBy = "paid_by"
        case paidByProfileId = "paid_by_profile_id"
        case splitType = "split_type"
        case splitValue = "split_value"
        case tagId = "tag_id"
        case expenseDate = "expense_date"
        case paymentType = "payment_type"
        case cardId = "card_id"
        case billingMonth = "billing_month"
        case installmentNumber = "installment_number"
        case createdAt = "created_at"
    }
}
```

### Tag
```swift
struct Tag: Codable, Identifiable {
    let id: UUID
    let coupleId: UUID
    var name: String
    var icon: String               // Lucide icon name → mapear para SF Symbols
    var color: String              // Hex
    let createdAt: Date

    enum CodingKeys: String, CodingKey {
        case id, name, icon, color
        case coupleId = "couple_id"
        case createdAt = "created_at"
    }
}
```

### Card
```swift
struct Card: Codable, Identifiable {
    let id: UUID
    let coupleId: UUID
    let profileId: UUID
    var name: String
    var type: CardType
    var closingDay: Int?           // 1-31
    var dueDay: Int?               // 1-31
    var color: String              // Hex
    let createdAt: Date

    enum CardType: String, Codable {
        case credit, debit
    }

    enum CodingKeys: String, CodingKey {
        case id, name, type, color
        case coupleId = "couple_id"
        case profileId = "profile_id"
        case closingDay = "closing_day"
        case dueDay = "due_day"
        case createdAt = "created_at"
    }
}
```

### Agreement
```swift
struct Agreement: Codable, Identifiable {
    let id: UUID
    let coupleId: UUID
    var name: String
    var amount: Decimal
    var splitType: Expense.SplitType
    var splitValue: [String: Double]
    var paidBy: Int
    var paidByProfileId: UUID?
    var tagId: UUID?
    var dayOfMonth: Int
    var isActive: Bool
    let createdAt: Date

    enum CodingKeys: String, CodingKey {
        case id, name, amount
        case coupleId = "couple_id"
        case splitType = "split_type"
        case splitValue = "split_value"
        case paidBy = "paid_by"
        case paidByProfileId = "paid_by_profile_id"
        case tagId = "tag_id"
        case dayOfMonth = "day_of_month"
        case isActive = "is_active"
        case createdAt = "created_at"
    }
}
```

### Settlement
```swift
struct Settlement: Codable, Identifiable {
    let id: UUID
    let coupleId: UUID
    var amount: Decimal
    var paidBy: Int
    var paidByProfileId: UUID?
    var receivedByProfileId: UUID?
    var settledAt: Date
    var note: String?

    enum CodingKeys: String, CodingKey {
        case id, amount, note
        case coupleId = "couple_id"
        case paidBy = "paid_by"
        case paidByProfileId = "paid_by_profile_id"
        case receivedByProfileId = "received_by_profile_id"
        case settledAt = "settled_at"
    }
}
```

### SpaceRole
```swift
struct SpaceRole: Codable, Identifiable {
    let id: UUID
    let spaceId: UUID
    let profileId: UUID
    var role: Role
    let createdAt: Date

    enum Role: String, Codable {
        case admin, member
    }

    enum CodingKeys: String, CodingKey {
        case id, role
        case spaceId = "space_id"
        case profileId = "profile_id"
        case createdAt = "created_at"
    }
}
```

## Mapeamento de Icones: Lucide → SF Symbols

O app web usa Lucide icons. No iOS, mapeamos para SF Symbols:

```swift
enum TagIcon: String, CaseIterable {
    case utensils    // → "fork.knife"
    case home        // → "house.fill"
    case receipt     // → "receipt"
    case gamepad2    // → "gamecontroller.fill"
    case car         // → "car.fill"
    case tag         // → "tag.fill"
    case heart       // → "heart.fill"
    case gift        // → "gift.fill"
    case shoppingBag // → "bag.fill"
    case coffee      // → "cup.and.saucer.fill"
    case plane       // → "airplane"
    case music       // → "music.note"

    var sfSymbolName: String {
        switch self {
        case .utensils:    return "fork.knife"
        case .home:        return "house.fill"
        case .receipt:     return "receipt"
        case .gamepad2:    return "gamecontroller.fill"
        case .car:         return "car.fill"
        case .tag:         return "tag.fill"
        case .heart:       return "heart.fill"
        case .gift:        return "gift.fill"
        case .shoppingBag: return "bag.fill"
        case .coffee:      return "cup.and.saucer.fill"
        case .plane:       return "airplane"
        case .music:       return "music.note"
        }
    }
}
```

## Avatares

O app web tem 8 avatares de gato (PNG). No iOS:
- Incluir os mesmos PNGs em Assets.xcassets
- Referenciar por `avatarIndex` (1-8)
- Manter as mesmas cores de fundo (`CAT_BG_COLORS`)

```swift
enum CatAvatar: Int, CaseIterable {
    case malhado = 1    // bg: #FFE4EC
    case siames = 2     // bg: #E4F0FF
    case tigrado = 3    // bg: #FFF4E4
    case preto = 4      // bg: #F0E4FF
    case laranja = 5    // bg: #FFE8D9
    case cinza = 6      // bg: #E4FFE8
    case branco = 7     // bg: #FFFBE4
    case rajado = 8     // bg: #E4FFF0

    var imageName: String { "cat-avatar-\(rawValue)" }
    var backgroundColor: Color { /* hex to Color */ }
}
```

## Cores dos Perfis

```swift
enum ProfileColor: String, CaseIterable {
    case coral    = "#F5A9B8"
    case salvia   = "#A8D5BA"
    case lavanda  = "#C4B5E0"
    case ceu      = "#A5D4E8"
    case pessego  = "#F8C8A8"
    case menta    = "#98E4D0"

    var displayName: String {
        switch self {
        case .coral:   return "Coral"
        case .salvia:  return "Salvia"
        case .lavanda: return "Lavanda"
        case .ceu:     return "Ceu"
        case .pessego: return "Pessego"
        case .menta:   return "Menta"
        }
    }
}
```

## SwiftData Models (Cache Offline)

Para cache offline, usamos versoes @Model dos modelos principais:

```swift
@Model
class CachedExpense {
    @Attribute(.unique) var id: UUID
    var coupleId: UUID
    var descriptionText: String?
    var totalAmount: Double
    var paidBy: Int
    var splitType: String
    var expenseDate: Date
    var paymentType: String
    var installments: Int
    var isSynced: Bool = true
    var lastModified: Date = Date()
    var pendingAction: String? // "create", "update", "delete"

    init(from remote: Expense) {
        self.id = remote.id
        self.coupleId = remote.coupleId
        // ... mapear campos
        self.isSynced = true
    }
}
```
