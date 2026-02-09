import Foundation
import LocalAuthentication
import Capacitor

@objc(BiometricPlugin)
public class BiometricPlugin: CAPPlugin, CAPBridgedPlugin {

    public let identifier = "BiometricPlugin"
    public let jsName = "BiometricAuth"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "isAvailable", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "authenticate", returnType: CAPPluginReturnPromise)
    ]

    /// Check if biometric authentication is available on this device
    @objc func isAvailable(_ call: CAPPluginCall) {
        let context = LAContext()
        var error: NSError?

        let canEvaluate = context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error)

        var biometryType = "none"
        if canEvaluate {
            switch context.biometryType {
            case .faceID:
                biometryType = "faceId"
            case .touchID:
                biometryType = "touchId"
            case .opticID:
                biometryType = "opticId"
            @unknown default:
                biometryType = "unknown"
            }
        }

        call.resolve([
            "available": canEvaluate,
            "biometryType": biometryType,
            "errorCode": error?.code ?? 0,
            "errorMessage": error?.localizedDescription ?? ""
        ])
    }

    /// Prompt the user for biometric authentication
    @objc func authenticate(_ call: CAPPluginCall) {
        let reason = call.getString("reason") ?? "Autentique-se para continuar"

        let context = LAContext()
        // Don't allow device passcode as fallback - we handle PIN in JS
        context.localizedFallbackTitle = ""

        var error: NSError?
        guard context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error) else {
            call.resolve([
                "success": false,
                "errorCode": error?.code ?? -1,
                "errorMessage": error?.localizedDescription ?? "Biometria não disponível"
            ])
            return
        }

        context.evaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, localizedReason: reason) { success, authError in
            DispatchQueue.main.async {
                if success {
                    call.resolve([
                        "success": true,
                        "errorCode": 0,
                        "errorMessage": ""
                    ])
                } else {
                    let nsError = authError as NSError?
                    call.resolve([
                        "success": false,
                        "errorCode": nsError?.code ?? -1,
                        "errorMessage": nsError?.localizedDescription ?? "Autenticação falhou"
                    ])
                }
            }
        }
    }
}
