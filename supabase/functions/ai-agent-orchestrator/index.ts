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

    // Execute agents in parallel
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

        // Prepare AI prompt
        const prompt = agent.prompt_template.replace('{target}', target);
        
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
              { role: 'system', content: 'You are a cybersecurity expert. Provide detailed, accurate analysis in JSON format.' },
              { role: 'user', content: prompt }
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

    // Aggregate results and determine threat level
    const aggregatedResults = {
      target,
      asset_type: assetType,
      agents: results,
      summary: {
        total_agents: results.length,
        successful: results.filter(r => !r.error).length,
        failed: results.filter(r => r.error).length,
        total_execution_time: results.reduce((sum, r) => sum + r.execution_time_ms, 0)
      }
    };

    // Determine threat level based on results
    let threatLevel = 'low';
    const hasHighRiskIndicators = results.some(r => 
      r.result && (
        JSON.stringify(r.result).includes('malicious') ||
        JSON.stringify(r.result).includes('suspicious') ||
        JSON.stringify(r.result).includes('high risk')
      )
    );
    
    if (hasHighRiskIndicators) threatLevel = 'high';
    else if (results.some(r => r.result && JSON.stringify(r.result).includes('medium'))) threatLevel = 'medium';

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