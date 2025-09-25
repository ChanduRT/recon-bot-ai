import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface MitreMatrixProps {
  campaignId: string;
  scans: any[];
  onTechniqueSelect: (technique: string) => void;
}

interface MitreTechnique {
  id: string;
  name: string;
  tactic: string;
  description: string;
  platforms: string[];
  tools: string[];
  confidence?: number;
}

// MITRE ATT&CK Tactics and Techniques (subset for demo)
const MITRE_TACTICS = [
  { id: 'TA0001', name: 'Initial Access', color: 'bg-red-500' },
  { id: 'TA0002', name: 'Execution', color: 'bg-orange-500' },
  { id: 'TA0003', name: 'Persistence', color: 'bg-yellow-500' },
  { id: 'TA0004', name: 'Privilege Escalation', color: 'bg-green-500' },
  { id: 'TA0005', name: 'Defense Evasion', color: 'bg-blue-500' },
  { id: 'TA0006', name: 'Credential Access', color: 'bg-indigo-500' },
  { id: 'TA0007', name: 'Discovery', color: 'bg-purple-500' },
  { id: 'TA0008', name: 'Lateral Movement', color: 'bg-pink-500' },
  { id: 'TA0009', name: 'Collection', color: 'bg-cyan-500' },
  { id: 'TA0010', name: 'Exfiltration', color: 'bg-emerald-500' },
];

const MITRE_TECHNIQUES = [
  {
    id: 'T1566.001',
    name: 'Spearphishing Attachment',
    tactic: 'Initial Access',
    description: 'Adversaries may send spearphishing emails with a malicious attachment',
    platforms: ['Linux', 'macOS', 'Windows'],
    tools: ['Empire', 'Metasploit', 'PowerShell Empire']
  },
  {
    id: 'T1190',
    name: 'Exploit Public-Facing Application',
    tactic: 'Initial Access',
    description: 'Adversaries may attempt to take advantage of a weakness in an Internet-facing computer or program',
    platforms: ['Linux', 'Network', 'Windows', 'macOS'],
    tools: ['nmap', 'Burp Suite', 'SQLMap']
  },
  {
    id: 'T1059.001',
    name: 'PowerShell',
    tactic: 'Execution',
    description: 'Adversaries may abuse PowerShell commands and scripts for execution',
    platforms: ['Linux', 'macOS', 'Windows'],
    tools: ['Empire', 'PowerSploit', 'Cobalt Strike']
  },
  {
    id: 'T1053',
    name: 'Scheduled Task/Job',
    tactic: 'Persistence',
    description: 'Adversaries may abuse task scheduling functionality to facilitate initial or recurring execution',
    platforms: ['Linux', 'macOS', 'Windows'],
    tools: ['at', 'crontab', 'schtasks']
  },
  {
    id: 'T1068',
    name: 'Exploitation for Privilege Escalation',
    tactic: 'Privilege Escalation',
    description: 'Adversaries may exploit software vulnerabilities in an attempt to elevate privileges',
    platforms: ['Linux', 'macOS', 'Windows'],
    tools: ['Metasploit', 'LinEnum', 'WinPEAS']
  },
  {
    id: 'T1003.001',
    name: 'LSASS Memory',
    tactic: 'Credential Access',
    description: 'Adversaries may attempt to access credential material stored in the process memory of LSASS',
    platforms: ['Windows'],
    tools: ['Mimikatz', 'ProcDump', 'Cobalt Strike']
  },
  {
    id: 'T1018',
    name: 'Remote System Discovery',
    tactic: 'Discovery',
    description: 'Adversaries may attempt to get a listing of other systems by IP address, hostname, or other logical identifier',
    platforms: ['Linux', 'macOS', 'Windows'],
    tools: ['nmap', 'ping', 'arp']
  },
  {
    id: 'T1021.001',
    name: 'Remote Desktop Protocol',
    tactic: 'Lateral Movement',
    description: 'Adversaries may use Valid Accounts to log into a computer using the Remote Desktop Protocol (RDP)',
    platforms: ['Windows'],
    tools: ['rdesktop', 'xfreerdp', 'mstsc']
  }
];

export const MitreMatrix: React.FC<MitreMatrixProps> = ({ 
  campaignId, 
  scans, 
  onTechniqueSelect 
}) => {
  const [selectedTechnique, setSelectedTechnique] = useState<MitreTechnique | null>(null);
  const [mitreMappings, setMitreMappings] = useState<any[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchMitreMappings();
  }, [campaignId]);

  const fetchMitreMappings = async () => {
    try {
      const { data, error } = await supabase
        .from('mitre_mappings')
        .select('*')
        .in('scan_id', scans.map(s => s.id));

      if (error) throw error;
      setMitreMappings(data || []);
    } catch (error: any) {
      console.error('Error fetching MITRE mappings:', error);
    }
  };

  const addTechniqueToPath = async (technique: MitreTechnique) => {
    try {
      const { error } = await supabase
        .from('attack_paths')
        .insert([
          {
            campaign_id: campaignId,
            phase: technique.tactic,
            mitre_tactic: technique.tactic,
            mitre_technique: technique.id,
            technique_name: technique.name,
            description: technique.description,
            tools_required: technique.tools,
            risk_level: 'medium',
            user_id: (await supabase.auth.getUser()).data.user?.id
          }
        ]);

      if (error) throw error;

      toast({
        title: "Technique Added",
        description: `${technique.name} has been added to your attack path`,
      });

      onTechniqueSelect(technique.name);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getTechniquesByTactic = (tactic: string) => {
    return MITRE_TECHNIQUES.filter(tech => tech.tactic === tactic);
  };

  const getTechniqueConfidence = (techniqueId: string) => {
    const mapping = mitreMappings.find(m => m.mitre_technique === techniqueId);
    return mapping?.confidence_score || 0;
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-red-500';
    if (confidence >= 0.6) return 'bg-orange-500';
    if (confidence >= 0.4) return 'bg-yellow-500';
    return 'bg-gray-300';
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>MITRE ATT&CK Matrix</CardTitle>
          <p className="text-sm text-muted-foreground">
            Select techniques based on discovered vulnerabilities and attack vectors
          </p>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px] w-full">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {MITRE_TACTICS.map((tactic) => (
                <div key={tactic.id} className="space-y-2">
                  <div className={`${tactic.color} text-white p-2 rounded text-center text-sm font-medium`}>
                    {tactic.name}
                  </div>
                  
                  <div className="space-y-1">
                    {getTechniquesByTactic(tactic.name).map((technique) => {
                      const confidence = getTechniqueConfidence(technique.id);
                      return (
                        <Dialog key={technique.id}>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              className="w-full justify-start text-left text-xs h-auto p-2 relative"
                              onClick={() => setSelectedTechnique(technique)}
                            >
                              <div className="truncate">
                                <div className="font-medium">{technique.id}</div>
                                <div className="text-muted-foreground">{technique.name}</div>
                              </div>
                              {confidence > 0 && (
                                <div 
                                  className={`absolute top-1 right-1 w-2 h-2 rounded-full ${getConfidenceColor(confidence)}`}
                                  title={`Confidence: ${(confidence * 100).toFixed(0)}%`}
                                />
                              )}
                            </Button>
                          </DialogTrigger>
                          
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle className="flex items-center gap-2">
                                <Badge variant="outline">{technique.id}</Badge>
                                {technique.name}
                              </DialogTitle>
                            </DialogHeader>
                            
                            <div className="space-y-4">
                              <div>
                                <h4 className="font-medium mb-2">Description</h4>
                                <p className="text-sm text-muted-foreground">
                                  {technique.description}
                                </p>
                              </div>
                              
                              <div>
                                <h4 className="font-medium mb-2">Platforms</h4>
                                <div className="flex flex-wrap gap-1">
                                  {technique.platforms.map((platform) => (
                                    <Badge key={platform} variant="secondary">
                                      {platform}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                              
                              <div>
                                <h4 className="font-medium mb-2">Recommended Tools</h4>
                                <div className="flex flex-wrap gap-1">
                                  {technique.tools.map((tool) => (
                                    <Badge key={tool} variant="outline">
                                      {tool}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                              
                              {confidence > 0 && (
                                <div>
                                  <h4 className="font-medium mb-2">AI Confidence</h4>
                                  <div className="flex items-center gap-2">
                                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                                      <div 
                                        className={`h-2 rounded-full ${getConfidenceColor(confidence)}`}
                                        style={{ width: `${confidence * 100}%` }}
                                      />
                                    </div>
                                    <span className="text-sm">
                                      {(confidence * 100).toFixed(0)}%
                                    </span>
                                  </div>
                                </div>
                              )}
                              
                              <div className="flex justify-end gap-2">
                                <Button
                                  onClick={() => addTechniqueToPath(technique)}
                                  className="flex items-center gap-2"
                                >
                                  Add to Attack Path
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};