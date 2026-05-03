# iOS Performance Playbook

Mensurar antes de otimizar. Apple entrega ferramentas de classe mundial — dominá-las é o diferencial entre achismo e ganho real.

Fontes canônicas:
- [Optimizing app launch — WWDC](https://developer.apple.com/videos/play/wwdc2019/423/)
- [Demystify SwiftUI performance — WWDC23](https://developer.apple.com/videos/play/wwdc2023/10160/)
- [Diagnose performance issues with Xcode Organizer](https://developer.apple.com/documentation/xcode/diagnosing_performance_issues_early)
- [MetricKit](https://developer.apple.com/documentation/metrickit)
- [Instruments](https://help.apple.com/instruments/mac/current/)

---

## 1. Mensuração — instrumentos canônicos

### 1.1 Xcode Organizer (Metrics)
Apple agrega telemetria de **devices reais** e expõe no Organizer:
- **Hangs** (≥250ms freezes).
- **Disk Writes** (energy).
- **Battery Usage**.
- **Launch Time**.
- **Scrolling**.
- **Crashes**.
- **Memory**.

> Esse é o seu primeiro stop. Dados reais, sem instrumentação.

### 1.2 Instruments
Templates obrigatórios no toolkit:
| Template | Quando usar |
|---|---|
| **Time Profiler** | CPU bound — descobrir hot functions |
| **Allocations** | Memory growth, transient allocations |
| **Leaks** | Retain cycles, vazamentos |
| **Hangs** | Identificar mainthread blocks ≥250ms |
| **Animation Hitches** | Janks de UI, paths que perdem frame |
| **App Launch** | Cold/warm launch, time-to-first-frame |
| **SwiftUI** | Body updates, view diffing custo |
| **Network** | Latência, throughput, retries |
| **Energy Log** | Drain de bateria por subsystem |
| **System Trace** | Threading + locks + scheduler |

> **Sempre** profile **Release config** em **device real** (não Simulator). Simulator usa CPU do Mac e mente.

### 1.3 MetricKit (telemetria de campo)
Subscriber em `AppDelegate`:
```swift
import MetricKit

@MainActor
final class MetricsObserver: NSObject, MXMetricManagerSubscriber {
    func didReceive(_ payloads: [MXMetricPayload]) {
        for payload in payloads {
            // CPU, memory, animation, app launch, hang, signpost intervals
            uploadToBackend(payload.dictionaryRepresentation())
        }
    }

    func didReceive(_ payloads: [MXDiagnosticPayload]) {
        for payload in payloads {
            // crashes, hangs, disk writes, CPU exceptions
            uploadDiagnostic(payload.jsonRepresentation())
        }
    }
}

// init
MXMetricManager.shared.add(observer)
```

Backend agrega → dashboards de regressão por release. Alarmes em P95/P99.

### 1.4 OSSignposter para paths críticos
```swift
import os.signpost

let signposter = OSSignposter(subsystem: "co.kovyo.app", category: "checkout")

let interval = signposter.beginInterval("checkout_flow", id: signposter.makeSignpostID())
defer { signposter.endInterval("checkout_flow", interval) }

// inner intervals
let fetchInterval = signposter.beginInterval("fetch_cart", id: interval.id)
let cart = try await fetchCart()
signposter.endInterval("fetch_cart", fetchInterval)
```
Visível em Instruments + visível em MetricKit (`MXSignpostMetric`).

### 1.5 Logger (`os.log`) com `.public`/`.private`
```swift
let logger = Logger(subsystem: "co.kovyo.app", category: "perf")
logger.info("Loaded \(items.count, privacy: .public) items in \(elapsed, privacy: .public)s")
```
Logs estruturados são filtráveis no Console.app + dispositivos remotos.

---

## 2. Launch performance

Cold launch é o **primeiro impressão**. Apple recomenda:
- **<400ms** time-to-first-frame em iPhone moderno.
- **<2s** time-to-interactive (Apple penaliza apps acima disso no Organizer).

### 2.1 Diferir o quanto possível
- `App.init` → **vazio**. Nada de DB warmup, network, analytics init.
- `Scene` `body` → renderiza placeholder/splash view, dispara work em `.task`.
- ViewModels carregam em `.task(id:)`, **não** em `init`.

```swift
@main
struct KovyoApp: App {
    var body: some Scene {
        WindowGroup {
            RootView()
                .task { await Bootstrap.shared.start() }
        }
    }
}

actor Bootstrap {
    static let shared = Bootstrap()
    private var started = false
    func start() async {
        guard !started else { return }
        started = true
        await analytics.setup()
        await crashReporter.flush()
        // ...
    }
}
```

### 2.2 Static initializers / `+load` / `+initialize`
- Em Swift, evite work em `static let` que dispara cedo demais.
- Em Objective-C legacy, **nunca** `+load`.

### 2.3 Frameworks dinâmicos vs estáticos
- Dynamic frameworks impactam launch (dyld load time). 
- Use **static linking** quando possível (SPM `staticLibrary`).
- Auditar com `Instruments → App Launch → dyld phase`.

### 2.4 App Launch Profile
Xcode 15+ gera *Launch Profile* automático. Inspeciona em Organizer e em Instruments → App Launch.

---

## 3. SwiftUI performance

### 3.1 `body` deve ser barato
- Sem fetch de DB no `body`.
- Sem computações `O(n)` sem memoization.
- Decompor em subviews (cada uma só re-renderiza quando seus inputs mudam).

```swift
// ❌ ruim: filtragem em body
var body: some View {
    List(items.filter { $0.isActive && $0.matches(query) }) { ... }
}

// ✅ bom: filtragem em ViewModel @Observable
@Observable final class ItemsModel {
    var items: [Item] = []
    var query = ""
    var visible: [Item] {
        items.filter { $0.isActive && $0.matches(query) }
    }
}
```

### 3.2 Identity estável em `ForEach`
```swift
ForEach(items) { item in   // requires Identifiable
    Row(item: item)
}
// ou explícito
ForEach(items, id: \.id) { item in ... }
```
**Nunca** `id: \.self` em models grandes — equality fica caro. **Nunca** `id: \.self` em índice mutável de array.

### 3.3 Equatable views para diffing barato
```swift
struct Row: View, Equatable {
    let item: Item
    var body: some View { ... }
    static func == (lhs: Row, rhs: Row) -> Bool {
        lhs.item.id == rhs.item.id && lhs.item.version == rhs.item.version
    }
}
```
SwiftUI usa `Equatable` para skip diffing.

### 3.4 `.lazy*` para listas grandes
- `LazyVStack`/`LazyHStack` em `ScrollView`.
- `List` é lazy nativamente.

### 3.5 `@Observable` granular
Com Observation framework (iOS 17+), apenas as views que **leem** propriedade que mudou re-renderizam. Aproveite — quebre models grandes em vários `@Observable` em vez de um monolítico.

### 3.6 Auditar com Instruments → SwiftUI
- **View Body**: tempo gasto em cada `body`.
- **View Properties**: chamadas de @State, @Observable.
- **Core Animation Commit**: renderização real.

---

## 4. Listas e scrolling

### 4.1 Item identity + equality
Cobertos acima.

### 4.2 Cell reuse implícita
SwiftUI `List`/`Lazy*Stack` reusam internamente. Não precisa `cellForRowAt`.

### 4.3 Fixed sizes quando possível
```swift
.frame(height: 80) // evita measure pass
```

### 4.4 Asynchronous content loading
```swift
AsyncImage(url: url) { phase in
    switch phase {
    case .empty: ProgressView()
    case .success(let image): image.resizable().scaledToFit()
    case .failure: Image(systemName: "photo")
    @unknown default: EmptyView()
    }
}
.frame(width: 80, height: 80) // crítico — sem isso, layout pula quando carrega
```

### 4.5 Imagens — downsampling
Carregar imagem 4000×3000 pra exibir em 80×80 é desastre. Use Nuke ou rolar próprio:
```swift
import ImageIO
import UniformTypeIdentifiers

func downsample(url: URL, to size: CGSize, scale: CGFloat) -> CGImage? {
    let opts = [kCGImageSourceShouldCache: false] as CFDictionary
    guard let src = CGImageSourceCreateWithURL(url as CFURL, opts) else { return nil }
    let maxDim = max(size.width, size.height) * scale
    let downsampleOpts = [
        kCGImageSourceCreateThumbnailFromImageAlways: true,
        kCGImageSourceShouldCacheImmediately: true,
        kCGImageSourceCreateThumbnailWithTransform: true,
        kCGImageSourceThumbnailMaxPixelSize: maxDim
    ] as CFDictionary
    return CGImageSourceCreateThumbnailAtIndex(src, 0, downsampleOpts)
}
```

---

## 5. Concorrência

### 5.1 Não trave o main
```swift
// ❌ ruim
DispatchQueue.main.sync { ... } // deadlock-prone

// ✅ bom
Task { @MainActor in
    let result = await heavyWork() // heavyWork é async em outro contexto
    self.state = .loaded(result)
}
```

### 5.2 `actor` para isolamento real
```swift
actor ImageCache {
    private var entries: [URL: UIImage] = [:]
    func image(for url: URL) async -> UIImage? { entries[url] }
    func set(_ image: UIImage, for url: URL) { entries[url] = image }
}
```
Não use `@MainActor` para tudo — isso linealiza no main e mata throughput.

### 5.3 Cancelamento honrado
```swift
.task(id: query) {
    do {
        try Task.checkCancellation()
        let results = try await search(query)
        self.results = results
    } catch is CancellationError {
        // ok, fluiu
    } catch {
        self.error = error
    }
}
```

### 5.4 `TaskGroup` para paralelismo controlado
```swift
let images = try await withThrowingTaskGroup(of: (URL, Data).self) { group in
    for url in urls {
        group.addTask { (url, try await fetch(url)) }
    }
    var collected: [URL: Data] = [:]
    for try await (url, data) in group {
        collected[url] = data
    }
    return collected
}
```

### 5.5 Sendable sem `@unchecked`
`@unchecked Sendable` é dívida técnica. Modele tipos como `struct`/`actor` ou faça lock manual e documente.

---

## 6. Memory

### 6.1 Allocations growth
- Profile com Allocations + Generation Markers.
- Mark generation no início de uma operação, executa, mark de novo. Se crescer e não voltar — leak.

### 6.2 Retain cycles
- `[weak self]` em closures que podem outlive o owner (Tasks, observers, NotificationCenter).
- LeakedAnalyzer no Xcode + Instruments → Leaks.

### 6.3 Image decoding
- Decode é caro. Downsample (acima).
- Para listas, use Nuke com pipeline configurada.

### 6.4 Memory peak
- Operações em batch (ex: importar 10k items) → batched fetch + flush periódico.
- Para SwiftData/Core Data: `try modelContext.save(); modelContext.reset()` ou usar `BatchSave`.

---

## 7. Background work

### 7.1 BGTaskScheduler
```swift
// Info.plist:
// BGTaskSchedulerPermittedIdentifiers: ["co.kovyo.app.refresh"]

// Register on launch:
BGTaskScheduler.shared.register(
    forTaskWithIdentifier: "co.kovyo.app.refresh",
    using: nil
) { task in
    handleRefresh(task: task as! BGAppRefreshTask)
}

// Schedule:
let request = BGAppRefreshTaskRequest(identifier: "co.kovyo.app.refresh")
request.earliestBeginDate = Date(timeIntervalSinceNow: 15 * 60)
try? BGTaskScheduler.shared.submit(request)
```

### 7.2 URLSession background
Para uploads/downloads que continuam após app ir pra background:
```swift
let config = URLSessionConfiguration.background(withIdentifier: "co.kovyo.upload")
config.isDiscretionary = false
config.sessionSendsLaunchEvents = true
let session = URLSession(configuration: config, delegate: self, delegateQueue: nil)
let task = session.uploadTask(with: req, fromFile: localURL)
task.resume()
```

---

## 8. Bundle size

### 8.1 App Thinning
Apple gera variant por device automaticamente quando você sobe para App Store Connect. Auditar tamanho final na *App Store Connect → Analytics → App Sizes*.

### 8.2 On-Demand Resources
Recursos opcionais (level packs em jogos, idiomas pesados) etiquetados com tags:
```swift
let request = NSBundleResourceRequest(tags: ["spanish_assets"])
request.beginAccessingResources { error in
    // assets disponíveis no bundle
}
```

### 8.3 Asset Catalog optimization
- SF Symbols quando possível (vetor + variantes).
- Imagens como vector PDFs com "Preserve Vector Data" OFF se vai exportar como PNG.
- App Icon → catalog only (não solto).

### 8.4 Dependências
- Audit `Package.resolved` regularmente.
- Substituir libs grandes por implementação direta quando faz sentido.
- Static linking para libs pequenas.

---

## 9. Networking performance

### 9.1 HTTP/2 + HTTP/3 (QUIC)
`URLSession` automaticamente negocia. Garantir que server suporta.

### 9.2 Reuso de session
**Uma** `URLSession` por config. Não criar `URLSession.shared` por request.

### 9.3 Cache control
- `URLCache.shared` por default OK.
- Custom cache para clientes pesados:
```swift
let config = URLSessionConfiguration.default
config.urlCache = URLCache(memoryCapacity: 20_000_000, diskCapacity: 100_000_000)
config.requestCachePolicy = .useProtocolCachePolicy
```

### 9.4 Compression
- `Accept-Encoding: gzip` automático com `URLSession`.
- Brotli (`br`) requer custom decoder no client.

### 9.5 Coalescing requests
- Para listas (ex: avatares em feed), batchear via endpoint que aceita múltiplos IDs.
- Evita storm de requests + reduce latência total.

---

## 10. Budgets de release (não-negociáveis)

| Métrica | Threshold | Como medir |
|---|---|---|
| Cold launch P95 | ≤400ms | Xcode Organizer / MetricKit `MXAppLaunchMetric` |
| Warm launch P95 | ≤200ms | Xcode Organizer / MetricKit |
| Frame hitch ratio | ≤5 ms/s | MetricKit `MXAnimationMetric.scrollHitchTimeRatio` |
| Hang rate | ≤0.1% sessions com hang ≥250ms | Xcode Organizer / `MXHangDiagnostic` |
| Crash-free sessions | ≥99.9% | Crashlytics/Sentry |
| Memory peak (foreground) | ≤150MB típico | Instruments Allocations |
| Bundle size (universal) | ≤200MB | App Store Connect |
| Bundle size (device-thinned) | ≤80MB | App Store Connect |
| Energy impact | "Low" no Energy Log | Instruments Energy Log |

**Bloqueia release** se regredir vs baseline anterior. Toda PR que toca path crítico precisa anexar `xctrace` baseline.

---

## 11. Anti-patterns (rejeitar em PR)

❌ `DispatchQueue.main.async { ... }` em código novo (use `Task { @MainActor in }` ou `await MainActor.run`).
❌ `body` com fetch / computação `O(n)` sem cache.
❌ `id: \.self` em arrays grandes ou tipos complexos.
❌ `AsyncImage` sem `.frame()` fixo (causa layout jumps).
❌ Forçar tudo em `@MainActor` sem necessidade.
❌ Singleton com `init()` pesado disparado no launch.
❌ `print()` em hot path (degrada perf além de poluir log).
❌ Criar `URLSession` por request.
❌ Decode de imagem sem downsample.
❌ Force-evaluate `@Query`/SwiftData sem `predicate`/`sortBy`.

---

## 12. Workflow de profiling

1. **Reproduzir** — script de cenário (XCUITest ou manual com signposts).
2. **Capturar** — Instruments com Release build no device.
3. **Analisar** — Time Profiler (CPU), Allocations (memory), SwiftUI (rendering), Animation Hitches (UX).
4. **Hipotetizar** — uma mudança por vez.
5. **Aplicar** — PR pequena.
6. **Re-medir** — mesmas condições.
7. **Documentar** — anexar antes/depois (screenshots de Instruments traces) ao PR.
8. **Monitorar pós-release** — MetricKit dashboard 7 dias.

> Nunca otimize sem medir. Nunca declare vitória sem re-medir em condições idênticas.
