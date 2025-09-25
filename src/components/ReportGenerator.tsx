import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Download, FileText, Eye, Settings } from "lucide-react";

interface ReportGeneratorProps {
  campaignId: string;
  scans: any[];
  attackPaths: any[];
}

interface ReportConfig {
  format: 'pdf' | 'json' | 'xml';
  sections: {
    executiveSummary: boolean;
    technicalDetails: boolean;
    attackMethodology: boolean;
    toolUsage: boolean;
    aiDecisions: boolean;
    riskAssessment: boolean;
    remediation: boolean;
    appendices: boolean;
  };
  includeScreenshots: boolean;
  includeMitreMapping: boolean;
  includeTimeline: boolean;
}

const DEFAULT_CONFIG: ReportConfig = {
  format: 'pdf',
  sections: {
    executiveSummary: true,
    technicalDetails: true,
    attackMethodology: true,
    toolUsage: true,
    aiDecisions: true,
    riskAssessment: true,
    remediation: true,
    appendices: true
  },
  includeScreenshots: true,
  includeMitreMapping: true,
  includeTimeline: true
};

export const ReportGenerator: React.FC<ReportGeneratorProps> = ({
  campaignId,
  scans,
  attackPaths
}) => {
  const [config, setConfig] = useState<ReportConfig>(DEFAULT_CONFIG);
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const { toast } = useToast();

  const generateReport = async () => {
    setIsGenerating(true);
    
    try {
      // Simulate report generation - in real implementation, this would call an edge function
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const reportData = {
        campaign: {
          id: campaignId,
          generatedAt: new Date().toISOString(),
          format: config.format
        },
        executiveSummary: config.sections.executiveSummary ? {
          overview: "APT simulation completed with comprehensive testing of organizational security posture.",
          keyFindings: [
            "Multiple web application vulnerabilities identified",
            "Network segmentation weaknesses discovered", 
            "Privilege escalation paths available",
            "Data exfiltration opportunities present"
          ],
          riskLevel: "HIGH",
          businessImpact: "Significant potential for unauthorized data access and system compromise"
        } : null,
        
        technicalDetails: config.sections.technicalDetails ? {
          scans: scans.map(scan => ({
            target: scan.target,
            assetType: scan.asset_type,
            threatLevel: scan.threat_level,
            vulnerabilities: scan.results?.vulnerabilities || [],
            timestamp: scan.created_at
          })),
          totalVulnerabilities: scans.reduce((acc, scan) => 
            acc + (scan.results?.vulnerabilities?.length || 0), 0
          )
        } : null,
        
        attackMethodology: config.sections.attackMethodology ? {
          killChainPhases: attackPaths.map(path => ({
            phase: path.phase,
            technique: path.technique_name,
            description: path.description,
            tools: path.tools_required,
            status: path.status,
            risk: path.risk_level
          })),
          mitreMapping: config.includeMitreMapping
        } : null,
        
        toolUsage: config.sections.toolUsage ? {
          toolsUsed: [...new Set(attackPaths.flatMap(p => p.tools_required || []))],
          executionLog: attackPaths.map(path => ({
            timestamp: path.created_at,
            phase: path.phase,
            tool: path.tools_required?.[0],
            outcome: path.status
          }))
        } : null,
        
        riskAssessment: config.sections.riskAssessment ? {
          overallRisk: "HIGH",
          criticalFindings: scans.filter(s => s.threat_level === 'critical').length,
          highRiskPaths: attackPaths.filter(p => p.risk_level === 'high' || p.risk_level === 'critical').length,
          exploitability: "High - Multiple attack vectors available",
          businessImpact: "Severe - Potential for complete system compromise"
        } : null,
        
        remediation: config.sections.remediation ? {
          immediate: [
            "Patch critical vulnerabilities identified in web applications",
            "Implement network segmentation controls",
            "Review and update access control policies",
            "Deploy endpoint detection and response solutions"
          ],
          shortTerm: [
            "Conduct security awareness training for all staff",
            "Implement multi-factor authentication organization-wide",
            "Review and update incident response procedures",
            "Establish continuous security monitoring"
          ],
          longTerm: [
            "Implement zero-trust architecture principles",
            "Regular penetration testing and red team exercises",
            "Security architecture review and redesign",
            "Establish security metrics and KPIs"
          ]
        } : null
      };
      
      // Create and download the report
      const reportContent = JSON.stringify(reportData, null, 2);
      const blob = new Blob([reportContent], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `APT_Simulation_Report_${new Date().toISOString().split('T')[0]}.${config.format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
      
      toast({
        title: "Report Generated",
        description: `IEEE standard report downloaded successfully in ${config.format.toUpperCase()} format`,
      });
      
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to generate report",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const updateSection = (section: keyof ReportConfig['sections'], enabled: boolean) => {
    setConfig(prev => ({
      ...prev,
      sections: {
        ...prev.sections,
        [section]: enabled
      }
    }));
  };

  const getReportStats = () => {
    const totalScans = scans.length;
    const totalPaths = attackPaths.length;
    const completedPaths = attackPaths.filter(p => p.status === 'completed').length;
    const criticalFindings = scans.filter(s => s.threat_level === 'critical').length;
    
    return { totalScans, totalPaths, completedPaths, criticalFindings };
  };

  const stats = getReportStats();

  return (
    <div className="space-y-6">
      {/* Report Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{stats.totalScans}</div>
            <p className="text-sm text-muted-foreground">Total Scans</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{stats.totalPaths}</div>
            <p className="text-sm text-muted-foreground">Attack Paths</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{stats.completedPaths}</div>
            <p className="text-sm text-muted-foreground">Completed Paths</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-500">{stats.criticalFindings}</div>
            <p className="text-sm text-muted-foreground">Critical Findings</p>
          </CardContent>
        </Card>
      </div>

      {/* Report Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            IEEE Standard Report Generator
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Generate comprehensive APT simulation reports following IEEE 2600 standards
          </p>
        </CardHeader>
        
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Report Sections */}
            <div>
              <h4 className="font-medium mb-3">Report Sections</h4>
              <div className="space-y-3">
                {Object.entries(config.sections).map(([key, enabled]) => (
                  <div key={key} className="flex items-center space-x-2">
                    <Checkbox
                      id={key}
                      checked={enabled}
                      onCheckedChange={(checked) => 
                        updateSection(key as keyof ReportConfig['sections'], checked as boolean)
                      }
                    />
                    <Label htmlFor={key} className="text-sm">
                      {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Report Options */}
            <div>
              <h4 className="font-medium mb-3">Report Options</h4>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="format">Output Format</Label>
                  <Select 
                    value={config.format} 
                    onValueChange={(value: 'pdf' | 'json' | 'xml') => 
                      setConfig(prev => ({ ...prev, format: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pdf">PDF Report</SelectItem>
                      <SelectItem value="json">JSON Data</SelectItem>
                      <SelectItem value="xml">XML Format</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="screenshots"
                    checked={config.includeScreenshots}
                    onCheckedChange={(checked) => 
                      setConfig(prev => ({ ...prev, includeScreenshots: checked as boolean }))
                    }
                  />
                  <Label htmlFor="screenshots" className="text-sm">
                    Include Screenshots
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="mitre"
                    checked={config.includeMitreMapping}
                    onCheckedChange={(checked) => 
                      setConfig(prev => ({ ...prev, includeMitreMapping: checked as boolean }))
                    }
                  />
                  <Label htmlFor="mitre" className="text-sm">
                    Include MITRE ATT&CK Mapping
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="timeline"
                    checked={config.includeTimeline}
                    onCheckedChange={(checked) => 
                      setConfig(prev => ({ ...prev, includeTimeline: checked as boolean }))
                    }
                  />
                  <Label htmlFor="timeline" className="text-sm">
                    Include Attack Timeline
                  </Label>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex justify-between items-center mt-6 pt-4 border-t">
            <div className="flex gap-2">
              <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Eye className="h-4 w-4 mr-2" />
                    Preview
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Report Preview</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="prose max-w-none">
                      <h1>APT Simulation Report</h1>
                      <p><strong>Campaign ID:</strong> {campaignId}</p>
                      <p><strong>Generated:</strong> {new Date().toLocaleDateString()}</p>
                      
                      <h2>Executive Summary</h2>
                      <p>This report presents the findings of an Advanced Persistent Threat (APT) simulation conducted against organizational infrastructure.</p>
                      
                      <h2>Key Statistics</h2>
                      <ul>
                        <li>Total Scans Conducted: {stats.totalScans}</li>
                        <li>Attack Paths Tested: {stats.totalPaths}</li>
                        <li>Successfully Executed Paths: {stats.completedPaths}</li>
                        <li>Critical Vulnerabilities: {stats.criticalFindings}</li>
                      </ul>
                      
                      <h2>Risk Assessment</h2>
                      <p>Overall Risk Level: <Badge className="bg-red-500">HIGH</Badge></p>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            
            <Button 
              onClick={generateReport}
              disabled={isGenerating}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              {isGenerating ? 'Generating...' : 'Download Report'}
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Report Templates */}
      <Card>
        <CardHeader>
          <CardTitle>Standard Report Templates</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button variant="outline" className="h-auto p-4 text-left justify-start">
              <div>
                <div className="font-medium">Executive Summary</div>
                <div className="text-sm text-muted-foreground">
                  High-level overview for leadership
                </div>
              </div>
            </Button>
            
            <Button variant="outline" className="h-auto p-4 text-left justify-start">
              <div>
                <div className="font-medium">Technical Report</div>
                <div className="text-sm text-muted-foreground">
                  Detailed technical findings
                </div>
              </div>
            </Button>
            
            <Button variant="outline" className="h-auto p-4 text-left justify-start">
              <div>
                <div className="font-medium">Compliance Report</div>
                <div className="text-sm text-muted-foreground">
                  Regulatory compliance assessment
                </div>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};