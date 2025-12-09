-- Create demo_targets table for storing intentionally vulnerable targets
CREATE TABLE public.demo_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  target_value TEXT NOT NULL,
  target_type TEXT NOT NULL,
  category TEXT NOT NULL,
  source_provider TEXT NOT NULL,
  description TEXT,
  vulnerabilities TEXT[] DEFAULT '{}',
  usage_notes TEXT,
  documentation_url TEXT,
  is_active BOOLEAN DEFAULT true,
  is_live_target BOOLEAN DEFAULT true,
  requires_authentication BOOLEAN DEFAULT false,
  legal_disclaimer TEXT,
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS with public read access (demo targets are not sensitive)
ALTER TABLE public.demo_targets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active demo targets" ON public.demo_targets
  FOR SELECT USING (is_active = true);

-- Seed the database with demo targets
INSERT INTO public.demo_targets (name, target_value, target_type, category, source_provider, description, vulnerabilities, usage_notes, documentation_url, is_live_target, legal_disclaimer, tags) VALUES
-- Vulnweb (Acunetix) - Live Targets
('Vulnweb Main Site', 'vulnweb.com', 'domain', 'acunetix_demo', 'Acunetix', 
 'Intentionally vulnerable website by Acunetix for testing web scanners', 
 ARRAY['SQLi', 'XSS', 'CSRF', 'File Upload', 'Directory Traversal'],
 'Safe to scan with web security tools. Avoid DoS-style load testing.',
 'http://vulnweb.com', true,
 'This is an intentionally vulnerable website for demonstration purposes only.',
 ARRAY['web', 'demo', 'acunetix']),

('Vulnweb PHP Test', 'testphp.vulnweb.com', 'domain', 'acunetix_demo', 'Acunetix',
 'PHP-based vulnerable web application with common PHP vulnerabilities',
 ARRAY['SQLi', 'XSS', 'File Inclusion', 'Command Injection', 'Session Hijacking'],
 'Primary demo target for PHP vulnerability scanning. Full scan safe.',
 'http://testphp.vulnweb.com', true,
 'Intentionally vulnerable - for authorized testing only.',
 ARRAY['php', 'web', 'sql_injection', 'xss']),

('Vulnweb ASP Test', 'testasp.vulnweb.com', 'domain', 'acunetix_demo', 'Acunetix',
 'ASP.NET vulnerable web application',
 ARRAY['SQLi', 'XSS', 'Authentication Bypass', 'Session Fixation'],
 'Test ASP.NET specific vulnerabilities.',
 'http://testasp.vulnweb.com', true,
 'Intentionally vulnerable - for authorized testing only.',
 ARRAY['asp', 'dotnet', 'web']),

('Vulnweb HTML5 Test', 'testhtml5.vulnweb.com', 'domain', 'acunetix_demo', 'Acunetix',
 'HTML5 vulnerable web application showcasing modern web vulnerabilities',
 ARRAY['DOM XSS', 'WebSocket Vulnerabilities', 'LocalStorage Injection', 'CORS Misconfiguration'],
 'Test HTML5-specific vulnerabilities and modern JavaScript attacks.',
 'http://testhtml5.vulnweb.com', true,
 'Intentionally vulnerable - for authorized testing only.',
 ARRAY['html5', 'javascript', 'dom_xss', 'modern_web']),

-- Google Gruyere - CTF Platform
('Google Gruyere', 'google-gruyere.appspot.com', 'domain', 'ctf_platform', 'Google',
 'Google''s vulnerable web application for learning web security',
 ARRAY['XSS', 'CSRF', 'Path Traversal', 'Information Disclosure', 'DoS'],
 'Browser-based challenges. Focus on web exploitation rather than port scanning.',
 'https://google-gruyere.appspot.com', true,
 'Educational platform by Google. Follow their usage guidelines.',
 ARRAY['google', 'xss', 'web', 'education']),

-- HackThisSite
('HackThisSite', 'hackthissite.org', 'domain', 'ctf_platform', 'HackThisSite',
 'Free, legal, and safe training ground for hackers',
 ARRAY['Web Challenges', 'JavaScript', 'Basic+', 'Application', 'Programming'],
 'Create an account and complete challenges. Browser-based, not for port scanning.',
 'https://www.hackthissite.org', true,
 'Legal hacking training - must create account and follow rules.',
 ARRAY['ctf', 'challenges', 'legal_hacking', 'training']),

-- OWASP Reference
('OWASP VWAD List', 'owasp.org/www-project-vulnerable-web-applications-directory', 'url', 'reference_list', 'OWASP',
 'Directory of intentionally vulnerable applications for practice',
 ARRAY['Multiple Apps', 'Self-Hosted', 'Various Vulnerabilities'],
 'Download and deploy apps locally. Do NOT scan the OWASP website itself.',
 'https://owasp.org/www-project-vulnerable-web-applications-directory/', false,
 'Reference list only. Deploy apps on your own infrastructure to scan.',
 ARRAY['owasp', 'reference', 'self_hosted']),

-- Cyphere Reference
('Cyphere Vulnerable Sites List', 'thecyphere.com/blog/vulnerable-websites', 'url', 'reference_list', 'Cyphere',
 'Curated list of 25+ vulnerable sites and VMs for practice',
 ARRAY['BadStore', 'DVWA', 'Mutillidae', 'WebGoat', 'Many More'],
 'Reference guide. Only scan explicitly permitted targets from the list.',
 'https://thecyphere.com/blog/25-vulnerable-websites/', false,
 'Consult each target''s terms before scanning.',
 ARRAY['cyphere', 'reference', 'curated_list']),

-- MaxMind High-Risk IPs (Reference Only)
('MaxMind High-Risk IP Sample', 'dev.maxmind.com/minfraud/sample-data', 'url', 'ip_reputation', 'MaxMind',
 'Sample IPs associated with risky behavior (anonymizers, fraud signals)',
 ARRAY['Anonymizers', 'Fraud Signals', 'VPN Exits', 'Proxy Servers'],
 'Use for IP reputation testing ONLY. NOT authorized for port scanning or attacks.',
 'https://dev.maxmind.com/minfraud/sample-data', false,
 'IP reputation examples only - NOT authorized for scanning.',
 ARRAY['ip_reputation', 'fraud_detection', 'reference_only']);

-- Create trigger for updated_at
CREATE TRIGGER update_demo_targets_updated_at
BEFORE UPDATE ON public.demo_targets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();