# Cashy — Product Vision

> **iOS-native product vision (timeless).** For the software that actually ships —
> the React web app — see [cashy-web-spec.md](cashy-web-spec.md). When this vision
> and the code disagree about what *exists*, the code wins; when *philosophy* is in
> question, this vision wins.

> **Mục đích:** Tài liệu định hướng tầm nhìn phát triển Cashy. Đây là tài liệu **TIMELESS** — tư tưởng áp dụng qua mọi version.
>
> **Cách dùng:** Đọc file này đầu tiên khi onboarding. Mọi feature spec, code review, AI session phải align với vision này. Khi vision và spec mâu thuẫn, vision thắng.
>
> **Version:** 1.2 · **Last updated:** 2026 · **Owner:** Đạt (solo dev)

---

## 1 — Cashy là gì

Cashy là app **quản lý chi tiêu cá nhân + thống kê chi tiêu cá nhân**, native iOS, offline-first.

Người dùng:
- Ghi giao dịch (thu/chi) chỉ với vài tap.
- Phân loại theo category tùy chỉnh (icon + màu).
- Xem thống kê tháng/quý/năm với charts trực quan.
- Export ra file CSV để tự lưu trữ hoặc mở bằng Excel.

> Privacy là consequence tự nhiên của offline-first design — data ở thiết bị, không bắt buộc gửi đi đâu. Đây là tính chất đi kèm, không phải selling point chính.

---

## 2 — Differentiation

| Khía cạnh | App finance hiện có | Cashy |
|---|---|---|
| Lưu trữ | Cloud-first, sync mặc định | **Offline-first**, sync optional |
| UI/UX | Cross-platform, generic UI | **Native iOS HIG, dark/light polish** |
| Tâm lý dùng | Cảm giác kế toán, công cụ | **Personal, nhẹ nhàng** |
| Tốc độ nhập | Form rườm rà, nhiều bước | **< 5s** từ mở app đến lưu transaction |
| Thống kê | Chart cơ bản, ít filter | **Charts trực quan, filter linh hoạt, trend rõ** |
| Data portability | Lock-in proprietary | **CSV export/import, Excel-compatible** |

---

## 3 — Principles

Tất cả nguyên tắc dẫn đường — chia 3 nhóm: Product, UI, Code. Áp dụng cho mọi version.

### Product principles

| Principle | Cốt lõi |
|---|---|
| **Offline-first** | Network optional, không required. |
| **Privacy by default** | Mặc định không gửi gì ra ngoài. User opt-in mới sync/analytics. |
| **Native Apple** | SwiftUI/SwiftData. Stack Apple, không cross-platform framework. |
| **Simple over feature-rich** | Cắt thay vì thêm khi nghi ngờ. |
| **Speed** | Add transaction xong < 5s từ mở app. UI không bao giờ lag. |

### UI principles

| Principle | Cốt lõi |
|---|---|
| **Minimalism** | Less is more. Mỗi element trên màn hình phải có lý do tồn tại. Tránh decoration thừa (gradient, shadow lòe, animation trang trí). White space có chủ đích. Visual hierarchy qua scale + weight, không qua màu trang trí. |
| **Dark/light mode** | Cả hai mode đều polish, không có mode "phụ". |
| **Trắng/đen chủ đạo** | Background/surface trắng-đen. Accent màu khác dùng linh hoạt cho semantic. |
| **System colors first** | `Color(.systemBlue)`, `.systemGreen`... ưu tiên. Custom OK khi cần. |
| **Semantic colors** | Income → green, Expense → red, Action → blue. Không trang trí. |
| **Tabular numbers** | `monospacedDigit()` cho mọi số tiền — tránh nhảy chiều rộng. |
| **Apple HIG compliance** | Dynamic Type, touch target, accessibility. |

### Code principles

| Principle | Cốt lõi |
|---|---|
| **MVVM first, scale to TCA** | MVVM cho mọi feature nhỏ. Refactor lên TCA khi feature explosion (complexity / số màn hình tăng nhiều). Không premature optimization. |
| **Modular layered** | Presentation / Domain / Data tách rời, dependency point inward. |
| **Component-First Composition** | Build reusable units (class, struct, UI component, service) trước — compose thành feature sau. Tư duy như xây nhà: lắp sẵn tường, cầu thang, cánh cửa rồi mới ghép thành nhà, không xếp từng viên gạch / tay nắm cửa / sơn tường (từng dòng code) để thành nhà. Methodology gần với **Atomic Design** (atoms → molecules → organisms → templates → pages). |
| **Repository pattern** | Protocol cho data access — testable, swap được khi đổi backend. |
| **OOP + SOLID** | Design bằng class/struct/protocol theo 5 nguyên tắc SOLID: Single responsibility · Open/closed · Liskov · Interface segregation · Dependency inversion. |
| **Simple, clean code** | Code đơn giản, dễ đọc, không over-engineering. Pattern dùng khi cần, không lạm dụng. |
| **Decimal cho money** | Không bao giờ `Double`. |
| **Async/await** | Không completion handler khi có thể async. |
| **Testable** | Domain logic test được không cần UI. |

---

## 4 — Standards

Các tiêu chuẩn cứng — luôn áp dụng.

### Compliance

- **App Store Guideline 4.8** — Sign in with Apple bắt buộc khi có Google sign-in.
- **App Store Guideline 5.1.1(v)** — Delete Account in-app.
- **Apple HIG** — tuân thủ phiên bản hiện hành.
- **GDPR-like data minimization** — không thu thập gì không cần thiết.

### Identity sản phẩm

- **Tiếng Việt** là ngôn ngữ default.
- **VND** là currency default, format `1.000.000 đ` (VN locale).
- **Modern iOS** — min iOS bám sát Apple ecosystem hiện đại.

### Accessibility

- Dynamic Type (text scaling).
- VoiceOver cho tương tác chính.
- Contrast ratio đạt WCAG AA tối thiểu.
- Touch target theo Apple HIG.

### Data integrity (universal rules)

- Money: **Decimal**, không bao giờ `Double` (tránh floating-point error).
- Date: ISO 8601, timezone-aware.
- IDs: UUID v4.

### Data portability

- User own their data. Cashy hỗ trợ export/import data dưới **standard formats**.
- CSV là format chính (Excel mở được trực tiếp).
- Native .xlsx và CSV import có thể bổ sung version sau.

---

## 5 — Tech & Architecture Philosophy

Triết lý kỹ thuật áp dụng cho mọi version. Stack cụ thể từng version có trong spec doc.

### Tech philosophy

- **Apple-native stack**: Swift + SwiftUI + Apple frameworks.
- **Modern Swift idioms**: async/await over closures, structured concurrency, value types where possible.
- **Apple built-in over external libs**: prefer Apple frameworks. External lib chỉ khi Apple không có giải pháp tương đương (vd: third-party auth provider).
- **Declarative UI**: SwiftUI primary. State management qua `@Observable`.
- **Native data layer**: Apple's persistence (SwiftData hiện tại), local-first.

### Architecture philosophy

- **Modular layered** — Presentation / Domain / Data tách rời.
- **Dependency rule** — dependencies point inward toward Domain. Domain pure Swift, không phụ thuộc framework.
- **Repository pattern** — mọi data access qua protocol. Test được + swap được khi đổi backend.
- **OOP + SOLID** trong toàn bộ code organization (Single responsibility, Open/closed, Liskov, Interface segregation, Dependency inversion).
- **Component-First Composition** — build reusable units (class, struct, UI component, service) trước, compose thành feature sau. Không code monolithic block. Tương đương Atomic Design trong UI design system.
- **Simple, clean code** — pattern dùng khi cần, không lạm dụng. Không over-engineering.
- **MVVM first, scale to TCA on explosion** — bắt đầu với MVVM cho mọi feature. Refactor lên TCA khi complexity / số màn hình tăng nhiều. Refactor cost thấp vì Domain layer tách rời.

---

## Appendix — Quick Reference cho AI

Tập trung tech + feature sản phẩm.

### ✅ DO

- **Tech**: MVVM first cho feature nhỏ (TCA khi explosion), modular layered, **Component-First Composition** (build reusable units trước, compose sau), Repository pattern, **OOP + SOLID**, simple clean code, Decimal cho money, async/await, testable, `@Observable`.
- **Feature**: nhập transaction nhanh (< 5s), thống kê trực quan có filter, data portability (CSV export/import).
- **UI**: **minimalism** (less is more, không decoration thừa), dark/light polish, ưu tiên system colors, semantic colors có chủ đích, tabular numbers, HIG compliance.

### ❌ DON'T

- Không dùng Double cho money type — luôn Decimal.
- Không import framework infrastructure (SwiftData, Keychain...) trong Domain layer.
- Không gọi data layer trực tiếp từ Presentation — đi qua Repository.
- Không over-engineer / premature optimize architecture (MVVM đủ, chưa cần TCA cho feature nhỏ).
- Không add external dependency khi Apple framework đủ.
- **Không thêm visual decoration không có lý do** (gradient lòe, shadow nặng, animation trang trí, icon thừa).

### Khi có doubt

1. Đọc lại §3 Principles + §4 Standards.
2. Hỏi user, đừng đoán.

---

**End of Vision Document.**
