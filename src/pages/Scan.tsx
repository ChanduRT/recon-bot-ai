import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";
import { 
  Target, 
  Brain, 
  Shield, 
  Search, 
  AlertTriangle,
  CheckCircle,
  Loader2
} from "lucide-react";

interface AIAgent {
  id: string;
  name: string;
  agent_type: string;
  description: string;
  is_active: boolean;
}

const Scan = () => {
  const [target, setTarget] = useState("");
  const [assetType, setAssetType] = useState<'domain' | 'ip' | 'url' | 'hash' | 'email'>('domain');
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [agents, setAgents] = useState<AIAgent[]>([]);
  const [loading, setLoading] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStatus, setScanStatus] = useState<string>("");
  const [scanResults, setScanResults] = useState<any>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    try {
      const { data, error } = await supabase
        .from('ai_agents')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setAgents(data || []);
      // Select all agents by default
      setSelectedAgents(data?.map(agent => agent.id) || []);
    } catch (error) {
      console.error('Error fetching agents:', error);
      toast({
        title: "Error",
        description: "Failed to load AI agents",
        variant: "destructive",
      });
    }
  };

  const handleAgentToggle = (agentId: string) => {
    setSelectedAgents(prev =>
      prev.includes(agentId)
        ? prev.filter(id => id !== agentId)
        : [...prev, agentId]
    );
  };

  const validateTarget = (target: string, type: string): boolean => {
    switch (type) {
      case 'domain':
        return /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z]{2,})+$/.test(target);
      case 'ip':
        return /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(target);
      case 'url':
        try { new URL(target); return true; } catch { return false; }
      case 'hash':
        return /^[a-fA-F0-9]{32,128}$/.test(target);
      case 'email':
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(target);
      default:
        return false;
    }
  };

  const handleScan = async () => {
    if (!target.trim()) {
      toast({
        title: "Error",
        description: "Please enter a target to scan",
        variant: "destructive",
      });
      return;
    }

    if (!validateTarget(target, assetType)) {
      toast({
        title: "Invalid Target",
        description: `Please enter a valid ${assetType}`,
        variant: "destructive",
      });
      return;
    }

    if (selectedAgents.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one AI agent",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setScanProgress(0);
    setScanStatus("Initializing scan...");
    setScanResults(null);

    try {
      // Check rate limiting first
      const { data: rateLimitResponse, error: rateLimitError } = await supabase.functions
        .invoke('rate-limiter', {
          body: { endpoint: '/ai-agent-orchestrator' }
        });

      if (rateLimitError || !rateLimitResponse?.allowed) {
        toast({
          title: "Rate Limited",
          description: rateLimitResponse?.message || "Too many requests. Please try again later.",
          variant: "destructive",
        });
        return;
      }

      // Simulate progress updates with status messages
      let currentProgress = 0;
      const progressInterval = setInterval(() => {
        currentProgress += 8;
        if (currentProgress <= 25) {
          setScanStatus("🔍 Gathering reconnaissance data from Shodan, VirusTotal, and IPInfo...");
        } else if (currentProgress <= 45) {
          setScanStatus("🌐 Searching for recent vulnerabilities with Perplexity AI...");
        } else if (currentProgress <= 75) {
          setScanStatus("🤖 AI agents analyzing security posture and identifying threats...");
        } else if (currentProgress <= 90) {
          setScanStatus("📊 Aggregating results and calculating threat level...");
        }
        setScanProgress(Math.min(currentProgress, 90));
      }, 800);

      // Start the scan
      const { data: scanResult, error: scanError } = await supabase.functions
        .invoke('ai-agent-orchestrator', {
          body: {
            target,
            assetType,
            agentIds: selectedAgents
          }
        });

      clearInterval(progressInterval);
      setScanProgress(100);
      setScanStatus("✅ Scan complete!");

      if (scanError) {
        throw scanError;
      }

      setScanResults(scanResult);
      toast({
        title: "Scan Complete",
        description: `Successfully analyzed ${target} with ${selectedAgents.length} AI agents`,
      });

    } catch (error) {
      console.error('Scan error:', error);
      toast({
        title: "Scan Failed",
        description: error.message || "An error occurred during the scan",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getAgentTypeIcon = (type: string) => {
    switch (type) {
      case 'reconnaissance': return <Search className="w-4 h-4" />;
      case 'vulnerability': return <Shield className="w-4 h-4" />;
      case 'threat_intelligence': return <AlertTriangle className="w-4 h-4" />;
      case 'network_analysis': return <Target className="w-4 h-4" />;
      default: return <Brain className="w-4 h-4" />;
    }
  };

  const getThreatLevelColor = (level: string) => {
    switch (level) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold flex items-center justify-center gap-2">
            <Target className="w-8 h-8 text-primary" />
            New Reconnaissance Scan
          </h1>
          <p className="text-muted-foreground">
            Deploy AI agents to analyze your target and gather intelligence
          </p>
        </div>

        {/* Scan Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Scan Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Target Input */}
            <div className="space-y-2">
              <Label htmlFor="target">Target</Label>
              <Input
                id="target"
                placeholder="Enter domain, IP, URL, hash, or email"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                className="text-lg"
              />
            </div>

            {/* Asset Type Selection */}
            <div className="space-y-3">
              <Label>Asset Type</Label>
              <RadioGroup
                value={assetType}
                onValueChange={(value) => setAssetType(value as any)}
                className="grid grid-cols-2 md:grid-cols-5 gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="domain" id="domain" />
                  <Label htmlFor="domain">Domain</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="ip" id="ip" />
                  <Label htmlFor="ip">IP Address</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="url" id="url" />
                  <Label htmlFor="url">URL</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="hash" id="hash" />
                  <Label htmlFor="hash">Hash</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="email" id="email" />
                  <Label htmlFor="email">Email</Label>
                </div>
              </RadioGroup>
            </div>

            {/* AI Agents Selection */}
            <div className="space-y-3">
              <Label>AI Agents ({selectedAgents.length} selected)</Label>
              <div className="grid gap-3 md:grid-cols-2">
                {agents.map((agent) => (
                  <div
                    key={agent.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedAgents.includes(agent.id)
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:bg-accent'
                    }`}
                    onClick={() => handleAgentToggle(agent.id)}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={selectedAgents.includes(agent.id)}
                        onChange={() => handleAgentToggle(agent.id)}
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {getAgentTypeIcon(agent.agent_type)}
                          <h3 className="font-medium text-sm">{agent.name}</h3>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {agent.description}
                        </p>
                        <Badge variant="secondary" className="mt-1 text-xs">
                          {agent.agent_type.replace('_', ' ')}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Scan Button */}
            <Button
              onClick={handleScan}
              disabled={loading || !target.trim()}
              className="w-full gap-2"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Scanning...
                </>
              ) : (
                <>
                  <Target className="w-4 h-4" />
                  Start Reconnaissance Scan
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Progress */}
        {loading && (
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">Scan Progress</span>
                    <span className="text-muted-foreground">{scanProgress}%</span>
                  </div>
                  <Progress value={scanProgress} className="w-full" />
                </div>
                
                {/* Real-time Status */}
                <div className="bg-muted/50 rounded-lg p-4 border border-border">
                  <div className="flex items-start gap-3">
                    <Loader2 className="w-5 h-5 animate-spin text-primary mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium mb-1">Current Status</p>
                      <p className="text-sm text-muted-foreground">{scanStatus}</p>
                    </div>
                  </div>
                </div>

                {/* Stage Indicators */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <div className={`p-3 rounded-lg border text-center transition-colors ${
                    scanProgress > 0 ? 'border-primary bg-primary/10' : 'border-border'
                  }`}>
                    <Search className={`w-4 h-4 mx-auto mb-1 ${scanProgress > 0 ? 'text-primary' : 'text-muted-foreground'}`} />
                    <p className="text-xs font-medium">Reconnaissance</p>
                  </div>
                  <div className={`p-3 rounded-lg border text-center transition-colors ${
                    scanProgress > 25 ? 'border-primary bg-primary/10' : 'border-border'
                  }`}>
                    <AlertTriangle className={`w-4 h-4 mx-auto mb-1 ${scanProgress > 25 ? 'text-primary' : 'text-muted-foreground'}`} />
                    <p className="text-xs font-medium">Perplexity</p>
                  </div>
                  <div className={`p-3 rounded-lg border text-center transition-colors ${
                    scanProgress > 45 ? 'border-primary bg-primary/10' : 'border-border'
                  }`}>
                    <Brain className={`w-4 h-4 mx-auto mb-1 ${scanProgress > 45 ? 'text-primary' : 'text-muted-foreground'}`} />
                    <p className="text-xs font-medium">AI Analysis</p>
                  </div>
                  <div className={`p-3 rounded-lg border text-center transition-colors ${
                    scanProgress > 75 ? 'border-primary bg-primary/10' : 'border-border'
                  }`}>
                    <Shield className={`w-4 h-4 mx-auto mb-1 ${scanProgress > 75 ? 'text-primary' : 'text-muted-foreground'}`} />
                    <p className="text-xs font-medium">Results</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {scanResults && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                Scan Results
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">{scanResults.results?.target}</h3>
                  <p className="text-sm text-muted-foreground">
                    Scanned with {scanResults.results?.summary?.total_agents} agents
                  </p>
                </div>
                <Badge className={`${getThreatLevelColor(scanResults.threat_level)} text-white`}>
                  {scanResults.threat_level} Risk
                </Badge>
              </div>

              <div className="grid gap-2 text-sm">
                <div className="flex justify-between">
                  <span>Successful Agents:</span>
                  <span className="text-green-600">
                    {scanResults.results?.summary?.successful}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Failed Agents:</span>
                  <span className="text-red-600">
                    {scanResults.results?.summary?.failed}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Total Execution Time:</span>
                  <span>
                    {scanResults.results?.summary?.total_execution_time}ms
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/history`)}
                >
                  View Full Report
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setTarget("");
                    setScanResults(null);
                    setScanProgress(0);
                  }}
                >
                  New Scan
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Scan;