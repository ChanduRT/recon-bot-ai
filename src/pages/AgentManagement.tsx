import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import { 
  Brain, 
  Settings, 
  Activity, 
  Search, 
  Shield, 
  Target,
  AlertTriangle,
  CheckCircle,
  Clock,
  Zap
} from "lucide-react";

interface AIAgent {
  id: string;
  name: string;
  agent_type: string;
  description: string;
  is_active: boolean;
  config: any;
  prompt_template: string;
  created_at: string;
  updated_at: string;
}

interface AgentExecution {
  id: string;
  agent_id: string;
  status: string;
  execution_time_ms: number;
  created_at: string;
  completed_at: string;
  error_message?: string;
}

const AgentManagement = () => {
  const [agents, setAgents] = useState<AIAgent[]>([]);
  const [executions, setExecutions] = useState<AgentExecution[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchAgents();
    fetchExecutions();
  }, []);

  const fetchAgents = async () => {
    try {
      const { data, error } = await supabase
        .from('ai_agents')
        .select('*')
        .order('name');

      if (error) throw error;
      setAgents(data || []);
    } catch (error) {
      console.error('Error fetching agents:', error);
      toast({
        title: "Error",
        description: "Failed to load AI agents",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchExecutions = async () => {
    try {
      const { data, error } = await supabase
        .from('agent_executions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setExecutions(data || []);
    } catch (error) {
      console.error('Error fetching executions:', error);
    }
  };

  const toggleAgentStatus = async (agentId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('ai_agents')
        .update({ is_active: isActive })
        .eq('id', agentId);

      if (error) throw error;
      
      setAgents(prev => 
        prev.map(agent => 
          agent.id === agentId ? { ...agent, is_active: isActive } : agent
        )
      );

      toast({
        title: "Success",
        description: `Agent ${isActive ? 'activated' : 'deactivated'} successfully`,
      });
    } catch (error) {
      console.error('Error updating agent:', error);
      toast({
        title: "Error",
        description: "Failed to update agent status",
        variant: "destructive",
      });
    }
  };

  const getAgentTypeIcon = (type: string) => {
    switch (type) {
      case 'reconnaissance': return <Search className="w-5 h-5" />;
      case 'vulnerability': return <Shield className="w-5 h-5" />;
      case 'threat_intelligence': return <AlertTriangle className="w-5 h-5" />;
      case 'network_analysis': return <Target className="w-5 h-5" />;
      default: return <Brain className="w-5 h-5" />;
    }
  };

  const getAgentStats = (agentId: string) => {
    const agentExecutions = executions.filter(exec => exec.agent_id === agentId);
    const successful = agentExecutions.filter(exec => exec.status === 'completed').length;
    const failed = agentExecutions.filter(exec => exec.status === 'failed').length;
    const avgTime = agentExecutions.length > 0 
      ? Math.round(agentExecutions.reduce((sum, exec) => sum + (exec.execution_time_ms || 0), 0) / agentExecutions.length)
      : 0;

    return { total: agentExecutions.length, successful, failed, avgTime };
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'running': return <Clock className="w-4 h-4 text-blue-500 animate-spin" />;
      default: return <Clock className="w-4 h-4 text-yellow-500" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Brain className="w-8 h-8 animate-pulse text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="space-y-1">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Brain className="w-8 h-8 text-primary" />
            AI Agent Management
          </h1>
          <p className="text-muted-foreground">
            Monitor and configure your AI reconnaissance agents
          </p>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Agents</p>
                  <p className="text-2xl font-bold">{agents.length}</p>
                </div>
                <Brain className="w-8 h-8 text-primary" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active</p>
                  <p className="text-2xl font-bold text-green-500">
                    {agents.filter(a => a.is_active).length}
                  </p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Executions</p>
                  <p className="text-2xl font-bold">{executions.length}</p>
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
                  <p className="text-2xl font-bold text-green-500">
                    {executions.length > 0 
                      ? Math.round((executions.filter(e => e.status === 'completed').length / executions.length) * 100)
                      : 0
                    }%
                  </p>
                </div>
                <Zap className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Agents List */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">AI Agents</h2>
          {agents.map((agent) => {
            const stats = getAgentStats(agent.id);
            return (
              <Card key={agent.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      {getAgentTypeIcon(agent.agent_type)}
                      {agent.name}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant={agent.is_active ? "default" : "secondary"}
                        className={agent.is_active ? "bg-green-500" : ""}
                      >
                        {agent.is_active ? "Active" : "Inactive"}
                      </Badge>
                      <Switch
                        checked={agent.is_active}
                        onCheckedChange={(checked) => toggleAgentStatus(agent.id, checked)}
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium mb-2">Description</h4>
                      <p className="text-sm text-muted-foreground">{agent.description}</p>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Type</h4>
                      <Badge variant="outline" className="capitalize">
                        {agent.agent_type.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>

                  {/* Performance Metrics */}
                  <div className="border-t pt-4">
                    <h4 className="font-medium mb-3">Performance Metrics</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-primary">{stats.total}</p>
                        <p className="text-sm text-muted-foreground">Total Runs</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-green-500">{stats.successful}</p>
                        <p className="text-sm text-muted-foreground">Successful</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-red-500">{stats.failed}</p>
                        <p className="text-sm text-muted-foreground">Failed</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-blue-500">{stats.avgTime}ms</p>
                        <p className="text-sm text-muted-foreground">Avg Time</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button variant="outline" size="sm">
                      <Settings className="w-4 h-4 mr-2" />
                      Configure
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Recent Executions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Recent Agent Executions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {executions.slice(0, 10).map((execution) => {
                const agent = agents.find(a => a.id === execution.agent_id);
                return (
                  <div key={execution.id} className="flex items-center justify-between p-3 border rounded">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(execution.status)}
                      <div>
                        <p className="font-medium">{agent?.name || 'Unknown Agent'}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(execution.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium capitalize">{execution.status}</p>
                      {execution.execution_time_ms && (
                        <p className="text-sm text-muted-foreground">
                          {execution.execution_time_ms}ms
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
              {executions.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  No agent executions yet
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AgentManagement;