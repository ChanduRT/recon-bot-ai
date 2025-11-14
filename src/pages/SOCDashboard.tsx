import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Layout } from "@/components/Layout";
import { useNavigate } from "react-router-dom";
import { 
  Activity, 
  Shield, 
  Target, 
  AlertTriangle, 
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  Zap,
  Brain,
  Radar,
  Eye
} from "lucide-react";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface ThreatEvent {
  id: string;
  timestamp: string;
  type: string;
  severity: string;
  source: string;
  description: string;
  status: string;
}

interface ActiveScan {
  id: string;
  target: string;
  asset_type: string;
  status: string;
  threat_level: string;
  progress: number;
  started_at: string;
}

interface APTSimulation {
  id: string;
  campaign_name: string;
  phase: string;
  status: string;
  progress: number;
  tactics: string[];
}

const SOCDashboard = () => {
  const navigate = useNavigate();
  const [threats, setThreats] = useState<ThreatEvent[]>([]);
  const [activeScans, setActiveScans] = useState<ActiveScan[]>([]);
  const [aptSimulations, setAPTSimulations] = useState<APTSimulation[]>([]);
  const [stats, setStats] = useState({
    activeThreats: 0,
    blockedAttacks: 0,
    activeScans: 0,
    riskScore: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
    
    // Set up real-time subscriptions
    const scansChannel = supabase
      .channel('soc-scans-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'scans' }, () => {
        fetchActiveScans();
      })
      .subscribe();

    const campaignsChannel = supabase
      .channel('soc-campaigns-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'apt_campaigns' }, () => {
        fetchAPTSimulations();
      })
      .subscribe();

    // Simulate real-time threat events
    const threatInterval = setInterval(() => {
      simulateNewThreat();
    }, 10000); // New threat every 10 seconds

    return () => {
      supabase.removeChannel(scansChannel);
      supabase.removeChannel(campaignsChannel);
      clearInterval(threatInterval);
    };
  }, []);

  const fetchDashboardData = async () => {
    await Promise.all([
      fetchThreatEvents(),
      fetchActiveScans(),
      fetchAPTSimulations(),
      fetchStats()
    ]);
    setLoading(false);
  };

  const fetchThreatEvents = () => {
    // Simulate threat events
    const mockThreats: ThreatEvent[] = [
      {
        id: "threat-1",
        timestamp: new Date().toISOString(),
        type: "Port Scan",
        severity: "medium",
        source: "192.168.1.45",
        description: "Multiple port scan attempts detected from external IP",
        status: "monitoring"
      },
      {
        id: "threat-2",
        timestamp: new Date(Date.now() - 300000).toISOString(),
        type: "Brute Force",
        severity: "high",
        source: "10.0.0.23",
        description: "Failed authentication attempts on SSH service",
        status: "blocked"
      },
      {
        id: "threat-3",
        timestamp: new Date(Date.now() - 600000).toISOString(),
        type: "Malware Detection",
        severity: "critical",
        source: "Internal Network",
        description: "Suspicious file hash matches known malware signature",
        status: "investigating"
      }
    ];
    setThreats(mockThreats);
  };

  const fetchActiveScans = async () => {
    try {
      const { data, error } = await supabase
        .from('scans')
        .select('*')
        .in('status', ['pending', 'running'])
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      
      const scansWithProgress = (data || []).map(scan => ({
        ...scan,
        started_at: scan.created_at,
        progress: scan.status === 'running' ? Math.floor(Math.random() * 80) + 20 : 0
      }));
      
      setActiveScans(scansWithProgress);
    } catch (error) {
      console.error('Error fetching active scans:', error);
    }
  };

  const fetchAPTSimulations = async () => {
    try {
      const { data, error } = await supabase
        .from('apt_campaigns')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(3);

      if (error) throw error;
      
      const simulations = (data || []).map(campaign => ({
        id: campaign.id,
        campaign_name: campaign.name,
        phase: "Reconnaissance",
        status: campaign.status,
        progress: Math.floor(Math.random() * 60) + 30,
        tactics: ["T1595", "T1590", "T1589"]
      }));
      
      setAPTSimulations(simulations);
    } catch (error) {
      console.error('Error fetching APT simulations:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const { data: scans, error: scansError } = await supabase
        .from('scans')
        .select('id, threat_level')
        .in('status', ['pending', 'running']);

      if (scansError) throw scansError;

      const activeThreatsCount = (scans || []).filter(s => 
        s.threat_level === 'high' || s.threat_level === 'critical'
      ).length;

      setStats({
        activeThreats: activeThreatsCount,
        blockedAttacks: Math.floor(Math.random() * 20) + 10,
        activeScans: scans?.length || 0,
        riskScore: Math.floor(Math.random() * 30) + 40
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const simulateNewThreat = () => {
    const threatTypes = ["Port Scan", "DDoS Attempt", "SQL Injection", "XSS Attack", "Phishing"];
    const severities = ["low", "medium", "high", "critical"];
    const statuses = ["monitoring", "blocked", "investigating"];

    const newThreat: ThreatEvent = {
      id: `threat-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: threatTypes[Math.floor(Math.random() * threatTypes.length)],
      severity: severities[Math.floor(Math.random() * severities.length)],
      source: `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
      description: "Real-time threat detection from network monitoring",
      status: statuses[Math.floor(Math.random() * statuses.length)]
    };

    setThreats(prev => [newThreat, ...prev.slice(0, 9)]);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical': return 'bg-red-500 hover:bg-red-600';
      case 'high': return 'bg-orange-500 hover:bg-orange-600';
      case 'medium': return 'bg-yellow-500 hover:bg-yellow-600';
      default: return 'bg-blue-500 hover:bg-blue-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'blocked': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'monitoring': return <Eye className="w-4 h-4 text-yellow-500" />;
      case 'investigating': return <Activity className="w-4 h-4 text-blue-500" />;
      default: return <CheckCircle className="w-4 h-4 text-green-500" />;
    }
  };

  const threatChartData = [
    { name: '00:00', threats: 12 },
    { name: '04:00', threats: 8 },
    { name: '08:00', threats: 23 },
    { name: '12:00', threats: 34 },
    { name: '16:00', threats: 28 },
    { name: '20:00', threats: 19 },
    { name: 'Now', threats: threats.length }
  ];

  const threatTypeData = [
    { name: 'Port Scans', value: 35, color: '#3b82f6' },
    { name: 'Brute Force', value: 25, color: '#f59e0b' },
    { name: 'Malware', value: 20, color: '#ef4444' },
    { name: 'DDoS', value: 15, color: '#8b5cf6' },
    { name: 'Other', value: 5, color: '#6b7280' }
  ];

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold flex items-center gap-3">
              <Radar className="w-8 h-8" />
              Security Operations Center
            </h1>
            <p className="text-muted-foreground mt-2">
              Real-time threat monitoring and security operations dashboard
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => navigate('/scan')}>
              <Target className="w-4 h-4 mr-2" />
              New Scan
            </Button>
            <Button onClick={() => navigate('/apt-planning')}>
              <Brain className="w-4 h-4 mr-2" />
              APT Planning
            </Button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid gap-6 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active Threats</p>
                  <p className="text-3xl font-bold text-red-500">{stats.activeThreats}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Blocked Attacks</p>
                  <p className="text-3xl font-bold text-green-500">{stats.blockedAttacks}</p>
                </div>
                <Shield className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active Scans</p>
                  <p className="text-3xl font-bold text-blue-500">{stats.activeScans}</p>
                </div>
                <Activity className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Risk Score</p>
                  <p className="text-3xl font-bold text-orange-500">{stats.riskScore}/100</p>
                </div>
                <TrendingUp className="w-8 h-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Threat Activity (24h)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={threatChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="threats" stroke="#ef4444" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Threat Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={threatTypeData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {threatTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="threats" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="threats">
              <AlertTriangle className="w-4 h-4 mr-2" />
              Live Threats ({threats.length})
            </TabsTrigger>
            <TabsTrigger value="scans">
              <Target className="w-4 h-4 mr-2" />
              Active Scans ({activeScans.length})
            </TabsTrigger>
            <TabsTrigger value="apt">
              <Brain className="w-4 h-4 mr-2" />
              APT Simulations ({aptSimulations.length})
            </TabsTrigger>
          </TabsList>

          {/* Threats Tab */}
          <TabsContent value="threats" className="space-y-4 mt-6">
            {threats.map((threat) => (
              <Card key={threat.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      {getStatusIcon(threat.status)}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">{threat.type}</h3>
                          <Badge className={getSeverityColor(threat.severity)}>
                            {threat.severity}
                          </Badge>
                          <Badge variant="outline">{threat.status}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{threat.description}</p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(threat.timestamp).toLocaleTimeString()}
                          </span>
                          <span>Source: {threat.source}</span>
                        </div>
                      </div>
                    </div>
                    <Button size="sm" variant="outline">Investigate</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* Active Scans Tab */}
          <TabsContent value="scans" className="space-y-4 mt-6">
            {activeScans.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center text-muted-foreground">
                  No active scans. Start a new scan to monitor targets.
                </CardContent>
              </Card>
            ) : (
              activeScans.map((scan) => (
                <Card key={scan.id}>
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold">{scan.target}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline">{scan.asset_type}</Badge>
                            <Badge className={getSeverityColor(scan.threat_level)}>
                              {scan.threat_level}
                            </Badge>
                          </div>
                        </div>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => navigate(`/scan-details/${scan.id}`)}
                        >
                          View Details
                        </Button>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Progress</span>
                          <span className="font-medium">{scan.progress}%</span>
                        </div>
                        <Progress value={scan.progress} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* APT Simulations Tab */}
          <TabsContent value="apt" className="space-y-4 mt-6">
            {aptSimulations.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center text-muted-foreground">
                  No active APT simulations. Create a new campaign to begin testing.
                </CardContent>
              </Card>
            ) : (
              aptSimulations.map((sim) => (
                <Card key={sim.id}>
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold">{sim.campaign_name}</h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            Current Phase: {sim.phase}
                          </p>
                          <div className="flex gap-2 mt-2">
                            {sim.tactics.map((tactic) => (
                              <Badge key={tactic} variant="outline" className="text-xs">
                                {tactic}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => navigate('/apt-planning')}
                        >
                          View Campaign
                        </Button>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Campaign Progress</span>
                          <span className="font-medium">{sim.progress}%</span>
                        </div>
                        <Progress value={sim.progress} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default SOCDashboard;
