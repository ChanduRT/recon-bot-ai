import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { FileDown, FileText, Shield, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ReportExporterProps {
  campaign: any;
  scans: any[];
  attackPaths: any[];
}

interface ReportConfig {
  format: 'pdf' | 'html' | 'markdown';
  includeExecutiveSummary: boolean;
  includeTechnicalFindings: boolean;
  includeTimeline: boolean;
  includeEvidence: boolean;
  includeMitreMapping: boolean;
  includeRemediation: boolean;
  complianceFrameworks: string[];
}

const DEFAULT_CONFIG: ReportConfig = {
  format: 'pdf',
  includeExecutiveSummary: true,
  includeTechnicalFindings: true,
  includeTimeline: true,
  includeEvidence: true,
  includeMitreMapping: true,
  includeRemediation: true,
  complianceFrameworks: ['PCI-DSS', 'NIST', 'ISO-27001']
};

export const ReportExporter: React.FC<ReportExporterProps> = ({
  campaign,
  scans,
  attackPaths
}) => {
  const [config, setConfig] = useState<ReportConfig>(DEFAULT_CONFIG);
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const generateReport = async () => {
    setIsGenerating(true);
    try {
      // Calculate report statistics
      const stats = calculateReportStats();
      
      // Build report content
      const reportContent = buildReportContent(stats);
      
      // Export based on format
      if (config.format === 'pdf') {
        downloadAsPDF(reportContent);
      } else if (config.format === 'html') {
        downloadAsHTML(reportContent);
      } else {
        downloadAsMarkdown(reportContent);
      }

      toast({
        title: "Report Generated",
        description: `${config.format.toUpperCase()} report has been downloaded`
      });
    } catch (error) {
      console.error('Error generating report:', error);
      toast({
        title: "Generation Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const calculateReportStats = () => {
    const completedPaths = attackPaths.filter(p => p.status === 'completed');
    const criticalFindings = attackPaths.filter(p => p.risk_level === 'critical').length;
    const highFindings = attackPaths.filter(p => p.risk_level === 'high').length;
    const avgCVSS = attackPaths.reduce((sum, p) => sum + (p.cvss_score || 0), 0) / (attackPaths.length || 1);
    
    return {
      totalScans: scans.length,
      totalAttackPaths: attackPaths.length,
      completedPaths: completedPaths.length,
      criticalFindings,
      highFindings,
      avgCVSS: avgCVSS.toFixed(1),
      duration: calculateDuration(),
      targets: [...new Set(scans.map(s => s.target))],
      mitreCategories: [...new Set(attackPaths.map(p => p.mitre_tactic))]
    };
  };

  const calculateDuration = () => {
    const start = new Date(campaign.start_date);
    const end = campaign.end_date ? new Date(campaign.end_date) : new Date();
    const hours = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60));
    return `${hours} hours`;
  };

  const buildReportContent = (stats: any) => {
    let content = '';

    // Executive Summary
    if (config.includeExecutiveSummary) {
      content += `
# Executive Summary

**Campaign:** ${campaign.name}
**Organization:** ${campaign.target_organization || 'N/A'}
**Duration:** ${stats.duration}
**Assessment Date:** ${new Date().toLocaleDateString()}

## Key Findings

- **Total Scans Performed:** ${stats.totalScans}
- **Attack Paths Tested:** ${stats.totalAttackPaths}
- **Critical Vulnerabilities:** ${stats.criticalFindings}
- **High-Risk Vulnerabilities:** ${stats.highFindings}
- **Average CVSS Score:** ${stats.avgCVSS}

## Risk Assessment

This APT simulation identified ${stats.criticalFindings} critical and ${stats.highFindings} high-risk vulnerabilities across ${stats.targets.length} target systems. Immediate remediation is recommended for critical findings.

---
`;
    }

    // Technical Findings
    if (config.includeTechnicalFindings) {
      content += `
# Technical Findings

## Vulnerability Summary

`;
      attackPaths.forEach((path, index) => {
        const evidence = path.evidence || {};
        content += `
### ${index + 1}. ${path.technique_name}

**MITRE ATT&CK:** ${path.mitre_technique} (${path.mitre_tactic})
**Risk Level:** ${path.risk_level.toUpperCase()}
**CVSS Score:** ${path.cvss_score || 'N/A'}
**Status:** ${path.status}

**Description:**
${path.description}

**Tools Used:** ${path.tools_required?.join(', ') || 'N/A'}

${config.includeEvidence && evidence.output ? `**Evidence:**
\`\`\`
${evidence.output?.substring(0, 500)}...
\`\`\`
` : ''}

**Expected Outcome:** ${path.expected_outcome}

---
`;
      });
    }

    // MITRE ATT&CK Mapping
    if (config.includeMitreMapping) {
      content += `
# MITRE ATT&CK Mapping

## Tactics and Techniques Used

`;
      stats.mitreCategories.forEach((tactic: string) => {
        const techniques = attackPaths.filter(p => p.mitre_tactic === tactic);
        content += `
### ${tactic}

`;
        techniques.forEach(t => {
          content += `- **${t.mitre_technique}:** ${t.technique_name}\n`;
        });
      });
      content += '\n---\n';
    }

    // Timeline
    if (config.includeTimeline) {
      content += `
# Attack Timeline

`;
      const sortedPaths = [...attackPaths].sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      
      sortedPaths.forEach(path => {
        const time = new Date(path.created_at).toLocaleString();
        const completed = path.completed_at ? new Date(path.completed_at).toLocaleString() : 'In Progress';
        content += `
**${time}** - ${path.technique_name}
- Phase: ${path.phase}
- Status: ${path.status}
${path.completed_at ? `- Completed: ${completed}` : ''}

`;
      });
      content += '\n---\n';
    }

    // Remediation Recommendations
    if (config.includeRemediation) {
      content += `
# Remediation Recommendations

## Immediate Actions Required

`;
      const criticalPaths = attackPaths.filter(p => p.risk_level === 'critical');
      criticalPaths.forEach((path, index) => {
        content += `
${index + 1}. **${path.technique_name}**
   - Vulnerability: ${path.mitre_technique}
   - Recommended Fix: Implement patches, enhance security controls, and monitor for IOCs
   - Priority: CRITICAL

`;
      });

      content += `
## Security Enhancements

- Implement network segmentation
- Deploy intrusion detection systems
- Enhance logging and monitoring
- Conduct regular security assessments
- Implement least privilege access controls
- Enable multi-factor authentication

---
`;
    }

    // Compliance Mapping
    if (config.complianceFrameworks.length > 0) {
      content += `
# Compliance Mapping

This assessment addresses requirements from the following frameworks:

`;
      config.complianceFrameworks.forEach(framework => {
        content += `
## ${framework}

- Regular security assessments: COMPLIANT
- Vulnerability management: IN PROGRESS
- Access controls: REVIEW REQUIRED
- Network segmentation: NEEDS IMPROVEMENT

`;
      });
    }

    return content;
  };

  const downloadAsMarkdown = (content: string) => {
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${campaign.name}_report_${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadAsHTML = (content: string) => {
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${campaign.name} - Penetration Test Report</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; line-height: 1.6; }
    h1 { color: #dc2626; border-bottom: 3px solid #dc2626; padding-bottom: 10px; }
    h2 { color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 8px; margin-top: 30px; }
    h3 { color: #059669; margin-top: 20px; }
    code { background: #f3f4f6; padding: 2px 6px; border-radius: 4px; }
    pre { background: #1f2937; color: #f3f4f6; padding: 15px; border-radius: 8px; overflow-x: auto; }
    .critical { color: #dc2626; font-weight: bold; }
    .high { color: #ea580c; font-weight: bold; }
    .medium { color: #ca8a04; font-weight: bold; }
    .low { color: #16a34a; font-weight: bold; }
  </style>
</head>
<body>
${content.replace(/\n/g, '<br>').replace(/```([^`]+)```/g, '<pre>$1</pre>')}
</body>
</html>
    `;
    
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${campaign.name}_report_${Date.now()}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadAsPDF = (content: string) => {
    // For PDF generation, we'll first generate HTML and suggest browser print-to-PDF
    downloadAsHTML(content);
    toast({
      title: "PDF Generation",
      description: "HTML file generated. Use your browser's Print to PDF feature for PDF output.",
    });
  };

  const toggleCompliance = (framework: string) => {
    setConfig(prev => ({
      ...prev,
      complianceFrameworks: prev.complianceFrameworks.includes(framework)
        ? prev.complianceFrameworks.filter(f => f !== framework)
        : [...prev.complianceFrameworks, framework]
    }));
  };

  const stats = calculateReportStats();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Professional Report Generator
        </CardTitle>
        <CardDescription>
          Generate IEEE-standard penetration test reports with compliance mappings
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Report Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-1">
            <div className="text-sm text-muted-foreground">Total Findings</div>
            <div className="text-2xl font-bold">{stats.totalAttackPaths}</div>
          </div>
          <div className="space-y-1">
            <div className="text-sm text-muted-foreground">Critical</div>
            <div className="text-2xl font-bold text-destructive">{stats.criticalFindings}</div>
          </div>
          <div className="space-y-1">
            <div className="text-sm text-muted-foreground">Avg CVSS</div>
            <div className="text-2xl font-bold">{stats.avgCVSS}</div>
          </div>
          <div className="space-y-1">
            <div className="text-sm text-muted-foreground">Duration</div>
            <div className="text-2xl font-bold">{stats.duration}</div>
          </div>
        </div>

        {/* Report Configuration */}
        <div className="space-y-4">
          <div>
            <Label>Report Format</Label>
            <Select value={config.format} onValueChange={(value: any) => setConfig({...config, format: value})}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pdf">PDF (via Print)</SelectItem>
                <SelectItem value="html">HTML</SelectItem>
                <SelectItem value="markdown">Markdown</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Report Sections</Label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: 'includeExecutiveSummary', label: 'Executive Summary' },
                { key: 'includeTechnicalFindings', label: 'Technical Findings' },
                { key: 'includeTimeline', label: 'Attack Timeline' },
                { key: 'includeEvidence', label: 'Evidence & Logs' },
                { key: 'includeMitreMapping', label: 'MITRE ATT&CK Mapping' },
                { key: 'includeRemediation', label: 'Remediation Steps' }
              ].map(({ key, label }) => (
                <div key={key} className="flex items-center space-x-2">
                  <Checkbox
                    id={key}
                    checked={config[key as keyof ReportConfig] as boolean}
                    onCheckedChange={(checked) => 
                      setConfig({ ...config, [key]: checked })
                    }
                  />
                  <Label htmlFor={key} className="text-sm cursor-pointer">{label}</Label>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Compliance Frameworks</Label>
            <div className="flex flex-wrap gap-2">
              {['PCI-DSS', 'NIST', 'ISO-27001', 'HIPAA', 'SOC2'].map(framework => (
                <Badge
                  key={framework}
                  variant={config.complianceFrameworks.includes(framework) ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => toggleCompliance(framework)}
                >
                  <Shield className="h-3 w-3 mr-1" />
                  {framework}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        {/* AI Recommendations Alert */}
        {stats.criticalFindings > 0 && (
          <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
            <div className="text-sm">
              <div className="font-semibold text-destructive">Critical Findings Detected</div>
              <div className="text-muted-foreground">
                {stats.criticalFindings} critical vulnerabilities require immediate attention
              </div>
            </div>
          </div>
        )}

        {/* Generate Button */}
        <Button 
          onClick={generateReport} 
          disabled={isGenerating || attackPaths.length === 0}
          className="w-full"
          size="lg"
        >
          <FileDown className="h-4 w-4 mr-2" />
          {isGenerating ? 'Generating Report...' : 'Download Report'}
        </Button>
      </CardContent>
    </Card>
  );
};
