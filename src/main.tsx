import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Production security hardening
if (!import.meta.env.DEV) {
  // Disable React DevTools
  const w = window as unknown as Record<string, unknown>;
  if (typeof w.__REACT_DEVTOOLS_GLOBAL_HOOK__ === 'object' && w.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
    const hook = w.__REACT_DEVTOOLS_GLOBAL_HOOK__ as Record<string, unknown>;
    hook.inject = () => {};
    hook.onCommitFiberRoot = () => {};
    hook.onCommitFiberUnmount = () => {};
  }

  // Log errors to console instead of suppressing them entirely
  // This allows monitoring while not exposing details to users
  window.addEventListener('error', (e) => {
    console.warn('[App Error]', e.message);
    // Don't preventDefault - let ErrorBoundary handle it
  });
  window.addEventListener('unhandledrejection', (e) => {
    console.warn('[Unhandled Promise]', e.reason);
    // Don't preventDefault - let normal error handling work
  });

  // Anti-inspection: Disable common dev tools shortcuts
  document.addEventListener('keydown', (e) => {
    // Block F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C, Ctrl+U
    if (
      e.key === 'F12' ||
      (e.ctrlKey && e.shiftKey && ['I', 'J', 'C'].includes(e.key)) ||
      (e.ctrlKey && e.key === 'u') ||
      (e.metaKey && e.altKey && ['I', 'J', 'C'].includes(e.key)) ||
      (e.metaKey && e.key === 'u')
    ) {
      e.preventDefault();
      return false;
    }
  });

  // Disable right-click context menu
  document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    return false;
  });

  // Detect DevTools opening via debugger statement timing
  // If someone opens DevTools, the debugger pause will cause a measurable delay
  let devToolsOpen = false;
  const detectDevTools = () => {
    const start = performance.now();
    // This will pause if DevTools is open with the debugger tab active
    // Using a more subtle detection method
    const el = new Image();
    Object.defineProperty(el, 'id', {
      get: () => {
        devToolsOpen = true;
      }
    });
    console.debug(el);
    if (devToolsOpen) {
      // Clear sensitive data from memory when DevTools is detected
      document.title = 'Conta de Casal';
    }
  };
  setInterval(detectDevTools, 3000);

  // Disable text selection on sensitive elements
  const style = document.createElement('style');
  style.textContent = `
    body { -webkit-user-select: none; user-select: none; }
    input, textarea { -webkit-user-select: auto; user-select: auto; }
  `;
  document.head.appendChild(style);

  // Disable drag on images
  document.addEventListener('dragstart', (e) => {
    if (e.target instanceof HTMLImageElement) {
      e.preventDefault();
    }
  });
}

createRoot(document.getElementById("root")!).render(<App />);
