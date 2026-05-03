# Estrutura modular feature-based para apps iOS

Padrão recomendado pelo iOS Engineer para apps que precisam escalar de 1 dev → squad → time grande.

> Princípio: **modularização desde o dia 1**. Apps começam pequenos, viram grandes; refatorar mais tarde é caro. SPM é nativo, gratuito, testado em produção pela Apple.

---

## Layout do workspace

```
KovyoApp.xcworkspace                  ← workspace
├── KovyoApp.xcodeproj                ← app shell (target, plist, entitlements)
│   └── KovyoApp/                     ← código mínimo: @main App, AppDelegate
│       ├── KovyoApp.swift
│       ├── Info.plist
│       ├── KovyoApp.entitlements
│       └── PrivacyInfo.xcprivacy
├── Package.swift                     ← multi-target manifest (ver templates/Package.swift)
└── Sources/
    ├── AppFeature/                   ← composition root (importa todas features)
    │   └── AppFeature.swift
    │
    ├── FeatureCatalog/               ← feature: catálogo
    │   ├── Catalog.swift             ← @Observable model
    │   ├── CatalogView.swift         ← entry point SwiftUI
    │   ├── ProductDetailView.swift
    │   └── Internal/
    │       └── CatalogReducer.swift
    │
    ├── FeatureCart/                  ← feature: carrinho
    ├── FeatureCheckout/              ← feature: checkout
    ├── FeatureOrders/                ← feature: pedidos
    ├── FeatureProfile/               ← feature: perfil
    │
    ├── AppCore/                      ← domain (puro, sem framework Apple além de Foundation)
    │   ├── Models/
    │   │   ├── Product.swift
    │   │   ├── Cart.swift
    │   │   └── Order.swift
    │   └── UseCases/
    │       └── CheckoutUseCase.swift
    │
    ├── AppNetworking/                ← URLSession + Codable + ATS pinning
    │   ├── APIClient.swift
    │   ├── PinnedSessionDelegate.swift
    │   └── Endpoints/
    │       └── ProductsEndpoint.swift
    │
    ├── AppPersistence/               ← SwiftData @Model + CloudKit
    │   ├── Schema.swift
    │   └── PersistentStore.swift
    │
    ├── AppDesignSystem/              ← tokens + components + Liquid Glass
    │   ├── Tokens/
    │   │   ├── Color+App.swift
    │   │   ├── Typography.swift
    │   │   └── Spacing.swift
    │   ├── Components/
    │   │   ├── PrimaryButton.swift
    │   │   ├── Card.swift
    │   │   └── EmptyStateView.swift
    │   └── Resources/                ← assets, fonts, .xcassets
    │
    ├── AppIntents_/                  ← App Intents para Apple Intelligence
    │   ├── Entities/
    │   │   ├── ProductEntity.swift
    │   │   └── OrderEntity.swift
    │   ├── Intents/
    │   │   ├── SearchProductsIntent.swift
    │   │   ├── AddToCartIntent.swift
    │   │   └── CheckoutIntent.swift
    │   └── KovyoShortcuts.swift
    │
    ├── AppSecurity/                  ← Keychain + App Attest + biometrics + Secure Enclave
    │   ├── Keychain.swift
    │   ├── AppAttestService.swift
    │   ├── BiometricGuard.swift
    │   └── MandateSigner.swift
    │
    └── AppAnalytics/                 ← Logger + MetricKit + crash
        ├── AppLogger.swift
        ├── MetricsObserver.swift
        └── AnalyticsEvent.swift
```

---

## Regras de dependência

```
AppFeature
   ├── Feature*  (todas)
   ├── AppDesignSystem
   ├── AppIntents_
   ├── AppAnalytics
   └── AppSecurity

Feature*
   ├── AppCore
   ├── AppDesignSystem
   ├── AppNetworking (se acessa rede)
   └── AppPersistence (se acessa storage local)

AppNetworking → AppSecurity (cert pinning, App Attest assertions)

AppCore → (nada além de Foundation)
```

**Proibido**:
- `AppCore` importar `AppNetworking` ou `AppPersistence`. Domínio não conhece infraestrutura.
- `Feature*` importar outra `Feature*`. Comunicação cross-feature via `AppCore` events ou navigation.
- Imports circulares (SPM rejeita; Tuist também).

---

## Por que multi-package SPM (não monolítico)

| Benefício | Como se manifesta |
|---|---|
| Build incremental | Mudança em `FeatureCatalog` não rebuilda `FeatureProfile`. Em projetos grandes, economia de minutos por build. |
| Fronteiras de API | `internal` é o default. Para expor algo, escreve `public` — força reflexão. |
| Testabilidade | Cada package tem `Tests/` próprio; testes rodam em paralelo. |
| Reuso | `AppDesignSystem` pode ser usado por app principal + extension (Widget, Watch app). |
| Onboarding | Dev novo abre `FeatureCart` e entende a feature sem ter que ler o app inteiro. |
| Refactor seguro | Mover algo de `AppCore` para `AppNetworking` é um diff visível, não um silent leak. |

---

## Convenções

### Naming
- `Feature*` — features de UI/usecase com tela.
- `App*` — camadas transversais.
- View files: `<Domain>View.swift` (`CatalogView.swift`, `CheckoutView.swift`).
- Models: `<Noun>.swift` (`Product.swift`, `Cart.swift`).
- @Observable models: `<Noun>Model.swift` ou `<Noun>Store.swift`.
- Use cases: `<Verb><Noun>UseCase.swift` (`CheckoutCartUseCase.swift`).

### Arquitetura interna por feature
Padrão **MV** (Model-View) com `@Observable`:
```swift
// Catalog/CatalogModel.swift
@Observable
@MainActor
final class CatalogModel {
    private(set) var state: ViewState<[Product]> = .idle
    private let api: ProductsAPI

    init(api: ProductsAPI) { self.api = api }

    func load() async {
        state = .loading
        do {
            let products = try await api.fetchAll()
            state = .loaded(products)
        } catch {
            state = .failed(error)
        }
    }
}

// Catalog/CatalogView.swift
struct CatalogView: View {
    @State private var model: CatalogModel

    init(model: @autoclosure @escaping () -> CatalogModel) {
        _model = State(wrappedValue: model())
    }

    var body: some View {
        NavigationStack {
            content
                .task { await model.load() }
        }
    }

    @ViewBuilder
    private var content: some View {
        switch model.state {
        case .idle, .loading: ProgressView()
        case .loaded(let products): ProductList(products: products)
        case .failed(let error): ErrorView(error: error) { Task { await model.load() } }
        }
    }
}
```

Para domínios complexos (state machine, undo/redo, time-travel debugging), considerar **The Composable Architecture (TCA)** apenas naquela feature — não no app inteiro.

---

## Onde mora o que

| Coisa | Lugar | Por quê |
|---|---|---|
| `@Observable` models | `Feature*` | UI-bound; só a feature usa |
| `Codable` DTOs | `AppNetworking/Endpoints/` | API contract; não vaza pro domínio |
| `Product`, `Cart`, `Order` (domain) | `AppCore/Models/` | Reusado por features |
| `URLSession` config | `AppNetworking/APIClient.swift` | Singleton-by-injection |
| Keychain wrapper | `AppSecurity/Keychain.swift` | Encapsula API verbosa |
| `App Intents` | `AppIntents_/` | Apple precisa que vivam no main bundle ou framework com entitlement; deps mínimas |
| Strings localizadas | `Sources/<Module>/Localizable.xcstrings` | String Catalog por módulo (Xcode merge automático) |
| Assets (imagens, cores) | `AppDesignSystem/Resources/` | Reuso garantido |
| Privacy Manifest | `KovyoApp/PrivacyInfo.xcprivacy` (main bundle) | Top-level, único |

---

## CI/CD layout

```yaml
# .github/workflows/ios.yml ou Xcode Cloud Workflow
- Resolve dependencies
- swift-format --strict (lint)
- swiftlint --strict (lint)
- xcodebuild test \
    -workspace KovyoApp.xcworkspace \
    -scheme KovyoApp \
    -destination "platform=iOS Simulator,name=iPhone 15 Pro,OS=17.5"
- xcodebuild archive (only main branch)
- xcrun altool / Xcode Cloud upload to TestFlight
```

Stages:
1. **PR check** — lint + unit tests + snapshot tests (5-10 min).
2. **Main merge** — full test matrix + archive + TestFlight internal.
3. **Release tag** — TestFlight external + manual approval para App Store submission.

---

## Quando NÃO modularizar tanto

- Prototipo de hackathon: monolítico OK.
- App de 1 tela com 0 lógica: monolítico OK.

Para qualquer app que vai chegar a >5 telas com lógica real ou >1 dev, **modularize desde o início**. O custo de adicionar módulo no início é trivial; o custo de modularizar app legado é semanas.
