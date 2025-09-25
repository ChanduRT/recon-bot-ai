import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, Clock, AlertCircle, XCircle } from "lucide-react";

interface KillChainTimelineProps {
  campaignId: string;
  attackPaths: any[];
}

const KILL_CHAIN_PHASES = [
  {
    id: 'reconnaissance',
    name: 'Reconnaissance',
    description: 'Gather information about the target',
    color: 'bg-blue-500'
  },
  {
    id: 'weaponization',
    name: 'Weaponization',
    description: 'Create attack tools and payloads',
    color: 'bg-purple-500'
  },
  {
    id: 'delivery',
    name: 'Delivery',
    description: 'Deliver the weapon to the target',
    color: 'bg-orange-500'
  },
  {
    id: 'exploitation',
    name: 'Exploitation',
    description: 'Execute code on victim system',
    color: 'bg-red-500'
  },
  {
    id: 'installation',
    name: 'Installation',
    description: 'Install malware on target system',
    color: 'bg-yellow-500'
  },
  {
    id: 'command_control',
    name: 'Command & Control',
    description: 'Establish C2 communications',
    color: 'bg-green-500'
  },
  {
    id: 'actions_objectives',
    name: 'Actions on Objectives',
    description: 'Achieve campaign goals',
    color: 'bg-indigo-500'
  }
];

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'completed':
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    case 'in_progress':
      return <Clock className="h-5 w-5 text-yellow-500" />;
    case 'failed':
      return <XCircle className="h-5 w-5 text-red-500" />;
    default:
      return <AlertCircle className="h-5 w-5 text-gray-400" />;
  }
};

const getPhaseProgress = (phase: string, attackPaths: any[]) => {
  const phasePaths = attackPaths.filter(path => 
    path.phase.toLowerCase().replace(/[^a-z0-9]/g, '_') === phase
  );
  
  if (phasePaths.length === 0) return { progress: 0, status: 'planned', total: 0, completed: 0 };
  
  const completed = phasePaths.filter(path => path.status === 'completed').length;
  const inProgress = phasePaths.filter(path => path.status === 'in_progress').length;
  const failed = phasePaths.filter(path => path.status === 'failed').length;
  
  const progress = (completed / phasePaths.length) * 100;
  
  let status = 'planned';
  if (completed === phasePaths.length) status = 'completed';
  else if (inProgress > 0) status = 'in_progress';
  else if (failed > 0) status = 'failed';
  
  return { progress, status, total: phasePaths.length, completed };
};

export const KillChainTimeline: React.FC<KillChainTimelineProps> = ({ 
  campaignId, 
  attackPaths 
}) => {
  const overallProgress = attackPaths.length > 0 
    ? (attackPaths.filter(path => path.status === 'completed').length / attackPaths.length) * 100
    : 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Cyber Kill Chain Progress</CardTitle>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Overall Campaign Progress</span>
              <span>{overallProgress.toFixed(0)}%</span>
            </div>
            <Progress value={overallProgress} className="w-full" />
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {KILL_CHAIN_PHASES.map((phase, index) => {
          const phaseData = getPhaseProgress(phase.id, attackPaths);
          
          return (
            <Card key={phase.id} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 ${phase.color} rounded-full flex items-center justify-center text-white font-bold text-sm`}>
                      {index + 1}
                    </div>
                    <div>
                      <CardTitle className="text-lg">{phase.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {phase.description}
                      </p>
                    </div>
                  </div>
                  {getStatusIcon(phaseData.status)}
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span>Phase Progress</span>
                    <span>{phaseData.progress.toFixed(0)}%</span>
                  </div>
                  <Progress value={phaseData.progress} className="w-full" />
                  
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>Attack Paths: {phaseData.total}</span>
                    <span>Completed: {phaseData.completed}</span>
                  </div>
                  
                  <div className="flex flex-wrap gap-1">
                    <Badge variant={phaseData.status === 'completed' ? 'default' : 'secondary'}>
                      {phaseData.status.replace('_', ' ')}
                    </Badge>
                    {phaseData.total > 0 && (
                      <Badge variant="outline">
                        {phaseData.total} paths
                      </Badge>
                    )}
                  </div>
                  
                  {phaseData.total === 0 && (
                    <p className="text-sm text-muted-foreground italic">
                      No attack paths planned for this phase
                    </p>
                  )}
                </div>
              </CardContent>
              
              {/* Connection line to next phase */}
              {index < KILL_CHAIN_PHASES.length - 1 && (
                <div className="absolute -right-2 top-1/2 w-4 h-px bg-border hidden xl:block" />
              )}
            </Card>
          );
        })}
      </div>
      
      {/* Detailed Phase Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Phase Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {attackPaths.map((path) => (
              <div key={path.id} className="flex items-center justify-between p-3 border rounded">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{path.phase}</Badge>
                    <h4 className="font-medium">{path.technique_name || 'Unnamed Path'}</h4>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {path.description}
                  </p>
                  {path.tools_required && path.tools_required.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {path.tools_required.map((tool: string) => (
                        <Badge key={tool} variant="secondary" className="text-xs">
                          {tool}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge 
                    className={
                      path.risk_level === 'low' ? 'bg-green-500' :
                      path.risk_level === 'medium' ? 'bg-yellow-500' :
                      path.risk_level === 'high' ? 'bg-orange-500' : 'bg-red-500'
                    }
                  >
                    {path.risk_level}
                  </Badge>
                  {getStatusIcon(path.status)}
                </div>
              </div>
            ))}
            
            {attackPaths.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <AlertCircle className="h-12 w-12 mx-auto mb-4" />
                <p>No attack paths have been planned yet.</p>
                <p className="text-sm">Add techniques from the MITRE ATT&CK matrix to get started.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};