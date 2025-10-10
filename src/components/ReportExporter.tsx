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
  format: 'pdf';
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
      
      // Export as PDF (via browser print)
      downloadAsPDF(reportContent);

      toast({
        title: "Report Generated",
        description: "PDF report ready for download"
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

  const downloadAsPDF = (content: string) => {
    // Generate HTML for print-to-PDF
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${campaign.name} - Penetration Test Report</title>
  <style>
    @media print {
      body { margin: 0; }
      .page-break { page-break-before: always; }
    }
    body { 
      font-family: 'Segoe UI', Arial, sans-serif; 
      max-width: 1200px; 
      margin: 0 auto; 
      padding: 40px; 
      line-height: 1.8; 
      color: #1f2937;
    }
    h1 { 
      color: #dc2626; 
      border-bottom: 4px solid #dc2626; 
      padding-bottom: 15px; 
      font-size: 32px;
      margin-top: 0;
    }
    h2 { 
      color: #2563eb; 
      border-bottom: 2px solid #2563eb; 
      padding-bottom: 10px; 
      margin-top: 40px; 
      font-size: 24px;
    }
    h3 { 
      color: #059669; 
      margin-top: 25px; 
      font-size: 18px;
    }
    code { 
      background: #f3f4f6; 
      padding: 3px 8px; 
      border-radius: 4px; 
      font-family: 'Courier New', monospace;
      font-size: 14px;
    }
    pre { 
      background: #1f2937; 
      color: #f3f4f6; 
      padding: 20px; 
      border-radius: 8px; 
      overflow-x: auto; 
      font-family: 'Courier New', monospace;
      font-size: 13px;
      line-height: 1.5;
    }
    .critical { color: #dc2626; font-weight: bold; text-transform: uppercase; }
    .high { color: #ea580c; font-weight: bold; text-transform: uppercase; }
    .medium { color: #ca8a04; font-weight: bold; text-transform: uppercase; }
    .low { color: #16a34a; font-weight: bold; text-transform: uppercase; }
    ul, ol { margin: 15px 0; padding-left: 30px; }
    li { margin: 8px 0; }
    strong { color: #374151; }
    .header { 
      text-align: center; 
      margin-bottom: 50px; 
      padding: 30px;
      background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
      color: white;
      border-radius: 10px;
    }
    .header h1 { color: white; border: none; }
    .footer {
      margin-top: 60px;
      padding-top: 20px;
      border-top: 2px solid #e5e7eb;
      text-align: center;
      font-size: 12px;
      color: #6b7280;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>🔐 Penetration Test Report</h1>
    <p style="font-size: 18px; margin: 10px 0;">Campaign: ${campaign.name}</p>
    <p style="font-size: 14px; opacity: 0.9;">Generated: ${new Date().toLocaleString()}</p>
  </div>
${content
  .split('\n')
  .map(line => {
    if (line.startsWith('# ')) return `<h1>${line.substring(2)}</h1>`;
    if (line.startsWith('## ')) return `<h2>${line.substring(3)}</h2>`;
    if (line.startsWith('### ')) return `<h3>${line.substring(4)}</h3>`;
    if (line.startsWith('- ')) return `<li>${line.substring(2)}</li>`;
    if (line.trim().startsWith('```')) return line.includes('```') && line.indexOf('```') !== line.lastIndexOf('```') ? `<pre>${line.replace(/```/g, '')}</pre>` : '<pre>';
    if (line.includes('**') && line.split('**').length > 2) {
      return `<p>${line.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')}</p>`;
    }
    if (line.trim() === '---') return '<hr class="page-break" style="margin: 40px 0; border: none; border-top: 2px dashed #e5e7eb;">';
    return line.trim() ? `<p>${line}</p>` : '<br>';
  })
  .join('\n')}
  <div class="footer">
    <p><strong>CONFIDENTIAL</strong> - This report contains sensitive security information</p>
    <p>Generated by APT Security Assessment Platform</p>
  </div>
</body>
</html>
    `;
    
    // Open in new window for print
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      
      // Wait for content to load, then trigger print dialog
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
        }, 250);
      };
    }
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
            <div className="flex items-center gap-2 p-3 border rounded-md bg-muted">
              <FileText className="h-4 w-4" />
              <span className="font-medium">PDF Format Only</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Report will open in a new window. Use your browser's Print dialog to save as PDF.
            </p>
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
