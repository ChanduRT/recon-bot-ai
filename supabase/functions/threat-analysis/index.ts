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
    let threatLevel = 'low';
    let description = 'No significant threats detected in initial analysis';

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

            // Determine threat level and create detailed description based on VirusTotal results
            let vtThreatLevel = 'low';
            let vtDescription = 'No significant threats detected in initial analysis';

            if (iocType === 'ip' || iocType === 'domain') {
              const detectedUrls = vtData.detected_urls || [];
              const maliciousCount = detectedUrls.length;
              const detectedSamples = vtData.detected_downloaded_samples || [];
              const communicatingSamples = vtData.detected_communicating_samples || [];
              
              if (maliciousCount > 10 || detectedSamples.length > 5) {
                vtThreatLevel = 'critical';
                vtDescription = `Critical threat infrastructure: ${maliciousCount} malicious URLs and ${detectedSamples.length} malware samples detected. High confidence C2 or malware distribution site.`;
              } else if (maliciousCount > 5 || detectedSamples.length > 0) {
                vtThreatLevel = 'high';
                vtDescription = `High threat ${iocType}: ${maliciousCount} malicious URLs detected with ${detectedSamples.length} associated malware samples. Likely compromised or malicious infrastructure.`;
              } else if (maliciousCount > 0 || communicatingSamples.length > 0) {
                vtThreatLevel = 'medium';
                vtDescription = `Medium threat ${iocType}: ${maliciousCount} suspicious URLs and ${communicatingSamples.length} communicating samples detected. Monitor for potential compromise.`;
              } else {
                vtDescription = `${iocType.toUpperCase()} appears clean in VirusTotal analysis with no detected malicious activity.`;
              }
            } else if (iocType === 'hash') {
              const positives = vtData.positives || 0;
              const total = vtData.total || 0;
              
              if (positives > total * 0.5) {
                vtThreatLevel = 'critical';
                vtDescription = `Critical malware detected: ${positives}/${total} security engines flagged this file hash as malicious. High confidence malware.`;
              } else if (positives > total * 0.3) {
                vtThreatLevel = 'high';
                vtDescription = `High threat file: ${positives}/${total} security engines detected malware signatures. Likely malicious file.`;
              } else if (positives > 0) {
                vtThreatLevel = 'medium';
                vtDescription = `Suspicious file: ${positives}/${total} security engines flagged this hash. May contain potentially unwanted software or false positives.`;
              } else {
                vtDescription = `File hash appears clean with ${total} security engines reporting no threats detected.`;
              }
            } else if (iocType === 'url') {
              const positives = vtData.positives || 0;
              const total = vtData.total || 0;
              
              if (positives > total * 0.4) {
                vtThreatLevel = 'critical';
                vtDescription = `Critical malicious URL: ${positives}/${total} security engines flagged this URL as dangerous. High risk of malware, phishing, or exploit delivery.`;
              } else if (positives > total * 0.2) {
                vtThreatLevel = 'high'; 
                vtDescription = `High risk URL: ${positives}/${total} security engines detected threats. May host malware, phishing content, or exploits.`;
              } else if (positives > 0) {
                vtThreatLevel = 'medium';
                vtDescription = `Suspicious URL: ${positives}/${total} security engines flagged potential threats. Monitor for malicious activity.`;
              } else {
                vtDescription = `URL appears clean with ${total} security engines reporting no threats detected.`;
              }
            }

            // Update global variables
            threatLevel = vtThreatLevel;
            description = vtDescription;

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
You are a cybersecurity threat intelligence analyst. Analyze the IOC and provide detailed, actionable threat intelligence.

IOC: ${ioc}
Type: ${iocType}
${analysisResults.virustotal ? `VirusTotal Data: ${JSON.stringify(analysisResults.virustotal, null, 2)}` : ''}

Provide a detailed threat analysis with:

1. **Threat Description**: A clear, detailed explanation of what this IOC represents and why it's dangerous
2. **Attack Methods**: Specific attack techniques and methods associated with this IOC
3. **Impact Assessment**: What damage could occur if this threat is successful
4. **Indicators**: Additional IOCs or patterns to watch for
5. **Mitigation Steps**: Specific, actionable steps to defend against this threat
6. **Context**: Any known campaigns, threat actors, or historical context
7. **Severity**: Risk level assessment with justification
8. **Confidence**: Your confidence in this analysis (0-100)

Be specific and provide actionable intelligence that security teams can use immediately.
Format your response as JSON with these exact fields: description, attack_methods, impact_assessment, related_indicators, mitigation_steps, threat_context, severity_level, confidence_score.
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
            const parsedAnalysis = JSON.parse(aiAnalysis);
            analysisResults.ai_analysis = parsedAnalysis;
            
            // Update threat intelligence with AI-generated description if it's more detailed
            if (parsedAnalysis.description && parsedAnalysis.description.length > description.length) {
              description = parsedAnalysis.description;
            }
            
            // Update threat level if AI suggests higher severity
            if (parsedAnalysis.severity_level) {
              const aiThreatLevel = parsedAnalysis.severity_level.toLowerCase();
              const threatLevels: Record<string, number> = { low: 1, medium: 2, high: 3, critical: 4 };
              const currentLevel = threatLevels[threatLevel] || 1;
              const aiLevel = threatLevels[aiThreatLevel] || 1;
              
              if (aiLevel > currentLevel) {
                threatLevel = aiThreatLevel;
              }
            }
          } catch {
            analysisResults.ai_analysis = { 
              raw_analysis: aiAnalysis,
              error: "Failed to parse AI analysis as JSON"
            };
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