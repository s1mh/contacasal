import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { I18nProvider } from "@/contexts/I18nContext";
import Index from "./pages/Index";
import CreateSpace from "./pages/CreateSpace";
import CoupleLayout from "./pages/CoupleLayout";
import Summary from "./pages/Summary";
import NewExpense from "./pages/NewExpense";
import History from "./pages/History";
import Settings from "./pages/Settings";
import Statistics from "./pages/Statistics";
import ResetPin from "./pages/ResetPin";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <I18nProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
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
          </BrowserRouter>
        </TooltipProvider>
      </I18nProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
