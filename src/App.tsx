import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, HashRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { PreferencesProvider } from "@/contexts/PreferencesContext";
import { isNative } from "@/lib/capacitor";
import { ErrorBoundary } from "@/components/ErrorBoundary";

// Capacitor uses capacitor:// protocol which breaks BrowserRouter path-based routing.
// HashRouter works with any protocol by using URL hash (#/path).
const Router = isNative ? HashRouter : BrowserRouter;

// Eager: Index + CoupleLayout (always needed on first render)
import Index from "./pages/Index";
import CoupleLayout from "./pages/CoupleLayout";

// Lazy: loaded on demand when navigating
const CreateSpace = lazy(() => import("./pages/CreateSpace"));
const Summary = lazy(() => import("./pages/Summary"));
const NewExpense = lazy(() => import("./pages/NewExpense"));
const History = lazy(() => import("./pages/History"));
const Settings = lazy(() => import("./pages/Settings"));
const Statistics = lazy(() => import("./pages/Statistics"));
const ResetPin = lazy(() => import("./pages/ResetPin"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const LazyFallback = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

const AppRoutes = () => {
  return (
    <Router>
      <Suspense fallback={<LazyFallback />}>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/create" element={<CreateSpace />} />
          <Route path="/c/:shareCode" element={<CoupleLayout />}>
            <Route index element={<Summary />} />
            <Route path="novo" element={<NewExpense />} />
            <Route path="historico" element={<History />} />
            <Route path="ajustes" element={<Settings />} />
            <Route path="estatisticas" element={<Statistics />} />
          </Route>
          <Route path="/reset-pin/:token" element={<ResetPin />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </Router>
  );
};

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <PreferencesProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <AppRoutes />
          </TooltipProvider>
        </PreferencesProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
