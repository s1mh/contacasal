import Foundation
import UIKit
import Capacitor

@objc(SharePlugin)
public class SharePlugin: CAPPlugin, CAPBridgedPlugin {

    public let identifier = "SharePlugin"
    public let jsName = "NativeShare"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "share", returnType: CAPPluginReturnPromise)
    ]

    /// Show native iOS share sheet (UIActivityViewController)
    @objc func share(_ call: CAPPluginCall) {
        let title = call.getString("title") ?? ""
        let text = call.getString("text") ?? ""
        let url = call.getString("url") ?? ""

        var items: [Any] = []

        // Add text (message) as a single string
        if !text.isEmpty {
            items.append(text)
        }

        // Add URL as a proper URL object (separate from text to avoid duplication)
        if !url.isEmpty, let shareUrl = URL(string: url) {
            items.append(shareUrl)
        }

        if items.isEmpty {
            call.reject("Nothing to share")
            return
        }

        DispatchQueue.main.async {
            let activityVC = UIActivityViewController(
                activityItems: items,
                applicationActivities: nil
            )

            // Set subject for email sharing
            if !title.isEmpty {
                activityVC.setValue(title, forKey: "subject")
            }

            // iPad support (required)
            if let popover = activityVC.popoverPresentationController {
                popover.sourceView = self.bridge?.viewController?.view
                popover.sourceRect = CGRect(
                    x: UIScreen.main.bounds.midX,
                    y: UIScreen.main.bounds.midY,
                    width: 0,
                    height: 0
                )
                popover.permittedArrowDirections = []
            }

            activityVC.completionWithItemsHandler = { activityType, completed, _, error in
                if let error = error {
                    call.resolve(["completed": false, "error": error.localizedDescription])
                } else {
                    call.resolve([
                        "completed": completed,
                        "activityType": activityType?.rawValue ?? ""
                    ])
                }
            }

            self.bridge?.viewController?.present(activityVC, animated: true)
        }
    }
}
