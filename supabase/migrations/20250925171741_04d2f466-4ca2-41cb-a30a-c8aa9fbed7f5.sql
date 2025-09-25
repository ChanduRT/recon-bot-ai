-- Create APT campaigns table
CREATE TABLE public.apt_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  target_organization TEXT,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  end_date TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'planning',
  objectives TEXT[],
  scope_definition TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create attack paths table
CREATE TABLE public.attack_paths (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL,
  user_id UUID NOT NULL,
  phase TEXT NOT NULL,
  mitre_tactic TEXT,
  mitre_technique TEXT,
  technique_name TEXT,
  description TEXT,
  prerequisites TEXT[],
  tools_required TEXT[],
  expected_outcome TEXT,
  risk_level TEXT DEFAULT 'medium',
  execution_order INTEGER,
  status TEXT DEFAULT 'planned',
  evidence JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create MITRE mappings table
CREATE TABLE public.mitre_mappings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scan_id UUID NOT NULL,
  user_id UUID NOT NULL,
  mitre_tactic TEXT NOT NULL,
  mitre_technique TEXT NOT NULL,
  technique_name TEXT NOT NULL,
  confidence_score DECIMAL(3,2),
  vulnerability_cve TEXT,
  reasoning TEXT,
  automated BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create report templates table
CREATE TABLE public.report_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  template_type TEXT NOT NULL DEFAULT 'ieee',
  sections JSONB NOT NULL,
  format_settings JSONB DEFAULT '{}',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.apt_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attack_paths ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mitre_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_templates ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for apt_campaigns
CREATE POLICY "Users can create their own APT campaigns" 
ON public.apt_campaigns 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own APT campaigns" 
ON public.apt_campaigns 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own APT campaigns" 
ON public.apt_campaigns 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create RLS policies for attack_paths
CREATE POLICY "Users can create their own attack paths" 
ON public.attack_paths 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own attack paths" 
ON public.attack_paths 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own attack paths" 
ON public.attack_paths 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create RLS policies for mitre_mappings
CREATE POLICY "Users can create their own MITRE mappings" 
ON public.mitre_mappings 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own MITRE mappings" 
ON public.mitre_mappings 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own MITRE mappings" 
ON public.mitre_mappings 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create RLS policies for report_templates
CREATE POLICY "Users can create their own report templates" 
ON public.report_templates 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own report templates" 
ON public.report_templates 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own report templates" 
ON public.report_templates 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create triggers for updated_at columns
CREATE TRIGGER update_apt_campaigns_updated_at
  BEFORE UPDATE ON public.apt_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_report_templates_updated_at
  BEFORE UPDATE ON public.report_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();