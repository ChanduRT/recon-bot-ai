import React from 'react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Shield, AlertTriangle, Target, Database, Network, Eye } from 'lucide-react';

interface TimelineEvent {
  phase: number;
  name: string;
  duration: number;
  type: 'attack' | 'defense' | 'detection';
  description: string;
  timestamp: string;
}

interface InteractiveTimelineProps {
  currentPhase: number;
}

const InteractiveTimeline: React.FC<InteractiveTimelineProps> = ({ currentPhase }) => {
  const events: TimelineEvent[] = [
    {
      phase: 0,
      name: 'Reconnaissance',
      duration: 120,
      type: 'attack',
      description: 'Gathering intelligence on target infrastructure',
      timestamp: 'T+0h'
    },
    {
      phase: 1,
      name: 'Initial Access',
      duration: 45,
      type: 'attack',
      description: 'Spear phishing campaign targeting employees',
      timestamp: 'T+2h'
    },
    {
      phase: 1,
      name: 'Detection Alert',
      duration: 5,
      type: 'detection',
      description: 'Suspicious email attachments detected',
      timestamp: 'T+2h 30m'
    },
    {
      phase: 2,
      name: 'Privilege Escalation',
      duration: 30,
      type: 'attack',
      description: 'Exploiting local vulnerabilities for admin access',
      timestamp: 'T+3h'
    },
    {
      phase: 2,
      name: 'Defense Response',
      duration: 15,
      type: 'defense',
      description: 'Isolating compromised workstation',
      timestamp: 'T+3h 20m'
    },
    {
      phase: 3,
      name: 'Lateral Movement',
      duration: 60,
      type: 'attack',
      description: 'Moving through network to reach database servers',
      timestamp: 'T+4h'
    },
    {
      phase: 4,
      name: 'Data Exfiltration',
      duration: 90,
      type: 'attack',
      description: 'Extracting sensitive data to external servers',
      timestamp: 'T+6h'
    },
    {
      phase: 4,
      name: 'Detection Alert',
      duration: 10,
      type: 'detection',
      description: 'Unusual outbound traffic detected',
      timestamp: 'T+6h 45m'
    },
    {
      phase: 5,
      name: 'Persistence',
      duration: 20,
      type: 'attack',
      description: 'Installing backdoors for future access',
      timestamp: 'T+8h'
    },
    {
      phase: 5,
      name: 'Full Response',
      duration: 180,
      type: 'defense',
      description: 'Network-wide incident response and remediation',
      timestamp: 'T+8h 30m'
    }
  ];

  const getIcon = (type: string) => {
    switch (type) {
      case 'attack': return <Target className="w-4 h-4" />;
      case 'defense': return <Shield className="w-4 h-4" />;
      case 'detection': return <Eye className="w-4 h-4" />;
      default: return <AlertTriangle className="w-4 h-4" />;
    }
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case 'attack': return 'hsl(var(--destructive))';
      case 'defense': return 'hsl(var(--primary))';
      case 'detection': return 'hsl(var(--warning))';
      default: return 'hsl(var(--muted))';
    }
  };

  const chartData = events.filter(e => e.phase <= currentPhase).map(event => ({
    name: event.name,
    duration: event.duration,
    type: event.type,
  }));

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Interactive Timeline</h3>
      
      <div className="mb-6">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis type="number" stroke="hsl(var(--muted-foreground))" />
            <YAxis dataKey="name" type="category" width={120} stroke="hsl(var(--muted-foreground))" />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px'
              }}
            />
            <Bar dataKey="duration" radius={[0, 8, 8, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getEventColor(entry.type)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="space-y-4">
        {events.filter(e => e.phase <= currentPhase).map((event, index) => (
          <div 
            key={index}
            className={`flex items-start gap-4 p-4 rounded-lg border transition-all ${
              event.phase === currentPhase ? 'border-primary bg-primary/5' : 'border-border'
            }`}
          >
            <div className={`p-2 rounded-lg ${
              event.type === 'attack' ? 'bg-destructive/10 text-destructive' :
              event.type === 'defense' ? 'bg-primary/10 text-primary' :
              'bg-warning/10 text-warning'
            }`}>
              {getIcon(event.type)}
            </div>
            
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <h4 className="font-semibold">{event.name}</h4>
                <Badge variant={event.type === 'attack' ? 'destructive' : 'default'}>
                  {event.timestamp}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">{event.description}</p>
              <p className="text-xs text-muted-foreground mt-1">Duration: {event.duration} minutes</p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

export default InteractiveTimeline;
