import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import Admin from "./pages/Admin";
import Settings from "./pages/Settings";
import TestScripts from "./pages/TestScripts";
import TestComplete from "./pages/TestComplete";
import ApprovedGuard from "./components/ApprovedGuard";
import TrackingProvider from "./components/TrackingProvider";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <TrackingProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/test-scripts" element={<TestScripts />} />
            <Route path="/test-complete" element={<TestComplete />} />
            <Route path="/admin" element={<ApprovedGuard><Admin /></ApprovedGuard>} />
            <Route path="/settings" element={<ApprovedGuard><Settings /></ApprovedGuard>} />
            <Route path="/" element={<ApprovedGuard><Index /></ApprovedGuard>} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </TrackingProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
