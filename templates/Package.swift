// swift-tools-version: 6.0
// Production-ready Swift Package manifest para um app iOS modular.
// Use como referência inicial; ajuste targets conforme o domínio.

import PackageDescription

let package = Package(
    name: "KovyoApp",
    defaultLocalization: "pt-BR",
    platforms: [
        .iOS(.v17),
        .watchOS(.v10),
        .visionOS(.v1),
        .macOS(.v14)
    ],
    products: [
        // Composição final, importada pelo target App do Xcode project.
        .library(name: "AppFeature", targets: ["AppFeature"]),

        // Features (uma library por feature/subdomain).
        .library(name: "FeatureCatalog", targets: ["FeatureCatalog"]),
        .library(name: "FeatureCart", targets: ["FeatureCart"]),
        .library(name: "FeatureCheckout", targets: ["FeatureCheckout"]),
        .library(name: "FeatureOrders", targets: ["FeatureOrders"]),
        .library(name: "FeatureProfile", targets: ["FeatureProfile"]),

        // Camadas transversais.
        .library(name: "AppCore", targets: ["AppCore"]),                // domain models, use cases puros
        .library(name: "AppNetworking", targets: ["AppNetworking"]),    // URLSession + Codable + ATS pinning
        .library(name: "AppPersistence", targets: ["AppPersistence"]),  // SwiftData / CloudKit
        .library(name: "AppDesignSystem", targets: ["AppDesignSystem"]),// tokens, components, Liquid Glass
        .library(name: "AppIntents_", targets: ["AppIntents_"]),        // App Intents para agentic
        .library(name: "AppSecurity", targets: ["AppSecurity"]),        // Keychain, App Attest, biometrics
        .library(name: "AppAnalytics", targets: ["AppAnalytics"])       // Logger + MetricKit + crash
    ],
    dependencies: [
        // Mantenha o set de deps mínimo. Cada uma tem custo: build time, segurança, atualização.
        .package(url: "https://github.com/pointfreeco/swift-snapshot-testing", from: "1.17.0"),
        .package(url: "https://github.com/realm/SwiftLint", from: "0.55.0"),
        .package(url: "https://github.com/apple/swift-format", from: "510.0.0"),
    ],
    targets: [
        // App composition root
        .target(
            name: "AppFeature",
            dependencies: [
                "FeatureCatalog", "FeatureCart", "FeatureCheckout",
                "FeatureOrders", "FeatureProfile",
                "AppDesignSystem", "AppIntents_", "AppAnalytics", "AppSecurity"
            ],
            swiftSettings: strict
        ),

        // Features
        .target(name: "FeatureCatalog",
                dependencies: ["AppCore", "AppNetworking", "AppDesignSystem"],
                swiftSettings: strict),
        .target(name: "FeatureCart",
                dependencies: ["AppCore", "AppPersistence", "AppDesignSystem"],
                swiftSettings: strict),
        .target(name: "FeatureCheckout",
                dependencies: ["AppCore", "AppNetworking", "AppSecurity", "AppDesignSystem"],
                swiftSettings: strict),
        .target(name: "FeatureOrders",
                dependencies: ["AppCore", "AppNetworking", "AppPersistence", "AppDesignSystem"],
                swiftSettings: strict),
        .target(name: "FeatureProfile",
                dependencies: ["AppCore", "AppSecurity", "AppDesignSystem"],
                swiftSettings: strict),

        // Layers
        .target(name: "AppCore", dependencies: [], swiftSettings: strict),
        .target(name: "AppNetworking", dependencies: ["AppSecurity"], swiftSettings: strict),
        .target(name: "AppPersistence", dependencies: ["AppCore"], swiftSettings: strict),
        .target(name: "AppDesignSystem", dependencies: [], resources: [.process("Resources")], swiftSettings: strict),
        .target(name: "AppIntents_",
                dependencies: ["AppCore", "FeatureCatalog", "FeatureCart", "FeatureCheckout", "FeatureOrders"],
                swiftSettings: strict),
        .target(name: "AppSecurity", dependencies: [], swiftSettings: strict),
        .target(name: "AppAnalytics", dependencies: [], swiftSettings: strict),

        // Tests
        .testTarget(name: "AppCoreTests",
                    dependencies: ["AppCore"],
                    swiftSettings: strict),
        .testTarget(name: "AppNetworkingTests",
                    dependencies: ["AppNetworking", .product(name: "SnapshotTesting", package: "swift-snapshot-testing")],
                    swiftSettings: strict),
        .testTarget(name: "FeatureCheckoutTests",
                    dependencies: ["FeatureCheckout"],
                    swiftSettings: strict),
    ]
)

// Strict concurrency + warnings as errors em release.
let strict: [SwiftSetting] = [
    .enableExperimentalFeature("StrictConcurrency=complete"),
    .enableUpcomingFeature("ExistentialAny"),
    .enableUpcomingFeature("BareSlashRegexLiterals"),
    .enableUpcomingFeature("DisableOutwardActorInference"),
    .unsafeFlags(["-warnings-as-errors"], .when(configuration: .release))
]
