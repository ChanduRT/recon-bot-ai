import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Search, 
  DoorOpen, 
  Play, 
  Database, 
  TrendingUp, 
  Network, 
  Upload, 
  Eraser,
  Shield,
  Eye,
  Brain,
  AlertTriangle
} from "lucide-react";

interface APTPhase {
  id: string;
  name: string;
  icon: any;
  color: string;
  aiDecision: string[];
  indicators: string[];
  defenses: string[];
  description: string;
}

const aptPhases: APTPhase[] = [
  {
    id: "reconnaissance",
    name: "Reconnaissance",
    icon: Search,
    color: "bg-blue-500",
    description: "Attackers gather intelligence about the target organization, infrastructure, and potential vulnerabilities.",
    aiDecision: [
      "Perform passive DNS enumeration to map external infrastructure",
      "Analyze public job postings to identify technologies in use",
      "Monitor social media for organizational structure and employee information",
      "Scan for publicly exposed services and misconfigurations"
    ],
    indicators: [
      "Unusual DNS queries from external IPs",
      "Repeated access to company website from same source",
      "OSINT tools detected in web server logs",
      "Increased LinkedIn profile views by suspicious accounts",
      "Suspicious email reconnaissance attempts"
    ],
    defenses: [
      "Implement DNS query logging and monitoring",
      "Limit information disclosure on public websites and job postings",
      "Train employees on social engineering awareness",
      "Use deception technology (honeypots) to detect reconnaissance",
      "Monitor and sanitize public-facing error messages",
      "Implement rate limiting on web services"
    ]
  },
  {
    id: "initial-access",
    name: "Initial Access",
    icon: DoorOpen,
    color: "bg-orange-500",
    description: "Attackers gain initial foothold in the target environment through various entry vectors.",
    aiDecision: [
      "Launch spear-phishing campaign targeting high-value employees",
      "Exploit publicly known vulnerability in internet-facing service",
      "Use stolen credentials obtained from previous breach",
      "Deploy malicious attachments disguised as legitimate documents"
    ],
    indicators: [
      "Unusual login attempts from unfamiliar geolocations",
      "Spike in emails with suspicious attachments",
      "Failed authentication attempts followed by successful login",
      "New external connections to command and control servers",
      "Exploitation attempts in web application logs",
      "Anomalous process creation from Office applications"
    ],
    defenses: [
      "Deploy advanced email filtering and sandboxing",
      "Implement multi-factor authentication (MFA) across all systems",
      "Maintain aggressive patch management cycle",
      "Use application whitelisting to prevent unauthorized execution",
      "Deploy endpoint detection and response (EDR) solutions",
      "Conduct regular security awareness training with phishing simulations",
      "Implement zero-trust network architecture"
    ]
  },
  {
    id: "execution",
    name: "Execution",
    icon: Play,
    color: "bg-red-500",
    description: "Attackers execute malicious code to establish control and begin their operations.",
    aiDecision: [
      "Execute payload to establish reverse shell connection",
      "Deploy memory-resident malware to avoid disk-based detection",
      "Use living-off-the-land binaries (LOLBins) to blend with normal activity",
      "Inject code into legitimate running processes"
    ],
    indicators: [
      "Unsigned binaries or scripts executing in unusual locations",
      "PowerShell executing with encoded commands",
      "WMI or scheduled tasks created by non-admin users",
      "Suspicious parent-child process relationships",
      "Unusual network connections from system processes",
      "Registry modifications for persistence mechanisms"
    ],
    defenses: [
      "Enable PowerShell logging and monitor for obfuscated commands",
      "Implement application control policies (AppLocker/WDAC)",
      "Deploy behavioral analysis and machine learning-based EDR",
      "Restrict script execution to signed scripts only",
      "Monitor process creation events (Sysmon Event ID 1)",
      "Use attack surface reduction rules in Windows Defender",
      "Implement network segmentation to limit lateral movement"
    ]
  },
  {
    id: "persistence",
    name: "Persistence",
    icon: Database,
    color: "bg-purple-500",
    description: "Attackers establish mechanisms to maintain access even after system reboots or credential changes.",
    aiDecision: [
      "Create scheduled tasks or cron jobs for periodic execution",
      "Modify registry run keys for automatic startup",
      "Deploy web shells on internet-facing servers",
      "Create rogue user accounts with administrative privileges",
      "Install rootkits or bootkit for kernel-level persistence"
    ],
    indicators: [
      "New scheduled tasks created by unusual users",
      "Modifications to startup folders or registry run keys",
      "New user accounts created outside normal provisioning",
      "Unusual services installed on critical systems",
      "Web shells detected on web servers",
      "Kernel driver installations from non-standard sources"
    ],
    defenses: [
      "Monitor and alert on new scheduled task creation",
      "Implement privileged access management (PAM) solutions",
      "Conduct regular audits of user accounts and permissions",
      "Use file integrity monitoring (FIM) on critical directories",
      "Deploy advanced anti-malware with rootkit detection",
      "Implement secure boot and measured boot on all endpoints",
      "Regularly review and validate service configurations"
    ]
  },
  {
    id: "privilege-escalation",
    name: "Privilege Escalation",
    icon: TrendingUp,
    color: "bg-yellow-500",
    description: "Attackers elevate their privileges to gain higher-level access and control over systems.",
    aiDecision: [
      "Exploit unpatched kernel vulnerabilities for SYSTEM/root access",
      "Abuse misconfigured sudo/UAC permissions",
      "Extract credentials from memory using credential dumping tools",
      "Exploit service misconfigurations (unquoted service paths)"
    ],
    indicators: [
      "Unusual access to LSASS process memory",
      "Credential dumping tool artifacts (mimikatz signatures)",
      "Privilege escalation exploit attempts in logs",
      "Unexpected elevation of user privileges",
      "Token manipulation events",
      "SAM/SECURITY registry hive access"
    ],
    defenses: [
      "Enable Credential Guard and Remote Credential Guard",
      "Implement least privilege principle across all accounts",
      "Deploy just-in-time (JIT) privileged access",
      "Monitor for LSASS access and credential dumping attempts",
      "Keep systems patched against known privilege escalation exploits",
      "Use Protected Process Light for critical services",
      "Implement SELinux/AppArmor on Linux systems",
      "Regular privileged account audits and rotation"
    ]
  },
  {
    id: "lateral-movement",
    name: "Lateral Movement",
    icon: Network,
    color: "bg-cyan-500",
    description: "Attackers move through the network to access additional systems and expand their control.",
    aiDecision: [
      "Use stolen credentials to access additional systems via RDP/SSH",
      "Exploit trust relationships between systems",
      "Leverage administrative shares (ADMIN$, C$) for remote access",
      "Use remote execution tools (PsExec, WMI) to deploy malware"
    ],
    indicators: [
      "Unusual RDP/SSH connections between internal systems",
      "SMB connections to multiple systems from single host",
      "WMI/DCOM remote execution events",
      "Pass-the-hash or pass-the-ticket attempts",
      "Abnormal service account activity across network",
      "Kerberos ticket anomalies (golden/silver tickets)"
    ],
    defenses: [
      "Implement network segmentation and micro-segmentation",
      "Deploy network detection and response (NDR) solutions",
      "Disable SMBv1 and restrict SMB access",
      "Monitor for abnormal lateral movement patterns",
      "Implement tiered administrative model",
      "Use privileged access workstations (PAWs) for admin tasks",
      "Enable Enhanced Mitigation Experience Toolkit (EMET)",
      "Deploy deception technology (honeypots) in network segments"
    ]
  },
  {
    id: "exfiltration",
    name: "Data Exfiltration",
    icon: Upload,
    color: "bg-pink-500",
    description: "Attackers steal sensitive data and intellectual property from the compromised environment.",
    aiDecision: [
      "Compress and encrypt sensitive data for exfiltration",
      "Use DNS tunneling to bypass data loss prevention (DLP)",
      "Exfiltrate data through cloud storage services",
      "Leverage encrypted channels (HTTPS) to mask data transfer",
      "Stage data in hidden directories before bulk transfer"
    ],
    indicators: [
      "Unusual outbound data transfers to external IPs",
      "Large file uploads to cloud storage services",
      "DNS queries with abnormally long subdomains",
      "Data compression activities outside business hours",
      "Encrypted traffic to suspicious destinations",
      "Access to sensitive file shares by unusual accounts",
      "Network traffic spikes during non-business hours"
    ],
    defenses: [
      "Deploy data loss prevention (DLP) solutions",
      "Monitor and control DNS traffic for tunneling",
      "Implement egress filtering and proxy controls",
      "Use cloud access security brokers (CASB)",
      "Encrypt sensitive data at rest and in transit",
      "Implement user and entity behavior analytics (UEBA)",
      "Establish baseline network traffic patterns",
      "Monitor for large file transfers and archive creation",
      "Implement data classification and access controls"
    ]
  },
  {
    id: "cleanup",
    name: "Cleanup & Cover Tracks",
    icon: Eraser,
    color: "bg-gray-500",
    description: "Attackers attempt to remove evidence of their presence and maintain operational security.",
    aiDecision: [
      "Clear event logs and security audit trails",
      "Delete malware payloads and tools from compromised systems",
      "Modify timestamps on files to avoid detection",
      "Remove persistence mechanisms while retaining covert access",
      "Clear command history and temporary files"
    ],
    indicators: [
      "Event log clearing or suspicious gaps in logs",
      "Security event log service stopped/restarted",
      "File timestamp modifications (timestomping)",
      "Deletion of recently created files and registry keys",
      "Clearing of PowerShell/bash history files",
      "Unusual system restore point deletions"
    ],
    defenses: [
      "Forward logs to centralized SIEM in real-time",
      "Implement immutable log storage (write-once-read-many)",
      "Monitor for event log service manipulation",
      "Deploy file integrity monitoring (FIM) solutions",
      "Implement log retention policies outside attacker's control",
      "Use EDR with historical endpoint telemetry",
      "Configure audit policies to detect log tampering",
      "Implement security orchestration and automated response (SOAR)",
      "Maintain offline backups of critical logs"
    ]
  }
];

interface APTPhaseSimulationProps {
  currentPhaseIndex: number;
}

export const APTPhaseSimulation = ({ currentPhaseIndex }: APTPhaseSimulationProps) => {
  const currentPhase = aptPhases[currentPhaseIndex];

  return (
    <div className="space-y-6">
      {/* Phase Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-lg ${currentPhase.color} text-white`}>
              <currentPhase.icon className="h-6 w-6" />
            </div>
            <div>
              <CardTitle className="text-2xl">{currentPhase.name}</CardTitle>
              <CardDescription className="text-base mt-1">
                {currentPhase.description}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Detailed Information Tabs */}
      <Tabs defaultValue="ai-decision" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="ai-decision">
            <Brain className="h-4 w-4 mr-2" />
            AI Decision
          </TabsTrigger>
          <TabsTrigger value="indicators">
            <Eye className="h-4 w-4 mr-2" />
            Indicators
          </TabsTrigger>
          <TabsTrigger value="defenses">
            <Shield className="h-4 w-4 mr-2" />
            Defenses
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ai-decision" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                Attacker's Most Likely Actions
              </CardTitle>
              <CardDescription>
                Abstract, conceptual actions attackers typically take in this phase
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert className="mb-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Educational Purpose Only:</strong> These are conceptual descriptions for defensive training. 
                  No exploit code or step-by-step instructions provided.
                </AlertDescription>
              </Alert>
              <ul className="space-y-3">
                {currentPhase.aiDecision.map((decision, idx) => (
                  <li key={idx} className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                    <Badge variant="outline" className="mt-1">{idx + 1}</Badge>
                    <span className="text-sm">{decision}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="indicators" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Observable Indicators & Telemetry
              </CardTitle>
              <CardDescription>
                Signs security teams should monitor to detect this phase
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {currentPhase.indicators.map((indicator, idx) => (
                  <li key={idx} className="flex items-start gap-3 p-3 border rounded-lg bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-900">
                    <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">{indicator}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="defenses" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Defensive Recommendations & Mitigations
              </CardTitle>
              <CardDescription>
                Actionable steps security teams can implement immediately
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {currentPhase.defenses.map((defense, idx) => (
                  <li key={idx} className="flex items-start gap-3 p-3 border rounded-lg bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900">
                    <Shield className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                    <span className="text-sm font-medium">{defense}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
