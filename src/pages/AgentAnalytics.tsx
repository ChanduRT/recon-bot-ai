import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/use-toast";
import { 
  Brain,
  Activity,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertTriangle,
  Zap,
  Target,
  BarChart3,
  RefreshCw
} from "lucide-react";

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
  scan_id: string;
}

interface AIAgent {
  id: string;
  name: string;
  agent_type: string;
  description: string;
  is_active: boolean;
}

interface AgentMetrics {
  id: string;
  name: string;
  type: string;
  totalExecutions: number;
  successCount: number;
  failureCount: number;
  avgExecutionTime: number;
  successRate: number;
  isActive: boolean;
  recentExecutions: AgentExecution[];
}

const AgentAnalytics = () => {
  const [agents, setAgents] = useState<AIAgent[]>([]);
  const [executions, setExecutions] = useState<AgentExecution[]>([]);
  const [metrics, setMetrics] = useState<AgentMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [liveExecutions, setLiveExecutions] = useState<AgentExecution[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
    setupRealtimeSubscription();
  }, []);

  useEffect(() => {
    if (agents.length > 0 && executions.length >= 0) {
      calculateMetrics();
    }
  }, [agents, executions]);

  const fetchData = async () => {
    try {
      // Fetch agents
      const { data: agentsData, error: agentsError } = await supabase
        .from('ai_agents')
        .select('*')
        .order('name');

      if (agentsError) throw agentsError;

      // Fetch executions
      const { data: executionsData, error: executionsError } = await supabase
        .from('agent_executions')
        .select('*')
        .order('created_at', { ascending: false });

      if (executionsError) throw executionsError;

      setAgents(agentsData || []);
      setExecutions(executionsData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to load agent analytics",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    // Subscribe to real-time updates for agent executions
    const channel = supabase
      .channel('agent-analytics')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'agent_executions'
        },
        (payload) => {
          console.log('Real-time agent execution update:', payload);
          
          if (payload.eventType === 'INSERT') {
            setLiveExecutions(prev => [payload.new as AgentExecution, ...prev.slice(0, 9)]);
            setExecutions(prev => [payload.new as AgentExecution, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setExecutions(prev => 
              prev.map(exec => 
                exec.id === payload.new.id ? payload.new as AgentExecution : exec
              )
            );
            setLiveExecutions(prev =>
              prev.map(exec =>
                exec.id === payload.new.id ? payload.new as AgentExecution : exec
              )
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const calculateMetrics = () => {
    const agentMetrics = agents.map(agent => {
      const agentExecutions = executions.filter(exec => exec.agent_id === agent.id);
      const successCount = agentExecutions.filter(exec => exec.status === 'completed').length;
      const failureCount = agentExecutions.filter(exec => exec.status === 'failed').length;
      const totalExecutions = agentExecutions.length;
      
      const avgExecutionTime = totalExecutions > 0
        ? Math.round(
            agentExecutions
              .filter(exec => exec.execution_time_ms)
              .reduce((sum, exec) => sum + (exec.execution_time_ms || 0), 0) / totalExecutions
          )
        : 0;

      const successRate = totalExecutions > 0 ? Math.round((successCount / totalExecutions) * 100) : 0;

      return {
        id: agent.id,
        name: agent.name,
        type: agent.agent_type,
        totalExecutions,
        successCount,
        failureCount,
        avgExecutionTime,
        successRate,
        isActive: agent.is_active,
        recentExecutions: agentExecutions.slice(0, 5)
      };
    });

    setMetrics(agentMetrics);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'running': return <Clock className="w-4 h-4 text-blue-500 animate-spin" />;
      default: return <Clock className="w-4 h-4 text-yellow-500" />;
    }
  };

  const getAgentTypeIcon = (type: string) => {
    switch (type) {
      case 'reconnaissance': return <Target className="w-4 h-4" />;
      case 'vulnerability': return <AlertTriangle className="w-4 h-4" />;
      case 'threat_intelligence': return <Brain className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  const totalExecutions = executions.length;
  const completedExecutions = executions.filter(exec => exec.status === 'completed').length;
  const failedExecutions = executions.filter(exec => exec.status === 'failed').length;
  const runningExecutions = executions.filter(exec => exec.status === 'running').length;
  const overallSuccessRate = totalExecutions > 0 ? Math.round((completedExecutions / totalExecutions) * 100) : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="space-y-1">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BarChart3 className="w-8 h-8 text-primary" />
            AI Agent Analytics
          </h1>
          <p className="text-muted-foreground">
            Real-time monitoring and performance analytics for your AI reconnaissance agents
          </p>
        </div>

        {/* Overall Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Executions</p>
                  <p className="text-2xl font-bold">{totalExecutions}</p>
                </div>
                <Activity className="w-8 h-8 text-primary" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Success Rate</p>
                  <p className="text-2xl font-bold text-green-500">{overallSuccessRate}%</p>
                </div>
                <TrendingUp className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Agents</p>
                  <p className="text-2xl font-bold">{agents.filter(a => a.is_active).length}</p>
                </div>
                <Brain className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Running Now</p>
                  <p className="text-2xl font-bold text-blue-500">{runningExecutions}</p>
                </div>
                <Zap className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Agent Performance */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-xl font-semibold">Agent Performance</h2>
            <div className="space-y-4">
              {metrics.map((metric) => (
                <Card key={metric.id}>
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getAgentTypeIcon(metric.type)}
                          <div>
                            <h3 className="font-semibold">{metric.name}</h3>
                            <p className="text-sm text-muted-foreground capitalize">
                              {metric.type.replace('_', ' ')}
                            </p>
                          </div>
                        </div>
                        <Badge 
                          variant={metric.isActive ? "default" : "secondary"}
                          className={metric.isActive ? "bg-green-500" : ""}
                        >
                          {metric.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center">
                          <p className="text-lg font-bold">{metric.totalExecutions}</p>
                          <p className="text-xs text-muted-foreground">Total Runs</p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-bold text-green-500">{metric.successCount}</p>
                          <p className="text-xs text-muted-foreground">Successful</p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-bold text-red-500">{metric.failureCount}</p>
                          <p className="text-xs text-muted-foreground">Failed</p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-bold text-blue-500">{metric.avgExecutionTime}ms</p>
                          <p className="text-xs text-muted-foreground">Avg Time</p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Success Rate</span>
                          <span>{metric.successRate}%</span>
                        </div>
                        <Progress value={metric.successRate} className="h-2" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Live Activity Feed */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Live Agent Activity</h2>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Real-time Executions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(liveExecutions.length > 0 ? liveExecutions : executions.slice(0, 10)).map((execution) => {
                    const agent = agents.find(a => a.id === execution.agent_id);
                    return (
                      <div key={execution.id} className="flex items-center gap-3 p-2 border rounded">
                        {getStatusIcon(execution.status)}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">
                            {agent?.name || 'Unknown Agent'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(execution.created_at).toLocaleTimeString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge 
                            variant="outline" 
                            className="text-xs capitalize"
                          >
                            {execution.status}
                          </Badge>
                          {execution.execution_time_ms && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {execution.execution_time_ms}ms
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {executions.length === 0 && liveExecutions.length === 0 && (
                    <p className="text-center text-muted-foreground py-8 text-sm">
                      No agent executions yet. Start a scan to see live activity.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgentAnalytics;