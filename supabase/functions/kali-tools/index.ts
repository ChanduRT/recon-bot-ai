import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const isKaliLinux = async (): Promise<boolean> => {
  try {
    // Try multiple detection methods
    console.log('Checking for Kali Linux environment...');
    
    // Method 1: Check /etc/os-release
    try {
      const osRelease = await Deno.readTextFile('/etc/os-release');
      console.log('OS Release content:', osRelease);
      if (osRelease.toLowerCase().includes('kali')) {
        console.log('Kali detected via /etc/os-release');
        return true;
      }
    } catch (e) {
      console.log('Could not read /etc/os-release:', e);
    }
    
    // Method 2: Check /etc/debian_version (Kali is Debian-based)
    try {
      const debianVersion = await Deno.readTextFile('/etc/debian_version');
      console.log('Debian version:', debianVersion);
      if (debianVersion.toLowerCase().includes('kali')) {
        console.log('Kali detected via /etc/debian_version');
        return true;
      }
    } catch (e) {
      console.log('Could not read /etc/debian_version:', e);
    }
    
    // Method 3: Check lsb_release command
    try {
      const lsbCommand = new Deno.Command("lsb_release", {
        args: ["-i"],
        stdout: "piped",
        stderr: "piped",
      });
      const { success, stdout } = await lsbCommand.output();
      if (success) {
        const output = new TextDecoder().decode(stdout);
        console.log('LSB Release output:', output);
        if (output.toLowerCase().includes('kali')) {
          console.log('Kali detected via lsb_release');
          return true;
        }
      }
    } catch (e) {
      console.log('Could not run lsb_release:', e);
    }
    
    // Method 4: Check uname for Kali-specific kernel
    try {
      const unameCommand = new Deno.Command("uname", {
        args: ["-a"],
        stdout: "piped",
        stderr: "piped",
      });
      const { success, stdout } = await unameCommand.output();
      if (success) {
        const output = new TextDecoder().decode(stdout);
        console.log('Uname output:', output);
        if (output.toLowerCase().includes('kali')) {
          console.log('Kali detected via uname');
          return true;
        }
      }
    } catch (e) {
      console.log('Could not run uname:', e);
    }
    
    // Method 5: Check for Kali-specific directories
    try {
      const kaliPaths = ['/usr/share/kali-menu', '/etc/apt/sources.list.d/kali.list', '/usr/share/kali-defaults'];
      for (const path of kaliPaths) {
        try {
          const stat = await Deno.stat(path);
          if (stat) {
            console.log(`Kali detected via path: ${path}`);
            return true;
          }
        } catch {
          // Path doesn't exist, continue
        }
      }
    } catch (e) {
      console.log('Could not check Kali paths:', e);
    }
    
    console.log('No Kali Linux indicators found');
    return false;
  } catch (error) {
    console.error('Error in Kali detection:', error);
    return false;
  }
};

const checkToolAvailability = async (tool: string): Promise<boolean> => {
  try {
    console.log(`Checking availability of tool: ${tool}`);
    
    // Method 1: Check with 'which' command
    try {
      const whichCommand = new Deno.Command("which", {
        args: [tool],
        stdout: "piped",
        stderr: "piped",
      });
      const { success, stdout, stderr } = await whichCommand.output();
      const output = new TextDecoder().decode(stdout);
      const errorOutput = new TextDecoder().decode(stderr);
      
      console.log(`'which ${tool}' - success: ${success}, output: '${output.trim()}', error: '${errorOutput.trim()}'`);
      
      if (success && output.trim()) {
        console.log(`Tool ${tool} found at: ${output.trim()}`);
        return true;
      }
    } catch (e) {
      console.log(`'which' command failed for ${tool}:`, e);
    }
    
    // Method 2: Try to run the tool with --version or --help
    try {
      const testArgs = tool === 'nmap' ? ['--version'] : 
                     tool === 'nikto' ? ['-Version'] :
                     tool === 'dirb' ? [] :
                     tool === 'gobuster' ? ['version'] :
                     tool === 'masscan' ? ['--version'] :
                     tool === 'sqlmap' ? ['--version'] : ['--help'];
      
      const testCommand = new Deno.Command(tool, {
        args: testArgs,
        stdout: "piped",
        stderr: "piped",
      });
      
      const { success } = await testCommand.output();
      console.log(`Direct execution test for ${tool}: ${success}`);
      
      if (success) {
        console.log(`Tool ${tool} is executable`);
        return true;
      }
    } catch (e) {
      console.log(`Direct execution test failed for ${tool}:`, e);
    }
    
    // Method 3: Check common installation paths
    const commonPaths = [
      `/usr/bin/${tool}`,
      `/usr/local/bin/${tool}`,
      `/bin/${tool}`,
      `/sbin/${tool}`,
      `/usr/sbin/${tool}`
    ];
    
    for (const path of commonPaths) {
      try {
        const stat = await Deno.stat(path);
        if (stat && stat.isFile) {
          console.log(`Tool ${tool} found at path: ${path}`);
          return true;
        }
      } catch {
        // Path doesn't exist or not accessible
      }
    }
    
    console.log(`Tool ${tool} not found`);
    return false;
  } catch (error) {
    console.error(`Tool availability check failed for ${tool}:`, error);
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
    const cmd = new Deno.Command(command[0], {
      args: command.slice(1),
      stdout: "piped",
      stderr: "piped",
    });

    const { success, stdout, stderr, code } = await cmd.output();

    const output = new TextDecoder().decode(stdout);
    const error = new TextDecoder().decode(stderr);

    if (!success) {
      return `Command failed with exit code ${code}\n\nSTDOUT:\n${output}\n\nSTDERR:\n${error}`;
    }

    return output || error || 'Command completed successfully (no output)';
  } catch (error) {
    console.error('Tool execution error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    throw new Error(`Failed to execute ${tool}: ${errorMessage}`);
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
    const { action, tool, target, attackPath, parameters = {} } = await req.json();
    
    console.log(`Kali Tools - Action: ${action}, Tool: ${tool}, Target: ${target}`);

    if (action === 'check_environment') {
      const isKali = await isKaliLinux();
      console.log(`Environment check: isKali=${isKali}`);
      
      const availableTools: Record<string, boolean> = {};
      const toolsToCheck = ['nmap', 'nikto', 'dirb', 'gobuster', 'masscan', 'sqlmap'];
      
      // Check tool availability with detailed logging
      for (const toolName of toolsToCheck) {
        const available = await checkToolAvailability(toolName);
        availableTools[toolName] = available;
        console.log(`Tool ${toolName}: ${available ? 'available' : 'not found'}`);
      }

      const responseData = {
        isKali,
        availableTools,
        wordlists: getDefaultWordlists(),
        timestamp: new Date().toISOString(),
        toolsSummary: Object.entries(availableTools).map(([tool, available]) => 
          `${tool}: ${available ? '✓' : '✗'}`
        ).join(', ')
      };

      console.log('Environment check response:', responseData);

      return new Response(JSON.stringify(responseData), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'execute' && tool && target) {
      console.log(`Executing tool: ${tool} against target: ${target}`);
      
      try {
        const output = await executeTool(tool, target, parameters);
        
        return new Response(JSON.stringify({
          success: true,
          output,
          tool,
          target,
          timestamp: new Date().toISOString()
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (error) {
        console.error('Tool execution error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        
        return new Response(JSON.stringify({
          success: false,
          output: `Error executing ${tool}: ${errorMessage}`,
          tool,
          target,
          timestamp: new Date().toISOString()
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    if (action === 'execute_attack' && attackPath) {
      console.log(`Executing attack path: ${attackPath.technique} (${attackPath.phase})`);
      
      // Simulate attack execution
      const startTime = Date.now();
      await new Promise(resolve => setTimeout(resolve, Math.random() * 3000 + 1000));
      
      const executionTime = Date.now() - startTime;
      const output = generateAttackOutput(attackPath);
      const success = Math.random() > 0.3; // 70% success rate
      
      return new Response(JSON.stringify({
        success,
        output,
        executionTime,
        technique: attackPath.technique,
        phase: attackPath.phase,
        timestamp: new Date().toISOString()
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      error: 'Invalid action or missing parameters'
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Kali Tools error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(JSON.stringify({
      error: errorMessage,
      success: false,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function generateAttackOutput(attackPath: any): string {
  const { technique, phase, tools = [], description } = attackPath;
  
  const outputs = [
    `[${new Date().toLocaleString()}] Executing: ${technique}`,
    `[INFO] Phase: ${phase}`,
    `[INFO] ${description || 'Attack technique execution'}`,
    `[SUCCESS] Technique completed successfully`
  ];
  
  if (tools.length > 0) {
    outputs.push(`[TOOLS] Used: ${tools.join(', ')}`);
  }
  
  return outputs.join('\n');
}