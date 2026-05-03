# iOS Agentic Commerce Playbook

Stack canônica Apple para apps onde o **agente AI faz checkout** em nome do usuário — pesquisa, compara, autoriza pagamento, acompanha pedido.

Camada Apple: **App Intents + Foundation Models + StoreKit 2 + Apple Pay + Wallet + Tap to Pay + Sign in with Apple/Passkeys**.
Quando o agente é externo (Google, OpenAI, Anthropic), camada interop: **UCP + AP2 + MCP** server-side.

Fontes canônicas:
- [App Intents](https://developer.apple.com/documentation/appintents)
- [Foundation Models](https://developer.apple.com/documentation/foundationmodels)
- [StoreKit](https://developer.apple.com/documentation/storekit)
- [Apple Pay](https://developer.apple.com/apple-pay/)
- [Apple Wallet](https://developer.apple.com/wallet/)
- [Tap to Pay on iPhone](https://developer.apple.com/tap-to-pay-on-iphone/)
- [App Attest](https://developer.apple.com/documentation/devicecheck/establishing_your_app_s_integrity)
- [App Store Review 3.1](https://developer.apple.com/app-store/review/guidelines/#business)
- [Universal Commerce Protocol (UCP) — Google/NRF](https://developers.google.com/merchant/ucp)
- [Agent Payments Protocol (AP2) — Google Cloud](https://cloud.google.com/blog/products/ai-machine-learning/announcing-agents-to-payments-ap2-protocol)

---

## 1. Princípios fundadores

| Princípio | Implicação |
|---|---|
| **Intent → Action → Confirmation** | Toda ação do agente que move dinheiro tem **explicit user confirmation** com Face ID/Touch ID e display do que está sendo autorizado. |
| **Privacy-first via Foundation Models** | Sumarização, comparação, NLU sobre carrinho e produtos roda **on-device**. Não vaza ao servidor. |
| **App Store Review compliance** | Conteúdo digital → StoreKit/IAP. Bens físicos/serviços → Apple Pay/PSP. Não há atalho. |
| **Auditável** | Cada ação do agente persiste log com `(agent_id, intent_name, parameters_hash, transaction_id, user_signature, timestamp)`. |
| **Fail safe** | Default fechado: agente não pode iniciar pagamento sem confirmação. Em qualquer ambiguidade, escala ao usuário. |

---

## 2. Arquitetura de referência

```
┌────────────────────────────────────────────────────────────────────┐
│  iOS app                                                           │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  UI (SwiftUI)                                                │  │
│  │  ├── Catalog / Detail / Cart / Checkout                      │  │
│  │  └── AgentSheet (overlay quando agente está ativo)           │  │
│  └──────────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  App Intents Layer                                           │  │
│  │  ├── SearchProductsIntent : AssistantIntent                  │  │
│  │  ├── AddToCartIntent      : AssistantIntent                  │  │
│  │  ├── CheckoutIntent       : AssistantIntent (ConfirmIntent)  │  │
│  │  ├── TrackOrderIntent     : AssistantIntent                  │  │
│  │  └── AppEntities: Product, Order, CartItem (AssistantEntity) │  │
│  └──────────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  Domain                                                      │  │
│  │  ├── ProductService (URLSession async)                       │  │
│  │  ├── CartService (@Observable, actor)                        │  │
│  │  ├── CheckoutService (Apple Pay / StoreKit)                  │  │
│  │  └── MandateService (Secure Enclave + LA)                    │  │
│  └──────────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  AI on-device                                                │  │
│  │  └── FoundationModels (cart summary, product compare, NLU)   │  │
│  └──────────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  Security                                                    │  │
│  │  ├── App Attest                                              │  │
│  │  ├── Keychain                                                │  │
│  │  ├── Secure Enclave (mandate signing)                        │  │
│  │  └── LocalAuthentication                                     │  │
│  └──────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ HTTPS + App Attest assertion
                                    ▼
┌────────────────────────────────────────────────────────────────────┐
│  Backend                                                           │
│  ├── REST API (catalog, cart, orders)                              │
│  ├── App Attest verification                                       │
│  ├── App Store Server API + ASSN V2                                │
│  ├── PSP (Stripe / Adyen / Cielo / Stone)                          │
│  ├── UCP endpoints (interop com agentes externos)                  │
│  ├── AP2 mandate verifier                                          │
│  └── Audit log (immutable, queryable)                              │
└────────────────────────────────────────────────────────────────────┘
```

---

## 3. App Intents — exposição semântica

App Intents são a interface entre o app e os agentes (Siri, Spotlight, Shortcuts, Apple Intelligence, Visual Intelligence, Action Button).

### 3.1 AppEntity para o domínio
```swift
import AppIntents

struct ProductEntity: AppEntity, AssistantEntity {
    static var typeDisplayRepresentation = TypeDisplayRepresentation(name: "Product")
    static var defaultQuery = ProductQuery()

    let id: String
    let name: String
    let priceCents: Int
    let currency: String
    let stock: Int
    let summary: String

    var displayRepresentation: DisplayRepresentation {
        DisplayRepresentation(
            title: "\(name)",
            subtitle: "R$ \(Double(priceCents)/100)",
            image: .init(systemName: "cube.box")
        )
    }
}

struct ProductQuery: EntityQuery {
    func entities(for identifiers: [String]) async throws -> [ProductEntity] {
        try await ProductService.shared.fetch(ids: identifiers)
    }
    func suggestedEntities() async throws -> [ProductEntity] {
        try await ProductService.shared.featured(limit: 10)
    }
}

extension ProductQuery: EntityStringQuery {
    func entities(matching string: String) async throws -> [ProductEntity] {
        try await ProductService.shared.search(string, limit: 10)
    }
}
```

### 3.2 Intents seguros (read-only ou idempotent)
```swift
struct SearchProductsIntent: AppIntent, AssistantIntent {
    static var title: LocalizedStringResource = "Search products"
    static var description = IntentDescription("Search the catalog by query")
    static var openAppWhenRun = false

    @Parameter(title: "Query") var query: String
    @Parameter(title: "Maximum results") var maxResults: Int?

    func perform() async throws -> some IntentResult & ReturnsValue<[ProductEntity]> {
        let limit = maxResults ?? 10
        let products = try await ProductService.shared.search(query, limit: limit)
        return .result(value: products)
    }
}

struct AddToCartIntent: AppIntent, AssistantIntent {
    static var title: LocalizedStringResource = "Add to cart"
    static var description = IntentDescription("Add a product to the cart")
    static var openAppWhenRun = false

    @Parameter(title: "Product") var product: ProductEntity
    @Parameter(title: "Quantity", default: 1) var quantity: Int

    func perform() async throws -> some IntentResult & ReturnsValue<CartEntity> {
        let cart = try await CartService.shared.add(productId: product.id, quantity: quantity)
        return .result(value: cart.toEntity())
    }
}
```

### 3.3 Intents que movem dinheiro — confirmation obrigatória
```swift
struct CheckoutIntent: AppIntent {
    static var title: LocalizedStringResource = "Checkout cart"
    static var description = IntentDescription("Charge the cart and complete the order")

    // Apple Intelligence é forçado a ESCALAR ao usuário antes de invocar
    static var isDiscoverable = true
    static var openAppWhenRun = true   // sobe app pra confirmação visual

    @Parameter(title: "Cart") var cart: CartEntity

    func perform() async throws -> some IntentResult & ProvidesDialog {
        // 1. abre app com sheet de confirmação
        await CheckoutCoordinator.shared.beginAgenticCheckout(cart: cart)

        // 2. user precisa autorizar via Face ID + ver resumo
        let outcome = try await CheckoutCoordinator.shared.awaitOutcome()
        switch outcome {
        case .authorized(let orderId):
            return .result(dialog: "Pedido \(orderId) confirmado.")
        case .declined:
            return .result(dialog: "Pagamento não autorizado.")
        case .cancelled:
            return .result(dialog: "Cancelado pelo usuário.")
        }
    }
}
```

> **Regra de ouro**: Intent que toca dinheiro **sempre** tem `openAppWhenRun = true` + sheet visual de confirmação + biometric auth. Nunca silent.

### 3.4 OpenIntent para deep link semântico
```swift
struct OpenOrderIntent: OpenIntent {
    static var title: LocalizedStringResource = "Open order"
    @Parameter(title: "Order") var target: OrderEntity

    func perform() async throws -> some IntentResult & OpenAppResult {
        await NavigationRouter.shared.go(.order(id: target.id))
        return .result()
    }
}
```

### 3.5 AppShortcuts (Siri / Spotlight)
```swift
struct KovyoShortcuts: AppShortcutsProvider {
    static var appShortcuts: [AppShortcut] {
        AppShortcut(
            intent: SearchProductsIntent(),
            phrases: [
                "Search \(\.$query) in \(.applicationName)",
                "Find \(\.$query) on \(.applicationName)"
            ],
            shortTitle: "Search Products",
            systemImageName: "magnifyingglass"
        )
    }
}
```

---

## 4. Foundation Models — AI on-device

Apple Intelligence inclui um LLM on-device acessível via **Foundation Models framework**. Privacidade-first, sem custo, offline.

### 4.1 Sumarização do carrinho
```swift
import FoundationModels

let session = LanguageModelSession(instructions: "Você é um assistente de compras direto e útil.")

let cartText = cart.items.map { "\($0.name) x\($0.quantity) — R$ \($0.subtotal)" }.joined(separator: "\n")
let prompt = "Resuma este carrinho destacando o item mais caro e total:\n\(cartText)"

let response = try await session.respond(to: prompt)
print(response.content)
```

### 4.2 Tool use on-device
Foundation Models pode chamar **AppIntents** como tools — agente compreende capacidade do app sem rede.

### 4.3 Structured generation
```swift
@Generable
struct ProductRecommendation {
    @Guide(description: "Product ID")
    let productId: String
    @Guide(description: "Reason for recommendation, max 80 chars")
    let reason: String
}

let recs = try await session.respond(to: "Recommend 3 products for cooking", generating: [ProductRecommendation].self)
```

### 4.4 Quando NÃO usar on-device
- Tarefa precisa do estado-da-arte (Claude/GPT/Gemini Pro).
- Tarefa precisa de contexto >> que o on-device suporta.
- Tarefa beneficia de ferramentas multi-modais que ainda não estão on-device.

→ Cloud LLM via servidor proxy (não direto do client). Privacy Manifest reflete tracking domain do provider.

---

## 5. Pagamentos

### 5.1 Decisão: Apple Pay vs StoreKit/IAP

| Tipo de bem | Caminho | Por quê |
|---|---|---|
| **Conteúdo digital consumido no app** (subs, levels, premium features, créditos) | **StoreKit/IAP** | App Store Review 3.1.1 — obrigatório |
| **Bens físicos** (delivery, retail, ingressos físicos) | **Apple Pay** (PSP) | Permitido via 3rd-party processor |
| **Serviços não-digitais** (Uber, hotel booking, médico) | **Apple Pay** (PSP) | Permitido |
| **Doações pessoa-pessoa** (P2P) | **Apple Pay** (PSP) ou rails específicos | Permitido |
| **Reader apps** (Spotify-like) com conta externa | StoreKit External Purchase Link Entitlement em regiões aplicáveis | 3.1.3(a) |

> Não há atalho. Tentar usar Apple Pay para vender feature digital = rejection garantida.

### 5.2 Apple Pay (bens físicos / serviços)
```swift
import PassKit

let request = PKPaymentRequest()
request.merchantIdentifier = "merchant.co.kovyo.app"
request.supportedNetworks = [.visa, .masterCard, .amex, .elo]  // Brasil: incluir Elo
request.merchantCapabilities = .threeDSecure
request.countryCode = "BR"
request.currencyCode = "BRL"
request.paymentSummaryItems = [
    PKPaymentSummaryItem(label: "Subtotal", amount: NSDecimalNumber(value: 99.90)),
    PKPaymentSummaryItem(label: "Frete", amount: NSDecimalNumber(value: 12.00)),
    PKPaymentSummaryItem(label: "Kovyo Store", amount: NSDecimalNumber(value: 111.90))
]
request.requiredBillingContactFields = [.emailAddress, .phoneNumber, .postalAddress]
request.requiredShippingContactFields = [.postalAddress, .phoneNumber]

let controller = PKPaymentAuthorizationController(paymentRequest: request)
controller.delegate = self
await controller.present()
```

Delegate envia `payment.token.paymentData` ao backend → PSP descriptografa → cobra cartão real.

### 5.3 StoreKit 2 (conteúdo digital)
```swift
import StoreKit

// Fetch
let products = try await Product.products(for: ["co.kovyo.pro_monthly", "co.kovyo.pro_annual"])

// Purchase
let result = try await product.purchase()
switch result {
case .success(let verification):
    let transaction = try checkVerified(verification)
    await deliverContent(for: transaction)
    await transaction.finish()
case .userCancelled, .pending:
    break
@unknown default:
    break
}

func checkVerified<T>(_ result: VerificationResult<T>) throws -> T {
    switch result {
    case .verified(let t): return t
    case .unverified(_, let error): throw error
    }
}

// Listen for updates (sandbox + outside app)
Task.detached {
    for await result in Transaction.updates {
        if case .verified(let t) = result {
            await deliverContent(for: t)
            await t.finish()
        }
    }
}

// Current entitlements (restore-style)
for await result in Transaction.currentEntitlements {
    if case .verified(let t) = result { await deliverContent(for: t) }
}
```

**Server-side**:
- **App Store Server API** para query de transactions, refunds, history.
- **App Store Server Notifications V2** webhook para subs lifecycle (renew, refund, billing retry).
- Validar JWS via Apple Root Certificates.

### 5.4 Wallet — passes & order tracking
```swift
import PassKit

// 1. Backend gera pass.json + manifest + signature, retorna como .pkpass file
// 2. App apresenta:
let pass = try PKPass(data: passData)
let vc = PKAddPassesViewController(pass: pass)!
present(vc, animated: true)

// Order tracking (iOS 16+):
// Backend submit ao Apple Wallet via shareable URL
// User adiciona; status updates via webhook ao backend → push ao Wallet
```

### 5.5 Tap to Pay on iPhone (merchant que recebe)
```swift
import ProximityReader

// Entitlement: com.apple.developer.proximity-reader.payment.acceptance
// Requer parceria com PSP (Stripe Tap to Pay, Adyen, etc)

let reader = try await PaymentCardReader.startSession(...)
let transaction = try await reader.readPaymentCard(...)
// transaction.encryptedData → backend → PSP
```

---

## 6. AP2 (Agent Payments Protocol) — interop cross-agent

Quando agente externo (não Apple Intelligence) precisa autorizar pagamento, AP2 define o **mandate**: contrato assinado criptograficamente "agente X pode pagar até $Y nesta cesta".

### 6.1 Geração de mandate signing key (Secure Enclave)
```swift
import CryptoKit

let access = SecAccessControlCreateWithFlags(
    nil,
    kSecAttrAccessibleWhenUnlockedThisDeviceOnly,
    [.privateKeyUsage, .userPresence], // exige biometria pra usar
    nil
)!

let key = try SecureEnclave.P256.Signing.PrivateKey(accessControl: access)
// store key.dataRepresentation no Keychain
// publicKey enviado ao backend (associated com user)
```

### 6.2 Assinatura de Cart Mandate
```swift
struct CartMandate: Codable {
    let agentId: String
    let cartHash: String       // SHA-256(cart.json canonical)
    let maxAmountCents: Int
    let currency: String
    let validUntil: Date
    let nonce: String
}

// Apresentar UI:
// "Autorizar agente Acme.AI a pagar até R$ 200 neste carrinho"
let context = LAContext()
context.localizedReason = "Autorizar agente \(mandate.agentId) a pagar R$ \(mandate.maxAmountCents/100)"
let authed = try await context.evaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, localizedReason: ...)

let mandateData = try JSONEncoder().encode(mandate)
let signature = try key.signature(for: mandateData) // requer biometria
// envia { mandate, signature, publicKeyId } ao backend
// backend valida signature contra publicKey + executa pagamento
```

### 6.3 Server-side
- Verificar signature contra public key associada ao user.
- Replay protection (nonce + timestamp).
- Enforce `maxAmountCents` e `cartHash` (recomputar do cart real e comparar).
- Logar tudo (audit trail).

---

## 7. Auth + checkout one-tap

Combinação canônica:
```
Sign in with Apple ou Passkey  ─▶  resume sessão
                                     │
                                     ▼
                              Apple Pay (físico) ou StoreKit (digital)
                                     │
                                     ▼ Face ID confirma
                              Transaction success
                                     │
                                     ▼
                              Push to Wallet (order tracking) + log
```

**Meta**: ≤2 taps, ≤3s do "Buy" ao "Confirmed". Foundation Models pode pré-resumir o pedido on-device.

---

## 8. UCP (interop com agentes externos)

Quando agente externo (ChatGPT, Gemini, Claude com tool use) negocia em nome do usuário, **server-side** expõe endpoints UCP:

```
GET  /ucp/products?query=...
GET  /ucp/products/{id}
POST /ucp/cart
POST /ucp/cart/{id}/checkout    ← exige AP2 mandate signed
GET  /ucp/orders/{id}
POST /ucp/returns
```

Apple não dita UCP — é proposta Google/NRF — mas é compatível: agente externo conversa com seu backend via UCP, opcionalmente usando MCP para descoberta. Pagamento final usa AP2 mandate (se ele quer pagar pelo user) ou external link entitlement (se entitled na storefront).

---

## 9. Audit trail (não-negociável)

Cada ação do agente persiste imutável:
```json
{
  "timestamp": "2026-05-03T14:23:11Z",
  "user_id_hash": "0xab...",
  "device_id": "DCDevice token (hashed)",
  "agent_id": "apple_intelligence | acme.ai | ...",
  "intent_name": "CheckoutIntent",
  "parameters_hash": "sha256(...)",
  "transaction_id": "txn_xyz",
  "amount_cents": 19990,
  "currency": "BRL",
  "outcome": "authorized | declined | cancelled",
  "user_authentication": "faceid | touchid | passcode",
  "mandate_signature": "..." // se AP2
}
```

Retenção definida pelo legal (Brazil: LGPD; UE: GDPR — 5 anos típico para pagamentos). Acesso restrito.

---

## 10. App Review survival kit

Submissão de app com agentic commerce **vai** receber atenção extra. Antecipe:

✅ **Demo account** que permite ao reviewer testar o fluxo de agente.
✅ **Video demo** anexado mostrando: agente sugere → user confirma → Face ID → pedido criado.
✅ **Privacy Manifest** completo refletindo dados que o agente acessa.
✅ **App Privacy** no App Store Connect bate.
✅ **In-app purchase** apenas para conteúdo digital. Bens físicos via Apple Pay.
✅ **Sign in with Apple** disponível.
✅ **Account deletion** in-app.
✅ Texto em onboarding explicando o que o agente faz e o que não faz.
✅ Toggle para **desligar** uso do agente.
✅ Logs de cada ação visíveis ao usuário (histórico de pedidos).

❌ Nunca: pagamento auto sem confirmação.
❌ Nunca: bypass de StoreKit para conteúdo digital.
❌ Nunca: capturar dados do user para treinar modelo sem consent + ATT (se aplicável).

---

## 11. Métricas de sucesso

| Métrica | Target |
|---|---|
| Tempo médio do "Buy" ao "Confirmed" | <3s |
| Taxa de conversão checkout via agente | ≥ versão manual |
| Cancelamento na confirmação biométrica | <5% |
| Disputas/chargebacks | <0.5% (Apple Pay), <0.1% (Wallet) |
| Sucesso de App Attest assertion | >99.5% |
| Latência server-side (P95) | <500ms |
| Privacy Nutrition Label issues no review | 0 |
| App Review pass rate | 100% na primeira submissão |

---

## 12. Anti-patterns

❌ Chamar Apple Pay direto a partir de App Intent sem sheet visual de confirmação.
❌ Usar StoreKit para vender bens físicos.
❌ Usar Apple Pay para vender features digitais.
❌ Permitir agente externo invocar `CheckoutIntent` sem AP2 mandate.
❌ Skipping de App Attest server-side.
❌ Logar dados de pagamento (PAN, CVV) — nem mascarado.
❌ Enviar carrinho ao LLM cloud sem consent + Privacy Manifest correto.
❌ Não suportar `Restore Purchases` (App Review reject 3.1.1).
❌ Subs sem opção visível de cancelar.
❌ Não testar em sandbox StoreKit + TestFlight antes de production.
