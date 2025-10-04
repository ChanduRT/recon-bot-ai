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
  // Extract detailed findings from scan results
  const findings = scans.map(scan => {
    const results = scan.results || {};
    return {
      target: scan.target,
      assetType: scan.asset_type,
      threatLevel: scan.threat_level,
      openPorts: results.openPorts || results.ports || [],
      services: results.services || [],
      vulnerabilities: results.vulnerabilities || results.cves || [],
      webTech: results.webTechnology || results.technologies || [],
      osInfo: results.osInfo || results.os || '',
      sslInfo: results.sslInfo || {}
    };
  });

  const prompt = `You are an expert penetration tester creating a realistic APT simulation campaign. Analyze these scan results and generate 6-8 specific, actionable attack paths following the cyber kill chain.

SCAN FINDINGS:
${JSON.stringify(findings, null, 2)}

Create attack paths that:
- Start with reconnaissance using discovered open ports and services
- Progress through the kill chain phases logically
- Use REAL Kali Linux tools (nmap, nikto, sqlmap, metasploit, hydra, etc.)
- Map to actual MITRE ATT&CK techniques
- Consider the specific vulnerabilities and services found

Return a JSON array with this EXACT structure:
[
  {
    "phase": "reconnaissance|weaponization|delivery|exploitation|installation|command_control|actions_objectives",
    "mitreId": "T1234.001",
    "techniqueName": "Technique Name",
    "description": "Detailed description of what to do",
    "riskLevel": "low|medium|high|critical",
    "toolsRequired": ["tool1", "tool2"],
    "prerequisites": ["prerequisite1"],
    "expectedOutcome": "What you'll gain from this step",
    "executionOrder": 1
  }
]

IMPORTANT: Return ONLY the JSON array, no markdown formatting or explanations.`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are an expert penetration tester and cybersecurity analyst.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 3000
      }),
    });

    const data = await response.json();
    
    if (!data.choices?.[0]?.message?.content) {
      throw new Error('No response from OpenAI');
    }

    let aiResponse = data.choices[0].message.content;
    
    // Clean up the response to extract JSON
    if (aiResponse.includes('```json')) {
      aiResponse = aiResponse.split('```json')[1].split('```')[0];
    } else if (aiResponse.includes('```')) {
      aiResponse = aiResponse.split('```')[1];
    }

    const recommendations = JSON.parse(aiResponse.trim());
    
    console.log(`AI generated ${recommendations.length} attack recommendations`);
    return recommendations;

  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    
    // Fallback recommendations based on scan data
    return generateFallbackRecommendations(scans);
  }
}

function generateFallbackRecommendations(scans: any[]): AttackRecommendation[] {
  console.log('Using fallback recommendations due to AI failure');
  
  // Extract scan data to make recommendations more relevant
  const hasWebServices = scans.some(s => 
    s.results?.openPorts?.some((p: number) => [80, 443, 8080, 8443].includes(p))
  );
  const hasSSH = scans.some(s => 
    s.results?.openPorts?.includes(22)
  );
  const hasFTP = scans.some(s => 
    s.results?.openPorts?.some((p: number) => [20, 21].includes(p))
  );

  const recommendations: AttackRecommendation[] = [
    {
      phase: 'reconnaissance',
      mitreId: 'T1595.001',
      techniqueName: 'Active Scanning: Network Discovery',
      description: `Execute comprehensive port scanning on ${scans[0]?.target || 'target'}. Use nmap with multiple scan techniques to identify all open ports, running services, and OS fingerprinting.`,
      riskLevel: 'low',
      toolsRequired: ['nmap', 'masscan'],
      prerequisites: [],
      expectedOutcome: 'Complete map of network services and potential entry points',
      executionOrder: 1
    },
    {
      phase: 'reconnaissance',
      mitreId: 'T1595.002',
      techniqueName: 'Active Scanning: Vulnerability Scanning',
      description: 'Run automated vulnerability detection against discovered services using NSE scripts and vulnerability databases.',
      riskLevel: 'low',
      toolsRequired: ['nmap', 'nikto', 'whatweb'],
      prerequisites: ['Port scanning completed'],
      expectedOutcome: 'Identified CVEs and potential security weaknesses',
      executionOrder: 2
    }
  ];

  if (hasWebServices) {
    recommendations.push(
      {
        phase: 'reconnaissance',
        mitreId: 'T1595',
        techniqueName: 'Web Application Reconnaissance',
        description: 'Perform detailed web application fingerprinting and directory enumeration to identify web technologies, frameworks, and hidden endpoints.',
        riskLevel: 'low',
        toolsRequired: ['nikto', 'dirb', 'gobuster', 'whatweb'],
        prerequisites: ['Web services discovered'],
        expectedOutcome: 'Map of web application structure and potential attack surfaces',
        executionOrder: 3
      },
      {
        phase: 'exploitation',
        mitreId: 'T1190',
        techniqueName: 'Exploit Public-Facing Web Application',
        description: 'Test for common web vulnerabilities including SQL injection, XSS, and authentication bypass on discovered web services.',
        riskLevel: 'high',
        toolsRequired: ['sqlmap', 'burpsuite', 'wpscan'],
        prerequisites: ['Web reconnaissance completed'],
        expectedOutcome: 'Initial access through web application vulnerability',
        executionOrder: 4
      }
    );
  }

  if (hasSSH) {
    recommendations.push({
      phase: 'exploitation',
      mitreId: 'T1110.001',
      techniqueName: 'Brute Force: Password Guessing',
      description: 'Attempt authentication against SSH service using common credentials and weak password dictionary attacks.',
      riskLevel: 'medium',
      toolsRequired: ['hydra', 'medusa', 'ncrack'],
      prerequisites: ['SSH service identified'],
      expectedOutcome: 'Valid SSH credentials for remote access',
      executionOrder: 5
    });
  }

  if (hasFTP) {
    recommendations.push({
      phase: 'exploitation',
      mitreId: 'T1078',
      techniqueName: 'Valid Accounts: FTP Access',
      description: 'Test FTP service for anonymous access and weak credentials.',
      riskLevel: 'medium',
      toolsRequired: ['ftp', 'hydra'],
      prerequisites: ['FTP service discovered'],
      expectedOutcome: 'Access to file system through FTP',
      executionOrder: 6
    });
  }

  recommendations.push(
    {
      phase: 'installation',
      mitreId: 'T1105',
      techniqueName: 'Ingress Tool Transfer',
      description: 'Upload additional tools and payloads to compromised system for persistence and further exploitation.',
      riskLevel: 'high',
      toolsRequired: ['msfvenom', 'netcat', 'python'],
      prerequisites: ['Initial access achieved'],
      expectedOutcome: 'Persistent backdoor access established',
      executionOrder: 7
    },
    {
      phase: 'command_control',
      mitreId: 'T1071',
      techniqueName: 'Application Layer Protocol',
      description: 'Establish command and control channel using common protocols (HTTP/HTTPS) to maintain access and exfiltrate data.',
      riskLevel: 'critical',
      toolsRequired: ['metasploit', 'netcat', 'socat'],
      prerequisites: ['Persistence established'],
      expectedOutcome: 'Active C2 channel for remote command execution',
      executionOrder: 8
    }
  );

  return recommendations;
}