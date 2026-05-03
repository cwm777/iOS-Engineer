# iOS Engineer

Agente Claude altamente especializado em **desenvolvimento Apple moderno**, atuando como **Principal Engineer**: iPhone, iPad, Apple Watch, Vision Pro, Apple TV e CarPlay.

Construído após análise profunda da documentação oficial em [`developer.apple.com`](https://developer.apple.com/) — Human Interface Guidelines, App Store Review Guidelines, Apple Platform Security Guide — e padrões adjacentes (Apple Pay, Wallet, StoreKit 2, App Intents, Foundation Models, App Attest, Universal Commerce Protocol, Agent Payments Protocol).

---

## O que este agente faz

| Capacidade | Como entrega |
|---|---|
| **Construir apps do zero** | Stack canônica Modern Apple (Swift 6 + SwiftUI + Observation + Swift Concurrency + SwiftData + SPM modular), Privacy Manifest desde o dia 1, CI com SwiftLint/swift-format/Swift Testing/MetricKit, observabilidade integrada (`Logger` + Crashlytics/Sentry). |
| **Auditar apps existentes** | Audit estruturada em 3 fases (Discovery → Compliance → Report) cruzada com checklist de **220+ itens** mapeados ao `developer.apple.com`, classificados por severity/effort, distinguindo blockers de App Review (Critical) de melhorias progressivas. |
| **Hardening de segurança** | Defesa em profundidade: Sign in with Apple + Passkeys, LocalAuthentication, Keychain + Secure Enclave (CryptoKit), App Attest + DeviceCheck, certificate pinning, Privacy Manifest auditado, Hardened Runtime, ASWebAuthenticationSession para OAuth. |
| **Otimização de performance** | Instruments + MetricKit + OSSignposter + Xcode Organizer, SwiftUI body cost tuning, launch profile, hang rate <0.1%, budgets explícitos por release (cold launch P95 ≤400ms). |
| **Agentic commerce** | App Intents + AssistantSchemas + Foundation Models on-device + Apple Pay + StoreKit 2 + Apple Wallet + Tap to Pay + AP2 mandates assinados em Secure Enclave + biometria. |
| **Form factors** | iPad (NavigationSplitView + multitasking + Stage Manager + Pencil), Apple Watch (WidgetKit complications + Workout API + Always-On), Vision Pro (ImmersiveSpace + RealityKit), CarPlay (templates aprovados), Apple TV. |

---

## Estrutura

```
.
├── agents/
│   └── ios-engineer.md                # O agente principal (Principal Engineer)
├── checklists/
│   └── ios-audit-checklist.md         # 16 áreas, 220+ itens auditáveis
├── playbooks/
│   ├── agentic-commerce-playbook.md   # App Intents + Apple Pay + StoreKit + AP2/UCP
│   ├── security-hardening-playbook.md # 6 níveis de hardening progressivo
│   └── performance-playbook.md        # Instruments + MetricKit + budgets
└── templates/
    ├── Package.swift                  # Multi-target SPM manifest production-ready
    └── module-structure.md            # Modularização feature-based
```

---

## Como instalar como agente do Claude Code

1. Copie `agents/ios-engineer.md` para o diretório de agentes do seu Claude Code:

   ```bash
   # Global (todas as conversas):
   cp agents/ios-engineer.md ~/.claude/agents/

   # Ou por projeto:
   mkdir -p .claude/agents
   cp agents/ios-engineer.md .claude/agents/
   ```

2. Em conversas, invoque o agente:

   > Atue como o **iOS Engineer**. Audite este projeto contra padrões Apple e produza checklist priorizado.

   > Atue como o **iOS Engineer**. Quero criar um app de delivery com checkout via agentic commerce (App Intents + Apple Pay + Foundation Models on-device) e suporte a Apple Watch para tracking. Projete a arquitetura.

   > Atue como o **iOS Engineer**. Diagnostique o cold launch P95 deste app e proponha plano de redução para <400ms no iPhone 15 Pro.

   > Atue como o **iOS Engineer**. Prepare este app para submissão à App Review — Privacy Manifest, demo account, screenshots, build config — dê-me a checklist final.

---

## Stack canônica enforcada

| Camada | Tecnologia | Bloqueia desvio |
|---|---|---|
| Linguagem | Swift 6 (strict concurrency complete) | Sim, exceto interop ObjC legado |
| UI | SwiftUI + Observation framework + Liquid Glass | Sim (UIKit só onde SwiftUI ainda não cobre) |
| Arquitetura | MV com `@Observable` (TCA/Clean apenas onde justificado) | Sim |
| Estado | `@Observable` + `@State` + `@Bindable` + `@Environment` | Nunca `ObservableObject`/`@StateObject` em código novo |
| Concorrência | Swift Concurrency (async/await + actors + Sendable) | Sim, GCD proibido em código novo |
| Persistência | SwiftData + CloudKit (Core Data só em legado) | Sim |
| Rede | URLSession + async/await + ATS strict + cert pinning | Sim |
| Build | Xcode 16+ + SPM (preferido sobre CocoaPods) | Sim |
| Quality | SwiftLint + swift-format + Periphery + warnings-as-errors release | Sim |
| Auth | Sign in with Apple + Passkeys + LocalAuthentication | Sim |
| Distribuição | TestFlight + App Store + Phased Release + Privacy Manifest auditado | Sim |

> **Princípio rector**: se `developer.apple.com`, HIG, App Store Review Guidelines ou Apple Platform Security Guide recomenda X, X é o default. Desvios exigem RFC com tradeoff explícito.

---

## Budgets de release não-negociáveis

| Métrica | Threshold |
|---|---|
| Cold launch P95 (iPhone 15 Pro) | ≤400ms |
| Warm launch P95 | ≤200ms |
| Frame hitch ratio | ≤5 ms/s |
| Hang rate (≥250ms) | ≤0.1% sessions |
| Crash-free sessions | ≥99.9% |
| Memory peak (foreground) | ≤150MB típico |
| Bundle size (universal) | ≤200MB |
| Bundle size (device-thinned) | ≤80MB |
| Privacy Manifest issues | 0 no Privacy Report |
| App Review pass rate | 100% na primeira submissão |

---

## Fontes consultadas

- [Apple Developer](https://developer.apple.com/)
- [iOS landing](https://developer.apple.com/ios/)
- [Documentation hub](https://developer.apple.com/documentation/)
- [Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines)
- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [App Intents framework](https://developer.apple.com/documentation/appintents)
- [Foundation Models](https://developer.apple.com/documentation/foundationmodels)
- [StoreKit 2](https://developer.apple.com/storekit/)
- [Apple Pay](https://developer.apple.com/apple-pay/)
- [Apple Wallet](https://developer.apple.com/wallet/)
- [Tap to Pay on iPhone](https://developer.apple.com/tap-to-pay-on-iphone/)
- [Apple Platform Security](https://developer.apple.com/security/)
- [Apple Platform Security Guide](https://support.apple.com/guide/security/welcome/web)
- [Privacy Manifest files](https://developer.apple.com/documentation/bundleresources/privacy_manifest_files)
- [Required SDK list](https://developer.apple.com/support/third-party-SDK-requirements/)
- [App Attest](https://developer.apple.com/documentation/devicecheck/establishing_your_app_s_integrity)
- [CryptoKit](https://developer.apple.com/documentation/cryptokit)
- [LocalAuthentication](https://developer.apple.com/documentation/localauthentication)
- [AuthenticationServices (Sign in with Apple, Passkeys)](https://developer.apple.com/documentation/authenticationservices)
- [MetricKit](https://developer.apple.com/documentation/metrickit)
- [Swift Testing](https://developer.apple.com/xcode/swift-testing/)
- [WWDC sessions](https://developer.apple.com/wwdc/)
- [Swift documentation](https://www.swift.org/documentation/)
- [Universal Commerce Protocol (UCP)](https://developers.google.com/merchant/ucp)
- [Agent Payments Protocol (AP2)](https://cloud.google.com/blog/products/ai-machine-learning/announcing-agents-to-payments-ap2-protocol)

---

## Repositório

Este repositório é **público para leitura, mas não aceita contribuições externas**. É a referência oficial do agente iOS Engineer mantida por [@cwm777](https://github.com/cwm777).

Para reportar imprecisão técnica vs. documentação Apple, abra uma issue.

---

## Licença

MIT — veja [LICENSE](LICENSE).
