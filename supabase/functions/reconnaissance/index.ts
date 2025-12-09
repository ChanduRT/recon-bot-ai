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

// Demo target domains that should return simulated data
const DEMO_TARGETS = [
  'vulnweb.com',
  'testphp.vulnweb.com',
  'testasp.vulnweb.com',
  'testhtml5.vulnweb.com',
  'google-gruyere.appspot.com',
  'hackthissite.org'
];

// High-risk vulnerabilities data
const HIGH_RISK_VULNERABILITIES = [
  {
    ip: '10.24.5.17',
    port: 22,
    service: 'OpenSSH 6.0',
    severity: 'high',
    cve: 'CVE-2016-10009',
    name: 'OpenSSH Remote Code Execution',
    description: 'Outdated SSH version allows crafted requests to execute arbitrary commands on the remote system.',
    cvss_score: 7.8,
    exploitability: 'high',
    mitigation: 'Upgrade OpenSSH to version 7.4 or later. Implement key-based authentication only.'
  },
  {
    ip: '172.16.44.201',
    port: 445,
    service: 'SMBv1',
    severity: 'critical',
    cve: 'CVE-2017-0144',
    name: 'EternalBlue SMB Remote Code Execution',
    description: 'SMBv1 enabled and vulnerable to remote code execution via specially crafted packets.',
    cvss_score: 9.8,
    exploitability: 'critical',
    mitigation: 'Disable SMBv1 immediately. Apply MS17-010 security patch. Block port 445 at perimeter.'
  },
  {
    ip: '192.168.50.77',
    port: 80,
    service: 'Apache 2.2.8',
    severity: 'high',
    cve: 'CVE-2010-0740',
    name: 'Directory Traversal / Arbitrary File Access',
    description: 'Misconfigured Apache allows path traversal attacks enabling access to sensitive files outside web root.',
    cvss_score: 7.5,
    exploitability: 'high',
    mitigation: 'Update Apache to latest version. Configure proper directory permissions and disable directory listing.'
  },
  {
    ip: '10.0.3.110',
    port: 3306,
    service: 'MySQL 5.5',
    severity: 'critical',
    cve: 'CWE-521',
    name: 'Weak Database Credentials (root:root)',
    description: 'Database server allows login using default/weak credentials enabling full database access.',
    cvss_score: 9.1,
    exploitability: 'critical',
    mitigation: 'Change default credentials immediately. Implement strong password policy and restrict network access.'
  },
  {
    ip: '192.168.200.14',
    port: 21,
    service: 'vsftpd 2.3.4',
    severity: 'high',
    cve: 'CVE-2011-2523',
    name: 'Anonymous FTP Login Enabled',
    description: 'FTP server allows anonymous access enabling unauthorized data extraction and potential file upload.',
    cvss_score: 7.3,
    exploitability: 'high',
    mitigation: 'Disable anonymous FTP access. Implement SFTP instead of FTP for encrypted file transfers.'
  },
  {
    ip: '172.16.8.90',
    port: 23,
    service: 'Telnet',
    severity: 'high',
    cve: 'CWE-319',
    name: 'Unencrypted Remote Access Protocol',
    description: 'Telnet transmits credentials in cleartext, easily intercepted via network sniffing attacks.',
    cvss_score: 7.4,
    exploitability: 'high',
    mitigation: 'Disable Telnet completely. Use SSH for all remote administration tasks.'
  },
  {
    ip: '10.11.12.40',
    port: 8080,
    service: 'Apache Tomcat 7.0.23',
    severity: 'critical',
    cve: 'CVE-2017-12617',
    name: 'Tomcat Manager Unrestricted Access',
    description: 'Tomcat manager interface exposed without authentication allowing WAR file deployment and remote code execution.',
    cvss_score: 9.8,
    exploitability: 'critical',
    mitigation: 'Restrict manager interface access. Implement strong authentication. Remove default applications.'
  },
  {
    ip: '192.168.77.99',
    port: 3389,
    service: 'Microsoft RDP',
    severity: 'critical',
    cve: 'CVE-2019-0708',
    name: 'BlueKeep Remote Desktop Vulnerability',
    description: 'Remote Desktop Protocol vulnerable to pre-authentication remote code execution without user interaction.',
    cvss_score: 9.8,
    exploitability: 'critical',
    mitigation: 'Apply Microsoft security update KB4499175. Enable Network Level Authentication. Consider VPN-only RDP access.'
  }
];

// Low-risk vulnerabilities data
const LOW_RISK_VULNERABILITIES = [
  {
    ip: '10.24.5.17',
    port: 80,
    service: 'Apache 2.4.57',
    severity: 'low',
    cve: 'CWE-200',
    name: 'Server Banner Information Disclosure',
    description: 'Web server leaks version information in HTTP headers aiding reconnaissance.',
    cvss_score: 3.1,
    exploitability: 'low',
    mitigation: 'Configure ServerTokens Prod and ServerSignature Off in Apache configuration.'
  },
  {
    ip: '172.16.44.201',
    port: 53,
    service: 'BIND 9.11',
    severity: 'low',
    cve: 'CWE-16',
    name: 'DNS Zone Transfer Restriction Warning',
    description: 'DNS zone transfers properly restricted but configuration could be hardened further.',
    cvss_score: 2.5,
    exploitability: 'low',
    mitigation: 'Verify allow-transfer directives. Implement TSIG for zone transfers between authorized servers.'
  },
  {
    ip: '192.168.50.77',
    port: 443,
    service: 'TLS 1.2',
    severity: 'low',
    cve: 'CWE-693',
    name: 'Missing HTTP Strict Transport Security Header',
    description: 'HSTS header not configured potentially allowing protocol downgrade attacks.',
    cvss_score: 3.7,
    exploitability: 'low',
    mitigation: 'Add Strict-Transport-Security header with appropriate max-age and includeSubDomains directive.'
  },
  {
    ip: '10.0.3.110',
    port: 8081,
    service: 'Node.js Express API',
    severity: 'low',
    cve: 'CWE-209',
    name: 'Verbose Error Message Exposure',
    description: 'API returns detailed stack traces in error responses aiding attacker reconnaissance.',
    cvss_score: 3.3,
    exploitability: 'low',
    mitigation: 'Implement production error handling that logs details internally but returns generic messages to clients.'
  },
  {
    ip: '192.168.200.14',
    port: 111,
    service: 'rpcbind',
    severity: 'low',
    cve: 'CWE-200',
    name: 'RPC Portmapper Service Enumeration',
    description: 'RPC portmapper allows enumeration of available services on the host.',
    cvss_score: 2.9,
    exploitability: 'low',
    mitigation: 'Restrict rpcbind access via firewall. Consider disabling if RPC services not required.'
  },
  {
    ip: '172.16.8.90',
    port: 53,
    service: 'DNS',
    severity: 'low',
    cve: 'CWE-757',
    name: 'DNSSEC Not Implemented',
    description: 'DNS responses not cryptographically signed allowing potential cache poisoning.',
    cvss_score: 3.1,
    exploitability: 'low',
    mitigation: 'Implement DNSSEC signing for authoritative zones. Enable DNSSEC validation for resolvers.'
  },
  {
    ip: '10.11.12.40',
    port: 25,
    service: 'Postfix SMTP',
    severity: 'low',
    cve: 'CWE-200',
    name: 'SMTP VRFY Command Enabled',
    description: 'SMTP VRFY command allows enumeration of valid email addresses on the system.',
    cvss_score: 2.6,
    exploitability: 'low',
    mitigation: 'Disable VRFY command in SMTP configuration. Set disable_vrfy_command = yes in Postfix.'
  }
];

// Generate simulated scan results for demo targets
function generateDemoResults(target: string) {
  const baseTimestamp = new Date();
  const scanDuration = Math.floor(Math.random() * 45000) + 15000; // 15-60 seconds
  
  // Randomly select vulnerabilities (weighted towards showing more high-risk for demo effect)
  const numHighRisk = Math.floor(Math.random() * 4) + 3; // 3-6 high risk
  const numLowRisk = Math.floor(Math.random() * 4) + 2; // 2-5 low risk
  
  const selectedHigh = HIGH_RISK_VULNERABILITIES
    .sort(() => Math.random() - 0.5)
    .slice(0, numHighRisk);
  
  const selectedLow = LOW_RISK_VULNERABILITIES
    .sort(() => Math.random() - 0.5)
    .slice(0, numLowRisk);
  
  const allVulnerabilities = [...selectedHigh, ...selectedLow];
  
  // Calculate risk score based on vulnerabilities
  const criticalCount = allVulnerabilities.filter(v => v.severity === 'critical').length;
  const highCount = allVulnerabilities.filter(v => v.severity === 'high').length;
  const riskScore = Math.min(10, 4.5 + (criticalCount * 1.5) + (highCount * 0.8) + (Math.random() * 0.5));
  
  // Generate open ports from vulnerabilities
  const openPorts = [...new Set(allVulnerabilities.map(v => v.port))].sort((a, b) => a - b);
  
  // Generate findings based on vulnerabilities
  const findings = [
    `Detected ${criticalCount} critical and ${highCount} high severity vulnerabilities requiring immediate attention`,
    'Multiple services running outdated software versions with known CVE vulnerabilities',
    'Network services exposed that should be restricted to internal access only',
    'Default or weak credentials detected on critical infrastructure components',
    'Missing security headers and encryption configurations on web services',
    'Potential lateral movement paths identified through service interconnections'
  ].slice(0, Math.floor(Math.random() * 3) + 3);

  return {
    shodan: {
      ip: target.includes('.') && !target.match(/[a-zA-Z]/) ? target : '192.168.1.100',
      hostnames: [target],
      ports: openPorts,
      services: allVulnerabilities.map(v => ({
        port: v.port,
        protocol: 'tcp',
        product: v.service.split(' ')[0],
        version: v.service.split(' ')[1] || '1.0',
        banner: `${v.service} - Simulated vulnerability scan target`
      })),
      organization: 'Demo Lab Environment',
      isp: 'Intentionally Vulnerable Network',
      country: 'United States',
      city: 'Security Training Center',
      vulns: allVulnerabilities.filter(v => v.cve.startsWith('CVE')).map(v => v.cve),
      tags: ['demo-target', 'vulnerability-lab', 'training']
    },
    virustotal: {
      response_code: 1,
      verbose_msg: 'IP address found in dataset',
      detected_urls: [
        { url: `http://${target}/admin`, positives: 3, total: 70 },
        { url: `http://${target}/login.php`, positives: 2, total: 70 },
        { url: `http://${target}/upload`, positives: 5, total: 70 }
      ],
      detected_downloaded_samples: [],
      detected_communicating_samples: [],
      country: 'US',
      as_owner: 'Demo Network Inc.',
      asn: 12345
    },
    ipinfo: {
      ip: '192.168.1.100',
      hostname: target,
      city: 'Security Lab',
      region: 'Training Zone',
      country: 'US',
      loc: '37.7749,-122.4194',
      org: 'AS12345 Demo Security Network',
      postal: '94105',
      timezone: 'America/Los_Angeles'
    },
    vulnerabilities: allVulnerabilities,
    risk_score: parseFloat(riskScore.toFixed(1)),
    findings: findings,
    open_ports: openPorts,
    scan_duration_ms: scanDuration,
    scan_type: 'comprehensive',
    recent_threat_intelligence: {
      timestamp: baseTimestamp.toISOString(),
      recent_vulnerabilities: `Target ${target} is a known vulnerable test environment. Analysis indicates multiple exploitable services:\n\n` +
        `• ${criticalCount} CRITICAL severity issues including potential RCE vulnerabilities\n` +
        `• ${highCount} HIGH severity issues with authentication and access control weaknesses\n` +
        `• ${numLowRisk} LOW severity configuration and information disclosure issues\n\n` +
        `This environment demonstrates common attack vectors found in real-world penetration tests. ` +
        `Recommended immediate actions: patch critical services, rotate credentials, implement network segmentation.`
    }
  };
}

// Check if target is a demo target
function isDemoTarget(target: string): boolean {
  const normalizedTarget = target.toLowerCase().trim();
  return DEMO_TARGETS.some(demo => 
    normalizedTarget === demo.toLowerCase() || 
    normalizedTarget.endsWith('.' + demo.toLowerCase()) ||
    normalizedTarget.includes(demo.toLowerCase())
  );
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
    
    console.log('Reconnaissance request:', { target, services });
    
    if (!target) {
      return new Response(JSON.stringify({ error: 'Target is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if this is a demo target - return simulated results
    if (isDemoTarget(target)) {
      console.log('Demo target detected, returning simulated vulnerability data');
      
      // Add slight delay to simulate real scan
      await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 2000));
      
      const demoResults = generateDemoResults(target);
      
      // Log API usage for tracking
      await supabase.from('api_usage').insert({
        user_id: user.id,
        service_name: 'demo_scan',
        endpoint: '/reconnaissance',
        response_status: 200
      });
      
      return new Response(JSON.stringify({
        target,
        timestamp: new Date().toISOString(),
        services_queried: services.length > 0 ? services : ['shodan', 'virustotal', 'ipinfo'],
        results: demoResults
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Regular reconnaissance for non-demo targets
    const results: Record<string, any> = {};

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
