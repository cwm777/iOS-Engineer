# iOS Audit Checklist

Checklist auditável de 16 áreas, **220+ itens**, mapeada à documentação oficial em `developer.apple.com`. Use durante audit do iOS Engineer (Fase 2 — Compliance check).

**Convenções:**
- **Severity**: 🔴 **Critical** (bloqueia App Review ou expõe usuário) · 🟠 **High** (regressão grave) · 🟡 **Medium** (qualidade) · 🟢 **Low** (polish)
- **Effort**: **S** (≤4h) · **M** (1-3 dias) · **L** (1-2 sprints) · **XL** (>2 sprints)

---

## 1. Project setup & build

| # | Item | Severity | Effort | Doc |
|---|---|---|---|---|
| 1.1 | Xcode versão estável mais recente em uso | 🟠 High | S | [Xcode releases](https://developer.apple.com/xcode/) |
| 1.2 | Swift 6 com `SWIFT_STRICT_CONCURRENCY = complete` | 🟠 High | M | [Swift 6 migration](https://www.swift.org/migration/documentation/migrationguide/) |
| 1.3 | Deployment target em uma das 3 últimas major versions | 🟡 Medium | S | [Supporting older iOS](https://developer.apple.com/support/app-store/) |
| 1.4 | Swift Package Manager preferido sobre CocoaPods em código novo | 🟡 Medium | L | [SPM](https://www.swift.org/package-manager/) |
| 1.5 | `Package.swift` ou Tuist `Project.swift` versionado e determinístico | 🟡 Medium | M | [SPM manifests](https://developer.apple.com/documentation/packagedescription) |
| 1.6 | Build configurations Debug/Release/Beta separadas com xcconfigs | 🟡 Medium | M | [Build configs](https://developer.apple.com/documentation/xcode/configuring-the-build-settings-of-a-target) |
| 1.7 | `xcbeautify` ou similar em CI para output legível | 🟢 Low | S | [Xcode Cloud](https://developer.apple.com/xcode-cloud/) |
| 1.8 | `Treat Warnings as Errors` em Release | 🟠 High | S | Build settings |
| 1.9 | Sem código morto detectado por **Periphery** | 🟡 Medium | M | [Periphery](https://github.com/peripheryapp/periphery) |
| 1.10 | **SwiftLint** rodando em CI sem warnings | 🟠 High | S | [SwiftLint](https://github.com/realm/SwiftLint) |
| 1.11 | **swift-format** em CI | 🟡 Medium | S | [swift-format](https://github.com/swiftlang/swift-format) |

## 2. Arquitetura & código

| # | Item | Severity | Effort | Doc |
|---|---|---|---|---|
| 2.1 | UI em **SwiftUI** para telas novas (UIKit só em legado/justificado) | 🟠 High | XL | [SwiftUI](https://developer.apple.com/documentation/swiftui) |
| 2.2 | `@Observable` (Observation framework) em vez de `ObservableObject` em iOS 17+ | 🟠 High | M | [Observation](https://developer.apple.com/documentation/observation) |
| 2.3 | `@State`/`@Bindable`/`@Environment` corretos (não `@StateObject` em código novo) | 🟠 High | M | [Managing model data](https://developer.apple.com/documentation/swiftui/managing-model-data-in-your-app) |
| 2.4 | View bodies puros e leves (computações fora de `body`) | 🟠 High | M | [SwiftUI performance](https://developer.apple.com/videos/play/wwdc2023/10160/) |
| 2.5 | Modularização SPM por feature/layer (App / Feature\* / Core / Data) | 🟡 Medium | XL | [Organizing code](https://developer.apple.com/documentation/xcode/organizing-your-code-with-local-packages) |
| 2.6 | Composition root no `App` (sem service locator / global singleton) | 🟡 Medium | M | [Dependency injection](https://developer.apple.com/wwdc23) |
| 2.7 | Navegação value-based (`NavigationStack` + `Hashable` types) | 🟠 High | M | [NavigationStack](https://developer.apple.com/documentation/swiftui/navigationstack) |
| 2.8 | `NavigationSplitView` em iPad/Mac/visionOS | 🟠 High | M | [NavigationSplitView](https://developer.apple.com/documentation/swiftui/navigationsplitview) |
| 2.9 | Empty / loading / error states modelados como tipos algébricos | 🟡 Medium | M | HIG: Loading |
| 2.10 | Sem `print()` em release — `Logger` (`os.log`) por subsystem/category | 🟠 High | S | [os.Logger](https://developer.apple.com/documentation/os/logger) |

## 3. Concorrência (Swift Concurrency)

| # | Item | Severity | Effort | Doc |
|---|---|---|---|---|
| 3.1 | Código novo em `async/await`, sem `DispatchQueue.main.async` cosmético | 🟠 High | M | [Swift Concurrency](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/concurrency/) |
| 3.2 | `Sendable` em tipos atravessando isolation boundaries | 🟠 High | L | [Sendable](https://developer.apple.com/documentation/swift/sendable) |
| 3.3 | `actor` para isolamento real, `@MainActor` apenas onde necessário | 🟡 Medium | M | [Actors](https://developer.apple.com/documentation/swift/actor) |
| 3.4 | `Task { @MainActor in }` evitado onde isolamento já é garantido | 🟡 Medium | S | WWDC: Beyond the basics of structured concurrency |
| 3.5 | `.task(id:)` em vez de `.onAppear { Task { ... } }` | 🟡 Medium | S | [task modifier](https://developer.apple.com/documentation/swiftui/view/task(id:priority:_:)) |
| 3.6 | Cancelamento honrado (`Task.checkCancellation()`, propagação) | 🟠 High | M | [Cancellation](https://developer.apple.com/documentation/swift/task) |
| 3.7 | Sem `runBlocking`/sync IO no main thread | 🔴 Critical | M | [Threading](https://developer.apple.com/documentation/swift/concurrency) |
| 3.8 | Combine usado apenas em pipelines existentes (não em código novo) | 🟢 Low | L | — |

## 4. Persistência & dados

| # | Item | Severity | Effort | Doc |
|---|---|---|---|---|
| 4.1 | **SwiftData** (`@Model`) em apps novos iOS 17+ | 🟡 Medium | L | [SwiftData](https://developer.apple.com/documentation/swiftdata) |
| 4.2 | **CloudKit** para sync cross-device com privacy | 🟡 Medium | L | [CloudKit](https://developer.apple.com/icloud/cloudkit/) |
| 4.3 | Migrations versionadas e testadas | 🟠 High | M | [Schema migrations](https://developer.apple.com/documentation/swiftdata/schema-migration) |
| 4.4 | Índices declarados via `@Attribute(.indexed)` em queries quentes | 🟡 Medium | S | [@Attribute](https://developer.apple.com/documentation/swiftdata/attribute) |
| 4.5 | Segredos NUNCA em `UserDefaults`/`@AppStorage` | 🔴 Critical | S | [Keychain Services](https://developer.apple.com/documentation/security/keychain_services) |
| 4.6 | Dados sensíveis em arquivos com **Data Protection** classe `.complete` | 🟠 High | S | [File Data Protection](https://developer.apple.com/documentation/uikit/protecting_the_user_s_privacy/encrypting_your_app_s_files) |
| 4.7 | Tokens em **Keychain** com `kSecAttrAccessible` apropriado | 🔴 Critical | S | [Keychain](https://developer.apple.com/documentation/security/keychain_services) |

## 5. Networking & ATS

| # | Item | Severity | Effort | Doc |
|---|---|---|---|---|
| 5.1 | `URLSession` + async/await; sem `dataTask(with:completionHandler:)` em código novo | 🟡 Medium | M | [URLSession](https://developer.apple.com/documentation/foundation/urlsession) |
| 5.2 | App Transport Security strict (TLS 1.2+, sem `NSAllowsArbitraryLoads` em release) | 🔴 Critical | S | [ATS](https://developer.apple.com/documentation/bundleresources/information_property_list/nsapptransportsecurity) |
| 5.3 | Certificate pinning em hosts críticos (login, payment) | 🟠 High | M | [URLSessionDelegate auth challenge](https://developer.apple.com/documentation/foundation/urlsessiondelegate) |
| 5.4 | Tokens em headers `Authorization`, nunca em URL | 🔴 Critical | S | OWASP MASVS |
| 5.5 | Erros de rede modelados como `enum NetworkError` com casos ricos | 🟡 Medium | M | — |
| 5.6 | `Codable` models marcados `Sendable` quando usados em async | 🟡 Medium | S | [Sendable](https://developer.apple.com/documentation/swift/sendable) |
| 5.7 | Background uploads/downloads via `URLSession` background config | 🟡 Medium | M | [Background sessions](https://developer.apple.com/documentation/foundation/url_loading_system/downloading_files_in_the_background) |

## 6. Segurança (autenticação, crypto, integridade)

| # | Item | Severity | Effort | Doc |
|---|---|---|---|---|
| 6.1 | **Sign in with Apple** oferecido se há third-party login (Guideline 4.8) | 🔴 Critical | M | [Sign in with Apple](https://developer.apple.com/sign-in-with-apple/) |
| 6.2 | **Passkeys** suportadas em login | 🟠 High | L | [Passkeys](https://developer.apple.com/passkeys/) |
| 6.3 | **LocalAuthentication** (Face ID / Touch ID) para reauth/step-up | 🟠 High | M | [LocalAuthentication](https://developer.apple.com/documentation/localauthentication) |
| 6.4 | OAuth via **ASWebAuthenticationSession**, não `WKWebView` cru | 🔴 Critical | M | [ASWebAuthenticationSession](https://developer.apple.com/documentation/authenticationservices/aswebauthenticationsession) |
| 6.5 | Chaves criptográficas em **Secure Enclave** quando hardware suporta | 🟠 High | M | [Secure Enclave](https://developer.apple.com/documentation/cryptokit/secureenclave) |
| 6.6 | **CryptoKit** para todas operações criptográficas (sem rolar próprio crypto) | 🔴 Critical | M | [CryptoKit](https://developer.apple.com/documentation/cryptokit) |
| 6.7 | **App Attest** (`DCAppAttestService`) em handshakes server-side sensíveis | 🔴 Critical | L | [App Attest](https://developer.apple.com/documentation/devicecheck/establishing_your_app_s_integrity) |
| 6.8 | **DeviceCheck** para fraud signals (free-trial abuse, etc) | 🟡 Medium | M | [DeviceCheck](https://developer.apple.com/documentation/devicecheck) |
| 6.9 | Hardened Runtime + entitlements mínimos | 🟠 High | S | [Hardened Runtime](https://developer.apple.com/documentation/security/hardened_runtime) |
| 6.10 | Code signing: distribuição via App Store/TestFlight (não enterprise para uso geral) | 🔴 Critical | — | [Distribution](https://developer.apple.com/distribute/) |
| 6.11 | Sem chaves/segredos hard-coded no código ou no `Info.plist` | 🔴 Critical | M | — |
| 6.12 | Refresh tokens curtos + rotation; access tokens com TTL apropriado | 🟠 High | M | OWASP |

## 7. Privacidade & permissões

| # | Item | Severity | Effort | Doc |
|---|---|---|---|---|
| 7.1 | **`PrivacyInfo.xcprivacy`** completo e auditado | 🔴 Critical | M | [Privacy manifest](https://developer.apple.com/documentation/bundleresources/privacy_manifest_files) |
| 7.2 | `NSPrivacyTracking` correto (true se ATT é necessário) | 🔴 Critical | S | [Privacy manifest tracking](https://developer.apple.com/documentation/bundleresources/privacy_manifest_files/describing_use_of_required_reason_api) |
| 7.3 | `NSPrivacyTrackingDomains` lista todos domínios de tracking | 🔴 Critical | S | [Tracking domains](https://developer.apple.com/documentation/bundleresources/privacy_manifest_files) |
| 7.4 | `NSPrivacyCollectedDataTypes` enumera dados coletados (linked, used-for-tracking, purposes) | 🔴 Critical | M | [Data types](https://developer.apple.com/documentation/bundleresources/privacy_manifest_files) |
| 7.5 | `NSPrivacyAccessedAPITypes` declara required reasons (UserDefaults, file timestamp, system boot, disk space, active keyboards) | 🔴 Critical | S | [Required reason APIs](https://developer.apple.com/documentation/bundleresources/privacy_manifest_files/describing_use_of_required_reason_api) |
| 7.6 | Third-party SDKs da [lista oficial](https://developer.apple.com/support/third-party-SDK-requirements/) com Privacy Manifest + assinatura | 🔴 Critical | M | [Third-party SDK requirements](https://developer.apple.com/support/third-party-SDK-requirements/) |
| 7.7 | App Privacy no App Store Connect bate com Privacy Manifest | 🔴 Critical | S | [App privacy details](https://developer.apple.com/app-store/app-privacy-details/) |
| 7.8 | Purpose strings (`NS*UsageDescription`) claros, contextuais, localizados | 🔴 Critical | S | [Information property list](https://developer.apple.com/documentation/bundleresources/information_property_list) |
| 7.9 | Permissões pedidas just-in-time, não no launch | 🟠 High | M | HIG: Privacy |
| 7.10 | Rationale UI mostrada antes do system prompt | 🟠 High | M | HIG: Requesting permission |
| 7.11 | **App Tracking Transparency** (`ATTrackingManager`) só quando faz tracking real | 🔴 Critical | M | [App Tracking Transparency](https://developer.apple.com/documentation/apptrackingtransparency) |
| 7.12 | `PHPickerViewController` / SwiftUI `PhotosPicker` em vez de full Photos access | 🟠 High | S | [PhotosPicker](https://developer.apple.com/documentation/photokit/phpickerviewcontroller) |
| 7.13 | Location: `whenInUse` antes de `always`; respeitar `precise` opt-out | 🟠 High | M | [Core Location](https://developer.apple.com/documentation/corelocation) |
| 7.14 | **Account deletion** in-app obrigatório se há contas (Guideline 5.1.1(v)) | 🔴 Critical | M | [App Review 5.1.1(v)](https://developer.apple.com/app-store/review/guidelines/#5.1.1) |
| 7.15 | Privacy Policy URL ativa, em todas línguas suportadas | 🔴 Critical | S | — |

## 8. Acessibilidade (WCAG + Apple)

| # | Item | Severity | Effort | Doc |
|---|---|---|---|---|
| 8.1 | **VoiceOver** funcional em toda navegação principal | 🔴 Critical | M | [VoiceOver](https://developer.apple.com/accessibility/voiceover/) |
| 8.2 | `accessibilityLabel`, `Hint`, `Value`, `Traits` em controles custom | 🟠 High | M | [SwiftUI accessibility](https://developer.apple.com/documentation/swiftui/view-accessibility) |
| 8.3 | Touch targets ≥44pt × 44pt | 🟠 High | S | [HIG: Layout](https://developer.apple.com/design/human-interface-guidelines/layout) |
| 8.4 | Suporte completo a **Dynamic Type** (testar até `.accessibilityXXXL`) | 🔴 Critical | M | [Dynamic Type](https://developer.apple.com/design/human-interface-guidelines/typography#Specifications) |
| 8.5 | Contraste ≥4.5:1 (texto normal), ≥3:1 (texto grande) | 🟠 High | M | WCAG AA |
| 8.6 | Suporte a **Reduce Motion** (`@Environment(\.accessibilityReduceMotion)`) | 🟠 High | M | [Reduce Motion](https://developer.apple.com/documentation/swiftui/environmentvalues/accessibilityreducemotion) |
| 8.7 | Suporte a **Reduce Transparency** | 🟡 Medium | S | [Reduce Transparency](https://developer.apple.com/documentation/swiftui/environmentvalues/accessibilityreducetransparency) |
| 8.8 | Suporte a **Increase Contrast** | 🟡 Medium | S | [Increase Contrast](https://developer.apple.com/documentation/swiftui/environmentvalues/accessibilitydifferentiatewithoutcolor) |
| 8.9 | Suporte a **Differentiate Without Color** | 🟡 Medium | M | HIG: Color |
| 8.10 | Custom rotors quando navegação custom faz sentido | 🟡 Medium | M | [Custom rotors](https://developer.apple.com/documentation/swiftui/view/accessibilityrotor(_:entries:)) |
| 8.11 | Auditoria com **Accessibility Inspector** sem warnings | 🟠 High | S | [Accessibility Inspector](https://developer.apple.com/library/archive/documentation/Accessibility/Conceptual/AccessibilityMacOSX/OSXAXTestingApps.html) |
| 8.12 | Ícones SF Symbols com variantes apropriadas (multicolor, hierarchical, palette) | 🟢 Low | S | [SF Symbols](https://developer.apple.com/sf-symbols/) |

## 9. Internacionalização & localização

| # | Item | Severity | Effort | Doc |
|---|---|---|---|---|
| 9.1 | **String Catalog** (`.xcstrings`) em vez de `.strings` legado | 🟡 Medium | M | [String Catalog](https://developer.apple.com/documentation/xcode/localizing-and-varying-text-with-a-string-catalog) |
| 9.2 | `LocalizedStringResource` em vez de `String` literal | 🟠 High | M | [LocalizedStringResource](https://developer.apple.com/documentation/foundation/localizedstringresource) |
| 9.3 | Pseudo-localization testada (textos não cortados, layout não quebra) | 🟡 Medium | S | [Internationalization](https://developer.apple.com/internationalization/) |
| 9.4 | RTL (Arabic, Hebrew) suportado | 🟠 High | M | [RTL support](https://developer.apple.com/design/human-interface-guidelines/right-to-left) |
| 9.5 | Datas/números/moedas via `Date.FormatStyle`, `Locale.current`, `NumberFormatter`, `MeasurementFormatter` | 🟠 High | M | [Format styles](https://developer.apple.com/documentation/foundation/formatstyle) |
| 9.6 | Plurals (`stringsdict`/String Catalog) configurados | 🟡 Medium | M | [Plural rules](https://developer.apple.com/documentation/xcode/localizing-strings-that-contain-plurals) |

## 10. Adaptive UI & form factors

| # | Item | Severity | Effort | Doc |
|---|---|---|---|---|
| 10.1 | Layouts portrait + landscape funcionam (ou orientação justificada) | 🟠 High | M | HIG: Layout |
| 10.2 | iPhone compact + regular widths suportados | 🟠 High | M | [Size classes](https://developer.apple.com/design/human-interface-guidelines/layout#Specifications) |
| 10.3 | iPad: `NavigationSplitView` 2-3 colunas conforme densidade | 🟠 High | M | [NavigationSplitView](https://developer.apple.com/documentation/swiftui/navigationsplitview) |
| 10.4 | iPad: multitasking (Slide Over, Split View, Stage Manager) | 🟠 High | M | [Multitasking](https://developer.apple.com/library/archive/documentation/WindowsViews/Conceptual/AdoptingMultitaskingOniPad/) |
| 10.5 | iPad: Apple Pencil + cursor + keyboard shortcuts (`Commands`) | 🟡 Medium | M | [Pointing devices](https://developer.apple.com/design/human-interface-guidelines/pointing-devices) |
| 10.6 | Apple Watch: complications + Smart Stack relevance | 🟡 Medium | L | [WidgetKit watchOS](https://developer.apple.com/documentation/widgetkit/build-complications) |
| 10.7 | Apple Watch: Always-On display considerado | 🟡 Medium | M | [Always On](https://developer.apple.com/documentation/watchkit/keeping_your_watchos_app_s_content_up_to_date) |
| 10.8 | Vision Pro: ImmersiveSpace vs WindowGroup decisão consciente | 🟡 Medium | XL | [visionOS](https://developer.apple.com/visionos/) |
| 10.9 | CarPlay: templates aprovados, driver distraction guidelines | 🟠 High | L | [CarPlay](https://developer.apple.com/carplay/) |
| 10.10 | External display / Stage Manager testado | 🟢 Low | M | [External displays](https://developer.apple.com/documentation/uikit/windows_and_screens) |

## 11. Performance

| # | Item | Severity | Effort | Doc |
|---|---|---|---|---|
| 11.1 | Cold launch P95 ≤400ms (iPhone 15 Pro / iOS 17+) | 🔴 Critical | L | [Optimizing app launch](https://developer.apple.com/videos/play/wwdc2019/423/) |
| 11.2 | Trabalho pesado fora de `App.init` / scene root `body` | 🟠 High | M | WWDC: App launch |
| 11.3 | **MetricKit** integrado, dashboards de regressão | 🟠 High | M | [MetricKit](https://developer.apple.com/documentation/metrickit) |
| 11.4 | **Hang rate** <0.1% (Xcode Organizer) | 🟠 High | L | [Hangs](https://developer.apple.com/documentation/xcode/responding-to-hangs-in-your-app) |
| 11.5 | Frame hitch ratio <5 ms/s em UI principal | 🟠 High | M | [Animation hitches](https://developer.apple.com/documentation/xcode/diagnosing_performance_issues_early) |
| 11.6 | `LazyVStack`/`List` em vez de `VStack` para conteúdo grande | 🟠 High | M | [SwiftUI Lazy](https://developer.apple.com/documentation/swiftui/lazyvstack) |
| 11.7 | `.id` estável em `ForEach` (não índice de array mutável) | 🟠 High | S | [ForEach](https://developer.apple.com/documentation/swiftui/foreach) |
| 11.8 | Imagens: downsampling antes de carregar | 🟠 High | M | [Image and graphics best practices](https://developer.apple.com/videos/play/wwdc2018/219/) |
| 11.9 | `OSSignposter` em paths críticos para profiling em prod | 🟡 Medium | M | [Signposts](https://developer.apple.com/documentation/os/ossignposter) |
| 11.10 | Memory peak (foreground) ≤150MB em apps típicos | 🟠 High | M | [Memory diagnostics](https://developer.apple.com/documentation/xcode/gauging-your-app-s-memory-use) |
| 11.11 | Bundle size: App Thinning ativo, On-Demand Resources para conteúdo opcional | 🟡 Medium | M | [App Thinning](https://developer.apple.com/library/archive/documentation/IDEs/Conceptual/AppDistributionGuide/AppThinning/AppThinning.html) |
| 11.12 | Background tasks via `BGTaskScheduler` (não Notifications-based hack) | 🟠 High | M | [BGTaskScheduler](https://developer.apple.com/documentation/backgroundtasks) |
| 11.13 | `URLSession` background configuration para uploads/downloads grandes | 🟡 Medium | M | [Background URLSession](https://developer.apple.com/documentation/foundation/url_loading_system/downloading_files_in_the_background) |

## 12. Testing

| # | Item | Severity | Effort | Doc |
|---|---|---|---|---|
| 12.1 | **Swift Testing** (`@Test`, `#expect`) em código novo | 🟡 Medium | M | [Swift Testing](https://developer.apple.com/xcode/swift-testing/) |
| 12.2 | Unit tests cobrem lógica de domínio e ViewModels (`@Observable`) | 🟠 High | L | [Testing in Xcode](https://developer.apple.com/documentation/xcode/testing-your-apps-in-xcode) |
| 12.3 | UI tests com **XCUITest** para fluxos críticos | 🟠 High | L | [XCUITest](https://developer.apple.com/documentation/xctest/user_interface_tests) |
| 12.4 | Snapshot tests (light/dark/dynamic-type) | 🟡 Medium | M | [swift-snapshot-testing](https://github.com/pointfreeco/swift-snapshot-testing) |
| 12.5 | Performance tests (`measure { }`) em paths críticos | 🟡 Medium | M | [XCTest measure](https://developer.apple.com/documentation/xctest/xctest_measurement) |
| 12.6 | Coverage habilitada nos schemes; alvo ≥70% domínio | 🟢 Low | M | [Code coverage](https://developer.apple.com/documentation/xcode/configuring-code-coverage) |
| 12.7 | CI bloqueia PR com testes vermelhos | 🟠 High | S | — |

## 13. App Store Review compliance

| # | Item | Severity | Effort | Doc |
|---|---|---|---|---|
| 13.1 | App completo, sem placeholders/Lorem Ipsum (Guideline 2.1) | 🔴 Critical | — | [App Review 2.1](https://developer.apple.com/app-store/review/guidelines/#performance) |
| 13.2 | Demo account fornecido se há login (Guideline 2.1(b)) | 🔴 Critical | S | [Review notes](https://developer.apple.com/help/app-store-connect/manage-app-information/manage-app-store-information) |
| 13.3 | Metadata bate com app real (Guideline 2.3) | 🔴 Critical | S | App Review 2.3 |
| 13.4 | Screenshots reais (não promo art / splash) (Guideline 2.3.3) | 🔴 Critical | M | App Review 2.3 |
| 13.5 | Apenas APIs públicas (Guideline 2.5.1) | 🔴 Critical | M | App Review 2.5 |
| 13.6 | Conteúdo digital → **StoreKit/IAP** (Guideline 3.1.1) | 🔴 Critical | L | [App Review 3.1](https://developer.apple.com/app-store/review/guidelines/#business) |
| 13.7 | Subscriptions com valor contínuo, mín 7 dias (Guideline 3.1.2) | 🔴 Critical | M | App Review 3.1.2 |
| 13.8 | **Restore Purchases** disponível (Guideline 3.1.1) | 🔴 Critical | S | [Restoring purchased products](https://developer.apple.com/documentation/storekit/in-app_purchase/restoring_purchased_products) |
| 13.9 | Sign in with Apple oferecido se há third-party login (Guideline 4.8) | 🔴 Critical | M | [Sign in with Apple](https://developer.apple.com/sign-in-with-apple/) |
| 13.10 | **Account deletion** in-app (Guideline 5.1.1(v)) | 🔴 Critical | M | App Review 5.1 |
| 13.11 | UGC: filtering + reporting + block + contact (Guideline 1.2) | 🔴 Critical | L | App Review 1.2 |
| 13.12 | Privacy Policy URL válida em App Store Connect e in-app | 🔴 Critical | S | App Review 5.1 |
| 13.13 | Age rating preciso (Guideline 2.3.6) | 🟠 High | S | App Review 2.3 |
| 13.14 | Build assinado com certificado de distribuição correto | 🔴 Critical | S | [Code signing](https://developer.apple.com/support/code-signing/) |

## 14. Apple Intelligence & App Intents

| # | Item | Severity | Effort | Doc |
|---|---|---|---|---|
| 14.1 | **App Intents** expostas para capacidades core (search, open, action) | 🟠 High | L | [App Intents](https://developer.apple.com/documentation/appintents) |
| 14.2 | **AppEntity** definido para tipos de domínio (Product, Order, ...) | 🟠 High | M | [AppEntity](https://developer.apple.com/documentation/appintents/appentity) |
| 14.3 | **AssistantSchemas** / `AssistantIntent` para integração com Apple Intelligence | 🟡 Medium | L | [Assistant schemas](https://developer.apple.com/documentation/appintents/assistantschemas) |
| 14.4 | **OpenIntent** para deep linking semântico | 🟡 Medium | M | [OpenIntent](https://developer.apple.com/documentation/appintents/openintent) |
| 14.5 | Shortcuts donations (`IntentDonationManager` / `INRelevanceShortcut`) | 🟡 Medium | M | [Donations](https://developer.apple.com/documentation/appintents/donating-shortcuts) |
| 14.6 | **Foundation Models** on-device para sumarização/extração | 🟢 Low | M | [Foundation Models](https://developer.apple.com/documentation/foundationmodels) |
| 14.7 | Writing Tools suportadas (input fields padrão, ou opt-in custom) | 🟢 Low | S | [Writing Tools](https://developer.apple.com/documentation/uikit/writing_tools) |
| 14.8 | Action Button + Visual Intelligence considerados quando aplicável | 🟢 Low | M | HIG: Action Button |

## 15. Distribuição & lifecycle

| # | Item | Severity | Effort | Doc |
|---|---|---|---|---|
| 15.1 | TestFlight internal + external configurados | 🟠 High | S | [TestFlight](https://developer.apple.com/testflight/) |
| 15.2 | Phased Release ativado para production | 🟡 Medium | S | [Phased release](https://developer.apple.com/help/app-store-connect/update-your-app/release-a-version-update-in-phases) |
| 15.3 | Crash Organizer monitorado por release | 🟠 High | S | [Xcode Organizer](https://developer.apple.com/documentation/xcode/identifying-and-resolving-issues-in-your-app) |
| 15.4 | App Store Server Notifications V2 configurado para subs/IAP | 🟠 High | M | [Server Notifications V2](https://developer.apple.com/documentation/appstoreservernotifications) |
| 15.5 | App Store Server API integrado (validação, refunds, history) | 🟠 High | L | [App Store Server API](https://developer.apple.com/documentation/appstoreserverapi) |
| 15.6 | Universal Purchase configurado quando aplica iPhone+iPad+Mac+Vision | 🟢 Low | S | [Universal Purchase](https://developer.apple.com/support/universal-purchase/) |

## 16. Observabilidade & logging

| # | Item | Severity | Effort | Doc |
|---|---|---|---|---|
| 16.1 | `Logger` por subsystem/category (não `print`) | 🟠 High | S | [Logger](https://developer.apple.com/documentation/os/logger) |
| 16.2 | Crash reporting (Crashlytics, Sentry, Bugsnag) com symbolication | 🔴 Critical | S | [dSYMs](https://developer.apple.com/documentation/xcode/building-your-app-to-include-debugging-information) |
| 16.3 | MetricKit subscriber em `AppDelegate` reportando ao backend | 🟠 High | M | [MetricKit](https://developer.apple.com/documentation/metrickit) |
| 16.4 | Eventos de analytics tipados (não strings cruas) | 🟡 Medium | M | — |
| 16.5 | PII nunca em logs ou analytics | 🔴 Critical | M | LGPD/GDPR |
| 16.6 | Sampling de telemetria configurado (não 100% em todos eventos) | 🟡 Medium | S | — |

---

## Output esperado de uma audit

Ao final, o iOS Engineer entrega:

1. **Tabela única consolidada** com todos os itens checados, marcando ✅ / ❌ / ⚠️.
2. **Plano priorizado** em sprints:
   - **Sprint 1**: todos os 🔴 Critical (não pode submeter sem isso).
   - **Sprint 2-3**: 🟠 High de maior impacto.
   - **Backlog**: 🟡 Medium e 🟢 Low.
3. **Estimativa de esforço total** somando os Effort.
4. **Riscos para App Review** isolados e priorizados.
5. **Quick wins** (Critical+High de Effort=S/M) para o time atacar primeiro.
