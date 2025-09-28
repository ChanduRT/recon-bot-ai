import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Shield, Target, FileText, Download, Plus, Activity, Brain, AlertTriangle } from "lucide-react";
import { MitreMatrix } from "@/components/MitreMatrix";
import { KillChainTimeline } from "@/components/KillChainTimeline";
import { AttackPathVisualization } from "@/components/AttackPathVisualization";
import { ReportGenerator } from "@/components/ReportGenerator";

interface APTCampaign {
  id: string;
  name: string;
  description?: string;
  target_organization?: string;
  status: string;
  objectives?: string[];
  scope_definition?: string;
  created_at: string;
  updated_at: string;
}

interface Scan {
  id: string;
  target: string;
  asset_type: string;
  status: string;
  threat_level: string;
  results: any;
  created_at: string;
}

interface AttackPath {
  id: string;
  campaign_id: string;
  phase: string;
  mitre_tactic?: string;
  mitre_technique?: string;
  technique_name?: string;
  description?: string;
  risk_level: string;
  status: string;
  tools_required?: string[];
  execution_order?: number;
}

const APTPlanning = () => {
  const [user, setUser] = useState(null);
  const [campaigns, setCampaigns] = useState<APTCampaign[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>("");
  const [scans, setScans] = useState<Scan[]>([]);
  const [attackPaths, setAttackPaths] = useState<AttackPath[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          fetchData();
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchData();
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch APT campaigns
      const { data: campaignsData, error: campaignsError } = await supabase
        .from('apt_campaigns')
        .select('*')
        .order('created_at', { ascending: false });

      if (campaignsError) throw campaignsError;
      setCampaigns(campaignsData || []);

      // Fetch recent scans for target selection
      const { data: scansData, error: scansError } = await supabase
        .from('scans')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (scansError) throw scansError;
      setScans(scansData || []);

      // Fetch attack paths if campaign is selected
      if (selectedCampaignId) {
        const { data: pathsData, error: pathsError } = await supabase
          .from('attack_paths')
          .select('*')
          .eq('campaign_id', selectedCampaignId)
          .order('execution_order', { ascending: true });

        if (pathsError) throw pathsError;
        setAttackPaths(pathsData || []);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const createNewCampaign = async () => {
    try {
      const { data, error } = await supabase
        .from('apt_campaigns')
        .insert([
          {
            name: `APT Campaign ${new Date().toLocaleDateString()}`,
            description: "New APT simulation campaign",
            status: 'planning',
            user_id: user?.id
          }
        ])
        .select()
        .single();

      if (error) throw error;

      setCampaigns([data, ...campaigns]);
      setSelectedCampaignId(data.id);
      toast({
        title: "Success",
        description: "New APT campaign created",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planning': return 'bg-blue-500';
      case 'active': return 'bg-orange-500';
      case 'completed': return 'bg-green-500';
      case 'paused': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'bg-green-500';
      case 'medium': return 'bg-yellow-500';
      case 'high': return 'bg-orange-500';
      case 'critical': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Layout user={user}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">APT Simulation Planning</h1>
            <p className="text-muted-foreground">
              Plan Advanced Persistent Threat simulations using MITRE ATT&CK framework
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={createNewCampaign} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              New Campaign
            </Button>
          </div>
        </div>

        {/* Campaign Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Campaign Selection
            </CardTitle>
            <CardDescription>
              Select or create an APT campaign to begin planning attack paths
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 items-center">
              <Select value={selectedCampaignId} onValueChange={setSelectedCampaignId}>
                <SelectTrigger className="w-[300px]">
                  <SelectValue placeholder="Select a campaign" />
                </SelectTrigger>
                <SelectContent>
                  {campaigns.map((campaign) => (
                    <SelectItem key={campaign.id} value={campaign.id}>
                      <div className="flex items-center gap-2">
                        <Badge className={getStatusColor(campaign.status)}>
                          {campaign.status}
                        </Badge>
                        {campaign.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {selectedCampaignId && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Activity className="h-4 w-4" />
                  {attackPaths.length} attack paths planned
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Legal & Ethical Compliance Notice */}
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Legal Notice:</strong> This APT simulation platform is designed for authorized 
            penetration testing within your own organization. Ensure you have proper written 
            authorization before conducting any security testing activities.
          </AlertDescription>
        </Alert>

        {selectedCampaignId ? (
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="control">Control</TabsTrigger>
              <TabsTrigger value="mitre">MITRE</TabsTrigger>
              <TabsTrigger value="killchain">Kill Chain</TabsTrigger>
              <TabsTrigger value="execution">Execute</TabsTrigger>
              <TabsTrigger value="reports">Reports</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Target Intelligence */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5" />
                      Target Intelligence
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium mb-2">Recent Scans</h4>
                        <div className="space-y-2">
                          {scans.slice(0, 5).map((scan) => (
                            <div key={scan.id} className="flex items-center justify-between p-2 border rounded">
                              <div>
                                <div className="font-medium">{scan.target}</div>
                                <div className="text-sm text-muted-foreground">{scan.asset_type}</div>
                              </div>
                              <Badge className={getRiskColor(scan.threat_level)}>
                                {scan.threat_level}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Campaign Status */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Brain className="h-5 w-5" />
                      AI Recommendations
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <Alert>
                        <AlertDescription>
                          Based on scan results, consider focusing on:
                          <ul className="list-disc list-inside mt-2">
                            <li>Web application vulnerabilities (OWASP Top 10)</li>
                            <li>Network service enumeration</li>
                            <li>Social engineering vectors</li>
                            <li>Privilege escalation techniques</li>
                          </ul>
                        </AlertDescription>
                      </Alert>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="control">
              <CampaignManager
                campaign={campaigns.find(c => c.id === selectedCampaignId)}
                scans={scans}
                attackPaths={attackPaths}
                onCampaignUpdate={fetchData}
              />
            </TabsContent>

            <TabsContent value="mitre">
              <MitreMatrix 
                campaignId={selectedCampaignId}
                scans={scans}
                onTechniqueSelect={fetchData}
              />
            </TabsContent>

            <TabsContent value="killchain">
              <KillChainTimeline 
                campaignId={selectedCampaignId}
                attackPaths={attackPaths}
              />
            </TabsContent>

            <TabsContent value="execution">
              <AttackExecutor
                campaign={campaigns.find(c => c.id === selectedCampaignId)}
                attackPaths={attackPaths}
                onPathUpdate={fetchData}
              />
            </TabsContent>

            <TabsContent value="reports">
              <ReportGenerator 
                campaignId={selectedCampaignId}
                scans={scans}
                attackPaths={attackPaths}
              />
            </TabsContent>
          </Tabs>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Target className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Campaign Selected</h3>
              <p className="text-muted-foreground text-center mb-4">
                Select an existing campaign or create a new one to start planning your APT simulation
              </p>
              <Button onClick={createNewCampaign}>
                <Plus className="h-4 w-4 mr-2" />
                Create Campaign
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default APTPlanning;