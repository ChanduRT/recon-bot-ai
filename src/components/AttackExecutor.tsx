import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, Play, Pause, CheckCircle, XCircle, Clock, Terminal, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

interface AttackExecutorProps {
  campaign: any;
  attackPaths: any[];
  onPathUpdate: () => void;
}

export const AttackExecutor: React.FC<AttackExecutorProps> = ({
  campaign,
  attackPaths,
  onPathUpdate
}) => {
  const [executingPath, setExecutingPath] = useState<string | null>(null);
  const [executionLogs, setExecutionLogs] = useState<{ [key: string]: string }>({});
  const { toast } = useToast();

  const executeAttackPath = async (attackPath: any) => {
    if (campaign.status !== 'active') {
      toast({
        title: "Campaign Not Active",
        description: "Campaign must be active to execute attack paths",
        variant: "destructive"
      });
      return;
    }

    setExecutingPath(attackPath.id);
    
    try {
      // Update path status to in_progress
      await supabase
        .from('attack_paths')
        .update({ status: 'in_progress' })
        .eq('id', attackPath.id);

      // Call kali-tools function to execute the attack
      const { data, error } = await supabase.functions.invoke('kali-tools', {
        body: {
          action: 'execute_attack',
          attackPath: {
            id: attackPath.id,
            technique: attackPath.technique_name,
            tools: attackPath.tools_required || [],
            phase: attackPath.phase,
            description: attackPath.description
          }
        }
      });

      if (error) throw error;

      // Store execution logs
      setExecutionLogs(prev => ({
        ...prev,
        [attackPath.id]: data.output || 'Execution completed successfully'
      }));

      // Update path with results
      await supabase
        .from('attack_paths')
        .update({ 
          status: data.success ? 'completed' : 'failed',
          completed_at: data.success ? new Date().toISOString() : null,
          evidence: {
            executionTime: data.executionTime || 0,
            output: data.output || '',
            success: data.success || false,
            timestamp: new Date().toISOString()
          }
        })
        .eq('id', attackPath.id);

      toast({
        title: data.success ? "Attack Executed" : "Attack Failed",
        description: `${attackPath.technique_name} ${data.success ? 'completed successfully' : 'failed to execute'}`,
        variant: data.success ? "default" : "destructive"
      });

      onPathUpdate();

    } catch (error) {
      console.error('Error executing attack path:', error);
      
      await supabase
        .from('attack_paths')
        .update({ status: 'failed' })
        .eq('id', attackPath.id);

      toast({
        title: "Execution Failed",
        description: error.message,
        variant: "destructive"
      });

      onPathUpdate();
    } finally {
      setExecutingPath(null);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'planned': return <Clock className="h-4 w-4" />;
      case 'in_progress': return <Play className="h-4 w-4 animate-spin" />;
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'failed': return <XCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planned': return 'bg-secondary';
      case 'in_progress': return 'bg-primary';
      case 'completed': return 'bg-success';
      case 'failed': return 'bg-destructive';
      default: return 'bg-muted';
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'text-green-600';
      case 'medium': return 'text-yellow-600';
      case 'high': return 'text-orange-600';
      case 'critical': return 'text-red-600';
      default: return 'text-muted-foreground';
    }
  };

  const sortedPaths = [...attackPaths].sort((a, b) => 
    (a.execution_order || 0) - (b.execution_order || 0)
  );

  const getPhaseProgress = () => {
    const phases = ['reconnaissance', 'weaponization', 'delivery', 'exploitation', 'installation', 'command_control', 'actions_objectives'];
    return phases.map(phase => {
      const phasePaths = attackPaths.filter(p => p.phase === phase);
      const completed = phasePaths.filter(p => p.status === 'completed').length;
      return {
        phase,
        total: phasePaths.length,
        completed,
        progress: phasePaths.length > 0 ? (completed / phasePaths.length) * 100 : 0
      };
    }).filter(p => p.total > 0);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Terminal className="h-5 w-5" />
            Attack Execution Control
          </CardTitle>
          <CardDescription>
            Execute planned attack paths in the cyber kill chain sequence
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {getPhaseProgress().map(phase => (
              <div key={phase.phase} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="capitalize">{phase.phase.replace('_', ' ')}</span>
                  <span>{phase.completed}/{phase.total}</span>
                </div>
                <Progress value={phase.progress} className="h-2" />
              </div>
            ))}
          </div>

          {campaign.status !== 'active' && (
            <div className="flex items-center gap-2 p-3 bg-warning/10 text-warning rounded-lg mb-4">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm">Campaign must be active to execute attacks</span>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="space-y-4">
        {sortedPaths.map((path, index) => (
          <Card key={path.id} className="relative">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold">
                    {index + 1}
                  </div>
                  <div>
                    <CardTitle className="text-lg">{path.technique_name}</CardTitle>
                    <CardDescription className="flex items-center gap-2">
                      <span className="capitalize">{path.phase?.replace('_', ' ')}</span>
                      {path.mitre_technique && (
                        <Badge variant="outline">{path.mitre_technique}</Badge>
                      )}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={getRiskColor(path.risk_level || 'medium')}>
                    {(path.risk_level || 'medium').toUpperCase()}
                  </Badge>
                  <Badge className={getStatusColor(path.status)}>
                    {getStatusIcon(path.status)}
                    {path.status?.toUpperCase()}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">{path.description}</p>
                
                {path.tools_required && path.tools_required.length > 0 && (
                  <div>
                    <div className="text-sm font-medium mb-2">Required Tools:</div>
                    <div className="flex flex-wrap gap-1">
                      {path.tools_required.map((tool: string) => (
                        <Badge key={tool} variant="secondary" className="text-xs">
                          {tool}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  {path.status === 'planned' && campaign.status === 'active' && (
                    <Button
                      onClick={() => executeAttackPath(path)}
                      disabled={executingPath === path.id}
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      <Play className="h-4 w-4" />
                      {executingPath === path.id ? 'Executing...' : 'Execute'}
                    </Button>
                  )}

                  {(path.status === 'completed' || path.status === 'failed') && (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          View Evidence
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Execution Evidence</DialogTitle>
                          <DialogDescription>
                            Results and logs from {path.technique_name}
                          </DialogDescription>
                        </DialogHeader>
                        <ScrollArea className="max-h-96">
                          <div className="space-y-4">
                            {path.evidence && (
                              <div className="space-y-2">
                                <div className="text-sm font-medium">Execution Details:</div>
                                <div className="text-xs space-y-1">
                                  <div>Status: <Badge className={getStatusColor(path.status)}>{path.status}</Badge></div>
                                  <div>Timestamp: {path.evidence.timestamp}</div>
                                  {path.evidence.executionTime && (
                                    <div>Execution Time: {path.evidence.executionTime}ms</div>
                                  )}
                                </div>
                              </div>
                            )}
                            
                            {(executionLogs[path.id] || path.evidence?.output) && (
                              <div className="space-y-2">
                                <div className="text-sm font-medium">Output:</div>
                                <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">
                                  {executionLogs[path.id] || path.evidence?.output}
                                </pre>
                              </div>
                            )}
                          </div>
                        </ScrollArea>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {attackPaths.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <Terminal className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              No attack paths available. Generate an AI attack plan to begin execution.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};