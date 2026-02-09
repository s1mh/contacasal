import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initCapacitor } from "./lib/capacitor";

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

  /**
   * Importante:
   * - Não existe “segurança” real em bloquear Inspecionar Elemento / DevTools.
   * - A segurança do app deve estar no backend (RLS no Supabase, validações, rate-limit).
   * - Bloqueios de UI atrapalham usabilidade (botão direito, copiar/colar, acessibilidade).
   *
   * Por isso, mantemos apenas hardening não-invasivo (sem segredos no bundle).
   */

  // Disable text selection on non-interactive elements only
  const style = document.createElement('style');
  style.textContent = `
    img, svg, button:not(input):not(textarea) { -webkit-user-select: none; user-select: none; }
    input, textarea, [contenteditable], p, span, div, h1, h2, h3, h4, h5, h6, li, td, th, label, a {
      -webkit-user-select: auto; user-select: auto;
    }
  `;
  document.head.appendChild(style);

  // Disable drag on images
  document.addEventListener('dragstart', (e) => {
    if (e.target instanceof HTMLImageElement) {
      e.preventDefault();
    }
  });
}

// Initialize Capacitor native plugins (haptics, status bar, splash screen)
initCapacitor();

createRoot(document.getElementById("root")!).render(<App />);
