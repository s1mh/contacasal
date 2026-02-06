import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Production security hardening
if (!import.meta.env.DEV) {
  // Disable React DevTools
  const w = window as Record<string, unknown>;
  if (typeof w.__REACT_DEVTOOLS_GLOBAL_HOOK__ === 'object' && w.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
    const hook = w.__REACT_DEVTOOLS_GLOBAL_HOOK__ as Record<string, unknown>;
    hook.inject = () => {};
    hook.onCommitFiberRoot = () => {};
    hook.onCommitFiberUnmount = () => {};
  }

  // Suppress global error details from being inspected
  window.addEventListener('error', (e) => {
    e.preventDefault();
  });
  window.addEventListener('unhandledrejection', (e) => {
    e.preventDefault();
  });
}

createRoot(document.getElementById("root")!).render(<App />);
