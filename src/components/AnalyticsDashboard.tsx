import React from 'react';
import { Card } from './ui/card';
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, 
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar 
} from 'recharts';

interface AnalyticsDashboardProps {
  currentPhase: number;
}

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ currentPhase }) => {
  const riskTrendData = [
    { phase: 'Recon', risk: 10, detection: 5 },
    { phase: 'Access', risk: 35, detection: 15 },
    { phase: 'Escalate', risk: 60, detection: 30 },
    { phase: 'Lateral', risk: 80, detection: 50 },
    { phase: 'Exfil', risk: 95, detection: 70 },
    { phase: 'Persist', risk: 100, detection: 85 },
  ].slice(0, currentPhase + 1);

  const attackTypeData = [
    { name: 'Phishing', value: 35, color: 'hsl(var(--chart-1))' },
    { name: 'Exploit', value: 25, color: 'hsl(var(--chart-2))' },
    { name: 'Social Eng.', value: 20, color: 'hsl(var(--chart-3))' },
    { name: 'Brute Force', value: 12, color: 'hsl(var(--chart-4))' },
    { name: 'Other', value: 8, color: 'hsl(var(--chart-5))' },
  ];

  const mitreData = [
    { technique: 'Initial Access', coverage: 85 },
    { technique: 'Execution', coverage: 70 },
    { technique: 'Persistence', coverage: 90 },
    { technique: 'Privilege Esc.', coverage: 75 },
    { technique: 'Defense Evasion', coverage: 60 },
    { technique: 'Lateral Movement', coverage: 80 },
  ];

  const toolUsageData = [
    { tool: 'Nmap', count: 45 },
    { tool: 'Metasploit', count: 32 },
    { tool: 'Mimikatz', count: 28 },
    { tool: 'BloodHound', count: 22 },
    { tool: 'Cobalt Strike', count: 18 },
    { tool: 'PowerShell', count: 56 },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Risk & Detection Trends</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={riskTrendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="phase" stroke="hsl(var(--muted-foreground))" />
              <YAxis stroke="hsl(var(--muted-foreground))" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="risk" 
                stroke="hsl(var(--destructive))" 
                strokeWidth={2}
                name="Risk Score"
              />
              <Line 
                type="monotone" 
                dataKey="detection" 
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                name="Detection Rate"
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Attack Type Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={attackTypeData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {attackTypeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">MITRE ATT&CK Coverage</h3>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={mitreData}>
              <PolarGrid stroke="hsl(var(--border))" />
              <PolarAngleAxis dataKey="technique" stroke="hsl(var(--muted-foreground))" />
              <PolarRadiusAxis stroke="hsl(var(--muted-foreground))" />
              <Radar 
                name="Coverage" 
                dataKey="coverage" 
                stroke="hsl(var(--primary))" 
                fill="hsl(var(--primary))" 
                fillOpacity={0.6} 
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Tool Usage Statistics</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={toolUsageData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="tool" stroke="hsl(var(--muted-foreground))" />
              <YAxis stroke="hsl(var(--muted-foreground))" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
              <Bar dataKey="count" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Key Metrics</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-lg bg-primary/10">
            <p className="text-sm text-muted-foreground">Detection Rate</p>
            <p className="text-2xl font-bold text-primary">{Math.min(85, (currentPhase + 1) * 15)}%</p>
          </div>
          <div className="p-4 rounded-lg bg-destructive/10">
            <p className="text-sm text-muted-foreground">Risk Score</p>
            <p className="text-2xl font-bold text-destructive">{Math.min(100, (currentPhase + 1) * 18)}</p>
          </div>
          <div className="p-4 rounded-lg bg-warning/10">
            <p className="text-sm text-muted-foreground">Compromised Assets</p>
            <p className="text-2xl font-bold text-warning">{Math.min(8, currentPhase * 2)}</p>
          </div>
          <div className="p-4 rounded-lg bg-success/10">
            <p className="text-sm text-muted-foreground">Mitigations Applied</p>
            <p className="text-2xl font-bold text-success">{Math.min(12, (currentPhase + 1) * 2)}</p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default AnalyticsDashboard;
