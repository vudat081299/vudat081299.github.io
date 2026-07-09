# Cashy v1.0 — Implementation Spec

> **Mục đích:** Spec chi tiết cho version v1.0 — use cases, screens, tech stack cụ thể, architecture pattern hiện tại, data model, hard constraints.
>
> **Tài liệu này VERSION-SPECIFIC.** Sẽ có `cashy-v2-spec.md`, `cashy-v3-spec.md` sau. Tư tưởng dài hạn xem `cashy-vision.md` — **phải đọc trước file này**.
>
> Khi spec và vision mâu thuẫn, vision thắng.
>
> **Version:** 1.0 · **Last updated:** 2026 · **Owner:** Đạt (solo dev)

---

## 1 — Use cases v1 (21 UC)

### Authentication & Security (6 UC)

- **UC-01** Đăng nhập qua Apple
- **UC-02** Đăng nhập qua Google
- **UC-03** Đăng nhập qua Email + Password (local auth, không server)
- **UC-04** Set / Change PIN (4 hoặc 6 chữ số) — set lần đầu trong onboarding; change trong Settings (yêu cầu verify old PIN)
- **UC-05** Quick unlock app bằng PIN
- **UC-06** Quick unlock app bằng Face ID / Touch ID (gắn với app, không gắn account)

### Transaction (4 UC)

- **UC-07** Thêm transaction — chọn type (income/expense), amount, occurredAt, multi-select categories, note. **Quick-entry**: nếu user chỉ nhập amount + type và lưu, transaction tự gán `categories = [Pending]` để user hoàn tất sau.
- **UC-08** Sửa transaction
- **UC-09** Xóa transaction
- **UC-10** Xem detail transaction

### Category (3 UC)

- **UC-11** Thêm category — tùy chọn chọn parent category (nil = root)
- **UC-12** Sửa category — có thể move sang parent khác
- **UC-13** Xóa category (chỉ custom; system category không xóa được) — **cascade delete children**. Transactions còn lại với `categories.isEmpty` → tự gán Pending.

### Query (2 UC)

- **UC-14** Query transactions với filter optional (period, type, category, sort). **Filter theo category** có 2 mode toggle: roll-up (include transactions của children) hoặc strict (chỉ direct).
- **UC-15** Query categories với filter optional (type, root-only/all)

### Settings (6 UC)

- **UC-16** Đổi profile (avatar, display name)
- **UC-17** Đổi theme (dark / light / system)
- **UC-18** Toggle Face ID lock
- **UC-19** Export data ra CSV (CSV mở trực tiếp trong Excel — không cần native .xlsx ở v1). Multi-category → pipe-separated trong cùng column (`Sức khỏe|Thể thao`).
- **UC-20** Logout
- **UC-21** Delete account (Guideline 5.1.1v)

---

## 2 — 6 màn hình chính

1. **Đăng nhập** — màn entry khi user chưa có session active. Hiển thị 3 options: Sign in with Apple (Tier 2 button, primary per Guideline 4.8), Sign in with Google, và form Email + Password. Có link "Đăng ký" cho user chưa có account. UC-01, UC-02, UC-03.

2. **Đăng ký** — chỉ cho email + password flow. Apple/Google auto-create account khi sign in lần đầu nên không cần màn riêng. Fields: email, password, confirm password, displayName. Sau khi register thành công → PIN setup (embedded onboarding) → vào màn Tổng quan. UC-03 (register path), UC-04 (PIN setup embedded).

3. **Tổng quan / Statistics** — dashboard chính. Hiển thị balance hiện tại, charts spending theo period, top categories chi tiêu nhiều nhất, trend so với period trước. User filter theo period/type/category. **Khi filter theo parent category, có toggle Roll-up / Strict.**

4. **Settings** — profile (avatar, display name), theme (dark/light/system), security (Face ID toggle, change PIN), export CSV, logout, delete account, about & privacy policy.

5. **Add / Edit Transaction** — form thêm/sửa/xóa transaction. **Type (income/expense)** chọn trước (Tier 1 button), amount (Decimal), **multi-select categories** (hierarchy picker — có thể expand parent để thấy children), occurredAt (date), note optional.

6. **Add / Edit Category** — form thêm/sửa/xóa category với name, type (income/expense), icon (SF Symbol hoặc emoji), color, **parent (optional — chọn từ existing categories hoặc nil cho root)**.

---

## 3 — Authentication & Security spec

### Providers

- **Sign in with Apple** qua `AuthenticationServices` (bắt buộc per Guideline 4.8).
- **Sign in with Google** qua `GoogleSignIn-iOS` 7.x.
- **Email + Password local** — không có server. Password lưu trong **Keychain** ở với access control `.userPresence`.

### PIN

- **4 hoặc 6 chữ số** (user chọn lúc set).
- Hash bằng **CryptoKit SHA-256 + per-install salt**, lưu Keychain.
- Gắn với account để quick-unlock.
- Set lần đầu trong onboarding sau khi auth thành công.
- Change PIN trong Settings yêu cầu verify old PIN.

### Face ID / Touch ID

- Qua `LocalAuthentication` framework.
- **Gắn với app**, không gắn account.
- Pattern: device-level biometric verify "chủ thiết bị muốn mở Cashy", fallback PIN nếu fail.

### Password recovery

**v1 không hỗ trợ** password recovery. User quên password:
- (a) Dùng auth Apple/Google làm alternative.
- (b) Delete + reinstall (mất data).

Có thể reconsider ở v2+ khi có optional sync.

---

## 4 — Tech Stack v1

### Core stack

| Concern | Choice |
|---|---|
| Min iOS | **18.4** |
| Language | **Swift 6.2** với strict concurrency |
| UI | SwiftUI + `@Observable` |
| Local persistence | SwiftData với `@ModelActor` |
| Secure storage | Keychain (Security.framework) |
| Crypto | CryptoKit built-in — SHA-256 + salt cho PIN |
| Charts | Swift Charts |
| Auth — Apple | AuthenticationServices |
| Auth — Google | GoogleSignIn-iOS 7.x |
| Auth — Email | Keychain trực tiếp (hardware-backed encryption) |
| Biometric | LocalAuthentication |
| Notification | UNUserNotificationCenter |
| DI | AppContainer + `@Environment` |
| Localization | String Catalog (`.xcstrings`) |
| Testing | Swift Testing + InMemory adapter |
| Crash reporting | Sentry (opt-in) |

### Implementation choices flowing from vision rejection list

Vision đã reject Combine, UIKit-first, external DI/crypto/charting lib, cross-platform framework. Cụ thể v1:

| Reject (per vision) | Use instead in v1 |
|---|---|
| Combine | async/await |
| CoreData | SwiftData (iOS 18.4+) |
| ObservableObject | `@Observable` |
| UIKit | SwiftUI (trừ `UIViewControllerRepresentable` bắt buộc) |
| Factory, Resolver | `@Environment` + AppContainer |
| CryptoSwift, Argon2id, bcrypt | CryptoKit + Keychain hardware-backed |
| DGCharts | Swift Charts |
| PBKDF2 | Không cần — Keychain hardware-backed đã encrypt |

---

## 5 — Architecture v1: Modular layered + MVVM

Pattern hiện tại: **MVVM first cho mọi feature** (per vision §3 code principle), trong khung **Modular layered architecture** với 3 layer Presentation / Domain / Data. **Refactor lên TCA** khi feature explosion — current 21 UC + 6 màn hình chưa đủ phức tạp để cần TCA, MVVM đủ.

### Layered structure

```
┌─────────────────────────────────────────────┐
│  Presentation Layer                        │
│  SwiftUI Views + ViewModels (@Observable)   │
└────────────────┬────────────────────────────┘
                 │ depends on
┌────────────────▼────────────────────────────┐
│  Domain Layer (pure Swift)                  │
│  Entities · Business logic · Repository     │
│  protocols                                  │
└────────────────▲────────────────────────────┘
                 │ depended on by
┌────────────────┴────────────────────────────┐
│  Data Layer                                 │
│  Repository implementations                 │
│  SwiftData · Keychain · CryptoKit · Auth    │
└─────────────────────────────────────────────┘
```

### Layer rules

- Domain layer pure Swift — chỉ Foundation + stdlib. Không import SwiftData, không import framework infrastructure.
- Data layer implement Domain protocols — biết framework cụ thể (SwiftData, Keychain, etc.).
- Presentation layer (View + ViewModel) gọi qua Domain protocol, không touch Data layer trực tiếp.
- Dependency rule: dependencies point inward (Presentation → Domain ← Data). Domain ở trung tâm, không phụ thuộc ai.

### Folder structure

```
Cashy/
├── App/                  # @main + DI root (AppContainer)
├── Presentation/         # SwiftUI Views + ViewModels (@Observable)
├── Domain/               # Entities + Business logic + Repository protocols
├── Data/                 # Repository impl + SwiftData + Keychain + Auth
└── Resources/            # Assets, .xcstrings, JSON seed
```

### Path upgrade lên TCA tương lai

Khi app scale đủ lớn để cần Composable Architecture:
- Domain logic (entities, services, business rules) → TCA Reducers (logic giữ nguyên, wrap lại).
- `@Observable` ViewModels → TCA Stores.
- Repository protocols giữ nguyên (đã async/await, side-effect-friendly).

Migration là wrap lại, không phải rewrite. Đây là lý do chọn Modular layered + MVVM cho v1 — refactor cost thấp vì Domain layer tách rời.

---

## 6 — Data Model v1

### Entities (3 active + 1 schema-ready)

```
   ┌─────────────┐
   │    USER      │
   │              │
   │ id           │
   │ ...          │
   └──┬───────┬───┘
      │ 1     │ 1
      │       │
      │ N     │ N
      ▼       │
┌────────────┐│        ┌─────────────────────────┐
│  CATEGORY  ││        │  TRANSACTION            │
│            ││        │                         │
│ id         ││        │ id                      │
│ userId ────┘│        │ userId ─────────────────┘
│ parentId? ──┼─┐      │ type    (income/expense)
│ name        │ │      │ amount  (Decimal +)
│ type        │ │      │ occurredAt
│ iconName    │ │      │ note?
│ colorHex    │ │ M:N  │ categories: [Category] ─┐
│ isSystem    │◄┼──────┼────────────────────────┘
└─────────────┘ │      └─────────────────────────┘
       ▲────────┘ self-ref (parent)
       │ 1
       │ 0..1
   ┌───┴──────────┐
   │  BUDGET      │
   │  (v1.1)      │
   │ id           │
   │ categoryId   │
   │ limitAmount  │
   │ period       │
   │ startDate    │
   └──────────────┘
```

### Entity details

#### User
- `id: UUID` (PK)
- `email: String?` — nullable: Apple Sign-In "Hide My Email" relay có thể không cho email thật.
- `passwordHash: String?` — nil nếu auth qua Apple/Google. Password thực tế lưu Keychain.
- `pinHash: String?` — SHA-256 của `pin + salt`. Salt sinh ra mỗi install, lưu Keychain. Nil khi chưa set PIN.
- `authProvider: enum { email, apple, google }`
- `displayName: String`
- `currency: String` (ISO 4217 code, default "VND")
- `avatarPath: String?`
- `createdAt: Date`

#### Category (hierarchical — tree structure)
- `id: UUID` (PK)
- `userId: UUID` (FK → User)
- **`parentId: UUID?`** (FK self-ref → Category) — `nil` = root category; trỏ Category khác = child
- `name: String`
- `type: enum { income, expense }` — dùng để classify icon/UI grouping, **không** enforce constraint trên Transaction (xem note "Mixed-type categories" bên dưới)
- `iconName: String` (SF Symbol name hoặc emoji)
- `colorHex: String`
- `isSystem: Bool` (true = không xóa được)

**Self-referencing relationship qua `parentId`:**
- `nil` → root category
- Trỏ Category khác → child
- **Unlimited depth** ở schema level (UI có thể soft-limit để UX không rối — gợi ý ≤ 3 levels).

**SwiftData implementation:**
```swift
@Model final class Category {
    @Attribute(.unique) var id: UUID
    var parent: Category?
    @Relationship(deleteRule: .cascade, inverse: \Category.parent)
    var children: [Category] = []
    // ...
}
```

#### Transaction
- `id: UUID` (PK)
- `userId: UUID` (FK → User)
- **`type: enum { income, expense }`** — explicit, source of truth cho hướng dòng tiền. Không derive từ category.
- `amount: Decimal` (always positive — sign determined by `Transaction.type`)
- `occurredAt: Date`
- `note: String?`
- **`categories: [Category]`** — M:N relationship, một transaction có thể gắn nhiều categories ở bất kỳ level (root hoặc child). Tối thiểu 1 (fallback Pending nếu user không chọn).

**SwiftData implementation:**
```swift
@Model final class Transaction {
    @Attribute(.unique) var id: UUID
    var type: TransactionType  // income / expense
    var amount: Decimal
    @Relationship var categories: [Category] = []
    // ...
}
```

#### Budget (v1.1 — schema có sẵn, UC chưa kích hoạt v1)
- `id: UUID` (PK)
- `categoryId: UUID` (FK → Category)
- `limitAmount: Decimal`
- `period: enum { monthly, weekly }`
- `startDate: Date`

> `@Model` class đã define trong codebase v1 nhưng không có UC dùng. Tránh schema migration phức tạp khi v1.x thêm Budget UI.

### Relationships

- **User 1 — N Category** — user có nhiều category (system categories được seed lúc tạo user, gồm cả Pending).
- **User 1 — N Transaction** — mọi transaction thuộc 1 user.
- **Category 0..1 — N Category** (self-ref) — một category có 0 hoặc 1 parent, có N children. Tạo thành tree per user.
- **Category M — N Transaction** — một transaction gắn nhiều categories; một category xuất hiện trong nhiều transactions.
- **Category 1 — 0..1 Budget** — một category có 0 hoặc 1 budget (v1.1).

### "Pending" — system fallback category

**Pending** là một system category đặc biệt (`isSystem: true`, name "Chưa phân loại", icon `questionmark.circle`, color gray) **seed cho mỗi user** lúc account tạo, có hai vai trò:

1. **Quick-entry default** — user mở app, tap "+", nhập amount, chọn type, lưu nhanh (chưa chọn category) → transaction tự assign `categories = [Pending]`. User mở lại transaction sau (tối về nhà chẳng hạn) để gán category thật.

2. **Orphan fallback** — khi user xóa category mà có transactions trỏ tới, SwiftData M:N tự remove relationship. Sau cleanup, nếu `transaction.categories.isEmpty` → repository tự thêm Pending. Đảm bảo **invariant: mọi transaction luôn có ≥ 1 category**.

Pending không xóa được (`isSystem: true`). User có thể có nhiều transactions gắn Pending cùng lúc — đó là feature, không phải bug.

### Mixed-type categories trong một transaction

Vì `Transaction.type` là explicit (income/expense) và `Category.type` chỉ dùng để classify, **một transaction có thể gắn các categories có type khác nhau** (vd vừa income category vừa expense category). Stats tính tổng theo `Transaction.type` — Category.type chỉ dùng để filter/group UI.

> **Open question** (defer v2): hiện tại cho phép mix vì có thể có use case statistical chéo. Sẽ revisit khi có data thực tế và pattern usage rõ hơn.

### Data lifecycle

- **Tạo user** → seed default categories từ `DefaultCategories.json` (gồm Pending + các category thông dụng: Ăn uống, Đi lại, Mua sắm, Lương, v.v.). Default categories có thể có hierarchy sẵn (vd Sức khỏe > Thể thao, Khám sức khỏe).

- **Quick-entry transaction** → user chỉ nhập amount + type + lưu → transaction tạo với `categories = [Pending]`. UI hiển thị badge "Chưa phân loại" để user biết cần hoàn tất.

- **Xóa category (UC-13):**
  1. Block nếu là `isSystem` (gồm Pending).
  2. Recursive delete children categories (SwiftData cascade qua `@Relationship`).
  3. Cho mỗi transaction từng gắn category bị xóa: SwiftData M:N tự remove khỏi `transaction.categories`.
  4. Sau cleanup: với mỗi transaction `categories.isEmpty` → repository tự thêm Pending. Đảm bảo invariant.

- **Xóa account** → cascade delete: Transactions → Categories (custom only, gồm hierarchy children) → User. System categories (gồm Pending) không bị xóa (static seed).

- **Backup** → CSV/JSON export khi user request. Multi-category → pipe-separated trong cùng column.

### Stats compute logic

- **Tổng income/expense theo period**: sum amount theo `Transaction.type` filter.
- **Per-category stats**: count một transaction trong tất cả categories nó gắn (có thể double-count khi transaction có nhiều categories — đây là intentional, vì user chủ động gắn).
- **Filter theo category — Roll-up mode** (default toggle ON): include transactions của category đó + tất cả descendants. Recursive collect category tree, query `transactions where any category in tree`.
- **Filter theo category — Strict mode** (toggle OFF): chỉ transactions gắn trực tiếp category đó, không include children.

### Tại sao bỏ Wallet entity v1?

V1 ship MVP một-ví-mặc-định (cash). Đơn giản hóa schema để tránh code phức tạp về wallet selection trong UI. Khi version sau thêm multi-wallet, dùng SwiftData lightweight migration để add Wallet entity và migrate Transaction.

---

## 7 — Constraint kỹ thuật v1

| Constraint | Giá trị |
|---|---|
| Minimum iOS version | **18.4** |
| Target devices | iPhone (iPad scaled, không tối ưu) |
| App size | < 50 MB |
| Cold start | < 2 giây từ tap icon đến màn Tổng quan |
| Offline-first | Bắt buộc — mọi tính năng phải hoạt động không cần network |
| Backend | Không có v1 |

### Currency v1

- **VND only** ở v1 — không thập phân.
- Format: `1.000.000 đ` (VN locale), dùng `Decimal`.
- Schema giữ field `User.currency` (default `"VND"`) để future-proof — UI **không expose** lựa chọn currency ở v1.
- Multi-currency và các currency khác → defer cho version sau.

---

## Appendix — DO/DON'T cụ thể cho v1

Standards chung (Accessibility, Language, Data integrity, Compliance, Data portability) xem `cashy-vision.md` §4. Code principles (Modular layered, Repository pattern, Component-First Composition, OOP + SOLID, Simple/clean code, MVVM-first) xem `cashy-vision.md` §3 + §5. Phần này chỉ DO/DON'T **specific cho v1**.

### ✅ DO

- Dùng **SwiftUI + SwiftData + @Observable + Swift 6.2 strict concurrency**.
- Tuân thủ **Modular layered + MVVM**: Presentation ↔ Domain ↔ Data, dependency point inward.
- **Repository pattern** qua protocol — không bao giờ gọi SwiftData/Keychain trực tiếp từ Presentation.
- Password → **Keychain trực tiếp** (hardware-backed). PIN → **SHA-256 + salt** rồi lưu Keychain.
- Face ID qua **LocalAuthentication**, gắn với app.
- SwiftData operations qua `@ModelActor` cho concurrency safety.
- Money = **Decimal**, không Double.
- **Transaction.type explicit** (income/expense) — không derive từ Category.type.
- **Quick-entry default** → `categories = [Pending]` nếu user không chọn.
- **Invariant:** mọi transaction luôn có ≥ 1 category. Khi cleanup làm `categories.isEmpty` → tự gán Pending.
- **Cascade delete category:** xóa parent → xóa children (qua SwiftData `@Relationship(deleteRule: .cascade)`), transactions giữ nguyên.
- **Stats roll-up toggle** trong UI — default ON khi filter theo parent category.
- Ưu tiên `Color(.systemBlue)`, custom OK khi cần.
- Async/await thay vì closure.

### ❌ DON'T

- Không import SwiftData/Keychain trong Domain layer.
- Không dùng Combine, ObservableObject.
- Không dùng UIKit khi có thể dùng SwiftUI.
- Không thêm feature ngoài 21 UC mà chưa thảo luận.
- Không kết nối network mặc định.
- Không add analytics, ads, tracking.
- Không dùng external crypto lib.
- Không tự xử lý password recovery — v1 không support.
- **Không cho xóa Pending category** (cũng như mọi system category — kiểm tra `isSystem`).
- **Không derive `Transaction.type` từ categories** — luôn dùng explicit field.
- **Không hardcode depth limit** trong schema — chỉ soft limit ở UI nếu cần.

### Khi có doubt

1. Đọc lại **`cashy-vision.md` §3 Principles** + **§4 Standards**.
2. Check **§1 Use cases v1** — feature có nằm trong scope v1 không.
3. Check **§7 Constraint kỹ thuật v1** — có constraint cứng nào không.
4. Nếu van doubt → hỏi user, đừng đoán.

---

**End of v1.0 Spec.** Khi v1.x hoặc v2 ship, file này sẽ được fork thành `cashy-v1.x-spec.md` hoặc `cashy-v2-spec.md` với scope mới. Vision không đổi qua các version.
