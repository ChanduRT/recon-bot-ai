import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const openaiApiKey = Deno.env.get('OPENAI_API_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface AttackRecommendation {
  phase: string;
  mitreId: string;
  techniqueName: string;
  description: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  toolsRequired: string[];
  prerequisites: string[];
  expectedOutcome: string;
  executionOrder: number;
  riskScore?: number;
  exploitability?: number;
  impact?: number;
  stealth?: number;
  toolChain?: string[];
  fallbackTools?: string[];
  cvssScore?: number;
  aiRecommended?: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { campaignId, scanIds } = await req.json();
    
    if (!campaignId || !scanIds || !Array.isArray(scanIds) || scanIds.length === 0) {
      throw new Error('Campaign ID and at least one scan ID are required');
    }

    console.log(`[AI Attack Planner] Starting analysis for campaign ${campaignId}`);
    console.log(`[AI Attack Planner] Processing ${scanIds.length} scan(s):`, scanIds);

    // Fetch scan results
    const { data: scans, error: scanError } = await supabase
      .from('scans')
      .select('*')
      .in('id', scanIds);

    if (scanError) {
      console.error('[AI Attack Planner] Error fetching scans:', scanError);
      throw scanError;
    }

    if (!scans || scans.length === 0) {
      throw new Error('No scans found with provided IDs');
    }

    console.log(`[AI Attack Planner] Found ${scans.length} scan(s) to analyze`);
    console.log('[AI Attack Planner] Scan targets:', scans.map(s => s.target).join(', '));

    // Analyze scans with AI
    const attackRecommendations = await analyzeScansWithAI(scans);

    if (!attackRecommendations || attackRecommendations.length === 0) {
      throw new Error('Failed to generate attack recommendations');
    }

    console.log(`[AI Attack Planner] Generated ${attackRecommendations.length} recommendations`);

    // Store attack paths in database
    const attackPaths = [];
    for (const rec of attackRecommendations) {
      const { data: attackPath, error: pathError } = await supabase
        .from('attack_paths')
        .insert({
          campaign_id: campaignId,
          user_id: scans[0].user_id,
          phase: rec.phase,
          mitre_technique: rec.mitreId,
          technique_name: rec.techniqueName,
          description: rec.description,
          risk_level: rec.riskLevel,
          tools_required: rec.toolsRequired,
          prerequisites: rec.prerequisites,
          expected_outcome: rec.expectedOutcome,
          execution_order: rec.executionOrder,
          status: 'planned'
        })
        .select()
        .single();

      if (pathError) {
        console.error('[AI Attack Planner] Error creating attack path:', pathError);
        throw pathError;
      } else {
        attackPaths.push(attackPath);
        console.log(`[AI Attack Planner] Created attack path: ${rec.techniqueName}`);
      }
    }

    // Create MITRE mappings
    console.log('[AI Attack Planner] Creating MITRE mappings...');
    for (const rec of attackRecommendations) {
      const { error: mappingError } = await supabase
        .from('mitre_mappings')
        .insert({
          scan_id: scanIds[0],
          user_id: scans[0].user_id,
          mitre_technique: rec.mitreId,
          technique_name: rec.techniqueName,
          mitre_tactic: rec.phase,
          confidence_score: 0.85,
          automated: true,
          reasoning: `AI-generated based on ${scans[0].target} scan findings: ${rec.description.substring(0, 100)}...`
        });

      if (mappingError) {
        console.error('[AI Attack Planner] Error creating MITRE mapping:', mappingError);
      }
    }

    console.log(`[AI Attack Planner] ✓ Successfully created ${attackPaths.length} attack paths for campaign ${campaignId}`);

    return new Response(JSON.stringify({ 
      success: true, 
      attackPaths: attackPaths.length,
      recommendations: attackRecommendations,
      message: `Generated ${attackPaths.length} attack paths based on ${scans.length} scan(s)`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[AI Attack Planner] ✗ Error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      details: error instanceof Error ? error.stack : undefined
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function analyzeScansWithAI(scans: any[]): Promise<AttackRecommendation[]> {
  try {
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      console.log('OpenAI API key not found, using fallback recommendations');
      return generateFallbackRecommendations(scans);
    }

    const scanSummary = scans.map(scan => {
      const ports = scan.results?.ports || [];
      const services = scan.results?.services || [];
      const vulnerabilities = scan.results?.vulnerabilities || [];
      const osInfo = scan.results?.os || 'Unknown';
      
      return `
Target: ${scan.target}
Asset Type: ${scan.asset_type}
Threat Level: ${scan.threat_level}
OS: ${osInfo}
Open Ports: ${ports.join(', ') || 'None detected'}
Services: ${services.map((s: any) => `${s.name} (${s.version || 'unknown'})`).join(', ') || 'None detected'}
Vulnerabilities: ${vulnerabilities.map((v: any) => `${v.id}: ${v.description} (Severity: ${v.severity})`).join('; ') || 'None detected'}
      `.trim();
    }).join('\n\n---\n\n');

    const prompt = `You are an expert penetration tester analyzing scan results to create a realistic APT (Advanced Persistent Threat) simulation attack path.

SCAN RESULTS:
${scanSummary}

INSTRUCTIONS:
1. Parse each open port and service to identify specific attack vectors
2. Map vulnerabilities to MITRE ATT&CK techniques
3. Calculate risk scores based on exploitability, impact, and stealth
4. Create a realistic attack path with tool chains (recon → exploit → post-exploit)
5. Include fallback tools if primary tools fail
6. Prioritize high-value paths with AI recommendation flags

Generate 5-7 attack path steps following the cyber kill chain. Each step MUST include:
- technique_name: Specific technique name
- mitre_tactic: MITRE tactic (e.g., "Reconnaissance", "Initial Access")
- mitre_technique: MITRE technique ID (e.g., "T1595.001")
- phase: Kill chain phase
- description: Detailed description of the attack step
- tools_required: Array of Kali Linux tools to use
- tool_chain: Ordered sequence of tools for this step
- fallback_tools: Alternative tools if primary fails
- prerequisites: What must be completed first
- expected_outcome: What this step achieves
- risk_level: "low", "medium", "high", or "critical"
- risk_score: Number 1-100 (exploitability × impact × stealth)
- exploitability: Score 1-10
- impact: Score 1-10
- stealth: Score 1-10
- cvss_score: CVSS score if applicable
- ai_recommended: true for high-priority paths
- execution_order: Order in sequence

Focus on creating realistic, actionable attack paths based on the actual vulnerabilities and services discovered.

Return ONLY a valid JSON array of attack recommendations, no other text.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a cybersecurity expert specializing in penetration testing and APT simulation. Return only valid JSON arrays.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      return generateFallbackRecommendations(scans);
    }

    const data = await response.json();
    const content = data.choices[0].message.content.trim();
    
    let recommendations = JSON.parse(content);
    
    if (!Array.isArray(recommendations)) {
      recommendations = [recommendations];
    }

    // Calculate risk scores for any missing values
    recommendations = recommendations.map((rec: any, index: number) => ({
      phase: rec.phase || 'reconnaissance',
      mitreId: rec.mitre_technique || rec.mitreId || 'T1595',
      techniqueName: rec.technique_name || rec.techniqueName || 'Unknown Technique',
      description: rec.description || 'No description',
      riskLevel: rec.risk_level || rec.riskLevel || 'medium',
      toolsRequired: rec.tools_required || rec.toolsRequired || ['nmap'],
      prerequisites: rec.prerequisites || [],
      expectedOutcome: rec.expected_outcome || rec.expectedOutcome || 'Technique executed',
      executionOrder: rec.execution_order || rec.executionOrder || index + 1,
      riskScore: rec.risk_score || rec.riskScore || (rec.exploitability || 5) * (rec.impact || 5) * (rec.stealth || 5),
      exploitability: rec.exploitability || 5,
      impact: rec.impact || 5,
      stealth: rec.stealth || 5,
      aiRecommended: rec.ai_recommended || rec.aiRecommended || false,
      toolChain: rec.tool_chain || rec.toolChain || rec.tools_required || rec.toolsRequired || ['nmap'],
      fallbackTools: rec.fallback_tools || rec.fallbackTools || [],
      cvssScore: rec.cvss_score || rec.cvssScore || 0
    }));

    console.log(`Generated ${recommendations.length} AI-powered attack recommendations with risk analysis`);
    return recommendations;

  } catch (error) {
    console.error('Error in AI analysis:', error);
    return generateFallbackRecommendations(scans);
  }
}

function generateFallbackRecommendations(scans: any[]): AttackRecommendation[] {
  const recommendations: AttackRecommendation[] = [];
  let executionOrder = 1;

  scans.forEach(scan => {
    const ports = scan.results?.ports || [];
    const services = scan.results?.services || [];
    
    // Enhanced port-to-attack mapping with risk analysis
    const portMappings = [
      {
        ports: [80, 443, 8080, 8443],
        service: 'web',
        recommendations: [
          {
            technique_name: 'Web Application Scanning',
            mitre_tactic: 'Reconnaissance',
            mitre_technique: 'T1595.002',
            phase: 'reconnaissance',
            description: 'Perform comprehensive web application vulnerability scanning',
            tools_required: ['nikto', 'whatweb', 'dirb'],
            tool_chain: ['whatweb', 'nikto', 'dirb'],
            fallback_tools: ['wpscan', 'nuclei'],
            prerequisites: [],
            expected_outcome: 'Identify web vulnerabilities, CMS versions, and hidden directories',
            risk_level: 'medium' as const,
            risk_score: 250,
            exploitability: 7,
            impact: 7,
            stealth: 5,
            cvss_score: 6.5,
            ai_recommended: false
          },
          {
            technique_name: 'SQL Injection Testing',
            mitre_tactic: 'Initial Access',
            mitre_technique: 'T1190',
            phase: 'initial_access',
            description: 'Test for SQL injection vulnerabilities in web forms and parameters',
            tools_required: ['sqlmap', 'havij'],
            tool_chain: ['sqlmap'],
            fallback_tools: ['havij', 'jsql'],
            prerequisites: ['Web Application Scanning'],
            expected_outcome: 'Exploit SQL injection to access database',
            risk_level: 'high' as const,
            risk_score: 490,
            exploitability: 8,
            impact: 7,
            stealth: 7,
            cvss_score: 8.2,
            ai_recommended: true
          },
          {
            technique_name: 'Cross-Site Scripting (XSS) Exploitation',
            mitre_tactic: 'Execution',
            mitre_technique: 'T1059',
            phase: 'execution',
            description: 'Inject malicious scripts to steal session tokens or credentials',
            tools_required: ['xsser', 'beef'],
            tool_chain: ['xsser', 'beef'],
            fallback_tools: ['burpsuite'],
            prerequisites: ['Web Application Scanning'],
            expected_outcome: 'Execute JavaScript in victim browsers',
            risk_level: 'medium' as const,
            risk_score: 280,
            exploitability: 7,
            impact: 6,
            stealth: 6,
            cvss_score: 6.8,
            ai_recommended: false
          }
        ]
      },
      {
        ports: [22],
        service: 'ssh',
        recommendations: [
          {
            technique_name: 'SSH Enumeration',
            mitre_tactic: 'Reconnaissance',
            mitre_technique: 'T1592',
            phase: 'reconnaissance',
            description: 'Identify SSH version and supported authentication methods',
            tools_required: ['nmap', 'ssh-audit'],
            tool_chain: ['nmap', 'ssh-audit'],
            fallback_tools: ['netcat'],
            prerequisites: [],
            expected_outcome: 'Discover SSH configuration weaknesses',
            risk_level: 'low' as const,
            risk_score: 120,
            exploitability: 4,
            impact: 5,
            stealth: 6,
            cvss_score: 4.2,
            ai_recommended: false
          },
          {
            technique_name: 'SSH Brute Force Attack',
            mitre_tactic: 'Credential Access',
            mitre_technique: 'T1110.001',
            phase: 'credential_access',
            description: 'Attempt to brute force SSH credentials using common username/password combinations',
            tools_required: ['hydra', 'medusa', 'ncrack'],
            tool_chain: ['hydra'],
            fallback_tools: ['medusa', 'ncrack', 'patator'],
            prerequisites: ['SSH Enumeration'],
            expected_outcome: 'Gain valid SSH credentials',
            risk_level: 'high' as const,
            risk_score: 560,
            exploitability: 8,
            impact: 9,
            stealth: 6,
            cvss_score: 8.9,
            ai_recommended: true
          }
        ]
      },
      {
        ports: [21],
        service: 'ftp',
        recommendations: [
          {
            technique_name: 'FTP Anonymous Login Test',
            mitre_tactic: 'Initial Access',
            mitre_technique: 'T1078',
            phase: 'initial_access',
            description: 'Test for anonymous FTP access and enumerate available files',
            tools_required: ['ftp', 'nmap'],
            tool_chain: ['nmap', 'ftp'],
            fallback_tools: ['curl'],
            prerequisites: [],
            expected_outcome: 'Access files via anonymous FTP',
            risk_level: 'medium' as const,
            risk_score: 210,
            exploitability: 9,
            impact: 5,
            stealth: 7,
            cvss_score: 5.8,
            ai_recommended: false
          }
        ]
      },
      {
        ports: [445, 139],
        service: 'smb',
        recommendations: [
          {
            technique_name: 'SMB Enumeration',
            mitre_tactic: 'Discovery',
            mitre_technique: 'T1135',
            phase: 'discovery',
            description: 'Enumerate SMB shares, users, and system information',
            tools_required: ['enum4linux', 'smbclient', 'nmap'],
            tool_chain: ['enum4linux', 'smbclient'],
            fallback_tools: ['crackmapexec', 'smbmap'],
            prerequisites: [],
            expected_outcome: 'Discover shared folders and user accounts',
            risk_level: 'medium' as const,
            risk_score: 240,
            exploitability: 6,
            impact: 6,
            stealth: 6,
            cvss_score: 6.2,
            ai_recommended: false
          },
          {
            technique_name: 'EternalBlue Exploitation',
            mitre_tactic: 'Lateral Movement',
            mitre_technique: 'T1210',
            phase: 'lateral_movement',
            description: 'Exploit MS17-010 SMB vulnerability for remote code execution',
            tools_required: ['metasploit', 'eternalblue'],
            tool_chain: ['metasploit'],
            fallback_tools: ['python-eternalblue'],
            prerequisites: ['SMB Enumeration'],
            expected_outcome: 'Execute arbitrary code on target system',
            risk_level: 'critical' as const,
            risk_score: 810,
            exploitability: 9,
            impact: 10,
            stealth: 9,
            cvss_score: 9.8,
            ai_recommended: true
          }
        ]
      }
    ];

    // Add recommendations based on detected ports
    portMappings.forEach(mapping => {
      const hasPort = ports.some((p: number) => mapping.ports.includes(p));
      const hasService = services.some((s: any) => 
        s.name?.toLowerCase().includes(mapping.service)
      );

      if (hasPort || hasService) {
        mapping.recommendations.forEach(rec => {
          recommendations.push({
            ...rec,
            execution_order: executionOrder++
          });
        });
      }
    });
  });

  // Always add initial reconnaissance if no specific paths generated
  if (recommendations.length === 0) {
    recommendations.push({
      technique_name: 'Network Reconnaissance',
      mitre_tactic: 'Reconnaissance',
      mitre_technique: 'T1595.001',
      phase: 'reconnaissance',
      description: 'Perform active network scanning to discover live hosts and open ports',
      tools_required: ['nmap', 'masscan'],
      tool_chain: ['nmap'],
      fallback_tools: ['masscan', 'unicornscan'],
      prerequisites: [],
      expected_outcome: 'Create comprehensive map of target network',
      risk_level: 'low' as const,
      execution_order: 1,
      risk_score: 140,
      exploitability: 7,
      impact: 4,
      stealth: 5,
      cvss_score: 4.5,
      ai_recommended: false
    });
  }

  // Sort by risk score (highest first) and add AI recommendations for top paths
  recommendations.sort((a, b) => (b.risk_score || 0) - (a.risk_score || 0));
  recommendations.forEach((rec, index) => {
    rec.ai_recommended = rec.ai_recommended || (index < 2 && rec.risk_score > 400);
  });

  return recommendations;
}