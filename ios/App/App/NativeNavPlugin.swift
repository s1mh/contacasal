import Foundation
import Capacitor

@objc(NativeNavPlugin)
public class NativeNavPlugin: CAPPlugin, CAPBridgedPlugin {

    public let identifier = "NativeNavPlugin"
    public let jsName = "NativeNav"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "updateActiveTab", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setVisible", returnType: CAPPluginReturnPromise)
    ]

    // Route-to-tab-index mapping
    private let routeToIndex: [String: Int] = [
        "summary": 0,
        "historico": 1,
        "estatisticas": 3,
        "ajustes": 4
    ]

    /// Called from JavaScript to update the native tab bar selection
    @objc func updateActiveTab(_ call: CAPPluginCall) {
        guard let route = call.getString("route") else {
            call.reject("Missing 'route' parameter")
            return
        }

        let index = routeToIndex[route] ?? 0

        DispatchQueue.main.async {
            if let myVC = self.bridge?.viewController as? MyViewController {
                myVC.updateSelectedTab(index: index)
            }
        }

        call.resolve(["success": true])
    }

    /// Called from JavaScript to show/hide the native tab bar
    @objc func setVisible(_ call: CAPPluginCall) {
        let visible = call.getBool("visible") ?? false

        DispatchQueue.main.async {
            if let myVC = self.bridge?.viewController as? MyViewController {
                myVC.setTabBarVisible(visible)
            }
        }

        call.resolve(["success": true])
    }
}
