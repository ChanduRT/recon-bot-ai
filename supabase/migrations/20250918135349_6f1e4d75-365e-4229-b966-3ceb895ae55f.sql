-- Intel Web Hound Database Schema

-- Create enum types
CREATE TYPE public.scan_status AS ENUM ('pending', 'running', 'completed', 'failed');
CREATE TYPE public.threat_level AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE public.asset_type AS ENUM ('domain', 'ip', 'url', 'hash', 'email');
CREATE TYPE public.agent_type AS ENUM ('reconnaissance', 'vulnerability', 'threat_intelligence', 'network_analysis');

-- Profiles table for user data
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT,
  role TEXT DEFAULT 'user',
  api_quota INTEGER DEFAULT 100,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Rate limiting table
CREATE TABLE public.rate_limits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  requests_count INTEGER DEFAULT 0,
  window_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Reconnaissance scans table
CREATE TABLE public.scans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target TEXT NOT NULL,
  asset_type public.asset_type NOT NULL,
  status public.scan_status DEFAULT 'pending',
  threat_level public.threat_level DEFAULT 'low',
  results JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- AI Agents table
CREATE TABLE public.ai_agents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  agent_type public.agent_type NOT NULL,
  description TEXT,
  prompt_template TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Agent executions table
CREATE TABLE public.agent_executions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scan_id UUID NOT NULL REFERENCES public.scans(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES public.ai_agents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status public.scan_status DEFAULT 'pending',
  input_data JSONB NOT NULL,
  output_data JSONB DEFAULT '{}',
  error_message TEXT,
  execution_time_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Threat intelligence table
CREATE TABLE public.threat_intelligence (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ioc_value TEXT NOT NULL, -- Indicator of Compromise value
  ioc_type TEXT NOT NULL, -- ip, domain, hash, etc.
  threat_level public.threat_level NOT NULL,
  source TEXT NOT NULL,
  description TEXT,
  tags TEXT[],
  first_seen TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_seen TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}'
);

-- API integrations tracking table
CREATE TABLE public.api_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  service_name TEXT NOT NULL, -- shodan, virustotal, ipinfo, etc.
  endpoint TEXT NOT NULL,
  request_count INTEGER DEFAULT 1,
  response_status INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.threat_intelligence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_usage ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for rate_limits
CREATE POLICY "Users can view their own rate limits" 
ON public.rate_limits 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own rate limits" 
ON public.rate_limits 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own rate limits" 
ON public.rate_limits 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create RLS policies for scans
CREATE POLICY "Users can view their own scans" 
ON public.scans 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own scans" 
ON public.scans 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own scans" 
ON public.scans 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create RLS policies for ai_agents (public read, admin write)
CREATE POLICY "Anyone can view active AI agents" 
ON public.ai_agents 
FOR SELECT 
USING (is_active = true);

-- Create RLS policies for agent_executions
CREATE POLICY "Users can view their own agent executions" 
ON public.agent_executions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own agent executions" 
ON public.agent_executions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own agent executions" 
ON public.agent_executions 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create RLS policies for threat_intelligence (public read)
CREATE POLICY "Anyone can view active threat intelligence" 
ON public.threat_intelligence 
FOR SELECT 
USING (is_active = true);

-- Create RLS policies for api_usage
CREATE POLICY "Users can view their own API usage" 
ON public.api_usage 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own API usage" 
ON public.api_usage 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_scans_user_id ON public.scans(user_id);
CREATE INDEX idx_scans_status ON public.scans(status);
CREATE INDEX idx_scans_created_at ON public.scans(created_at);
CREATE INDEX idx_agent_executions_scan_id ON public.agent_executions(scan_id);
CREATE INDEX idx_agent_executions_agent_id ON public.agent_executions(agent_id);
CREATE INDEX idx_threat_intelligence_ioc_value ON public.threat_intelligence(ioc_value);
CREATE INDEX idx_threat_intelligence_ioc_type ON public.threat_intelligence(ioc_type);
CREATE INDEX idx_rate_limits_user_endpoint ON public.rate_limits(user_id, endpoint);
CREATE INDEX idx_api_usage_user_service ON public.api_usage(user_id, service_name);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_scans_updated_at
    BEFORE UPDATE ON public.scans
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ai_agents_updated_at
    BEFORE UPDATE ON public.ai_agents
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, username)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'username');
  RETURN NEW;
END;
$$;

-- Trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Insert default AI agents
INSERT INTO public.ai_agents (name, agent_type, description, prompt_template, config) VALUES
('Domain Reconnaissance Agent', 'reconnaissance', 'Performs comprehensive domain analysis including DNS records, WHOIS data, and subdomain enumeration', 'Analyze the domain {target} and provide comprehensive reconnaissance including DNS records, WHOIS information, subdomains, and potential security risks. Format your response as structured JSON.', '{"max_subdomains": 50, "include_whois": true}'),
('IP Address Analyzer', 'reconnaissance', 'Analyzes IP addresses for geolocation, ISP information, and associated threats', 'Analyze the IP address {target} and provide detailed information including geolocation, ISP, organization, open ports, and any associated security threats. Format your response as structured JSON.', '{"include_geolocation": true, "check_blacklists": true}'),
('Vulnerability Scanner', 'vulnerability', 'Identifies potential vulnerabilities and security weaknesses in targets', 'Scan {target} for potential vulnerabilities and security weaknesses. Provide a detailed assessment including CVE references, risk ratings, and recommended remediation steps. Format your response as structured JSON.', '{"scan_depth": "medium", "include_cves": true}'),
('Threat Intelligence Analyst', 'threat_intelligence', 'Correlates findings with known threat intelligence sources', 'Analyze {target} against known threat intelligence sources and provide correlation with IOCs, threat actors, and campaign associations. Include threat scoring and confidence levels. Format your response as structured JSON.', '{"confidence_threshold": 0.7, "include_campaigns": true}'),
('Network Analysis Agent', 'network_analysis', 'Performs network-level analysis including port scans and service detection', 'Perform network analysis on {target} including port scanning, service detection, and network topology mapping. Identify potential attack vectors and security gaps. Format your response as structured JSON.', '{"port_range": "1-10000", "service_detection": true}');