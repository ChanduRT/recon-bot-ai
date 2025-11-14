import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Scan from "./pages/Scan";
import History from "./pages/History";
import NetworkTools from "./pages/NetworkTools";
import Tools from "./pages/Tools";
import ScanDetails from "./pages/ScanDetails";
import Settings from "./pages/Settings";
import APTPlanning from "./pages/APTPlanning";
import SOCDashboard from "./pages/SOCDashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/scan" element={<Scan />} />
          <Route path="/history" element={<History />} />
          <Route path="/scan-details/:scanId" element={<ScanDetails />} />
          <Route path="/tools" element={<Tools />} />
          <Route path="/network-tools" element={<NetworkTools />} />
          <Route path="/apt-planning" element={<APTPlanning />} />
          <Route path="/soc-dashboard" element={<SOCDashboard />} />
          <Route path="/settings" element={<Settings />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
