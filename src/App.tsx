import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Scan from "./pages/Scan";
import History from "./pages/History";
import ThreatIntel from "./pages/ThreatIntel";
import AgentManagement from "./pages/AgentManagement";
import NetworkTools from "./pages/NetworkTools";
import Tools from "./pages/Tools";
import ScanDetails from "./pages/ScanDetails";
import Settings from "./pages/Settings";
import AgentAnalytics from "./pages/AgentAnalytics";
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
          <Route path="/threat-intel" element={<ThreatIntel />} />
          <Route path="/agents" element={<AgentManagement />} />
          <Route path="/agent-analytics" element={<AgentAnalytics />} />
          <Route path="/tools" element={<Tools />} />
          <Route path="/network-tools" element={<NetworkTools />} />
          <Route path="/settings" element={<Settings />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
