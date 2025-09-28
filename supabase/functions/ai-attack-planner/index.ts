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
    
    if (!campaignId || !scanIds || !Array.isArray(scanIds)) {
      throw new Error('Campaign ID and scan IDs are required');
    }

    console.log(`Analyzing scans for campaign ${campaignId}:`, scanIds);

    // Fetch scan results
    const { data: scans, error: scanError } = await supabase
      .from('scans')
      .select('*')
      .in('id', scanIds);

    if (scanError) {
      console.error('Error fetching scans:', scanError);
      throw scanError;
    }

    console.log(`Found ${scans?.length || 0} scans to analyze`);

    // Analyze scans with AI
    const attackRecommendations = await analyzeScansWithAI(scans || []);

    // Store attack paths in database
    const attackPaths = [];
    for (const rec of attackRecommendations) {
      const { data: attackPath, error: pathError } = await supabase
        .from('attack_paths')
        .insert({
          campaign_id: campaignId,
          user_id: scans?.[0]?.user_id,
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
        console.error('Error creating attack path:', pathError);
      } else {
        attackPaths.push(attackPath);
      }
    }

    // Create MITRE mappings
    for (const rec of attackRecommendations) {
      await supabase
        .from('mitre_mappings')
        .insert({
          scan_id: scanIds[0], // Associate with first scan
          user_id: scans?.[0]?.user_id,
          mitre_technique: rec.mitreId,
          technique_name: rec.techniqueName,
          confidence_score: 0.8,
          automated: true,
          reasoning: `AI-generated based on scan results: ${rec.description}`
        });
    }

    console.log(`Created ${attackPaths.length} attack paths for campaign ${campaignId}`);

    return new Response(JSON.stringify({ 
      success: true, 
      attackPaths: attackPaths.length,
      recommendations: attackRecommendations 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-attack-planner:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function analyzeScansWithAI(scans: any[]): Promise<AttackRecommendation[]> {
  const scanSummary = scans.map(scan => ({
    target: scan.target,
    assetType: scan.asset_type,
    threatLevel: scan.threat_level,
    results: scan.results,
    status: scan.status
  }));

  const prompt = `You are an expert penetration tester analyzing scan results to create a realistic APT simulation. Based on the following scan data, recommend 5-8 specific attack paths following the cyber kill chain phases.

Scan Results:
${JSON.stringify(scanSummary, null, 2)}

For each attack recommendation, provide:
1. Kill chain phase (reconnaissance, weaponization, delivery, exploitation, installation, command_control, actions_objectives)
2. MITRE ATT&CK technique ID (e.g., T1595.001)
3. Technique name
4. Detailed description of the attack step
5. Risk level (low/medium/high/critical)
6. Required tools (realistic pentesting tools)
7. Prerequisites (what must be done first)
8. Expected outcome
9. Execution order (1-8)

Focus on realistic attacks based on the actual scan findings. Consider the asset types, discovered services, and threat levels.

Return a JSON array of attack recommendations.`;

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
  const recommendations: AttackRecommendation[] = [];
  
  // Base recommendations for common attack scenarios
  const baseAttacks = [
    {
      phase: 'reconnaissance',
      mitreId: 'T1595.001',
      techniqueName: 'Active Scanning: Scanning IP Blocks',
      description: 'Perform comprehensive network reconnaissance to identify live hosts and services',
      riskLevel: 'low' as const,
      toolsRequired: ['nmap', 'masscan'],
      prerequisites: [],
      expectedOutcome: 'Discover network topology and active services',
      executionOrder: 1
    },
    {
      phase: 'reconnaissance',
      mitreId: 'T1595.002',
      techniqueName: 'Active Scanning: Vulnerability Scanning',
      description: 'Identify known vulnerabilities in discovered services',
      riskLevel: 'medium' as const,
      toolsRequired: ['nmap', 'nessus', 'openvas'],
      prerequisites: ['Network scanning completed'],
      expectedOutcome: 'Catalog of potential vulnerabilities',
      executionOrder: 2
    },
    {
      phase: 'exploitation',
      mitreId: 'T1190',
      techniqueName: 'Exploit Public-Facing Application',
      description: 'Attempt exploitation of identified web applications and services',
      riskLevel: 'high' as const,
      toolsRequired: ['nikto', 'sqlmap', 'burpsuite'],
      prerequisites: ['Vulnerability assessment completed'],
      expectedOutcome: 'Initial access to target systems',
      executionOrder: 3
    }
  ];

  return baseAttacks;
}