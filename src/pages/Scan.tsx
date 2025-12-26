import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";
import { 
  Target, 
  Brain, 
  Shield, 
  Search, 
  AlertTriangle,
  CheckCircle,
  Loader2,
  ExternalLink
} from "lucide-react";

interface AIAgent {
  id: string;
  name: string;
  agent_type: string;
  description: string;
  is_active: boolean;
}

interface DemoTarget {
  id: string;
  name: string;
  target_value: string;
  target_type: string;
  category: string;
  source_provider: string;
  description: string | null;
  vulnerabilities: string[];
  usage_notes: string | null;
  documentation_url: string | null;
  is_live_target: boolean;
  legal_disclaimer: string | null;
  tags: string[];
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
  const [demoTargets, setDemoTargets] = useState<DemoTarget[]>([]);
  const [selectedDemoTarget, setSelectedDemoTarget] = useState<DemoTarget | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchAgents();
    fetchDemoTargets();
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

  const fetchDemoTargets = async () => {
    try {
      const { data, error } = await supabase
        .from('demo_targets')
        .select('*')
        .eq('is_active', true)
        .order('category');

      if (error) throw error;
      setDemoTargets(data || []);
    } catch (error) {
      console.error('Error fetching demo targets:', error);
    }
  };

  const handleDemoTargetSelect = (targetId: string) => {
    if (targetId === "custom") {
      setSelectedDemoTarget(null);
      setTarget("");
      return;
    }
    
    const demo = demoTargets.find(t => t.id === targetId);
    if (demo) {
      setTarget(demo.target_value);
      // Map target_type to assetType
      const typeMap: { [key: string]: 'domain' | 'ip' | 'url' | 'hash' | 'email' } = {
        'domain': 'domain',
        'ip': 'ip',
        'url': 'url',
        'hash': 'hash',
        'email': 'email'
      };
      setAssetType(typeMap[demo.target_type] || 'domain');
      setSelectedDemoTarget(demo);
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

        {/* Demo Targets Card */}
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Demo Targets (Legal & Safe)
            </CardTitle>
            <CardDescription>
              Pre-configured intentionally vulnerable targets for testing and training
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select onValueChange={handleDemoTargetSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Select a demo target or enter custom..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="custom">
                  <span className="text-muted-foreground">Enter custom target...</span>
                </SelectItem>
                <SelectGroup>
                  <SelectLabel>Acunetix Vulnweb</SelectLabel>
                  {demoTargets.filter(t => t.category === 'acunetix_demo').map(t => (
                    <SelectItem key={t.id} value={t.id}>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{t.name}</span>
                        <span className="text-xs text-muted-foreground">({t.target_value})</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectGroup>
                <SelectGroup>
                  <SelectLabel>CTF Platforms</SelectLabel>
                  {demoTargets.filter(t => t.category === 'ctf_platform').map(t => (
                    <SelectItem key={t.id} value={t.id}>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{t.name}</span>
                        <span className="text-xs text-muted-foreground">({t.target_value})</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectGroup>
                <SelectGroup>
                  <SelectLabel>Reference Lists (Not Scannable)</SelectLabel>
                  {demoTargets.filter(t => t.category === 'reference_list' || t.category === 'ip_reputation').map(t => (
                    <SelectItem key={t.id} value={t.id} disabled={!t.is_live_target}>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{t.name}</span>
                        {!t.is_live_target && <Badge variant="outline" className="text-xs">Reference Only</Badge>}
                      </div>
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>

            {/* Selected Demo Target Info */}
            {selectedDemoTarget && (
              <Alert className="border-primary/20">
                <Target className="h-4 w-4" />
                <AlertDescription className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{selectedDemoTarget.name}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{selectedDemoTarget.source_provider}</Badge>
                      {selectedDemoTarget.is_live_target ? (
                        <Badge className="bg-green-500/20 text-green-500 border-green-500/30">Safe to Scan</Badge>
                      ) : (
                        <Badge variant="destructive">Reference Only</Badge>
                      )}
                    </div>
                  </div>
                  <p className="text-sm">{selectedDemoTarget.description}</p>
                  {selectedDemoTarget.vulnerabilities?.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      <span className="text-xs text-muted-foreground">Known vulnerabilities:</span>
                      {selectedDemoTarget.vulnerabilities.map((vuln, i) => (
                        <Badge key={i} variant="outline" className="text-xs">{vuln}</Badge>
                      ))}
                    </div>
                  )}
                  {selectedDemoTarget.usage_notes && (
                    <p className="text-xs text-muted-foreground italic">{selectedDemoTarget.usage_notes}</p>
                  )}
                  {selectedDemoTarget.legal_disclaimer && (
                    <p className="text-xs text-destructive">{selectedDemoTarget.legal_disclaimer}</p>
                  )}
                  {selectedDemoTarget.documentation_url && (
                    <a 
                      href={selectedDemoTarget.documentation_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs text-primary flex items-center gap-1 hover:underline"
                    >
                      <ExternalLink className="w-3 h-3" />
                      View Documentation
                    </a>
                  )}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

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
                onChange={(e) => {
                  setTarget(e.target.value);
                  // Clear selected demo if manually editing
                  if (selectedDemoTarget && e.target.value !== selectedDemoTarget.target_value) {
                    setSelectedDemoTarget(null);
                  }
                }}
                className="text-lg"
              />
              {selectedDemoTarget && (
                <p className="text-xs text-muted-foreground">
                  Using demo target: {selectedDemoTarget.name}
                </p>
              )}
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
          <div className="space-y-4">
            {/* Summary Card */}
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

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <p className="text-2xl font-bold">{scanResults.results?.risk_score?.toFixed(1) || 'N/A'}</p>
                    <p className="text-xs text-muted-foreground">Risk Score</p>
                  </div>
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <p className="text-2xl font-bold text-red-500">
                      {scanResults.results?.vulnerabilities?.filter((v: any) => v.severity === 'High' || v.severity === 'Critical').length || 0}
                    </p>
                    <p className="text-xs text-muted-foreground">High Risk</p>
                  </div>
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <p className="text-2xl font-bold text-yellow-500">
                      {scanResults.results?.vulnerabilities?.filter((v: any) => v.severity === 'Medium').length || 0}
                    </p>
                    <p className="text-xs text-muted-foreground">Medium Risk</p>
                  </div>
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <p className="text-2xl font-bold text-green-500">
                      {scanResults.results?.vulnerabilities?.filter((v: any) => v.severity === 'Low').length || 0}
                    </p>
                    <p className="text-xs text-muted-foreground">Low Risk</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* High Risk Vulnerabilities */}
            {scanResults.results?.vulnerabilities?.filter((v: any) => v.severity === 'High' || v.severity === 'Critical').length > 0 && (
              <Card className="border-red-500/30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-red-500">
                    <AlertTriangle className="w-5 h-5" />
                    High-Risk Vulnerabilities
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2 font-medium">IP Address</th>
                          <th className="text-left p-2 font-medium">Port</th>
                          <th className="text-left p-2 font-medium">Service</th>
                          <th className="text-left p-2 font-medium">Risk</th>
                          <th className="text-left p-2 font-medium">CVE / Vulnerability</th>
                          <th className="text-left p-2 font-medium">CVSS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {scanResults.results.vulnerabilities
                          .filter((v: any) => v.severity === 'High' || v.severity === 'Critical')
                          .map((vuln: any, idx: number) => (
                            <tr key={idx} className="border-b hover:bg-muted/50">
                              <td className="p-2 font-mono text-xs">{vuln.ip || scanResults.results?.target}</td>
                              <td className="p-2">{vuln.port || '-'}</td>
                              <td className="p-2">{vuln.service || '-'}</td>
                              <td className="p-2">
                                <Badge className={`${vuln.severity === 'Critical' ? 'bg-red-600' : 'bg-orange-500'} text-white text-xs`}>
                                  {vuln.severity}
                                </Badge>
                              </td>
                              <td className="p-2">
                                <div className="space-y-1">
                                  {vuln.cve && <Badge variant="destructive" className="font-mono text-xs">{vuln.cve}</Badge>}
                                  <p className="text-xs text-muted-foreground">{vuln.name || vuln.title}</p>
                                </div>
                              </td>
                              <td className="p-2">
                                <span className={`font-bold ${parseFloat(vuln.cvss_score) >= 7 ? 'text-red-500' : parseFloat(vuln.cvss_score) >= 4 ? 'text-yellow-500' : 'text-green-500'}`}>
                                  {vuln.cvss_score || '-'}
                                </span>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Medium/Low Risk Vulnerabilities */}
            {scanResults.results?.vulnerabilities?.filter((v: any) => v.severity === 'Medium' || v.severity === 'Low').length > 0 && (
              <Card className="border-yellow-500/30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-yellow-500">
                    <Shield className="w-5 h-5" />
                    Medium & Low Risk Vulnerabilities
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2 font-medium">IP Address</th>
                          <th className="text-left p-2 font-medium">Port</th>
                          <th className="text-left p-2 font-medium">Service</th>
                          <th className="text-left p-2 font-medium">Risk</th>
                          <th className="text-left p-2 font-medium">Vulnerability</th>
                        </tr>
                      </thead>
                      <tbody>
                        {scanResults.results.vulnerabilities
                          .filter((v: any) => v.severity === 'Medium' || v.severity === 'Low')
                          .map((vuln: any, idx: number) => (
                            <tr key={idx} className="border-b hover:bg-muted/50">
                              <td className="p-2 font-mono text-xs">{vuln.ip || scanResults.results?.target}</td>
                              <td className="p-2">{vuln.port || '-'}</td>
                              <td className="p-2">{vuln.service || '-'}</td>
                              <td className="p-2">
                                <Badge className={`${vuln.severity === 'Medium' ? 'bg-yellow-500' : 'bg-green-500'} text-white text-xs`}>
                                  {vuln.severity}
                                </Badge>
                              </td>
                              <td className="p-2">
                                <p className="text-xs">{vuln.name || vuln.title}</p>
                                <p className="text-xs text-muted-foreground">{vuln.description?.slice(0, 100)}...</p>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Vulnerability Details Accordion */}
            {scanResults.results?.vulnerabilities?.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5" />
                    Vulnerability Details & Mitigations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {scanResults.results.vulnerabilities.slice(0, 5).map((vuln: any, idx: number) => (
                      <div key={idx} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              {vuln.cve && <Badge variant="destructive" className="font-mono">{vuln.cve}</Badge>}
                              <h4 className="font-semibold">{vuln.name || vuln.title}</h4>
                            </div>
                            <p className="text-sm text-muted-foreground">{vuln.description}</p>
                          </div>
                          <Badge className={`${getThreatLevelColor(vuln.severity?.toLowerCase())} text-white`}>
                            {vuln.severity}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm bg-muted/50 rounded-lg p-3">
                          <div>
                            <span className="font-medium text-muted-foreground">IP:</span>
                            <p className="font-mono">{vuln.ip || scanResults.results?.target}</p>
                          </div>
                          <div>
                            <span className="font-medium text-muted-foreground">Port:</span>
                            <p>{vuln.port || 'N/A'}</p>
                          </div>
                          <div>
                            <span className="font-medium text-muted-foreground">CVSS:</span>
                            <p className={`font-bold ${parseFloat(vuln.cvss_score) >= 7 ? 'text-red-500' : parseFloat(vuln.cvss_score) >= 4 ? 'text-yellow-500' : 'text-green-500'}`}>
                              {vuln.cvss_score || 'N/A'}
                            </p>
                          </div>
                          <div>
                            <span className="font-medium text-muted-foreground">Exploitability:</span>
                            <p className="capitalize">{vuln.exploitability || 'Unknown'}</p>
                          </div>
                        </div>

                        {vuln.mitigation && (
                          <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                            <p className="text-sm font-medium text-green-600 dark:text-green-400 mb-1">Recommended Mitigation:</p>
                            <p className="text-sm text-green-700 dark:text-green-300">{vuln.mitigation}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Actions */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => navigate(`/history`)}
                  >
                    View Full Report
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setTarget("");
                      setScanResults(null);
                      setScanProgress(0);
                      setSelectedDemoTarget(null);
                    }}
                  >
                    New Scan
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default Scan;