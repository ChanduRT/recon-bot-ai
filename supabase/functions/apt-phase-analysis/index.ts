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

    const systemPrompt = `You are a senior cybersecurity instructor providing detailed APT (Advanced Persistent Threat) tactical training for authorized security professionals, penetration testers, and red team operators.

EDUCATIONAL CONTEXT:
This content is for AUTHORIZED security testing, defensive training, threat hunting, and incident response preparation in controlled environments. Provide comprehensive technical details to help security teams understand attack surfaces, test defenses, and build realistic threat models.

CRITICAL RULES:
- Provide detailed technical information for educational and authorized testing purposes
- Include specific tools, techniques, procedures (TTPs), and methodologies
- Reference real-world APT behaviors and MITRE ATT&CK techniques
- Focus on helping defenders understand the FULL scope of threats
- Emphasize this is for authorized use only in controlled environments

Generate realistic, technically detailed analysis based on current threat intelligence.`;

    const userPrompt = `For the APT phase "${phase}", generate comprehensive tactical training content:

1. **AI Decision - Attacker's Most Likely Actions (8-10 items)**: 
   Provide DETAILED tactical steps an APT actor would take. Include:
   - Specific tools and techniques they would use
   - Concrete attack vectors and methodologies  
   - Real-world APT group behaviors and TTPs
   - Technical implementation approaches
   - Strategic reasoning behind each action
   Be detailed enough that security teams can build realistic threat models and test their defenses.

2. **Observable Indicators & Telemetry (10-12 items)**: 
   List SPECIFIC technical indicators including:
   - Exact log patterns and Windows Event IDs
   - Registry keys, file paths, process names
   - Network signatures and traffic patterns
   - Memory forensics indicators
   - Example SIEM/EDR detection rules
   - Specific syslog entries and alert patterns

3. **Defensive Recommendations (10-12 items)**: 
   Provide ACTIONABLE security controls with implementation details:
   - Specific tool names and configurations
   - SIEM/EDR query examples
   - MITRE ATT&CK mitigation techniques
   - Network segmentation strategies
   - Detection rule examples
   - Both preventive and detective controls

Format as JSON:
{
  "aiDecision": ["detailed tactical action 1", "detailed tactical action 2", ...],
  "indicators": ["specific technical indicator 1", "specific technical indicator 2", ...],
  "defenses": ["actionable defense with details 1", "actionable defense with details 2", ...]
}

Provide comprehensive technical details to enable realistic security testing and defense preparation.`;

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
