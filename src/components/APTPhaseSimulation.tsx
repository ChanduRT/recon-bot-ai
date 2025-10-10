import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { 
  Search, 
  DoorOpen, 
  Play, 
  Database, 
  TrendingUp, 
  Network, 
  Upload, 
  Eraser,
  Shield,
  Eye,
  Brain,
  AlertTriangle,
  Loader2
} from "lucide-react";

interface APTPhase {
  id: string;
  name: string;
  icon: any;
  color: string;
  description: string;
}

interface PhaseAnalysis {
  aiDecision: string[];
  indicators: string[];
  defenses: string[];
}

const aptPhases: APTPhase[] = [
  {
    id: "reconnaissance",
    name: "Reconnaissance",
    icon: Search,
    color: "bg-blue-500",
    description: "Attackers gather intelligence about the target organization, infrastructure, and potential vulnerabilities.",
  },
  {
    id: "initial-access",
    name: "Initial Access",
    icon: DoorOpen,
    color: "bg-orange-500",
    description: "Attackers gain initial foothold in the target environment through various entry vectors.",
  },
  {
    id: "execution",
    name: "Execution",
    icon: Play,
    color: "bg-red-500",
    description: "Attackers execute malicious code to establish control and begin their operations.",
  },
  {
    id: "persistence",
    name: "Persistence",
    icon: Database,
    color: "bg-purple-500",
    description: "Attackers establish mechanisms to maintain access even after system reboots or credential changes.",
  },
  {
    id: "privilege-escalation",
    name: "Privilege Escalation",
    icon: TrendingUp,
    color: "bg-yellow-500",
    description: "Attackers elevate their privileges to gain higher-level access and control over systems.",
  },
  {
    id: "lateral-movement",
    name: "Lateral Movement",
    icon: Network,
    color: "bg-cyan-500",
    description: "Attackers move through the network to access additional systems and expand their control.",
  },
  {
    id: "exfiltration",
    name: "Data Exfiltration",
    icon: Upload,
    color: "bg-pink-500",
    description: "Attackers steal sensitive data and intellectual property from the compromised environment.",
  },
  {
    id: "cleanup",
    name: "Cleanup & Cover Tracks",
    icon: Eraser,
    color: "bg-gray-500",
    description: "Attackers attempt to remove evidence of their presence and maintain operational security.",
  }
];

interface APTPhaseSimulationProps {
  currentPhaseIndex: number;
}

export const APTPhaseSimulation = ({ currentPhaseIndex }: APTPhaseSimulationProps) => {
  const currentPhase = aptPhases[currentPhaseIndex];
  const [analysis, setAnalysis] = useState<PhaseAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchAIAnalysis = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke('apt-phase-analysis', {
          body: { phase: currentPhase.name }
        });

        if (error) throw error;

        setAnalysis(data);
      } catch (error: any) {
        console.error('Error fetching AI analysis:', error);
        toast({
          title: "AI Analysis Error",
          description: error.message || "Failed to generate live AI analysis",
          variant: "destructive",
        });
        
        // Fallback data
        setAnalysis({
          aiDecision: ["Error loading AI analysis - please refresh"],
          indicators: ["Check network connection and try again"],
          defenses: ["Retry the analysis"]
        });
      } finally {
        setLoading(false);
      }
    };

    fetchAIAnalysis();
  }, [currentPhaseIndex, currentPhase.name, toast]);

  return (
    <div className="space-y-6">
      {/* Phase Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-lg ${currentPhase.color} text-white`}>
              <currentPhase.icon className="h-6 w-6" />
            </div>
            <div>
              <CardTitle className="text-2xl">{currentPhase.name}</CardTitle>
              <CardDescription className="text-base mt-1">
                {currentPhase.description}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Detailed Information Tabs */}
      <Tabs defaultValue="ai-decision" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="ai-decision">
            <Brain className="h-4 w-4 mr-2" />
            AI Decision
          </TabsTrigger>
          <TabsTrigger value="indicators">
            <Eye className="h-4 w-4 mr-2" />
            Indicators
          </TabsTrigger>
          <TabsTrigger value="defenses">
            <Shield className="h-4 w-4 mr-2" />
            Defenses
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ai-decision" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                Live AI Decision - Attacker's Most Likely Actions
              </CardTitle>
              <CardDescription>
                Real-time AI-generated analysis of conceptual attack scenarios
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert className="mb-4 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
                <AlertTriangle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <AlertDescription>
                  <strong>Educational & Authorized Testing Only:</strong> This detailed tactical information is provided for defensive security training, 
                  authorized penetration testing, red team exercises, and security research in controlled environments. 
                  Unauthorized use of these techniques against systems you don't own or have explicit permission to test is illegal.
                </AlertDescription>
              </Alert>
              
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <span className="ml-3 text-muted-foreground">Generating live AI analysis...</span>
                </div>
              ) : (
                <ul className="space-y-3">
                  {analysis?.aiDecision.map((decision, idx) => (
                    <li key={idx} className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors animate-fade-in">
                      <Badge variant="outline" className="mt-1">{idx + 1}</Badge>
                      <span className="text-sm">{decision}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="indicators" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Observable Indicators & Telemetry
              </CardTitle>
              <CardDescription>
                Live AI-generated detection signatures and telemetry
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <span className="ml-3 text-muted-foreground">Generating live AI analysis...</span>
                </div>
              ) : (
                <ul className="space-y-3">
                  {analysis?.indicators.map((indicator, idx) => (
                    <li key={idx} className="flex items-start gap-3 p-3 border rounded-lg bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-900 animate-fade-in">
                      <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{indicator}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="defenses" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Defensive Recommendations & Mitigations
              </CardTitle>
              <CardDescription>
                Live AI-generated actionable security controls
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <span className="ml-3 text-muted-foreground">Generating live AI analysis...</span>
                </div>
              ) : (
                <ul className="space-y-3">
                  {analysis?.defenses.map((defense, idx) => (
                    <li key={idx} className="flex items-start gap-3 p-3 border rounded-lg bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900 animate-fade-in">
                      <Shield className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                      <span className="text-sm font-medium">{defense}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
