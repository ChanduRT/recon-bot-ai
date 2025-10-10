import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Shield, Play, Pause, SkipBack, SkipForward, RotateCcw, AlertTriangle, GraduationCap, Target } from "lucide-react";
import { APTLifecycleTimeline } from "@/components/APTLifecycleTimeline";
import { APTPhaseSimulation } from "@/components/APTPhaseSimulation";

const APTPlanning = () => {
  const [user, setUser] = useState(null);
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<string>("");
  const { toast } = useToast();

  const totalPhases = 8;

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          fetchCampaigns();
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchCampaigns();
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchCampaigns = async () => {
    try {
      const { data, error } = await supabase
        .from('apt_campaigns')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCampaigns(data || []);
      
      // Auto-select first campaign if available
      if (data && data.length > 0 && !selectedCampaign) {
        setSelectedCampaign(data[0].id);
      }
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      toast({
        title: "Error",
        description: "Failed to load campaigns",
        variant: "destructive",
      });
    }
  };

  // Auto-advance phases when playing
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setCurrentPhaseIndex(prev => {
        if (prev >= totalPhases - 1) {
          setIsPlaying(false);
          toast({
            title: "Simulation Complete",
            description: "APT lifecycle simulation has finished",
          });
          return prev;
        }
        return prev + 1;
      });
    }, 10000); // Advance every 10 seconds

    return () => clearInterval(interval);
  }, [isPlaying, toast]);

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
    if (!isPlaying) {
      toast({
        title: "Simulation Started",
        description: "APT lifecycle simulation is now playing",
      });
    }
  };

  const handlePrevious = () => {
    if (currentPhaseIndex > 0) {
      setCurrentPhaseIndex(currentPhaseIndex - 1);
      setIsPlaying(false);
    }
  };

  const handleNext = () => {
    if (currentPhaseIndex < totalPhases - 1) {
      setCurrentPhaseIndex(currentPhaseIndex + 1);
    }
  };

  const handleReset = () => {
    setCurrentPhaseIndex(0);
    setIsPlaying(false);
    toast({
      title: "Simulation Reset",
      description: "APT lifecycle simulation has been reset to the beginning",
    });
  };

  const handlePhaseClick = (index: number) => {
    setCurrentPhaseIndex(index);
    setIsPlaying(false);
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
            <div className="flex items-center gap-3">
              <GraduationCap className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-3xl font-bold tracking-tight">APT Lifecycle Simulation</h1>
                <p className="text-muted-foreground">
                  Educational training on Advanced Persistent Threat detection and defense
                </p>
              </div>
            </div>
          </div>
          <Shield className="h-12 w-12 text-muted-foreground opacity-20" />
        </div>

        {/* Campaign Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Campaign Selection
            </CardTitle>
            <CardDescription>
              Select an APT campaign to simulate its lifecycle phases
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Label htmlFor="campaign">Active Campaign</Label>
              <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
                <SelectTrigger id="campaign">
                  <SelectValue placeholder="Select a campaign..." />
                </SelectTrigger>
                <SelectContent>
                  {campaigns.length === 0 ? (
                    <SelectItem value="none" disabled>No campaigns available</SelectItem>
                  ) : (
                    campaigns.map((campaign) => (
                      <SelectItem key={campaign.id} value={campaign.id}>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{campaign.name}</span>
                          {campaign.target_organization && (
                            <span className="text-xs text-muted-foreground">
                              ({campaign.target_organization})
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {selectedCampaign && campaigns.find(c => c.id === selectedCampaign) && (
                <div className="p-3 bg-muted rounded-lg text-sm">
                  <p className="font-medium mb-1">
                    {campaigns.find(c => c.id === selectedCampaign)?.name}
                  </p>
                  <p className="text-muted-foreground">
                    {campaigns.find(c => c.id === selectedCampaign)?.description || 'No description available'}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Legal & Educational Notice */}
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Educational Purpose Only:</strong> This simulation is designed for cybersecurity training 
            and awareness. It provides conceptual knowledge about APT tactics and defensive strategies without 
            providing actionable exploit code or step-by-step attack instructions. Focus is on detection, 
            impact analysis, and remediation for defensive security teams.
          </AlertDescription>
        </Alert>

        {/* Playback Controls */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Play className="h-5 w-5" />
              Simulation Controls
            </CardTitle>
            <CardDescription>
              Navigate through the APT attack lifecycle phases
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center gap-4">
              <Button
                variant="outline"
                size="icon"
                onClick={handleReset}
                disabled={currentPhaseIndex === 0 && !isPlaying}
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={handlePrevious}
                disabled={currentPhaseIndex === 0 || isPlaying}
              >
                <SkipBack className="h-4 w-4" />
              </Button>
              <Button
                size="lg"
                onClick={handlePlayPause}
                className="px-8"
              >
                {isPlaying ? (
                  <>
                    <Pause className="h-5 w-5 mr-2" />
                    Pause
                  </>
                ) : (
                  <>
                    <Play className="h-5 w-5 mr-2" />
                    Play
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={handleNext}
                disabled={currentPhaseIndex === totalPhases - 1 || isPlaying}
              >
                <SkipForward className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Timeline */}
        <APTLifecycleTimeline
          currentPhaseIndex={currentPhaseIndex}
          onPhaseClick={handlePhaseClick}
        />

        {/* Phase Details */}
        <APTPhaseSimulation currentPhaseIndex={currentPhaseIndex} />

        {/* Additional Resources */}
        <Card>
          <CardHeader>
            <CardTitle>Learning Resources</CardTitle>
            <CardDescription>
              Additional materials for understanding APT attacks and defenses
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 border rounded-lg">
                <h4 className="font-semibold mb-2">MITRE ATT&CK Framework</h4>
                <p className="text-sm text-muted-foreground">
                  Comprehensive knowledge base of adversary tactics and techniques
                </p>
              </div>
              <div className="p-4 border rounded-lg">
                <h4 className="font-semibold mb-2">NIST Cybersecurity Framework</h4>
                <p className="text-sm text-muted-foreground">
                  Standards for identifying, protecting, and responding to threats
                </p>
              </div>
              <div className="p-4 border rounded-lg">
                <h4 className="font-semibold mb-2">Defense in Depth Strategy</h4>
                <p className="text-sm text-muted-foreground">
                  Layered security approach to protect against sophisticated attacks
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Key Takeaways */}
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            <strong>Key Defense Principles:</strong> Early detection is critical. Most APT attacks can be 
            detected during reconnaissance and initial access phases with proper monitoring. Implement 
            defense in depth, maintain security hygiene, and train your team regularly.
          </AlertDescription>
        </Alert>
      </div>
    </Layout>
  );
};

export default APTPlanning;
