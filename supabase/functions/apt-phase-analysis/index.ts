import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phase } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log(`Generating AI analysis for APT phase: ${phase}`);

    const systemPrompt = `You are an expert cybersecurity analyst specializing in Advanced Persistent Threat (APT) detection and defense. Your role is to provide educational insights for security teams.

CRITICAL RULES:
- DO NOT provide exploit code or step-by-step attack instructions
- Focus on detection, observable indicators, and defensive measures
- Provide abstract, conceptual attack scenarios only
- Emphasize security team training and awareness

Generate realistic, current analysis based on latest threat intelligence and MITRE ATT&CK framework.`;

    const userPrompt = `For the APT phase "${phase}", generate a comprehensive analysis with:

1. AI Decision (3-5 items): What would an advanced threat actor most likely do in this phase? Keep it conceptual and non-actionable.

2. Observable Indicators (5-7 items): Specific telemetry, logs, alerts, and anomalies that security teams should monitor to detect this phase.

3. Defensive Recommendations (5-7 items): Concrete, actionable steps that security teams can implement immediately (tools, configurations, policies, monitoring rules).

Format your response as JSON:
{
  "aiDecision": ["action 1", "action 2", ...],
  "indicators": ["indicator 1", "indicator 2", ...],
  "defenses": ["defense 1", "defense 2", ...]
}

Base your analysis on current threat landscape, real APT campaigns, and MITRE ATT&CK techniques. Be specific about tools, techniques, and procedures (TTPs) but avoid providing exploitation details.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Payment required. Please add credits to your workspace.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      throw new Error(`AI Gateway returned ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    console.log('AI response:', content);

    // Parse JSON from AI response
    let analysis;
    try {
      // Try to extract JSON from markdown code blocks if present
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;
      analysis = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
      // Fallback to basic structure
      analysis = {
        aiDecision: [content.substring(0, 200)],
        indicators: ['AI response formatting error - please try again'],
        defenses: ['AI response formatting error - please try again']
      };
    }

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in apt-phase-analysis function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      aiDecision: ['Error generating AI analysis - using fallback'],
      indicators: ['Check console logs for errors'],
      defenses: ['Retry the request']
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
