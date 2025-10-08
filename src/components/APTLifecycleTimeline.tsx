import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  DoorOpen, 
  Play, 
  Database, 
  TrendingUp, 
  Network, 
  Upload, 
  Eraser 
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Phase {
  id: string;
  name: string;
  icon: any;
  color: string;
  shortName: string;
}

const phases: Phase[] = [
  { id: "reconnaissance", name: "Reconnaissance", shortName: "Recon", icon: Search, color: "bg-blue-500" },
  { id: "initial-access", name: "Initial Access", shortName: "Access", icon: DoorOpen, color: "bg-orange-500" },
  { id: "execution", name: "Execution", shortName: "Execute", icon: Play, color: "bg-red-500" },
  { id: "persistence", name: "Persistence", shortName: "Persist", icon: Database, color: "bg-purple-500" },
  { id: "privilege-escalation", name: "Privilege Escalation", shortName: "Escalate", icon: TrendingUp, color: "bg-yellow-500" },
  { id: "lateral-movement", name: "Lateral Movement", shortName: "Move", icon: Network, color: "bg-cyan-500" },
  { id: "exfiltration", name: "Data Exfiltration", shortName: "Exfil", icon: Upload, color: "bg-pink-500" },
  { id: "cleanup", name: "Cleanup", shortName: "Clean", icon: Eraser, color: "bg-gray-500" }
];

interface APTLifecycleTimelineProps {
  currentPhaseIndex: number;
  onPhaseClick: (index: number) => void;
}

export const APTLifecycleTimeline = ({ currentPhaseIndex, onPhaseClick }: APTLifecycleTimelineProps) => {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute top-8 left-0 right-0 h-1 bg-border" />
          <div 
            className="absolute top-8 left-0 h-1 bg-primary transition-all duration-500"
            style={{ width: `${(currentPhaseIndex / (phases.length - 1)) * 100}%` }}
          />

          {/* Phase nodes */}
          <div className="relative flex justify-between">
            {phases.map((phase, index) => {
              const isActive = index === currentPhaseIndex;
              const isCompleted = index < currentPhaseIndex;
              const Icon = phase.icon;

              return (
                <div
                  key={phase.id}
                  className="flex flex-col items-center cursor-pointer group"
                  onClick={() => onPhaseClick(index)}
                >
                  {/* Icon circle */}
                  <div
                    className={cn(
                      "w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 mb-2 border-4",
                      isActive && "scale-110 shadow-lg",
                      isCompleted && "opacity-70",
                      !isActive && !isCompleted && "opacity-50 grayscale",
                      isActive ? "border-primary" : "border-background",
                      phase.color
                    )}
                  >
                    <Icon className="h-7 w-7 text-white" />
                  </div>

                  {/* Phase name */}
                  <div className="text-center">
                    <div className={cn(
                      "text-sm font-medium transition-colors",
                      isActive && "text-primary font-bold"
                    )}>
                      {phase.shortName}
                    </div>
                    {isActive && (
                      <Badge variant="default" className="mt-1 animate-fade-in">
                        Current
                      </Badge>
                    )}
                  </div>

                  {/* Hover tooltip */}
                  <div className="hidden group-hover:block absolute -top-12 bg-popover text-popover-foreground px-3 py-1 rounded text-xs whitespace-nowrap shadow-lg border z-10">
                    {phase.name}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Progress indicator */}
        <div className="mt-6 text-center">
          <div className="text-sm text-muted-foreground">
            Phase {currentPhaseIndex + 1} of {phases.length}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {Math.round((currentPhaseIndex / (phases.length - 1)) * 100)}% Complete
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
