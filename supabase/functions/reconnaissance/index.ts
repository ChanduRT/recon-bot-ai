import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ReconRequest {
  target: string;
  services: string[]; // ['shodan', 'virustotal', 'ipinfo']
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

    const requestBody = await req.json();
    const { target, services = [] }: ReconRequest = requestBody;
    const results: Record<string, any> = {};
    
    console.log('Reconnaissance request:', { target, services });
    
    if (!target) {
      return new Response(JSON.stringify({ error: 'Target is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Log API usage
    const logApiUsage = async (serviceName: string, endpoint: string, status: number) => {
      await supabase.from('api_usage').insert({
        user_id: user.id,
        service_name: serviceName,
        endpoint,
        response_status: status
      });
    };

    // Shodan integration
    if (services && services.length > 0 && services.includes('shodan')) {
      try {
        const shodanResponse = await fetch(`https://api.shodan.io/shodan/host/${target}?key=${Deno.env.get('SHODAN_API_KEY')}`);
        await logApiUsage('shodan', '/shodan/host', shodanResponse.status);
        
        if (shodanResponse.ok) {
          const shodanData = await shodanResponse.json();
          results.shodan = {
            ip: shodanData.ip_str,
            hostnames: shodanData.hostnames || [],
            ports: shodanData.ports || [],
            services: shodanData.data?.map((service: any) => ({
              port: service.port,
              protocol: service.transport,
              product: service.product,
              version: service.version,
              banner: service.data?.substring(0, 200)
            })) || [],
            organization: shodanData.org,
            isp: shodanData.isp,
            country: shodanData.country_name,
            city: shodanData.city,
            vulns: shodanData.vulns || [],
            tags: shodanData.tags || []
          };
        } else {
          results.shodan = { error: 'Failed to fetch Shodan data', status: shodanResponse.status };
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        results.shodan = { error: errorMessage };
      }
    }

    // VirusTotal integration  
    if (services && services.length > 0 && services.includes('virustotal')) {
      try {
        // For IP addresses
        const vtResponse = await fetch(`https://www.virustotal.com/vtapi/v2/ip-address/report?apikey=${Deno.env.get('VIRUSTOTAL_API_KEY')}&ip=${target}`);
        await logApiUsage('virustotal', '/ip-address/report', vtResponse.status);
        
        if (vtResponse.ok) {
          const vtData = await vtResponse.json();
          results.virustotal = {
            response_code: vtData.response_code,
            verbose_msg: vtData.verbose_msg,
            detected_urls: vtData.detected_urls?.slice(0, 10) || [], // Limit to 10 URLs
            detected_downloaded_samples: vtData.detected_downloaded_samples?.slice(0, 10) || [],
            detected_communicating_samples: vtData.detected_communicating_samples?.slice(0, 10) || [],
            undetected_downloaded_samples: vtData.undetected_downloaded_samples?.slice(0, 5) || [],
            country: vtData.country,
            as_owner: vtData.as_owner,
            asn: vtData.asn
          };
        } else {
          results.virustotal = { error: 'Failed to fetch VirusTotal data', status: vtResponse.status };
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        results.virustotal = { error: errorMessage };
      }
    }

    // IPInfo integration
    if (services && services.length > 0 && services.includes('ipinfo')) {
      try {
        const ipinfoResponse = await fetch(`https://ipinfo.io/${target}?token=${Deno.env.get('IPINFO_API_KEY')}`);
        await logApiUsage('ipinfo', '/ip', ipinfoResponse.status);
        
        if (ipinfoResponse.ok) {
          const ipinfoData = await ipinfoResponse.json();
          results.ipinfo = {
            ip: ipinfoData.ip,
            hostname: ipinfoData.hostname,
            city: ipinfoData.city,
            region: ipinfoData.region,
            country: ipinfoData.country,
            loc: ipinfoData.loc,
            org: ipinfoData.org,
            postal: ipinfoData.postal,
            timezone: ipinfoData.timezone,
            asn: ipinfoData.asn,
            company: ipinfoData.company,
            carrier: ipinfoData.carrier,
            privacy: ipinfoData.privacy
          };
        } else {
          results.ipinfo = { error: 'Failed to fetch IPInfo data', status: ipinfoResponse.status };
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        results.ipinfo = { error: errorMessage };
      }
    }

    // Additional DNS reconnaissance for domains (if DNS service requested or no services specified)
    if ((!services || services.length === 0 || services.includes('dns')) && target.includes('.') && !target.match(/^\d+\.\d+\.\d+\.\d+$/)) {
      try {
        // Basic DNS lookups would go here
        // For now, we'll add a placeholder for DNS data
        results.dns = {
          domain: target,
          note: 'DNS reconnaissance would be performed here with appropriate DNS libraries'
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        results.dns = { error: errorMessage };
      }
    }

    return new Response(JSON.stringify({
      target,
      timestamp: new Date().toISOString(),
      services_queried: services,
      results
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in reconnaissance:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});