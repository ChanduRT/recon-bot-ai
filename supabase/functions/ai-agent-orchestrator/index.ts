import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ScanRequest {
  target: string;
  assetType: 'domain' | 'ip' | 'url' | 'hash' | 'email';
  agentIds?: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);

    if (!user) {
      return new Response('Unauthorized', { status: 401, headers: corsHeaders });
    }

    const { target, assetType, agentIds }: ScanRequest = await req.json();

    // Create scan record
    const { data: scan, error: scanError } = await supabase
      .from('scans')
      .insert({
        user_id: user.id,
        target,
        asset_type: assetType,
        status: 'running',
        metadata: { started_at: new Date().toISOString() }
      })
      .select()
      .single();

    if (scanError) {
      console.error('Error creating scan:', scanError);
      return new Response(JSON.stringify({ error: 'Failed to create scan' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get AI agents to run
    let { data: agents, error: agentsError } = await supabase
      .from('ai_agents')
      .select('*')
      .eq('is_active', true);

    if (agentsError) {
      console.error('Error fetching agents:', agentsError);
      return new Response(JSON.stringify({ error: 'Failed to fetch agents' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Filter agents if specific ones requested
    if (agentIds && agentIds.length > 0) {
      agents = agents?.filter(agent => agentIds.includes(agent.id)) || [];
    }

    // First, gather real reconnaissance data
    console.log('Gathering reconnaissance data for:', target);
    let reconData: any = { target };
    
    try {
      const reconResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/reconnaissance`, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          target,
          services: ['shodan', 'virustotal', 'ipinfo']
        }),
      });

      if (reconResponse.ok) {
        reconData = await reconResponse.json();
        console.log('Reconnaissance data gathered:', reconData);
      } else {
        console.warn('Reconnaissance failed, continuing with limited data');
      }
    } catch (error) {
      console.error('Reconnaissance error:', error);
    }

    // Gather recent vulnerability data from Perplexity
    console.log('Gathering recent vulnerability data from Perplexity for:', target);
    let perplexityData: any = null;
    
    try {
      const perplexityApiKey = Deno.env.get('PERPLEXITY_API_KEY');
      
      if (perplexityApiKey) {
        const perplexityResponse = await fetch('https://api.perplexity.ai/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${perplexityApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'llama-3.1-sonar-small-128k-online',
            messages: [
              {
                role: 'system',
                content: 'You are a cybersecurity expert. Provide recent vulnerability information about the given target. Be precise and concise. Focus on CVEs, exploits, and security advisories from the last 6 months.'
              },
              {
                role: 'user',
                content: `Find recent vulnerabilities, CVEs, security advisories, and exploit information for: ${target}. Include any known security issues, patches, and threat intelligence.`
              }
            ],
            temperature: 0.2,
            top_p: 0.9,
            max_tokens: 1000,
            search_recency_filter: 'month'
          }),
        });

        if (perplexityResponse.ok) {
          const perplexityResult = await perplexityResponse.json();
          perplexityData = {
            recent_vulnerabilities: perplexityResult.choices[0].message.content,
            timestamp: new Date().toISOString()
          };
          console.log('Perplexity data gathered:', perplexityData);
        } else {
          console.warn('Perplexity API call failed:', await perplexityResponse.text());
        }
      } else {
        console.warn('Perplexity API key not configured');
      }
    } catch (error) {
      console.error('Perplexity error:', error);
    }

    // Execute agents in parallel with reconnaissance data
    const agentPromises = agents?.map(async (agent) => {
      const startTime = Date.now();
      
      try {
        // Create agent execution record
        const { data: execution } = await supabase
          .from('agent_executions')
          .insert({
            scan_id: scan.id,
            agent_id: agent.id,
            user_id: user.id,
            status: 'running',
            input_data: { target, asset_type: assetType }
          })
          .select()
          .single();

        // Prepare AI prompt with reconnaissance data
        let prompt = agent.prompt_template.replace('{target}', target);
        
        // Enhance prompt with real reconnaissance findings and recent vulnerability data
        let reconContext = `\n\nREAL RECONNAISSANCE DATA:\n${JSON.stringify(reconData, null, 2)}`;
        
        if (perplexityData) {
          reconContext += `\n\nRECENT VULNERABILITY INTELLIGENCE:\n${perplexityData.recent_vulnerabilities}`;
        }
        
        reconContext += `\n\nAnalyze this data and identify specific vulnerabilities.`;
        
        // Call OpenAI
        const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              { 
                role: 'system', 
                content: 'You are a cybersecurity expert. Analyze reconnaissance data and identify vulnerabilities. Return JSON with: {vulnerabilities: [{name, cve, severity, description, cvss_score, exploitability, port, service, mitigation}], findings: string[], risk_score: number}'
              },
              { role: 'user', content: prompt + reconContext }
            ],
            temperature: 0.7,
            max_tokens: 2000
          }),
        });

        const aiResult = await openaiResponse.json();
        const analysisResult = aiResult.choices[0].message.content;

        // Parse AI response as JSON
        let parsedResult;
        try {
          parsedResult = JSON.parse(analysisResult);
        } catch {
          parsedResult = { analysis: analysisResult, raw: true };
        }

        // Update execution with results
        await supabase
          .from('agent_executions')
          .update({
            status: 'completed',
            output_data: parsedResult,
            execution_time_ms: Date.now() - startTime,
            completed_at: new Date().toISOString()
          })
          .eq('id', execution.id);

        return {
          agent: agent.name,
          result: parsedResult,
          execution_time_ms: Date.now() - startTime
        };

      } catch (error) {
        console.error(`Agent ${agent.name} failed:`, error);
        
        // Update execution with error
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        await supabase
          .from('agent_executions')
          .update({
            status: 'failed',
            error_message: errorMessage,
            execution_time_ms: Date.now() - startTime,
            completed_at: new Date().toISOString()
          })
          .eq('scan_id', scan.id)
          .eq('agent_id', agent.id);

        return {
          agent: agent.name,
          error: errorMessage,
          execution_time_ms: Date.now() - startTime
        };
      }
    }) || [];

    // Wait for all agents to complete
    const results = await Promise.all(agentPromises);

    // Aggregate vulnerabilities from all agents
    const allVulnerabilities: any[] = [];
    const allFindings: string[] = [];
    let totalRiskScore = 0;

    results.forEach(r => {
      if (r.result && !r.error) {
        if (r.result.vulnerabilities && Array.isArray(r.result.vulnerabilities)) {
          allVulnerabilities.push(...r.result.vulnerabilities);
        }
        if (r.result.findings && Array.isArray(r.result.findings)) {
          allFindings.push(...r.result.findings);
        }
        if (r.result.risk_score) {
          totalRiskScore += r.result.risk_score;
        }
      }
    });

    // Extract open ports from Shodan data
    const openPorts = reconData.results?.shodan?.ports || [];
    const services = reconData.results?.shodan?.services || [];

    // Aggregate results and determine threat level
    const aggregatedResults = {
      target,
      asset_type: assetType,
      vulnerabilities: allVulnerabilities,
      findings: allFindings,
      open_ports: openPorts,
      services: services,
      risk_score: totalRiskScore / Math.max(results.filter(r => !r.error).length, 1),
      reconnaissance_data: reconData,
      recent_threat_intelligence: perplexityData,
      agents: results,
      summary: {
        total_agents: results.length,
        successful: results.filter(r => !r.error).length,
        failed: results.filter(r => r.error).length,
        total_vulnerabilities: allVulnerabilities.length,
        total_execution_time: results.reduce((sum, r) => sum + r.execution_time_ms, 0)
      }
    };

    // Determine threat level based on vulnerabilities and risk score
    let threatLevel = 'low';
    const highSeverityVulns = allVulnerabilities.filter(v => 
      v.severity === 'critical' || v.severity === 'high'
    ).length;
    
    const avgRiskScore = totalRiskScore / Math.max(results.filter(r => !r.error).length, 1);
    
    // Detailed threat level calculation with logging
    const threatFactors = {
      highSeverityCount: highSeverityVulns,
      totalVulnerabilities: allVulnerabilities.length,
      avgRiskScore: avgRiskScore.toFixed(2),
      findingsCount: allFindings.length,
      openPortsCount: openPorts.length,
      hasRecentThreats: !!perplexityData
    };
    
    if (highSeverityVulns >= 3 || avgRiskScore >= 8) {
      threatLevel = 'critical';
      console.log('🔴 CRITICAL threat level assigned:', threatFactors);
    } else if (highSeverityVulns >= 1 || avgRiskScore >= 6) {
      threatLevel = 'high';
      console.log('🟠 HIGH threat level assigned:', threatFactors);
    } else if (allVulnerabilities.length >= 3 || avgRiskScore >= 4) {
      threatLevel = 'medium';
      console.log('🟡 MEDIUM threat level assigned:', threatFactors);
    } else {
      console.log('🟢 LOW threat level assigned:', threatFactors);
    }
    
    console.log('Threat assessment complete:', { 
      threatLevel, 
      ...threatFactors,
      calculationReason: `Risk score: ${avgRiskScore.toFixed(1)}/10, CVEs: ${allVulnerabilities.length}, High severity: ${highSeverityVulns}, Findings: ${allFindings.length}`
    });

    // Update scan with final results
    await supabase
      .from('scans')
      .update({
        status: 'completed',
        threat_level: threatLevel,
        results: aggregatedResults,
        completed_at: new Date().toISOString()
      })
      .eq('id', scan.id);

    return new Response(JSON.stringify({
      scan_id: scan.id,
      status: 'completed',
      threat_level: threatLevel,
      results: aggregatedResults
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in AI orchestrator:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});