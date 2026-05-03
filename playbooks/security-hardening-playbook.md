# iOS Security Hardening Playbook

Defesa em profundidade para apps iOS, em **6 níveis progressivos**. Cada nível é cumulativo: o nível 6 é o que apps de pagamento, banking, healthcare e enterprise devem alcançar.

Fontes canônicas:
- [Apple Platform Security Guide](https://support.apple.com/guide/security/welcome/web)
- [Apple Developer — Security](https://developer.apple.com/security/)
- [Privacy Manifest files](https://developer.apple.com/documentation/bundleresources/privacy_manifest_files)
- [App Attest](https://developer.apple.com/documentation/devicecheck/establishing_your_app_s_integrity)
- OWASP MASVS / MASTG

---

## Nível 1 — Foundations (todo app deve ter)

### 1.1 ATS strict
```xml
<!-- Info.plist -->
<key>NSAppTransportSecurity</key>
<dict>
    <key>NSAllowsArbitraryLoads</key>
    <false/>
</dict>
```
Sem exceções globais. Se houver host legado HTTP, exception única + plano de migração datado.

### 1.2 Privacy purpose strings
Cada permissão sensível com `NS*UsageDescription` claro, contextual, em todas as línguas:
- `NSCameraUsageDescription`
- `NSMicrophoneUsageDescription`
- `NSPhotoLibraryUsageDescription` / `NSPhotoLibraryAddUsageDescription`
- `NSLocationWhenInUseUsageDescription` / `NSLocationAlwaysAndWhenInUseUsageDescription`
- `NSContactsUsageDescription`
- `NSCalendarsUsageDescription` / `NSRemindersUsageDescription`
- `NSFaceIDUsageDescription`
- `NSBluetoothAlwaysUsageDescription`
- `NSHealthShareUsageDescription` / `NSHealthUpdateUsageDescription`
- `NSUserTrackingUsageDescription` (ATT)

> **Regra**: o texto deve dizer **por que** o app precisa, não **o quê**.

### 1.3 Privacy Manifest
`PrivacyInfo.xcprivacy` no bundle principal:
```xml
<dict>
    <key>NSPrivacyTracking</key>
    <false/>
    <key>NSPrivacyTrackingDomains</key>
    <array/>
    <key>NSPrivacyCollectedDataTypes</key>
    <array>
        <dict>
            <key>NSPrivacyCollectedDataType</key>
            <string>NSPrivacyCollectedDataTypeEmailAddress</string>
            <key>NSPrivacyCollectedDataTypeLinked</key>
            <true/>
            <key>NSPrivacyCollectedDataTypeTracking</key>
            <false/>
            <key>NSPrivacyCollectedDataTypePurposes</key>
            <array>
                <string>NSPrivacyCollectedDataTypePurposeAppFunctionality</string>
            </array>
        </dict>
    </array>
    <key>NSPrivacyAccessedAPITypes</key>
    <array>
        <dict>
            <key>NSPrivacyAccessedAPIType</key>
            <string>NSPrivacyAccessedAPICategoryUserDefaults</string>
            <key>NSPrivacyAccessedAPITypeReasons</key>
            <array>
                <string>CA92.1</string>
            </array>
        </dict>
    </array>
</dict>
```

Auditar **third-party SDKs** contra a [lista oficial](https://developer.apple.com/support/third-party-SDK-requirements/) — cada SDK da lista deve ter próprio `PrivacyInfo.xcprivacy` + assinatura de código.

### 1.4 Hardened Runtime + entitlements mínimos
- Hardened Runtime ativo (Mac Catalyst e Mac).
- Entitlements declarados explicitamente; sem `com.apple.developer.kernel.increased-memory-limit` sem necessidade real.
- App Sandbox (Mac/Mac Catalyst) sempre habilitado.

### 1.5 Sem PII em logs
- `Logger` por subsystem/category com **privacy specifiers**:
  ```swift
  let logger = Logger(subsystem: "co.kovyo.app", category: "auth")
  logger.info("User logged in: \(userID, privacy: .private)")
  logger.error("HTTP \(status, privacy: .public): \(error.localizedDescription, privacy: .private)")
  ```
- Crashlytics/Sentry com PII scrubbing ativo.

---

## Nível 2 — Storage seguro

### 2.1 Keychain como única origem de segredos
Tokens, refresh tokens, chaves de API, biometric-bound secrets — todos em Keychain.

```swift
import Security

func storeToken(_ token: String, account: String) throws {
    let data = Data(token.utf8)
    let query: [String: Any] = [
        kSecClass as String: kSecClassGenericPassword,
        kSecAttrAccount as String: account,
        kSecAttrService as String: "co.kovyo.app.auth",
        kSecAttrAccessible as String: kSecAttrAccessibleWhenUnlockedThisDeviceOnly,
        kSecValueData as String: data,
    ]
    SecItemDelete(query as CFDictionary) // overwrite
    let status = SecItemAdd(query as CFDictionary, nil)
    guard status == errSecSuccess else { throw KeychainError.unhandled(status: status) }
}
```

`kSecAttrAccessible` apropriado:
| Constant | Quando usar |
|---|---|
| `kSecAttrAccessibleWhenUnlockedThisDeviceOnly` | **Default sensato** — não vai para backup, requer unlock |
| `kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly` | Para tokens lidos por background tasks |
| `kSecAttrAccessibleWhenUnlocked` | Vai para iCloud Keychain — só para itens compartilháveis intencionalmente |

**Nunca**:
- `kSecAttrAccessibleAlways` (depreciado, inseguro).
- Salvar tokens em `UserDefaults` / `@AppStorage` / arquivos sem proteção.

### 2.2 Data Protection em arquivos
```swift
let url = ... // arquivo sensível
try data.write(to: url, options: [.completeFileProtection])
// ou via FileManager:
try FileManager.default.setAttributes(
    [.protectionKey: FileProtectionType.complete],
    ofItemAtPath: url.path
)
```

Classes:
- `.complete` — default sensato (criptografada quando device locked).
- `.completeUntilFirstUserAuthentication` — para arquivos lidos por background tasks após boot.
- `.completeUnlessOpen` — exceto se arquivo já está aberto.
- `.none` — não encriptado (evitar).

### 2.3 Secure Enclave para chaves críticas
```swift
import CryptoKit

let key = try SecureEnclave.P256.Signing.PrivateKey(
    accessControl: SecAccessControlCreateWithFlags(
        nil,
        kSecAttrAccessibleWhenUnlockedThisDeviceOnly,
        [.privateKeyUsage, .userPresence],
        nil
    )!
)
let signature = try key.signature(for: payload)
```

Use Secure Enclave para:
- Assinatura de mandates AP2.
- Chaves de pinning rotacionáveis.
- Chaves de E2E encryption.
- App Attest keys.

---

## Nível 3 — Autenticação moderna

### 3.1 Sign in with Apple (obrigatório se third-party login)
```swift
import AuthenticationServices

let request = ASAuthorizationAppleIDProvider().createRequest()
request.requestedScopes = [.fullName, .email]
let controller = ASAuthorizationController(authorizationRequests: [request])
controller.delegate = self
controller.performRequests()
```
Server-side: validar `identityToken` (JWT) contra Apple public keys.

### 3.2 Passkeys (FIDO2/WebAuthn)
Associated Domains entitlement (`webcredentials:auth.kovyo.co`) + RP no backend.
```swift
import AuthenticationServices

let challenge = await fetchChallengeFromBackend()
let provider = ASAuthorizationPlatformPublicKeyCredentialProvider(relyingPartyIdentifier: "auth.kovyo.co")
let request = provider.createCredentialAssertionRequest(challenge: challenge)
let controller = ASAuthorizationController(authorizationRequests: [request])
controller.performRequests()
```

### 3.3 OAuth via ASWebAuthenticationSession
**Nunca** `WKWebView` cru para OAuth — vaza cookies, não permite Sign in with Apple.
```swift
let session = ASWebAuthenticationSession(
    url: oauthURL,
    callbackURLScheme: "co.kovyo.oauth"
) { callbackURL, error in
    // ...
}
session.presentationContextProvider = self
session.prefersEphemeralWebBrowserSession = true // não persiste cookies
session.start()
```

### 3.4 LocalAuthentication para reauth/step-up
```swift
import LocalAuthentication

let context = LAContext()
context.localizedReason = "Confirme com Face ID para autorizar a transferência"

let canEvaluate = context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: nil)
guard canEvaluate else { /* fallback ou bloquear */ return }

let success = try await context.evaluatePolicy(
    .deviceOwnerAuthenticationWithBiometrics,
    localizedReason: "Confirme com Face ID para autorizar a transferência"
)
```

Combine com chaves Keychain `kSecAttrAccessControl` + `userPresence` ou `biometryCurrentSet` para itens biometric-bound.

---

## Nível 4 — Network hardening

### 4.1 Certificate pinning
```swift
final class PinnedSessionDelegate: NSObject, URLSessionDelegate {
    let pinnedHashes: Set<String> // SHA-256 dos SubjectPublicKeyInfo

    func urlSession(_ session: URLSession,
                    didReceive challenge: URLAuthenticationChallenge,
                    completionHandler: @escaping (URLSession.AuthChallengeDisposition, URLCredential?) -> Void) {
        guard challenge.protectionSpace.authenticationMethod == NSURLAuthenticationMethodServerTrust,
              let trust = challenge.protectionSpace.serverTrust,
              SecTrustEvaluateWithError(trust, nil),
              let chain = SecTrustCopyCertificateChain(trust) as? [SecCertificate] else {
            completionHandler(.cancelAuthenticationChallenge, nil)
            return
        }
        let leafKey = SecCertificateCopyKey(chain[0])
        let keyData = SecKeyCopyExternalRepresentation(leafKey!, nil)! as Data
        let hash = SHA256.hash(data: keyData).map { String(format: "%02x", $0) }.joined()
        if pinnedHashes.contains(hash) {
            completionHandler(.useCredential, URLCredential(trust: trust))
        } else {
            completionHandler(.cancelAuthenticationChallenge, nil)
        }
    }
}
```

**Sempre** múltiplos pins simultâneos para rotation graciosa. Documentar processo de rotação.

### 4.2 Tokens em headers, nunca em URL
```swift
var req = URLRequest(url: url)
req.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
```

### 4.3 Refresh token rotation
- Access tokens curtos (≤15 min).
- Refresh tokens em Keychain com `kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly`.
- Server-side refresh token rotation (one-time-use).

---

## Nível 5 — App integrity (App Attest, DeviceCheck)

### 5.1 App Attest
```swift
import DeviceCheck

let service = DCAppAttestService.shared
guard service.isSupported else { /* handle */ return }

// 1. Generate key
let keyId = try await service.generateKey()
// store keyId in Keychain (não na nuvem)

// 2. Attest the key (one-time)
let challenge = try await fetchChallengeFromServer()
let attestationData = try await service.attestKey(keyId, clientDataHash: SHA256.hash(data: challenge).withUnsafeBytes { Data($0) })
try await sendAttestationToServer(keyId: keyId, attestation: attestationData)

// 3. Assert subsequent requests
let bodyHash = SHA256.hash(data: requestBody).withUnsafeBytes { Data($0) }
let assertion = try await service.generateAssertion(keyId, clientDataHash: bodyHash)
// envia assertion + bodyHash + nonce server-side
```

**Server-side obrigatório**:
- Validar attestation chain contra Apple Root CA.
- Anti-replay: nonce + timestamp + challenge único por request.
- Bloquear apps que falharem repetidamente (jailbreak / tampering signal).

### 5.2 DeviceCheck (bit flags)
```swift
let device = DCDevice.current
guard device.isSupported else { return }
let token = try await device.generateToken()
// envia ao server, server consulta API DeviceCheck para set/get bits
```

Use bits para:
- Free trial abuse.
- Throttle/blacklist devices flagrados.
- Sinalização de risco em pagamentos.

---

## Nível 6 — Apps de alto valor (banking, payments, health, enterprise)

### 6.1 Jailbreak / tampering detection (light)
**Princípio**: detecção é dissuasão, não barreira. Não vaze sinal ao usuário malicioso.

Sinais (todos com falsos-positivos):
- `isBeingDebugged()` (anti-debug).
- Verificar bundle integrity (resource hashes).
- Verificar entitlements esperados.
- Conferir paths suspeitos (`/Applications/Cydia.app`, `/private/var/lib/apt`) — mas não dependa só disso.

Reportar sinal **server-side** + decisão server-side (degradação graciosa, step-up auth, deny).

### 6.2 End-to-end encryption (E2EE) com CryptoKit
```swift
import CryptoKit

// Key agreement (Curve25519)
let alicePrivate = Curve25519.KeyAgreement.PrivateKey()
let alicePublic = alicePrivate.publicKey
// trocar publicKeys
let sharedSecret = try alicePrivate.sharedSecretFromKeyAgreement(with: bobPublic)
let key = sharedSecret.hkdfDerivedSymmetricKey(
    using: SHA256.self,
    salt: salt,
    sharedInfo: "co.kovyo.e2e".data(using: .utf8)!,
    outputByteCount: 32
)

// AEAD (ChaChaPoly)
let sealed = try ChaChaPoly.seal(plaintext, using: key, nonce: ChaChaPoly.Nonce())
let opened = try ChaChaPoly.open(sealed, using: key)
```

### 6.3 Anti-screenshot / anti-screenrecording (sensitive views)
```swift
struct SensitiveContentView: View {
    @State private var isCaptured = false
    var body: some View {
        Group {
            if isCaptured {
                Text("Conteúdo oculto durante captura").redacted(reason: .privacy)
            } else {
                ActualSensitiveContent()
            }
        }
        .onReceive(UIScreen.main.publisher(for: \.isCaptured).receive(on: DispatchQueue.main)) {
            isCaptured = $0
        }
    }
}
```
- `UIScreen.main.isCaptured` indica screen recording.
- Aplicar `redacted(reason: .privacy)` ou substituir conteúdo.

### 6.4 Audit log
- Cada operação sensível (login, payment, password change, account deletion request, mandate sign) loga: timestamp, user ID hash, ip (no server), device ID (`DCDevice` token), result.
- Persiste server-side, retenção definida pelo legal.

### 6.5 Threat modeling continuo
- STRIDE em cada feature nova com PII ou pagamento.
- Pen test anual (interno + externo).
- Bug bounty para apps de pagamento.

---

## Anti-patterns (rejeitar em PR review)

❌ Tokens em `UserDefaults`/`@AppStorage`.
❌ `NSAllowsArbitraryLoads = true` em release.
❌ `kSecAttrAccessibleAlways`.
❌ AES-CBC sem MAC; MD5/SHA-1 para integridade.
❌ `WKWebView` para OAuth (Sign in with Apple não funciona).
❌ Privacy Manifest faltando ou desatualizado.
❌ SDKs de terceiros sem Privacy Manifest na release build.
❌ `print()` de PII em qualquer ambiente.
❌ Skipping de App Attest em pagamentos.
❌ Force-unwrap em paths de auth/payment.
❌ Hard-coded API keys (mesmo que ofuscadas — extraíveis em runtime).

---

## Checklist de release (security gate)

```
[ ] Privacy Manifest auditado vs build atual
[ ] Privacy Nutrition Label batido com Privacy Manifest
[ ] Third-party SDKs com Privacy Manifest + assinatura
[ ] ATS sem exceções injustificadas
[ ] Cert pinning ativo + plano de rotação documentado
[ ] App Attest validado server-side em flows críticos
[ ] Tokens com TTL apropriado + refresh rotation
[ ] LocalAuthentication step-up em ações sensíveis
[ ] Logs sem PII (privacy specifiers `.private`)
[ ] Crash reporter sem PII
[ ] Build de Release config (não Debug)
[ ] Hardened Runtime ativo
[ ] Entitlements mínimos
```
