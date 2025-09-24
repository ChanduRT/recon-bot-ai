-- Enable real-time updates for key tables
ALTER TABLE public.scans REPLICA IDENTITY FULL;
ALTER TABLE public.ai_agents REPLICA IDENTITY FULL;
ALTER TABLE public.agent_executions REPLICA IDENTITY FULL;
ALTER TABLE public.threat_intelligence REPLICA IDENTITY FULL;
ALTER TABLE public.profiles REPLICA IDENTITY FULL;

-- Add tables to supabase_realtime publication for real-time functionality
ALTER PUBLICATION supabase_realtime ADD TABLE public.scans;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_agents;
ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_executions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.threat_intelligence;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;