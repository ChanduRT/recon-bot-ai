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

// Demo target domains that should return HIGH RISK simulated data
const DEMO_TARGETS = [
  'vulnweb.com',
  'testphp.vulnweb.com',
  'testasp.vulnweb.com',
  'testhtml5.vulnweb.com',
  'google-gruyere.appspot.com',
  'hackthissite.org'
];

// High-risk IP patterns that should show critical vulnerabilities
const HIGH_RISK_IP_PATTERNS = [
  /^192\.168\.1\.\d+$/,    // Common router/home network IPs
  /^10\.0\.0\.\d+$/,       // Private network Class A
  /^172\.16\.\d+\.\d+$/,   // Private network Class B
  /^192\.168\.0\.\d+$/,    // Common home networks
];

// Medium-risk IP patterns
const MEDIUM_RISK_IP_PATTERNS = [
  /^192\.168\.\d+\.\d+$/,  // Other 192.168.x.x ranges
  /^10\.\d+\.\d+\.\d+$/,   // Other 10.x.x.x ranges
];

// Determine risk level based on target
function getTargetRiskLevel(target: string): 'high' | 'medium' | 'low' {
  const normalizedTarget = target.toLowerCase().trim();
  
  // Demo targets are always high risk
  if (DEMO_TARGETS.some(demo => 
    normalizedTarget === demo.toLowerCase() || 
    normalizedTarget.includes(demo.toLowerCase())
  )) {
    return 'high';
  }
  
  // Check high-risk IP patterns
  if (HIGH_RISK_IP_PATTERNS.some(pattern => pattern.test(target))) {
    return 'high';
  }
  
  // Check medium-risk IP patterns
  if (MEDIUM_RISK_IP_PATTERNS.some(pattern => pattern.test(target))) {
    return 'medium';
  }
  
  // Default to low risk for unknown targets
  return 'low';
}

// High-risk vulnerabilities data
const HIGH_RISK_VULNERABILITIES = [
  {
    ip: '10.24.5.17',
    port: 22,
    service: 'OpenSSH 6.0',
    severity: 'High',
    cve: 'CVE-2016-10009',
    name: 'OpenSSH Remote Code Execution',
    description: 'Outdated SSH version allows crafted requests to execute arbitrary commands on the remote system.',
    cvss_score: '7.8',
    exploitability: 'High',
    mitigation: 'Upgrade OpenSSH to version 7.4 or later. Implement key-based authentication only.'
  },
  {
    ip: '172.16.44.201',
    port: 445,
    service: 'SMBv1',
    severity: 'Critical',
    cve: 'CVE-2017-0144',
    name: 'EternalBlue SMB Remote Code Execution',
    description: 'SMBv1 enabled and vulnerable to remote code execution via specially crafted packets.',
    cvss_score: '9.8',
    exploitability: 'Critical',
    mitigation: 'Disable SMBv1 immediately. Apply MS17-010 security patch. Block port 445 at perimeter.'
  },
  {
    ip: '192.168.50.77',
    port: 80,
    service: 'Apache 2.2.8',
    severity: 'High',
    cve: 'CVE-2010-0740',
    name: 'Directory Traversal / Arbitrary File Access',
    description: 'Misconfigured Apache allows path traversal attacks enabling access to sensitive files outside web root.',
    cvss_score: '7.5',
    exploitability: 'High',
    mitigation: 'Update Apache to latest version. Configure proper directory permissions and disable directory listing.'
  },
  {
    ip: '10.0.3.110',
    port: 3306,
    service: 'MySQL 5.5',
    severity: 'Critical',
    cve: 'CWE-521',
    name: 'Weak Database Credentials (root:root)',
    description: 'Database server allows login using default/weak credentials enabling full database access.',
    cvss_score: '9.1',
    exploitability: 'Critical',
    mitigation: 'Change default credentials immediately. Implement strong password policy and restrict network access.'
  },
  {
    ip: '192.168.200.14',
    port: 21,
    service: 'vsftpd 2.3.4',
    severity: 'High',
    cve: 'CVE-2011-2523',
    name: 'Anonymous FTP Login Enabled',
    description: 'FTP server allows anonymous access enabling unauthorized data extraction and potential file upload.',
    cvss_score: '7.3',
    exploitability: 'High',
    mitigation: 'Disable anonymous FTP access. Implement SFTP instead of FTP for encrypted file transfers.'
  },
  {
    ip: '172.16.8.90',
    port: 23,
    service: 'Telnet',
    severity: 'High',
    cve: 'CWE-319',
    name: 'Unencrypted Remote Access Protocol',
    description: 'Telnet transmits credentials in cleartext, easily intercepted via network sniffing attacks.',
    cvss_score: '7.4',
    exploitability: 'High',
    mitigation: 'Disable Telnet completely. Use SSH for all remote administration tasks.'
  },
  {
    ip: '10.11.12.40',
    port: 8080,
    service: 'Apache Tomcat 7.0.23',
    severity: 'Critical',
    cve: 'CVE-2017-12617',
    name: 'Tomcat Manager Unrestricted Access',
    description: 'Tomcat manager interface exposed without authentication allowing WAR file deployment and remote code execution.',
    cvss_score: '9.8',
    exploitability: 'Critical',
    mitigation: 'Restrict manager interface access. Implement strong authentication. Remove default applications.'
  },
  {
    ip: '192.168.77.99',
    port: 3389,
    service: 'Microsoft RDP',
    severity: 'Critical',
    cve: 'CVE-2019-0708',
    name: 'BlueKeep Remote Desktop Vulnerability',
    description: 'Remote Desktop Protocol vulnerable to pre-authentication remote code execution without user interaction.',
    cvss_score: '9.8',
    exploitability: 'Critical',
    mitigation: 'Apply Microsoft security update KB4499175. Enable Network Level Authentication. Consider VPN-only RDP access.'
  }
];

// Low-risk vulnerabilities data
const LOW_RISK_VULNERABILITIES = [
  {
    ip: '10.24.5.17',
    port: 80,
    service: 'Apache 2.4.57',
    severity: 'Low',
    cve: 'CWE-200',
    name: 'Server Banner Information Disclosure',
    description: 'Web server leaks version information in HTTP headers aiding reconnaissance.',
    cvss_score: '3.1',
    exploitability: 'Low',
    mitigation: 'Configure ServerTokens Prod and ServerSignature Off in Apache configuration.'
  },
  {
    ip: '172.16.44.201',
    port: 53,
    service: 'BIND 9.11',
    severity: 'Low',
    cve: 'CWE-16',
    name: 'DNS Zone Transfer Restriction Warning',
    description: 'DNS zone transfers properly restricted but configuration could be hardened further.',
    cvss_score: '2.5',
    exploitability: 'Low',
    mitigation: 'Verify allow-transfer directives. Implement TSIG for zone transfers between authorized servers.'
  },
  {
    ip: '192.168.50.77',
    port: 443,
    service: 'TLS 1.2',
    severity: 'Low',
    cve: 'CWE-693',
    name: 'Missing HTTP Strict Transport Security Header',
    description: 'HSTS header not configured potentially allowing protocol downgrade attacks.',
    cvss_score: '3.7',
    exploitability: 'Low',
    mitigation: 'Add Strict-Transport-Security header with appropriate max-age and includeSubDomains directive.'
  },
  {
    ip: '10.0.3.110',
    port: 8081,
    service: 'Node.js Express API',
    severity: 'Medium',
    cve: 'CWE-209',
    name: 'Verbose Error Message Exposure',
    description: 'API returns detailed stack traces in error responses aiding attacker reconnaissance.',
    cvss_score: '4.3',
    exploitability: 'Medium',
    mitigation: 'Implement production error handling that logs details internally but returns generic messages to clients.'
  },
  {
    ip: '192.168.200.14',
    port: 111,
    service: 'rpcbind',
    severity: 'Medium',
    cve: 'CWE-200',
    name: 'RPC Portmapper Service Enumeration',
    description: 'RPC portmapper allows enumeration of available services on the host.',
    cvss_score: '4.9',
    exploitability: 'Medium',
    mitigation: 'Restrict rpcbind access via firewall. Consider disabling if RPC services not required.'
  },
  {
    ip: '172.16.8.90',
    port: 53,
    service: 'DNS',
    severity: 'Low',
    cve: 'CWE-757',
    name: 'DNSSEC Not Implemented',
    description: 'DNS responses not cryptographically signed allowing potential cache poisoning.',
    cvss_score: '3.1',
    exploitability: 'Low',
    mitigation: 'Implement DNSSEC signing for authoritative zones. Enable DNSSEC validation for resolvers.'
  },
  {
    ip: '10.11.12.40',
    port: 25,
    service: 'Postfix SMTP',
    severity: 'Low',
    cve: 'CWE-200',
    name: 'SMTP VRFY Command Enabled',
    description: 'SMTP VRFY command allows enumeration of valid email addresses on the system.',
    cvss_score: '2.6',
    exploitability: 'Low',
    mitigation: 'Disable VRFY command in SMTP configuration. Set disable_vrfy_command = yes in Postfix.'
  }
];

// Generate simulated scan results based on risk level
function generateScanResults(target: string, riskLevel: 'high' | 'medium' | 'low') {
  const baseTimestamp = new Date();
  const scanDuration = Math.floor(Math.random() * 45000) + 15000;
  
  let numHighRisk: number, numLowRisk: number;
  let selectedHigh: typeof HIGH_RISK_VULNERABILITIES = [];
  let selectedLow: typeof LOW_RISK_VULNERABILITIES = [];
  
  // Determine vulnerability distribution based on risk level
  if (riskLevel === 'high') {
    // High risk: Show many critical/high vulnerabilities
    numHighRisk = Math.floor(Math.random() * 4) + 4; // 4-7 high risk
    numLowRisk = Math.floor(Math.random() * 3) + 2;  // 2-4 low/medium risk
    selectedHigh = [...HIGH_RISK_VULNERABILITIES]
      .sort(() => Math.random() - 0.5)
      .slice(0, numHighRisk);
    selectedLow = [...LOW_RISK_VULNERABILITIES]
      .sort(() => Math.random() - 0.5)
      .slice(0, numLowRisk);
  } else if (riskLevel === 'medium') {
    // Medium risk: Show fewer high-risk, more medium vulnerabilities
    numHighRisk = Math.floor(Math.random() * 2) + 1; // 1-2 high risk
    numLowRisk = Math.floor(Math.random() * 4) + 3;  // 3-6 low/medium risk
    selectedHigh = [...HIGH_RISK_VULNERABILITIES]
      .filter(v => v.severity === 'High') // Only high, not critical
      .sort(() => Math.random() - 0.5)
      .slice(0, numHighRisk);
    selectedLow = [...LOW_RISK_VULNERABILITIES]
      .sort(() => Math.random() - 0.5)
      .slice(0, numLowRisk);
  } else {
    // Low risk: Mostly informational findings
    numHighRisk = 0;
    numLowRisk = Math.floor(Math.random() * 3) + 2; // 2-4 low risk
    selectedLow = [...LOW_RISK_VULNERABILITIES]
      .filter(v => v.severity === 'Low')
      .sort(() => Math.random() - 0.5)
      .slice(0, numLowRisk);
  }
  
  // Replace IPs in vulnerabilities with the actual target IP
  const allVulnerabilities = [...selectedHigh, ...selectedLow].map((v, idx) => ({
    ...v,
    ip: target.match(/^\d+\.\d+\.\d+\.\d+$/) ? target : `192.168.${Math.floor(idx / 2) + 1}.${(idx * 17 + 10) % 255}`
  }));
  
  // Calculate risk score based on vulnerabilities
  const criticalCount = allVulnerabilities.filter(v => v.severity === 'Critical').length;
  const highCount = allVulnerabilities.filter(v => v.severity === 'High').length;
  const mediumCount = allVulnerabilities.filter(v => v.severity === 'Medium').length;
  const lowCount = allVulnerabilities.filter(v => v.severity === 'Low').length;
  
  let riskScore: number;
  if (riskLevel === 'high') {
    riskScore = Math.min(10, 7.0 + (criticalCount * 0.5) + (highCount * 0.3) + (Math.random() * 0.5));
  } else if (riskLevel === 'medium') {
    riskScore = Math.min(10, 4.0 + (highCount * 0.5) + (mediumCount * 0.3) + (Math.random() * 0.5));
  } else {
    riskScore = Math.min(10, 1.5 + (lowCount * 0.2) + (Math.random() * 0.5));
  }
  
  // Generate open ports from vulnerabilities
  const openPorts = [...new Set(allVulnerabilities.map(v => v.port))].sort((a, b) => a - b);
  
  // Generate findings based on risk level
  const highRiskFindings = [
    `CRITICAL: Detected ${criticalCount} critical and ${highCount} high severity vulnerabilities requiring IMMEDIATE attention`,
    'CRITICAL: Multiple services running severely outdated software with actively exploited CVE vulnerabilities',
    'HIGH: Network services exposed that should be restricted to internal access only',
    'HIGH: Default or weak credentials detected on critical infrastructure components',
    'HIGH: Remote code execution vulnerabilities detected - system compromise possible',
    'HIGH: Potential lateral movement paths identified through service interconnections'
  ];
  
  const mediumRiskFindings = [
    `WARNING: Detected ${highCount} high and ${mediumCount} medium severity vulnerabilities`,
    'MEDIUM: Some services running outdated software versions',
    'MEDIUM: Missing security headers on web services',
    'LOW: Information disclosure vulnerabilities detected',
    'INFO: Recommend reviewing access control configurations'
  ];
  
  const lowRiskFindings = [
    `INFO: Detected ${lowCount} low severity informational findings`,
    'LOW: Minor configuration improvements recommended',
    'INFO: Overall security posture is acceptable',
    'INFO: Continue monitoring for emerging vulnerabilities'
  ];
  
  let findings: string[];
  let threatLevel: string;
  
  if (riskLevel === 'high') {
    findings = highRiskFindings.slice(0, Math.floor(Math.random() * 2) + 4);
    threatLevel = criticalCount > 2 ? 'critical' : 'high';
  } else if (riskLevel === 'medium') {
    findings = mediumRiskFindings.slice(0, Math.floor(Math.random() * 2) + 3);
    threatLevel = 'medium';
  } else {
    findings = lowRiskFindings.slice(0, Math.floor(Math.random() * 2) + 2);
    threatLevel = 'low';
  }

  return {
    shodan: {
      ip: target.match(/^\d+\.\d+\.\d+\.\d+$/) ? target : '192.168.1.100',
      hostnames: [target],
      ports: openPorts,
      services: allVulnerabilities.map(v => ({
        port: v.port,
        protocol: 'tcp',
        product: v.service.split(' ')[0],
        version: v.service.split(' ')[1] || '1.0',
        banner: `${v.service} - Scanned target`
      })),
      organization: riskLevel === 'high' ? 'Vulnerable Network Detected' : 'Standard Network',
      isp: 'Network Provider',
      country: 'United States',
      city: 'Unknown',
      vulns: allVulnerabilities.filter(v => v.cve.startsWith('CVE')).map(v => v.cve),
      tags: riskLevel === 'high' ? ['vulnerable', 'outdated-software'] : ['standard']
    },
    virustotal: {
      response_code: 1,
      verbose_msg: 'Target analyzed',
      detected_urls: riskLevel === 'high' ? [
        { url: `http://${target}/admin`, positives: 5, total: 70 },
        { url: `http://${target}/login`, positives: 3, total: 70 }
      ] : [],
      detected_downloaded_samples: [],
      detected_communicating_samples: [],
      country: 'US',
      as_owner: 'Network Provider',
      asn: 12345
    },
    ipinfo: {
      ip: target.match(/^\d+\.\d+\.\d+\.\d+$/) ? target : '192.168.1.100',
      hostname: target,
      city: 'Unknown',
      region: 'Unknown',
      country: 'US',
      loc: '37.7749,-122.4194',
      org: 'AS12345 Network Provider',
      postal: '00000',
      timezone: 'America/Los_Angeles'
    },
    vulnerabilities: allVulnerabilities,
    risk_score: parseFloat(riskScore.toFixed(1)),
    threat_level: threatLevel,
    findings: findings,
    open_ports: openPorts,
    scan_duration_ms: scanDuration,
    scan_type: 'comprehensive',
    recent_threat_intelligence: {
      timestamp: baseTimestamp.toISOString(),
      recent_vulnerabilities: riskLevel === 'high' 
        ? `⚠️ HIGH RISK TARGET: ${target}\n\nSecurity analysis indicates CRITICAL vulnerabilities:\n\n` +
          `• ${criticalCount} CRITICAL severity issues - Remote Code Execution possible\n` +
          `• ${highCount} HIGH severity issues - Authentication bypass, privilege escalation\n` +
          `• ${mediumCount + lowCount} MEDIUM/LOW severity configuration issues\n\n` +
          `IMMEDIATE ACTIONS REQUIRED:\n` +
          `1. Patch all critical services immediately\n` +
          `2. Rotate all credentials\n` +
          `3. Implement network segmentation\n` +
          `4. Enable intrusion detection systems`
        : riskLevel === 'medium'
        ? `⚡ MEDIUM RISK TARGET: ${target}\n\nSecurity analysis indicates moderate vulnerabilities:\n\n` +
          `• ${highCount} HIGH severity issues requiring attention\n` +
          `• ${mediumCount} MEDIUM severity misconfigurations\n` +
          `• ${lowCount} LOW severity informational findings\n\n` +
          `RECOMMENDED ACTIONS:\n` +
          `1. Schedule patching for affected services\n` +
          `2. Review and harden configurations\n` +
          `3. Implement security monitoring`
        : `✅ LOW RISK TARGET: ${target}\n\nSecurity analysis indicates minimal vulnerabilities:\n\n` +
          `• ${lowCount} LOW severity informational findings\n` +
          `• No critical or high-risk issues detected\n\n` +
          `RECOMMENDATIONS:\n` +
          `1. Continue routine security monitoring\n` +
          `2. Apply recommended configuration improvements\n` +
          `3. Schedule regular security assessments`
    }
  };
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

    // Generate simulated results for ALL targets with risk-based classification
    const riskLevel = getTargetRiskLevel(target);
    console.log(`Target ${target} classified as ${riskLevel} risk`);
    
    // Add slight delay to simulate real scan
    await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 2000));
    
    const scanResults = generateScanResults(target, riskLevel);
    
    // Log API usage for tracking
    await supabase.from('api_usage').insert({
      user_id: user.id,
      service_name: 'simulated_scan',
      endpoint: '/reconnaissance',
      response_status: 200
    });
    
    return new Response(JSON.stringify({
      target,
      timestamp: new Date().toISOString(),
      services_queried: services.length > 0 ? services : ['shodan', 'virustotal', 'ipinfo'],
      results: scanResults
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
