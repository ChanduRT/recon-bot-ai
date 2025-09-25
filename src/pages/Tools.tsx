import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Activity, 
  Terminal, 
  Wifi, 
  Search, 
  Shield, 
  Zap,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Brain,
  Target,
  Network,
  Eye,
  Loader2
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface ToolUsage {
  id: string;
  tool_name: string;
  target: string;
  status: 'running' | 'completed' | 'failed' | 'queued';
  started_at: string;
  completed_at?: string;
  ai_decision: string;
  reasoning: string;
  parameters: Record<string, any>;
  output?: string;
  execution_time_ms?: number;
}

interface ToolAvailability {
  name: string;
  available: boolean;
  version?: string;
  last_checked: string;
}

const Tools = () => {
  const [activeTools, setActiveTools] = useState<ToolUsage[]>([]);
  const [toolAvailability, setToolAvailability] = useState<ToolAvailability[]>([]);
  const [aiDecisions, setAiDecisions] = useState<ToolUsage[]>([]);
  const [loading, setLoading] = useState(true);
  const [isKaliDetected, setIsKaliDetected] = useState(false);
  const { toast } = useToast();

  const toolIcons: Record<string, any> = {
    nmap: Network,
    nikto: Shield,
    dirb: Search,
    gobuster: Search,
    masscan: Zap,
    sqlmap: Terminal,
    reconnaissance: Eye,
    default: Terminal
  };

  useEffect(() => {
    checkKaliEnvironment();
    fetchToolUsage();
    fetchAiDecisions();

    // Set up real-time subscriptions
    const toolUsageChannel = supabase
      .channel('tool-usage-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'agent_executions'
        },
        (payload) => {
          console.log('Tool usage update:', payload);
          fetchToolUsage();
        }
      )
      .subscribe();

    // Refresh data every 5 seconds for active tools
    const interval = setInterval(() => {
      fetchToolUsage();
    }, 5000);

    return () => {
      supabase.removeChannel(toolUsageChannel);
      clearInterval(interval);
    };
  }, []);

  const checkKaliEnvironment = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('kali-tools', {
        body: { action: 'check_environment' }
      });

      if (error) {
        console.error('Error checking Kali environment:', error);
        return;
      }

      setIsKaliDetected(data.isKali || false);
      
      const availability: ToolAvailability[] = Object.entries(data.availableTools || {}).map(([name, available]) => ({
        name,
        available: available as boolean,
        last_checked: new Date().toISOString()
      }));
      
      setToolAvailability(availability);
    } catch (error) {
      console.error('Error checking environment:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchToolUsage = async () => {
    try {
      const { data, error } = await supabase
        .from('agent_executions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Error fetching tool usage:', error);
        return;
      }

      const formattedData: ToolUsage[] = data.map(item => {
        const inputData = item.input_data as any;
        const outputData = item.output_data as any;
        
        return {
          id: item.id,
          tool_name: inputData?.tool || 'unknown',
          target: inputData?.target || 'N/A',
          status: item.status === 'completed' ? 'completed' : 
                  item.status === 'failed' ? 'failed' : 
                  item.status === 'running' ? 'running' : 'queued',
          started_at: item.created_at,
          completed_at: item.completed_at,
          ai_decision: inputData?.ai_decision || 'Automated tool selection',
          reasoning: inputData?.reasoning || 'Tool selected based on target analysis',
          parameters: inputData?.parameters || {},
          output: outputData?.output,
          execution_time_ms: item.execution_time_ms
        };
      });

      setActiveTools(formattedData);
      
      // Filter for recent AI decisions (last 24 hours)
      const recent = formattedData.filter(item => {
        const itemTime = new Date(item.started_at).getTime();
        const dayAgo = Date.now() - (24 * 60 * 60 * 1000);
        return itemTime > dayAgo;
      });
      
      setAiDecisions(recent);
    } catch (error) {
      console.error('Error fetching tool usage:', error);
    }
  };

  const fetchAiDecisions = async () => {
    // This will be populated by the fetchToolUsage function
    // We could also create a separate table for AI decisions if needed
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      running: 'default',
      completed: 'secondary',
      failed: 'destructive',
      queued: 'outline'
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'outline'}>
        <div className="flex items-center gap-1">
          {getStatusIcon(status)}
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </div>
      </Badge>
    );
  };

  const formatExecutionTime = (ms?: number) => {
    if (!ms) return 'N/A';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p>Checking tool availability...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Real-Time Tools Monitor</h1>
          <p className="text-muted-foreground">
            Monitor active tool usage and AI decision making in real-time
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isKaliDetected ? (
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              <CheckCircle className="h-3 w-3 mr-1" />
              Kali Linux Detected
            </Badge>
          ) : (
            <Badge variant="destructive">
              <AlertCircle className="h-3 w-3 mr-1" />
              Not Kali Linux
            </Badge>
          )}
        </div>
      </div>

      {/* Tool Availability Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Tool Availability Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {toolAvailability.map((tool) => {
              const IconComponent = toolIcons[tool.name] || toolIcons.default;
              return (
                <div key={tool.name} className="flex flex-col items-center p-3 border rounded-lg">
                  <IconComponent className={`h-6 w-6 mb-2 ${tool.available ? 'text-green-500' : 'text-red-500'}`} />
                  <span className="text-sm font-medium">{tool.name}</span>
                  <Badge variant={tool.available ? 'secondary' : 'destructive'} className="text-xs">
                    {tool.available ? 'Available' : 'Not Found'}
                  </Badge>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Tools */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Terminal className="h-5 w-5" />
              Active Tool Executions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {activeTools.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No active tool executions
                </p>
              ) : (
                activeTools.map((tool) => {
                  const IconComponent = toolIcons[tool.tool_name] || toolIcons.default;
                  return (
                    <div key={tool.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <IconComponent className="h-5 w-5" />
                        <div>
                          <div className="font-medium">{tool.tool_name}</div>
                          <div className="text-sm text-muted-foreground">
                            Target: {tool.target}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatExecutionTime(tool.execution_time_ms)} • 
                            {new Date(tool.started_at).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        {getStatusBadge(tool.status)}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        {/* AI Decision Log */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              AI Decision Log
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {aiDecisions.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No recent AI decisions
                </p>
              ) : (
                aiDecisions.map((decision) => (
                  <div key={decision.id} className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium flex items-center gap-2">
                        <Brain className="h-4 w-4" />
                        {decision.ai_decision}
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {decision.tool_name}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {decision.reasoning}
                    </p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Target: {decision.target}</span>
                      <span>{new Date(decision.started_at).toLocaleString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tool Parameters and Output */}
      {activeTools.filter(tool => tool.status === 'running').length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Running Tool Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activeTools
                .filter(tool => tool.status === 'running')
                .map((tool) => (
                  <div key={tool.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold">{tool.tool_name}</h3>
                      <Badge>Running</Badge>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-medium mb-2">Parameters</h4>
                        <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                          {JSON.stringify(tool.parameters, null, 2)}
                        </pre>
                      </div>
                      {tool.output && (
                        <div>
                          <h4 className="font-medium mb-2">Live Output</h4>
                          <pre className="text-xs bg-muted p-2 rounded max-h-32 overflow-auto">
                            {tool.output}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Tools;