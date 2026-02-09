import UIKit
import Capacitor

class MyViewController: CAPBridgeViewController {

    // MARK: - UI Elements

    /// Native UITabBar with automatic Liquid Glass on iOS 26+
    private let nativeTabBar = UITabBar()
    private let fabButton = UIButton(type: .custom)
    private var tabBarVisible: Bool = false

    // Tab config: route, icon, selectedIcon, title
    private let tabs: [(route: String, icon: String, selectedIcon: String, title: String)] = [
        ("summary",      "house",                        "house.fill",                       "Resumo"),
        ("historico",     "clock",                        "clock.fill",                       "Histórico"),
        ("estatisticas",  "chart.line.uptrend.xyaxis",    "chart.line.uptrend.xyaxis",        "Estatísticas"),
        ("ajustes",       "gearshape",                    "gearshape.fill",                   "Ajustes"),
    ]

    private let fabSize: CGFloat = 48
    private let primaryColor = UIColor(red: 232/255, green: 130/255, blue: 92/255, alpha: 1.0)

    // MARK: - Lifecycle

    override func capacitorDidLoad() {
        super.capacitorDidLoad()
        bridge?.registerPluginInstance(NativeNavPlugin())
        bridge?.registerPluginInstance(BiometricPlugin())
        bridge?.registerPluginInstance(SharePlugin())
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        setupNativeTabBar()
        setupFABButton()
        nativeTabBar.isHidden = true
        fabButton.isHidden = true
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        layoutNativeTabBar()
        layoutFAB()
        adjustWebViewForTabBar()
    }

    // MARK: - Native UITabBar (Liquid Glass on iOS 26+)

    private func setupNativeTabBar() {
        // Create tab bar items: 2 left, placeholder center, 2 right
        var items: [UITabBarItem] = []

        for (index, tab) in tabs.enumerated() {
            let config = UIImage.SymbolConfiguration(pointSize: 18, weight: .medium)
            let image = UIImage(systemName: tab.icon, withConfiguration: config)
            let selectedImage = UIImage(systemName: tab.selectedIcon, withConfiguration: config)
            let item = UITabBarItem(title: tab.title, image: image, selectedImage: selectedImage)
            item.tag = index
            items.append(item)

            // Insert a blank spacer item between left 2 and right 2 tabs (index 1 → 2)
            if index == 1 {
                let spacer = UITabBarItem(title: nil, image: nil, selectedImage: nil)
                spacer.isEnabled = false
                spacer.tag = 999  // Spacer tag
                items.append(spacer)
            }
        }

        nativeTabBar.items = items
        nativeTabBar.delegate = self
        nativeTabBar.selectedItem = items.first

        // Native translucent appearance — Liquid Glass is automatic on iOS 26+
        nativeTabBar.isTranslucent = true
        nativeTabBar.tintColor = primaryColor
        nativeTabBar.unselectedItemTintColor = UIColor.secondaryLabel

        view.addSubview(nativeTabBar)
    }

    // MARK: - FAB Button

    private func setupFABButton() {
        fabButton.frame = CGRect(x: 0, y: 0, width: fabSize, height: fabSize)
        fabButton.layer.cornerRadius = fabSize / 2
        fabButton.backgroundColor = primaryColor

        let config = UIImage.SymbolConfiguration(pointSize: 20, weight: .semibold)
        fabButton.setImage(UIImage(systemName: "plus", withConfiguration: config), for: .normal)
        fabButton.tintColor = .white

        fabButton.layer.shadowColor = primaryColor.withAlphaComponent(0.4).cgColor
        fabButton.layer.shadowOffset = CGSize(width: 0, height: 4)
        fabButton.layer.shadowRadius = 8
        fabButton.layer.shadowOpacity = 1.0

        fabButton.addTarget(self, action: #selector(fabTapped), for: .touchUpInside)
        view.addSubview(fabButton)
    }

    // MARK: - Layout

    private func layoutNativeTabBar() {
        let safeBottom = view.safeAreaInsets.bottom
        let tabBarHeight: CGFloat = 49 + safeBottom  // Standard UITabBar height + safe area
        nativeTabBar.frame = CGRect(
            x: 0,
            y: view.bounds.height - tabBarHeight,
            width: view.bounds.width,
            height: tabBarHeight
        )
    }

    private func layoutFAB() {
        let tabBarFrame = nativeTabBar.frame
        // Center FAB horizontally, vertically aligned with the tab bar content area (above safe area)
        let contentCenterY = tabBarFrame.origin.y + 49.0 / 2.0
        fabButton.bounds = CGRect(x: 0, y: 0, width: fabSize, height: fabSize)
        fabButton.center = CGPoint(x: view.bounds.width / 2.0, y: contentCenterY)
    }

    private func adjustWebViewForTabBar() {
        guard let webView = self.webView else { return }
        if tabBarVisible {
            webView.scrollView.contentInset.bottom = 49
            webView.scrollView.verticalScrollIndicatorInsets.bottom = 49
        } else {
            webView.scrollView.contentInset.bottom = 0
            webView.scrollView.verticalScrollIndicatorInsets.bottom = 0
        }
    }

    // MARK: - Actions

    @objc private func fabTapped() {
        let generator = UIImpactFeedbackGenerator(style: .medium)
        generator.impactOccurred()

        UIView.animate(withDuration: 0.1, animations: {
            self.fabButton.transform = CGAffineTransform(scaleX: 0.9, y: 0.9)
        }) { _ in
            UIView.animate(withDuration: 0.1) {
                self.fabButton.transform = .identity
            }
        }

        notifyWebView(eventName: "fabTapped", data: [:])
    }

    // MARK: - Show / Hide

    func setTabBarVisible(_ visible: Bool) {
        guard visible != tabBarVisible else { return }
        tabBarVisible = visible

        DispatchQueue.main.async {
            UIView.animate(withDuration: 0.25, delay: 0, options: .curveEaseInOut) {
                self.nativeTabBar.isHidden = !visible
                self.fabButton.isHidden = !visible
                self.adjustWebViewForTabBar()
            }
        }
    }

    // MARK: - Bridge Communication

    private func notifyWebView(eventName: String, data: [String: Any]) {
        if let jsonData = try? JSONSerialization.data(withJSONObject: data),
           let jsonString = String(data: jsonData, encoding: .utf8) {
            let js = "window.dispatchEvent(new CustomEvent('capacitor_native_nav', {detail: {event: '\(eventName)', data: \(jsonString)}}));"
            DispatchQueue.main.async {
                self.webView?.evaluateJavaScript(js, completionHandler: nil)
            }
        }
    }

    /// Called from NativeNavPlugin to update the selected tab
    func updateSelectedTab(index: Int) {
        DispatchQueue.main.async {
            // Map route index (0,1,3,4) to tab bar items (0,1, skip spacer at 2, 3,4)
            let items = self.nativeTabBar.items ?? []
            let itemIndex: Int
            if index < 2 {
                itemIndex = index
            } else {
                itemIndex = index  // 3→3, 4→4 (spacer is at 2)
            }
            if itemIndex < items.count {
                self.nativeTabBar.selectedItem = items[itemIndex]
            }
        }
    }
}

// MARK: - UITabBarDelegate

extension MyViewController: UITabBarDelegate {
    func tabBar(_ tabBar: UITabBar, didSelect item: UITabBarItem) {
        let tag = item.tag
        guard tag != 999 else {
            // Spacer item tapped — ignore and reselect previous
            return
        }

        // Map tab tag (0,1,2,3 from tabs array) to route index
        // tabs[0]=summary→0, tabs[1]=historico→1, tabs[2]=estatisticas→3, tabs[3]=ajustes→4
        let routeIndex = tag < 2 ? tag : tag + 1

        let route = tabs[tag].route
        notifyWebView(eventName: "tabSelected", data: ["route": route, "index": routeIndex])
    }
}
