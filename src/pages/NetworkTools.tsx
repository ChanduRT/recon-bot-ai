import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { 
  Network, 
  Terminal, 
  Wifi, 
  Search, 
  Shield, 
  Zap,
  Play,
  Square,
  Copy,
  Download,
  Settings
} from "lucide-react";

interface KaliTool {
  name: string;
  description: string;
  category: string;
  command: string;
  icon: any;
  parameters: { name: string; description: string; required: boolean }[];
}

const NetworkTools = () => {
  const [selectedTool, setSelectedTool] = useState<string>("");
  const [target, setTarget] = useState("");
  const [parameters, setParameters] = useState<Record<string, string>>({});
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isKaliDetected, setIsKaliDetected] = useState(false);
  const { toast } = useToast();

  const kaliTools: KaliTool[] = [
    {
      name: "nmap",
      description: "Network discovery and security auditing",
      category: "Network Scanner",
      command: "nmap",
      icon: Network,
      parameters: [
        { name: "target", description: "Target IP/domain", required: true },
        { name: "ports", description: "Port range (e.g., 1-1000)", required: false },
        { name: "scan_type", description: "Scan type (-sS, -sT, -sU)", required: false },
        { name: "timing", description: "Timing template (-T0 to -T5)", required: false },
        { name: "service_version", description: "Service version detection (-sV)", required: false }
      ]
    },
    {
      name: "nikto",
      description: "Web server vulnerability scanner",
      category: "Web Scanner",
      command: "nikto",
      icon: Shield,
      parameters: [
        { name: "target", description: "Target URL", required: true },
        { name: "port", description: "Port number", required: false },
        { name: "ssl", description: "Use SSL (-ssl)", required: false },
        { name: "evasion", description: "Evasion technique", required: false }
      ]
    },
    {
      name: "dirb",
      description: "Web content scanner",
      category: "Web Scanner",
      command: "dirb",
      icon: Search,
      parameters: [
        { name: "target", description: "Target URL", required: true },
        { name: "wordlist", description: "Custom wordlist path", required: false },
        { name: "extensions", description: "File extensions (-X)", required: false },
        { name: "recursive", description: "Recursive scan (-r)", required: false }
      ]
    },
    {
      name: "gobuster",
      description: "Directory/file & DNS busting tool",
      category: "Web Scanner",
      command: "gobuster",
      icon: Search,
      parameters: [
        { name: "target", description: "Target URL", required: true },
        { name: "mode", description: "Mode (dir, dns, vhost)", required: true },
        { name: "wordlist", description: "Wordlist path", required: true },
        { name: "extensions", description: "File extensions", required: false },
        { name: "threads", description: "Number of threads", required: false }
      ]
    },
    {
      name: "masscan",
      description: "High-speed TCP port scanner",
      category: "Network Scanner", 
      command: "masscan",
      icon: Zap,
      parameters: [
        { name: "target", description: "Target IP/range", required: true },
        { name: "ports", description: "Port range", required: true },
        { name: "rate", description: "Packet rate", required: false },
        { name: "banners", description: "Grab banners (--banners)", required: false }
      ]
    },
    {
      name: "sqlmap",
      description: "SQL injection detection and exploitation",
      category: "Database",
      command: "sqlmap",
      icon: Shield,
      parameters: [
        { name: "target", description: "Target URL", required: true },
        { name: "data", description: "POST data", required: false },
        { name: "cookie", description: "HTTP cookies", required: false },
        { name: "level", description: "Test level (1-5)", required: false },
        { name: "risk", description: "Risk level (1-3)", required: false }
      ]
    }
  ];

  useEffect(() => {
    checkKaliEnvironment();
  }, []);

  const checkKaliEnvironment = async () => {
    try {
      const { data, error } = await supabase.functions
        .invoke('kali-tools', {
          body: { action: 'check_environment' }
        });

      if (!error && data?.isKali) {
        setIsKaliDetected(true);
      }
    } catch (error) {
      console.log('Not running on Kali Linux or tools not available');
    }
  };

  const getToolsByCategory = () => {
    const categories = [...new Set(kaliTools.map(tool => tool.category))];
    return categories.map(category => ({
      category,
      tools: kaliTools.filter(tool => tool.category === category)
    }));
  };

  const buildCommand = (tool: KaliTool) => {
    let command = tool.command;
    
    // Build command based on tool and parameters
    switch (tool.name) {
      case 'nmap':
        if (parameters.scan_type) command += ` ${parameters.scan_type}`;
        if (parameters.service_version === 'true') command += ` -sV`;
        if (parameters.timing) command += ` -T${parameters.timing}`;
        if (parameters.ports) command += ` -p ${parameters.ports}`;
        command += ` ${target}`;
        break;
        
      case 'nikto':
        command += ` -h ${target}`;
        if (parameters.port) command += ` -p ${parameters.port}`;
        if (parameters.ssl === 'true') command += ` -ssl`;
        break;
        
      case 'dirb':
        command += ` ${target}`;
        if (parameters.wordlist) command += ` ${parameters.wordlist}`;
        if (parameters.extensions) command += ` -X ${parameters.extensions}`;
        if (parameters.recursive === 'true') command += ` -r`;
        break;
        
      case 'gobuster':
        command += ` ${parameters.mode || 'dir'} -u ${target}`;
        if (parameters.wordlist) command += ` -w ${parameters.wordlist}`;
        if (parameters.extensions) command += ` -x ${parameters.extensions}`;
        if (parameters.threads) command += ` -t ${parameters.threads}`;
        break;
        
      case 'masscan':
        command += ` ${target} -p${parameters.ports}`;
        if (parameters.rate) command += ` --rate ${parameters.rate}`;
        if (parameters.banners === 'true') command += ` --banners`;
        break;
        
      case 'sqlmap':
        command += ` -u "${target}"`;
        if (parameters.data) command += ` --data="${parameters.data}"`;
        if (parameters.cookie) command += ` --cookie="${parameters.cookie}"`;
        if (parameters.level) command += ` --level=${parameters.level}`;
        if (parameters.risk) command += ` --risk=${parameters.risk}`;
        break;
    }
    
    return command;
  };

  const executeTool = async () => {
    if (!selectedTool || !target.trim()) {
      toast({
        title: "Error",
        description: "Please select a tool and enter a target",
        variant: "destructive",
      });
      return;
    }

    const tool = kaliTools.find(t => t.name === selectedTool);
    if (!tool) return;

    const command = buildCommand(tool);
    
    setLoading(true);
    setOutput("Executing command: " + command + "\n\n");

    try {
      if (isKaliDetected) {
        // Execute on local Kali Linux
        const { data, error } = await supabase.functions
          .invoke('kali-tools', {
            body: {
              action: 'execute',
              tool: selectedTool,
              target,
              parameters
            }
          });

        if (error) throw error;
        setOutput(prev => prev + data.output);
      } else {
        // Simulate execution or use API-based alternatives
        setOutput(prev => prev + "⚠️ Kali Linux environment not detected. Using simulated output.\n");
        setOutput(prev => prev + `Tool: ${tool.name}\nTarget: ${target}\nCommand: ${command}\n\n`);
        setOutput(prev => prev + "To use actual Kali Linux tools, run this application on a Kali Linux system.\n");
        
        // Call reconnaissance edge function as fallback
        const { data, error } = await supabase.functions
          .invoke('reconnaissance', {
            body: {
              target,
              tool: selectedTool,
              parameters
            }
          });

        if (!error && data) {
          setOutput(prev => prev + "\n--- API-based reconnaissance results ---\n");
          setOutput(prev => prev + JSON.stringify(data, null, 2));
        }
      }

      toast({
        title: "Execution Complete",
        description: `${tool.name} scan finished successfully`,
      });

    } catch (error) {
      console.error('Tool execution error:', error);
      setOutput(prev => prev + `\nError: ${error.message || 'Tool execution failed'}`);
      toast({
        title: "Execution Failed",
        description: error.message || "Tool execution failed",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const stopExecution = () => {
    setLoading(false);
    setOutput(prev => prev + "\n\n--- Execution stopped by user ---");
  };

  const copyOutput = () => {
    navigator.clipboard.writeText(output);
    toast({
      title: "Copied",
      description: "Output copied to clipboard",
    });
  };

  const exportOutput = () => {
    const blob = new Blob([output], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedTool}_${target}_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Terminal className="w-8 h-8 text-primary" />
              Network & Security Tools
            </h1>
            <p className="text-muted-foreground">
              Kali Linux security tools integration
            </p>
          </div>
          <Badge 
            variant={isKaliDetected ? "default" : "secondary"}
            className={isKaliDetected ? "bg-green-500" : ""}
          >
            {isKaliDetected ? "Kali Linux Detected" : "Simulation Mode"}
          </Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Tool Selection & Configuration */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Tool Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Tool Selection */}
                <div className="space-y-2">
                  <Label>Security Tool</Label>
                  <Select value={selectedTool} onValueChange={setSelectedTool}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a security tool" />
                    </SelectTrigger>
                    <SelectContent>
                      {getToolsByCategory().map(({ category, tools }) => (
                        <div key={category}>
                          <div className="px-2 py-1 text-sm font-medium text-muted-foreground">
                            {category}
                          </div>
                          {tools.map(tool => (
                            <SelectItem key={tool.name} value={tool.name}>
                              <div className="flex items-center gap-2">
                                <tool.icon className="w-4 h-4" />
                                {tool.name}
                              </div>
                            </SelectItem>
                          ))}
                        </div>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Target Input */}
                <div className="space-y-2">
                  <Label htmlFor="target">Target</Label>
                  <Input
                    id="target"
                    placeholder="Enter IP address, domain, or URL"
                    value={target}
                    onChange={(e) => setTarget(e.target.value)}
                  />
                </div>

                {/* Tool-specific parameters */}
                {selectedTool && (
                  <div className="space-y-3">
                    <Label>Parameters</Label>
                    {kaliTools.find(t => t.name === selectedTool)?.parameters.map(param => (
                      <div key={param.name} className="space-y-1">
                        <Label className="text-sm">
                          {param.name} {param.required && <span className="text-red-500">*</span>}
                        </Label>
                        <Input
                          placeholder={param.description}
                          value={parameters[param.name] || ""}
                          onChange={(e) => setParameters(prev => ({
                            ...prev,
                            [param.name]: e.target.value
                          }))}
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* Command Preview */}
                {selectedTool && target && (
                  <div className="space-y-2">
                    <Label>Command Preview</Label>
                    <div className="p-3 bg-muted rounded font-mono text-sm">
                      {buildCommand(kaliTools.find(t => t.name === selectedTool)!)}
                    </div>
                  </div>
                )}

                {/* Execute Button */}
                <div className="flex gap-2">
                  <Button
                    onClick={executeTool}
                    disabled={loading || !selectedTool || !target.trim()}
                    className="flex-1"
                  >
                    {loading ? (
                      <>
                        <Square className="w-4 h-4 mr-2" />
                        Executing...
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 mr-2" />
                        Execute Tool
                      </>
                    )}
                  </Button>
                  {loading && (
                    <Button variant="destructive" onClick={stopExecution}>
                      <Square className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Tool Description */}
            {selectedTool && (
              <Card>
                <CardContent className="pt-6">
                  {(() => {
                    const tool = kaliTools.find(t => t.name === selectedTool)!;
                    return (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <tool.icon className="w-5 h-5 text-primary" />
                          <h3 className="font-semibold">{tool.name}</h3>
                          <Badge variant="outline">{tool.category}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{tool.description}</p>
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Output */}
          <Card className="h-fit">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Terminal className="w-5 h-5" />
                  Output
                </CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyOutput}
                    disabled={!output}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={exportOutput}
                    disabled={!output}
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Textarea
                value={output}
                readOnly
                className="min-h-[500px] font-mono text-sm"
                placeholder="Tool output will appear here..."
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default NetworkTools;