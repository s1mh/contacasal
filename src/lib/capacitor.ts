import { Capacitor, registerPlugin } from '@capacitor/core';

/**
 * Whether the app is running inside Capacitor (native iOS/Android).
 */
export const isNative = Capacitor.isNativePlatform();

/**
 * Whether the app is running on iOS.
 */
export const isIOS = Capacitor.getPlatform() === 'ios';

// ─── Native Plugin Interfaces ───────────────────────────────────────

interface NativeNavPlugin {
  updateActiveTab(options: { route: string }): Promise<{ success: boolean }>;
  setVisible(options: { visible: boolean }): Promise<{ success: boolean }>;
}

interface BiometricAuthPlugin {
  isAvailable(): Promise<{
    available: boolean;
    biometryType: string;
    errorCode: number;
    errorMessage: string;
  }>;
  authenticate(options: { reason?: string }): Promise<{
    success: boolean;
    errorCode: number;
    errorMessage: string;
  }>;
}

// Register native plugins (only available on native, no-op on web)
const NativeNav = isNative ? registerPlugin<NativeNavPlugin>('NativeNav') : null;
const BiometricAuth = isNative ? registerPlugin<BiometricAuthPlugin>('BiometricAuth') : null;

// ─── Haptics ────────────────────────────────────────────────────────

/**
 * Trigger haptic feedback (only on native).
 */
export async function hapticImpact(style: 'light' | 'medium' | 'heavy' = 'medium') {
  if (!isNative) return;
  const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
  const styleMap = {
    light: ImpactStyle.Light,
    medium: ImpactStyle.Medium,
    heavy: ImpactStyle.Heavy,
  };
  await Haptics.impact({ style: styleMap[style] });
}

/**
 * Trigger haptic selection feedback.
 */
export async function hapticSelection() {
  if (!isNative) return;
  const { Haptics } = await import('@capacitor/haptics');
  await Haptics.selectionStart();
  await Haptics.selectionEnd();
}

/**
 * Trigger haptic notification feedback.
 */
export async function hapticNotification(type: 'success' | 'warning' | 'error' = 'success') {
  if (!isNative) return;
  const { Haptics, NotificationType } = await import('@capacitor/haptics');
  const typeMap = {
    success: NotificationType.Success,
    warning: NotificationType.Warning,
    error: NotificationType.Error,
  };
  await Haptics.notification({ type: typeMap[type] });
}

// ─── Share URLs ─────────────────────────────────────────────────────

/**
 * Get the web origin for share URLs.
 * On native, window.location.origin returns capacitor://localhost or https://localhost,
 * which is not useful for sharing. Falls back to window.location.origin on web.
 */
export function getWebOrigin(): string {
  if (isNative) {
    return import.meta.env.VITE_APP_URL || window.location.origin;
  }
  return window.location.origin;
}

/**
 * Build a shareable URL for a couple space.
 * Works correctly in both web and native Capacitor contexts.
 */
export function buildShareUrl(shareCode: string, inviterName?: string): string {
  const baseUrl = `${getWebOrigin()}/c/${shareCode}`;
  return inviterName ? `${baseUrl}?from=${encodeURIComponent(inviterName)}` : baseUrl;
}

// ─── Native Navigation ──────────────────────────────────────────────

/**
 * Show or hide the native tab bar.
 * Called when entering/leaving a couple space.
 */
export async function setNativeTabBarVisible(visible: boolean) {
  if (!NativeNav) return;
  try {
    await NativeNav.setVisible({ visible });
  } catch (e) {
    console.warn('NativeNav.setVisible failed:', e);
  }
}

/**
 * Update the native tab bar to highlight the correct tab.
 * Called when the React Router route changes.
 */
export async function updateNativeTab(route: string) {
  if (!NativeNav) return;
  try {
    await NativeNav.updateActiveTab({ route });
  } catch (e) {
    console.warn('NativeNav.updateActiveTab failed:', e);
  }
}

/**
 * Listen for native tab selection events.
 * Returns a cleanup function to remove the listener.
 */
export function onNativeTabSelected(callback: (route: string) => void): () => void {
  if (!isNative) return () => {};

  const handler = (event: Event) => {
    const detail = (event as CustomEvent).detail;
    if (detail?.event === 'tabSelected' && detail?.data?.route) {
      callback(detail.data.route);
    }
  };

  window.addEventListener('capacitor_native_nav', handler);
  return () => window.removeEventListener('capacitor_native_nav', handler);
}

/**
 * Listen for native FAB tap events.
 * Returns a cleanup function to remove the listener.
 */
export function onNativeFabTapped(callback: () => void): () => void {
  if (!isNative) return () => {};

  const handler = (event: Event) => {
    const detail = (event as CustomEvent).detail;
    if (detail?.event === 'fabTapped') {
      callback();
    }
  };

  window.addEventListener('capacitor_native_nav', handler);
  return () => window.removeEventListener('capacitor_native_nav', handler);
}

// ─── Biometric Auth (Native Plugin) ─────────────────────────────────

/**
 * Check if biometric authentication (Face ID / Touch ID) is available.
 * Uses our custom BiometricPlugin (LocalAuthentication framework).
 */
export async function isBiometricAvailable(): Promise<{ available: boolean; biometryType: string }> {
  if (!BiometricAuth) return { available: false, biometryType: 'none' };
  try {
    const result = await BiometricAuth.isAvailable();
    return {
      available: result.available,
      biometryType: result.biometryType,
    };
  } catch {
    return { available: false, biometryType: 'none' };
  }
}

/**
 * Prompt for biometric authentication (Face ID / Touch ID).
 * Returns true if successfully authenticated.
 */
export async function authenticateBiometric(reason?: string): Promise<boolean> {
  if (!BiometricAuth) return false;
  try {
    const result = await BiometricAuth.authenticate({
      reason: reason || 'Confirme sua identidade para entrar',
    });
    return result.success;
  } catch {
    return false;
  }
}

// ─── Initialization ─────────────────────────────────────────────────

/**
 * Initialize Capacitor plugins on app startup.
 */
export async function initCapacitor() {
  if (!isNative) return;

  try {
    const { SplashScreen } = await import('@capacitor/splash-screen');
    await SplashScreen.hide({ fadeOutDuration: 300 });
  } catch (e) {
    console.warn('SplashScreen plugin not available:', e);
  }

  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    await StatusBar.setStyle({ style: Style.Light });
  } catch (e) {
    console.warn('StatusBar plugin not available:', e);
  }

  try {
    const { Keyboard } = await import('@capacitor/keyboard');
    await Keyboard.setAccessoryBarVisible({ isVisible: true });
  } catch (e) {
    console.warn('Keyboard plugin not available:', e);
  }
}
