import UIKit
import Capacitor

class MyViewController: CAPBridgeViewController, UITabBarDelegate {

    // MARK: - UI Elements
    private let nativeTabBar = UITabBar()
    private let fabButton = UIButton(type: .custom)
    private var currentTabIndex: Int = 0
    private var tabBarVisible: Bool = false

    // Tab identifiers matching web routes
    private let tabRoutes = ["summary", "historico", "placeholder", "estatisticas", "ajustes"]

    private let fabSize: CGFloat = 44

    // MARK: - Lifecycle

    override func capacitorDidLoad() {
        super.capacitorDidLoad()
        // Register custom Capacitor plugins
        bridge?.registerPluginInstance(NativeNavPlugin())
        bridge?.registerPluginInstance(BiometricPlugin())
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        setupNativeTabBar()
        setupFABButton()
        // Start hidden — JS will call setVisible(true) when entering a couple space
        nativeTabBar.isHidden = true
        fabButton.isHidden = true
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        updateLayout()
    }

    override func viewSafeAreaInsetsDidChange() {
        super.viewSafeAreaInsetsDidChange()
        updateLayout()
    }

    private func updateLayout() {
        layoutTabBar()
        layoutFAB()
        adjustWebViewForTabBar()
    }

    // MARK: - Tab Bar Setup

    private func setupNativeTabBar() {
        nativeTabBar.delegate = self
        nativeTabBar.translatesAutoresizingMaskIntoConstraints = false

        // Tab bar items
        let summaryItem = UITabBarItem(title: "Resumo", image: UIImage(systemName: "house"), selectedImage: UIImage(systemName: "house.fill"))
        summaryItem.tag = 0

        let historyItem = UITabBarItem(title: "Histórico", image: UIImage(systemName: "clock"), selectedImage: UIImage(systemName: "clock.fill"))
        historyItem.tag = 1

        // Placeholder for FAB (invisible spacer)
        let placeholderItem = UITabBarItem(title: nil, image: nil, selectedImage: nil)
        placeholderItem.tag = 2
        placeholderItem.isEnabled = false

        let statsItem = UITabBarItem(title: "Estatísticas", image: UIImage(systemName: "chart.line.uptrend.xyaxis"), selectedImage: UIImage(systemName: "chart.line.uptrend.xyaxis"))
        statsItem.tag = 3

        let settingsItem = UITabBarItem(title: "Ajustes", image: UIImage(systemName: "gearshape"), selectedImage: UIImage(systemName: "gearshape.fill"))
        settingsItem.tag = 4

        nativeTabBar.items = [summaryItem, historyItem, placeholderItem, statsItem, settingsItem]
        nativeTabBar.selectedItem = summaryItem

        // Tint color matching the web primary color (coral/peach)
        nativeTabBar.tintColor = UIColor(red: 232/255, green: 130/255, blue: 92/255, alpha: 1.0)

        view.addSubview(nativeTabBar)
    }

    // MARK: - FAB Button Setup

    private func setupFABButton() {
        fabButton.frame = CGRect(x: 0, y: 0, width: fabSize, height: fabSize)
        fabButton.layer.cornerRadius = fabSize / 2

        // Gradient-like solid color matching web's primary
        fabButton.backgroundColor = UIColor(red: 232/255, green: 130/255, blue: 92/255, alpha: 1.0)

        // Plus icon (smaller)
        let config = UIImage.SymbolConfiguration(pointSize: 20, weight: .semibold)
        let plusImage = UIImage(systemName: "plus", withConfiguration: config)
        fabButton.setImage(plusImage, for: .normal)
        fabButton.tintColor = .white

        // Shadow (subtler)
        fabButton.layer.shadowColor = UIColor(red: 232/255, green: 130/255, blue: 92/255, alpha: 0.3).cgColor
        fabButton.layer.shadowOffset = CGSize(width: 0, height: 4)
        fabButton.layer.shadowRadius = 8
        fabButton.layer.shadowOpacity = 1.0

        fabButton.addTarget(self, action: #selector(fabTapped), for: .touchUpInside)

        view.addSubview(fabButton)
    }

    // MARK: - Layout

    private func layoutTabBar() {
        let safeBottom = view.safeAreaInsets.bottom
        let tabBarHeight: CGFloat = 49 + safeBottom
        nativeTabBar.frame = CGRect(
            x: 0,
            y: view.bounds.height - tabBarHeight,
            width: view.bounds.width,
            height: tabBarHeight
        )
    }

    private func layoutFAB() {
        // The visible tab bar content is 49pt tall, sitting above the safe area.
        // Center the FAB within that 49pt area (+ 1pt optical correction).
        let safeBottom = view.safeAreaInsets.bottom
        let tabBarContentTop = view.bounds.height - 49 - safeBottom
        let centerY = tabBarContentTop + (49 - fabSize) / 2 + 1
        fabButton.frame = CGRect(
            x: (view.bounds.width - fabSize) / 2,
            y: centerY,
            width: fabSize,
            height: fabSize
        )
    }

    private func adjustWebViewForTabBar() {
        guard let webView = self.webView else { return }
        if tabBarVisible {
            let tabBarHeight: CGFloat = 49
            webView.scrollView.contentInset.bottom = tabBarHeight
            webView.scrollView.verticalScrollIndicatorInsets.bottom = tabBarHeight
        } else {
            webView.scrollView.contentInset.bottom = 0
            webView.scrollView.verticalScrollIndicatorInsets.bottom = 0
        }
    }

    // MARK: - Show / Hide Tab Bar

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

    // MARK: - UITabBarDelegate

    func tabBar(_ tabBar: UITabBar, didSelect item: UITabBarItem) {
        let tag = item.tag
        // Don't select the placeholder
        if tag == 2 { return }

        currentTabIndex = tag
        let route = tabRoutes[tag]

        // Notify JavaScript about tab selection
        notifyWebView(eventName: "tabSelected", data: ["route": route, "index": tag])
    }

    // MARK: - FAB Action

    @objc private func fabTapped() {
        // Haptic feedback
        let generator = UIImpactFeedbackGenerator(style: .medium)
        generator.impactOccurred()

        // Animate press
        UIView.animate(withDuration: 0.1, animations: {
            self.fabButton.transform = CGAffineTransform(scaleX: 0.9, y: 0.9)
        }) { _ in
            UIView.animate(withDuration: 0.1) {
                self.fabButton.transform = .identity
            }
        }

        notifyWebView(eventName: "fabTapped", data: [:])
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
        guard index >= 0, index < (nativeTabBar.items?.count ?? 0), index != 2 else { return }
        currentTabIndex = index
        DispatchQueue.main.async {
            self.nativeTabBar.selectedItem = self.nativeTabBar.items?[index]
        }
    }
}
