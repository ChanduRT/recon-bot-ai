import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ThreatAnalysisRequest {
  ioc: string; // Indicator of Compromise
  iocType: 'ip' | 'domain' | 'hash' | 'url' | 'email';
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

    const { ioc, iocType }: ThreatAnalysisRequest = await req.json();

    // Check existing threat intelligence
    const { data: existingThreat } = await supabase
      .from('threat_intelligence')
      .select('*')
      .eq('ioc_value', ioc)
      .eq('ioc_type', iocType)
      .eq('is_active', true)
      .single();

    let threatIntelligence = existingThreat;
    let analysisResults: any = {};

    // If no existing threat intelligence, perform analysis
    if (!existingThreat) {
      // VirusTotal analysis based on IOC type
      try {
        let vtEndpoint = '';
        let vtParams = `apikey=${Deno.env.get('VIRUSTOTAL_API_KEY')}`;

        switch (iocType) {
          case 'ip':
            vtEndpoint = 'https://www.virustotal.com/vtapi/v2/ip-address/report';
            vtParams += `&ip=${ioc}`;
            break;
          case 'domain':
            vtEndpoint = 'https://www.virustotal.com/vtapi/v2/domain/report';
            vtParams += `&domain=${ioc}`;
            break;
          case 'hash':
            vtEndpoint = 'https://www.virustotal.com/vtapi/v2/file/report';
            vtParams += `&resource=${ioc}`;
            break;
          case 'url':
            vtEndpoint = 'https://www.virustotal.com/vtapi/v2/url/report';
            vtParams += `&resource=${encodeURIComponent(ioc)}`;
            break;
        }

        if (vtEndpoint) {
          const vtResponse = await fetch(`${vtEndpoint}?${vtParams}`);
          
          // Log API usage
          await supabase.from('api_usage').insert({
            user_id: user.id,
            service_name: 'virustotal',
            endpoint: vtEndpoint.split('?')[0],
            response_status: vtResponse?.status || 0
          });
          
          if (vtResponse.ok) {
            const vtData = await vtResponse.json();
            analysisResults.virustotal = vtData;

            // Determine threat level based on VirusTotal results
            let threatLevel = 'low';
            let description = 'No significant threats detected';

            if (iocType === 'ip' || iocType === 'domain') {
              const detectedUrls = vtData.detected_urls || [];
              const maliciousCount = detectedUrls.length;
              
              if (maliciousCount > 5) {
                threatLevel = 'high';
                description = `High threat: ${maliciousCount} malicious URLs detected`;
              } else if (maliciousCount > 0) {
                threatLevel = 'medium';
                description = `Medium threat: ${maliciousCount} malicious URLs detected`;
              }
            } else if (iocType === 'hash' || iocType === 'url') {
              const positives = vtData.positives || 0;
              const total = vtData.total || 0;
              
              if (positives > total * 0.3) {
                threatLevel = 'high';
                description = `High threat: ${positives}/${total} engines detected malware`;
              } else if (positives > 0) {
                threatLevel = 'medium';
                description = `Medium threat: ${positives}/${total} engines detected malware`;
              }
            }

            // Store threat intelligence
            const { data: newThreat } = await supabase
              .from('threat_intelligence')
              .insert({
                ioc_value: ioc,
                ioc_type: iocType,
                threat_level: threatLevel,
                source: 'virustotal',
                description,
                tags: ['automated_analysis'],
                metadata: { virustotal: vtData }
              })
              .select()
              .single();

            threatIntelligence = newThreat;
          }
        }

      } catch (error) {
        console.error('VirusTotal analysis error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        analysisResults.virustotal = { error: errorMessage };
      }

      // AI-powered threat analysis
      try {
        const aiPrompt = `
Analyze the following Indicator of Compromise (IOC) for cybersecurity threats:

IOC: ${ioc}
Type: ${iocType}
${analysisResults.virustotal ? `VirusTotal Data: ${JSON.stringify(analysisResults.virustotal, null, 2)}` : ''}

Provide a comprehensive threat analysis including:
1. Threat classification and severity (low, medium, high, critical)
2. Potential attack vectors
3. Associated threat actors or campaigns (if known)
4. Recommended defensive actions
5. Confidence score (0-100)

Format your response as JSON.
        `;

        const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: 'You are a cybersecurity threat intelligence analyst. Provide detailed, accurate threat analysis in JSON format.' },
              { role: 'user', content: aiPrompt }
            ],
            temperature: 0.3,
            max_tokens: 1500
          }),
        });

        if (openaiResponse.ok) {
          const aiResult = await openaiResponse.json();
          const aiAnalysis = aiResult.choices[0].message.content;
          
          try {
            analysisResults.ai_analysis = JSON.parse(aiAnalysis);
          } catch {
            analysisResults.ai_analysis = { raw_analysis: aiAnalysis };
          }
        }

      } catch (error) {
        console.error('AI analysis error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        analysisResults.ai_analysis = { error: errorMessage };
      }
    }

    // Get related IOCs and campaigns
    const { data: relatedThreats } = await supabase
      .from('threat_intelligence')
      .select('*')
      .or(`tags.cs.{${ioc}},metadata.cs.${ioc}`)
      .limit(5);

    return new Response(JSON.stringify({
      ioc,
      ioc_type: iocType,
      threat_intelligence: threatIntelligence,
      analysis_results: analysisResults,
      related_threats: relatedThreats || [],
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in threat analysis:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});