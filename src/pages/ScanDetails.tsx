import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { 
  ArrowLeft,
  Target,
  AlertTriangle,
  CheckCircle,
  Clock,
  Brain,
  Activity,
  Shield,
  FileText,
  Download,
  Bug
} from "lucide-react";
import VulnerabilityAssessment from "@/components/VulnerabilityAssessment";

interface ScanDetails {
  id: string;
  target: string;
  asset_type: string;
  status: string;
  threat_level: string;
  created_at: string;
  completed_at: string;
  results: any;
  metadata: any;
}

interface AgentExecution {
  id: string;
  agent_id: string;
  status: string;
  input_data: any;
  output_data: any;
  execution_time_ms: number;
  created_at: string;
  completed_at: string;
  error_message?: string;
}

const ScanDetails = () => {
  const { scanId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [scan, setScan] = useState<ScanDetails | null>(null);
  const [executions, setExecutions] = useState<AgentExecution[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (scanId) {
      fetchScanDetails();
      fetchAgentExecutions();
      fetchAgents();
    }
  }, [scanId]);

  const fetchScanDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('scans')
        .select('*')
        .eq('id', scanId)
        .single();

      if (error) throw error;
      setScan(data);
    } catch (error) {
      console.error('Error fetching scan details:', error);
      toast({
        title: "Error",
        description: "Failed to load scan details",
        variant: "destructive",
      });
      navigate('/history');
    }
  };

  const fetchAgentExecutions = async () => {
    try {
      const { data, error } = await supabase
        .from('agent_executions')
        .select('*')
        .eq('scan_id', scanId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setExecutions(data || []);
    } catch (error) {
      console.error('Error fetching agent executions:', error);
    }
  };

  const fetchAgents = async () => {
    try {
      const { data, error } = await supabase
        .from('ai_agents')
        .select('*');

      if (error) throw error;
      setAgents(data || []);
    } catch (error) {
      console.error('Error fetching agents:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'running': return <Clock className="w-4 h-4 text-blue-500 animate-spin" />;
      default: return <Clock className="w-4 h-4 text-yellow-500" />;
    }
  };

  const getThreatBadgeColor = (level: string) => {
    switch (level) {
      case 'critical': return 'bg-red-500 hover:bg-red-600';
      case 'high': return 'bg-orange-500 hover:bg-orange-600';
      case 'medium': return 'bg-yellow-500 hover:bg-yellow-600';
      default: return 'bg-green-500 hover:bg-green-600';
    }
  };

  const getAgentName = (agentId: string) => {
    const agent = agents.find(a => a.id === agentId);
    return agent?.name || 'Unknown Agent';
  };

  const exportResults = () => {
    if (scan?.results) {
      const dataStr = JSON.stringify(scan.results, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      
      const exportFileDefaultName = `scan-results-${scan.target}-${new Date().toISOString().split('T')[0]}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
    }
  };

  if (loading || !scan) {
    return (
      <div className="flex items-center justify-center h-64">
        <Clock className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/history')}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to History
            </Button>
            <div className="space-y-1">
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <Target className="w-8 h-8 text-primary" />
                Scan Details
              </h1>
              <p className="text-muted-foreground">
                Detailed analysis results for {scan.target}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={exportResults} variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export Results
            </Button>
          </div>
        </div>

        {/* Scan Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getStatusIcon(scan.status)}
                {scan.target}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="capitalize">
                  {scan.asset_type}
                </Badge>
                <Badge className={`text-white ${getThreatBadgeColor(scan.threat_level)}`}>
                  {scan.threat_level} Risk
                </Badge>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm font-medium">Status</p>
                <p className="text-lg capitalize">{scan.status}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Started</p>
                <p className="text-lg">{new Date(scan.created_at).toLocaleString()}</p>
              </div>
              {scan.completed_at && (
                <div>
                  <p className="text-sm font-medium">Completed</p>
                  <p className="text-lg">{new Date(scan.completed_at).toLocaleString()}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Detailed Results */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="vulnerabilities">
              <Bug className="w-4 h-4 mr-2" />
              Vulnerabilities
            </TabsTrigger>
            <TabsTrigger value="agents">AI Analysis</TabsTrigger>
            <TabsTrigger value="raw">Raw Data</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {/* Risk Assessment Summary - Show First */}
            <Card className="border-l-4" style={{ borderLeftColor: scan.threat_level === 'critical' ? '#ef4444' : scan.threat_level === 'high' ? '#f97316' : scan.threat_level === 'medium' ? '#eab308' : '#22c55e' }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Risk Assessment Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <p className="text-sm font-medium text-muted-foreground">Overall Risk Score</p>
                    <p className="text-3xl font-bold mt-1">
                      {scan.results?.risk_score ? scan.results.risk_score.toFixed(1) : 'N/A'}/10
                    </p>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <p className="text-sm font-medium text-muted-foreground">Threat Level</p>
                    <Badge className={`text-white mt-2 text-lg px-4 py-1 ${getThreatBadgeColor(scan.threat_level)}`}>
                      {scan.threat_level.toUpperCase()}
                    </Badge>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <p className="text-sm font-medium text-muted-foreground">CVE Vulnerabilities</p>
                    <p className="text-3xl font-bold mt-1">
                      {scan.results?.vulnerabilities?.length || 0}
                    </p>
                  </div>
                </div>

                {/* Risk Factors - Show why it's marked as high risk */}
                {scan.threat_level !== 'low' && (
                  <div className="mt-4 p-4 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-900">
                    <h4 className="font-semibold text-orange-800 dark:text-orange-400 mb-2">
                      Risk Factors Contributing to {scan.threat_level.toUpperCase()} Threat Level:
                    </h4>
                    <ul className="space-y-2 text-sm text-orange-700 dark:text-orange-300">
                      {scan.results?.risk_score >= 6 && (
                        <li className="flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          <span>AI agents detected a high risk score of {scan.results.risk_score.toFixed(1)}/10 based on security analysis</span>
                        </li>
                      )}
                      {scan.results?.vulnerabilities?.length > 0 && (
                        <li className="flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          <span>{scan.results.vulnerabilities.length} specific vulnerabilities identified with CVE references</span>
                        </li>
                      )}
                      {scan.results?.findings?.length > 0 && (
                        <li className="flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          <span>{scan.results.findings.length} security concerns and potential attack vectors detected</span>
                        </li>
                      )}
                      {scan.results?.open_ports?.length > 0 && (
                        <li className="flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          <span>{scan.results.open_ports.length} open ports discovered, expanding attack surface</span>
                        </li>
                      )}
                      {scan.results?.recent_threat_intelligence && (
                        <li className="flex items-start gap-2">
                          <Activity className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          <span>Recent threat intelligence indicates potential vulnerabilities in this target</span>
                        </li>
                      )}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Security Findings from AI Analysis */}
            {scan.results?.findings && Array.isArray(scan.results.findings) && scan.results.findings.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="w-5 h-5" />
                    AI-Detected Security Concerns
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {scan.results.findings.map((finding: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2 p-3 bg-muted rounded-lg">
                        <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0 text-orange-500" />
                        <span className="text-sm">{finding}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Recent Threat Intelligence from Perplexity */}
            {scan.results?.recent_threat_intelligence && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Recent Threat Intelligence
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-sm max-w-none">
                    <p className="whitespace-pre-wrap text-sm">
                      {scan.results.recent_threat_intelligence.recent_vulnerabilities}
                    </p>
                    <p className="text-xs text-muted-foreground mt-4">
                      Data gathered: {new Date(scan.results.recent_threat_intelligence.timestamp).toLocaleString()}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Vulnerabilities Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-orange-500" />
                  Specific CVE Vulnerabilities
                </CardTitle>
              </CardHeader>
              <CardContent>
                {scan.results?.vulnerabilities && Array.isArray(scan.results.vulnerabilities) && scan.results.vulnerabilities.length > 0 ? (
                  <div className="space-y-4">
                    {scan.results.vulnerabilities.map((vuln: any, idx: number) => (
                      <div key={idx} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <h4 className="font-semibold text-lg">{vuln.name || vuln.title || `Vulnerability #${idx + 1}`}</h4>
                            {vuln.cve && (
                              <Badge variant="destructive" className="font-mono">
                                {vuln.cve}
                              </Badge>
                            )}
                          </div>
                          {vuln.severity && (
                            <Badge className={`${getThreatBadgeColor(vuln.severity.toLowerCase())} text-white`}>
                              {vuln.severity}
                            </Badge>
                          )}
                        </div>
                        
                        {vuln.description && (
                          <p className="text-sm text-muted-foreground">{vuln.description}</p>
                        )}
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                          {vuln.cvss_score && (
                            <div>
                              <span className="font-medium">CVSS Score:</span>
                              <p className="text-muted-foreground">{vuln.cvss_score}</p>
                            </div>
                          )}
                          {vuln.exploitability && (
                            <div>
                              <span className="font-medium">Exploitability:</span>
                              <p className="text-muted-foreground capitalize">{vuln.exploitability}</p>
                            </div>
                          )}
                          {vuln.port && (
                            <div>
                              <span className="font-medium">Port:</span>
                              <p className="text-muted-foreground">{vuln.port}</p>
                            </div>
                          )}
                          {vuln.service && (
                            <div>
                              <span className="font-medium">Service:</span>
                              <p className="text-muted-foreground">{vuln.service}</p>
                            </div>
                          )}
                        </div>
                        
                        {vuln.mitigation && (
                          <div className="mt-3 p-3 bg-green-50 dark:bg-green-950/20 rounded border border-green-200 dark:border-green-900">
                            <p className="text-sm font-medium text-green-800 dark:text-green-400 mb-1">
                              Recommended Mitigation:
                            </p>
                            <p className="text-sm text-green-700 dark:text-green-300">{vuln.mitigation}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : scan.results?.open_ports ? (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground mb-3">
                      No structured vulnerability data available. Showing open ports and services:
                    </p>
                    {Array.isArray(scan.results.open_ports) && scan.results.open_ports.map((port: any, idx: number) => (
                      <div key={idx} className="border rounded-lg p-3 flex items-center justify-between">
                        <div>
                          <span className="font-medium">Port {port.port || port}</span>
                          {port.service && (
                            <span className="text-muted-foreground ml-2">- {port.service}</span>
                          )}
                        </div>
                        {port.version && (
                          <Badge variant="outline">{port.version}</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">No vulnerabilities identified in this scan</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Security Assessment */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Security Assessment Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                {scan.results && typeof scan.results === 'object' ? (
                  <div className="space-y-4">
                    {Object.entries(scan.results)
                      .filter(([key]) => key !== 'vulnerabilities') // Hide vulnerabilities as we show them above
                      .map(([key, value]) => (
                        <div key={key} className="border-l-4 border-primary pl-4">
                          <h4 className="font-medium capitalize">{key.replace(/_/g, ' ')}</h4>
                          <pre className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">
                            {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                          </pre>
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No detailed results available</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="vulnerabilities" className="space-y-4">
            <VulnerabilityAssessment scanResults={scan.results} target={scan.target} />
          </TabsContent>

          <TabsContent value="agents" className="space-y-4">
            <div className="space-y-4">
              {executions.length === 0 ? (
                <Card>
                  <CardContent className="pt-6 text-center">
                    <Brain className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No AI Analysis Available</h3>
                    <p className="text-muted-foreground">
                      This scan hasn't been analyzed by AI agents yet.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                executions.map((execution) => (
                  <Card key={execution.id}>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Brain className="w-5 h-5" />
                          {getAgentName(execution.agent_id)}
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(execution.status)}
                          <Badge variant="outline" className="capitalize">
                            {execution.status}
                          </Badge>
                          {execution.execution_time_ms && (
                            <Badge variant="secondary">
                              {execution.execution_time_ms}ms
                            </Badge>
                          )}
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {execution.output_data && (
                        <div>
                          <h4 className="font-medium mb-2">Analysis Results</h4>
                          <pre className="text-sm bg-muted p-4 rounded whitespace-pre-wrap">
                            {JSON.stringify(execution.output_data, null, 2)}
                          </pre>
                        </div>
                      )}
                      {execution.error_message && (
                        <div>
                          <h4 className="font-medium mb-2 text-red-500">Error</h4>
                          <p className="text-sm text-red-600 bg-red-50 p-3 rounded">
                            {execution.error_message}
                          </p>
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground">
                        Executed: {new Date(execution.created_at).toLocaleString()}
                        {execution.completed_at && (
                          <span> - Completed: {new Date(execution.completed_at).toLocaleString()}</span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="raw" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Raw Scan Data
                </CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-sm bg-muted p-4 rounded overflow-auto max-h-96">
                  {JSON.stringify(scan, null, 2)}
                </pre>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ScanDetails;