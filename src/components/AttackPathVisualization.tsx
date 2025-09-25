import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, ArrowRight, Settings, Trash2, Play } from "lucide-react";

interface AttackPathVisualizationProps {
  campaignId: string;
  attackPaths: any[];
  onPathUpdate: () => void;
}

interface NewAttackPath {
  phase: string;
  technique_name: string;
  description: string;
  risk_level: string;
  tools_required: string[];
  mitre_tactic?: string;
  mitre_technique?: string;
}

const PHASES = [
  'Reconnaissance',
  'Weaponization', 
  'Delivery',
  'Exploitation',
  'Installation',
  'Command & Control',
  'Actions on Objectives'
];

const RISK_LEVELS = [
  { value: 'low', label: 'Low', color: 'bg-green-500' },
  { value: 'medium', label: 'Medium', color: 'bg-yellow-500' },
  { value: 'high', label: 'High', color: 'bg-orange-500' },
  { value: 'critical', label: 'Critical', color: 'bg-red-500' }
];

const COMMON_TOOLS = [
  'nmap', 'nikto', 'dirb', 'gobuster', 'masscan', 'sqlmap',
  'metasploit', 'burpsuite', 'wireshark', 'john', 'hashcat',
  'hydra', 'aircrack-ng', 'ettercap', 'social-engineer-toolkit'
];

export const AttackPathVisualization: React.FC<AttackPathVisualizationProps> = ({
  campaignId,
  attackPaths,
  onPathUpdate
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [newPath, setNewPath] = useState<NewAttackPath>({
    phase: '',
    technique_name: '',
    description: '',
    risk_level: 'medium',
    tools_required: []
  });
  const [selectedTools, setSelectedTools] = useState<string[]>([]);
  const { toast } = useToast();

  const handleAddPath = async () => {
    try {
      const { error } = await supabase
        .from('attack_paths')
        .insert([
          {
            campaign_id: campaignId,
            phase: newPath.phase,
            technique_name: newPath.technique_name,
            description: newPath.description,
            risk_level: newPath.risk_level,
            tools_required: selectedTools,
            mitre_tactic: newPath.mitre_tactic,
            mitre_technique: newPath.mitre_technique,
            execution_order: attackPaths.length + 1,
            user_id: (await supabase.auth.getUser()).data.user?.id
          }
        ]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Attack path added successfully",
      });

      setIsOpen(false);
      setNewPath({
        phase: '',
        technique_name: '',
        description: '',
        risk_level: 'medium',
        tools_required: []
      });
      setSelectedTools([]);
      onPathUpdate();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const updatePathStatus = async (pathId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('attack_paths')
        .update({ 
          status,
          completed_at: status === 'completed' ? new Date().toISOString() : null
        })
        .eq('id', pathId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Path status updated to ${status}`,
      });

      onPathUpdate();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const deletePath = async (pathId: string) => {
    try {
      const { error } = await supabase
        .from('attack_paths')
        .delete()
        .eq('id', pathId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Attack path deleted",
      });

      onPathUpdate();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const toggleTool = (tool: string) => {
    setSelectedTools(prev => 
      prev.includes(tool) 
        ? prev.filter(t => t !== tool)
        : [...prev, tool]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'in_progress': return 'bg-yellow-500';
      case 'failed': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getRiskColor = (risk: string) => {
    return RISK_LEVELS.find(r => r.value === risk)?.color || 'bg-gray-500';
  };

  const sortedPaths = [...attackPaths].sort((a, b) => {
    const phaseOrder = PHASES.indexOf(a.phase) - PHASES.indexOf(b.phase);
    if (phaseOrder !== 0) return phaseOrder;
    return (a.execution_order || 0) - (b.execution_order || 0);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Attack Path Visualization</h3>
          <p className="text-sm text-muted-foreground">
            Plan and execute your APT simulation attack paths
          </p>
        </div>
        
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Attack Path
            </Button>
          </DialogTrigger>
          
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Attack Path</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phase">Kill Chain Phase</Label>
                  <Select value={newPath.phase} onValueChange={(value) => 
                    setNewPath(prev => ({ ...prev, phase: value }))
                  }>
                    <SelectTrigger>
                      <SelectValue placeholder="Select phase" />
                    </SelectTrigger>
                    <SelectContent>
                      {PHASES.map(phase => (
                        <SelectItem key={phase} value={phase}>
                          {phase}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="risk">Risk Level</Label>
                  <Select value={newPath.risk_level} onValueChange={(value) => 
                    setNewPath(prev => ({ ...prev, risk_level: value }))
                  }>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RISK_LEVELS.map(risk => (
                        <SelectItem key={risk.value} value={risk.value}>
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${risk.color}`} />
                            {risk.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <Label htmlFor="technique">Technique Name</Label>
                <Input
                  id="technique"
                  value={newPath.technique_name}
                  onChange={(e) => setNewPath(prev => ({ ...prev, technique_name: e.target.value }))}
                  placeholder="e.g., Spearphishing Attachment"
                />
              </div>
              
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newPath.description}
                  onChange={(e) => setNewPath(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe the attack technique and expected outcome..."
                  rows={3}
                />
              </div>
              
              <div>
                <Label>Required Tools</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {COMMON_TOOLS.map(tool => (
                    <Button
                      key={tool}
                      variant={selectedTools.includes(tool) ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleTool(tool)}
                    >
                      {tool}
                    </Button>
                  ))}
                </div>
              </div>
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddPath}>
                  Add Path
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Attack Path Flow */}
      <Card>
        <CardHeader>
          <CardTitle>Attack Path Flow</CardTitle>
        </CardHeader>
        <CardContent>
          {sortedPaths.length > 0 ? (
            <div className="space-y-4">
              {sortedPaths.map((path, index) => (
                <div key={path.id} className="flex items-center gap-4">
                  <div className="flex-1">
                    <Card className="border-2 hover:border-primary/50 transition-colors">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline">{path.phase}</Badge>
                              <Badge className={getRiskColor(path.risk_level)}>
                                {path.risk_level}
                              </Badge>
                              <Badge className={getStatusColor(path.status)}>
                                {path.status}
                              </Badge>
                            </div>
                            
                            <h4 className="font-medium mb-1">
                              {path.technique_name || 'Unnamed Technique'}
                            </h4>
                            
                            <p className="text-sm text-muted-foreground mb-3">
                              {path.description}
                            </p>
                            
                            {path.tools_required && path.tools_required.length > 0 && (
                              <div className="flex flex-wrap gap-1 mb-3">
                                {path.tools_required.map((tool: string) => (
                                  <Badge key={tool} variant="secondary" className="text-xs">
                                    {tool}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-1 ml-4">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updatePathStatus(path.id, 
                                path.status === 'completed' ? 'planned' : 
                                path.status === 'in_progress' ? 'completed' : 'in_progress'
                              )}
                            >
                              <Play className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => deletePath(path.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                  
                  {index < sortedPaths.length - 1 && (
                    <ArrowRight className="h-6 w-6 text-muted-foreground flex-shrink-0" />
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Settings className="h-12 w-12 mx-auto mb-4" />
              <p>No attack paths planned yet.</p>
              <p className="text-sm">Add your first attack path to get started with the simulation.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};