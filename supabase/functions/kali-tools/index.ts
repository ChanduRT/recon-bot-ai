import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const isKaliLinux = async (): Promise<boolean> => {
  try {
    const osRelease = await Deno.readTextFile('/etc/os-release');
    return osRelease.includes('Kali') || osRelease.includes('kali');
  } catch {
    return false;
  }
};

const checkToolAvailability = async (tool: string): Promise<boolean> => {
  try {
    const process = Deno.run({
      cmd: ["which", tool],
      stdout: "piped",
      stderr: "piped",
    });
    const status = await process.status();
    process.close();
    return status.success;
  } catch {
    return false;
  }
};

const executeTool = async (tool: string, target: string, parameters: Record<string, string>): Promise<string> => {
  let command: string[] = [];
  
  switch (tool) {
    case 'nmap':
      command = ['nmap'];
      if (parameters.scan_type) command.push(parameters.scan_type);
      if (parameters.service_version === 'true') command.push('-sV');
      if (parameters.timing) command.push(`-T${parameters.timing}`);
      if (parameters.ports) command.push('-p', parameters.ports);
      command.push(target);
      break;
      
    case 'nikto':
      command = ['nikto', '-h', target];
      if (parameters.port) command.push('-p', parameters.port);
      if (parameters.ssl === 'true') command.push('-ssl');
      break;
      
    case 'dirb':
      command = ['dirb', target];
      if (parameters.wordlist) command.push(parameters.wordlist);
      if (parameters.extensions) command.push('-X', parameters.extensions);
      if (parameters.recursive === 'true') command.push('-r');
      break;
      
    case 'gobuster':
      command = ['gobuster', parameters.mode || 'dir', '-u', target];
      if (parameters.wordlist) command.push('-w', parameters.wordlist);
      if (parameters.extensions) command.push('-x', parameters.extensions);
      if (parameters.threads) command.push('-t', parameters.threads);
      break;
      
    case 'masscan':
      command = ['masscan', target, `-p${parameters.ports}`];
      if (parameters.rate) command.push('--rate', parameters.rate);
      if (parameters.banners === 'true') command.push('--banners');
      break;
      
    case 'sqlmap':
      command = ['sqlmap', '-u', target];
      if (parameters.data) command.push('--data', parameters.data);
      if (parameters.cookie) command.push('--cookie', parameters.cookie);
      if (parameters.level) command.push('--level', parameters.level);
      if (parameters.risk) command.push('--risk', parameters.risk);
      command.push('--batch'); // Non-interactive mode
      break;
      
    default:
      throw new Error(`Unsupported tool: ${tool}`);
  }

  console.log(`Executing command: ${command.join(' ')}`);

  try {
    const process = Deno.run({
      cmd: command,
      stdout: "piped",
      stderr: "piped",
    });

    const [status, stdout, stderr] = await Promise.all([
      process.status(),
      process.output(),
      process.stderrOutput(),
    ]);

    process.close();

    const output = new TextDecoder().decode(stdout);
    const error = new TextDecoder().decode(stderr);

    if (!status.success) {
      return `Command failed with exit code ${status.code}\n\nSTDOUT:\n${output}\n\nSTDERR:\n${error}`;
    }

    return output || error || 'Command completed successfully (no output)';
  } catch (error) {
    console.error('Tool execution error:', error);
    throw new Error(`Failed to execute ${tool}: ${error.message}`);
  }
};

const getDefaultWordlists = (): Record<string, string> => {
  return {
    'dirb_common': '/usr/share/dirb/wordlists/common.txt',
    'dirb_big': '/usr/share/dirb/wordlists/big.txt',
    'gobuster_common': '/usr/share/wordlists/dirb/common.txt',
    'gobuster_big': '/usr/share/wordlists/dirb/big.txt',
    'seclist_discovery': '/usr/share/seclists/Discovery/Web-Content/common.txt',
  };
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, tool, target, parameters = {} } = await req.json();
    
    console.log(`Kali Tools - Action: ${action}, Tool: ${tool}, Target: ${target}`);

    switch (action) {
      case 'check_environment': {
        const isKali = await isKaliLinux();
        console.log(`Environment check: isKali=${isKali}`);
        
        const availableTools: Record<string, boolean> = {};
        const toolsToCheck = ['nmap', 'nikto', 'dirb', 'gobuster', 'masscan', 'sqlmap'];
        
        for (const toolName of toolsToCheck) {
          availableTools[toolName] = await checkToolAvailability(toolName);
        }

        return new Response(JSON.stringify({
          isKali,
          availableTools,
          wordlists: getDefaultWordlists(),
          timestamp: new Date().toISOString()
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'execute': {
        if (!tool || !target) {
          throw new Error('Tool and target are required for execution');
        }

        const isKali = await isKaliLinux();
        if (!isKali) {
          return new Response(JSON.stringify({
            output: `⚠️  Warning: Not running on Kali Linux\nTool: ${tool}\nTarget: ${target}\nParameters: ${JSON.stringify(parameters, null, 2)}\n\nTo use actual Kali Linux tools, deploy this application on a Kali Linux system.`,
            success: false,
            isSimulated: true
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const toolAvailable = await checkToolAvailability(tool);
        if (!toolAvailable) {
          throw new Error(`Tool '${tool}' is not available on this system. Please install it first.`);
        }

        const output = await executeTool(tool, target, parameters);
        
        return new Response(JSON.stringify({
          output,
          success: true,
          isSimulated: false,
          tool,
          target,
          timestamp: new Date().toISOString()
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

  } catch (error) {
    console.error('Kali Tools error:', error);
    return new Response(JSON.stringify({
      error: error.message,
      success: false,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});