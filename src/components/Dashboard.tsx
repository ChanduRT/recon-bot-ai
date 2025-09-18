import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Activity, 
  Shield, 
  AlertTriangle, 
  Brain, 
  TrendingUp,
  Clock,
  Target,
  Zap
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface DashboardStats {
  totalScans: number;
  activeScans: number;
  threatsDetected: number;
  agentExecutions: number;
  recentScans: any[];
}

export function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalScans: 0,
    activeScans: 0,
    threatsDetected: 0,
    agentExecutions: 0,
    recentScans: []
  });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch total scans
      const { count: totalScans } = await supabase
        .from('scans')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      // Fetch active scans
      const { count: activeScans } = await supabase
        .from('scans')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .in('status', ['pending', 'running']);

      // Fetch high/critical threats
      const { count: threatsDetected } = await supabase
        .from('scans')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .in('threat_level', ['high', 'critical']);

      // Fetch agent executions
      const { count: agentExecutions } = await supabase
        .from('agent_executions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      // Fetch recent scans
      const { data: recentScans } = await supabase
        .from('scans')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      setStats({
        totalScans: totalScans || 0,
        activeScans: activeScans || 0,
        threatsDetected: threatsDetected || 0,
        agentExecutions: agentExecutions || 0,
        recentScans: recentScans || []
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
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

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'running': return 'bg-blue-500';
      case 'pending': return 'bg-yellow-500';
      case 'failed': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Security Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor your reconnaissance activities and threat intelligence
          </p>
        </div>
        <Button onClick={() => navigate("/scan")} className="gap-2">
          <Target className="w-4 h-4" />
          New Scan
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Scans</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalScans}</div>
            <p className="text-xs text-muted-foreground">
              All time reconnaissance scans
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Scans</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeScans}</div>
            <p className="text-xs text-muted-foreground">
              Currently running scans
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Threats Detected</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.threatsDetected}</div>
            <p className="text-xs text-muted-foreground">
              High/Critical severity threats
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AI Executions</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.agentExecutions}</div>
            <p className="text-xs text-muted-foreground">
              AI agent analyses performed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Scans */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Recent Scans
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.recentScans.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  No scans yet. Create your first scan to get started.
                </p>
              ) : (
                stats.recentScans.map((scan) => (
                  <div key={scan.id} className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">{scan.target}</p>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {scan.asset_type}
                        </Badge>
                        <Badge 
                          className={`text-xs text-white ${getStatusBadgeColor(scan.status)}`}
                        >
                          {scan.status}
                        </Badge>
                        <Badge 
                          className={`text-xs text-white ${getThreatBadgeColor(scan.threat_level)}`}
                        >
                          {scan.threat_level}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(scan.created_at).toLocaleDateString()}
                    </div>
                  </div>
                ))
              )}
            </div>
            {stats.recentScans.length > 0 && (
              <div className="mt-4">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                  onClick={() => navigate("/history")}
                >
                  View All Scans
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full justify-start gap-2"
                onClick={() => navigate("/scan")}
              >
                <Target className="w-4 h-4" />
                Start New Reconnaissance
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full justify-start gap-2"
                onClick={() => navigate("/threats")}
              >
                <AlertTriangle className="w-4 h-4" />
                View Threat Intelligence
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full justify-start gap-2"
                onClick={() => navigate("/agents")}
              >
                <Brain className="w-4 h-4" />
                Manage AI Agents
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full justify-start gap-2"
                onClick={() => navigate("/network-scan")}
              >
                <Shield className="w-4 w-4" />
                Network Scanner
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}