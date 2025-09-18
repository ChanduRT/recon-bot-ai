import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RateLimitConfig {
  endpoint: string;
  maxRequests: number;
  windowMinutes: number;
}

const RATE_LIMITS: Record<string, RateLimitConfig> = {
  '/ai-agent-orchestrator': { endpoint: '/ai-agent-orchestrator', maxRequests: 10, windowMinutes: 60 },
  '/reconnaissance': { endpoint: '/reconnaissance', maxRequests: 50, windowMinutes: 60 },
  '/threat-analysis': { endpoint: '/threat-analysis', maxRequests: 30, windowMinutes: 60 },
  '/network-scan': { endpoint: '/network-scan', maxRequests: 20, windowMinutes: 60 },
};

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

    const { endpoint } = await req.json();
    const rateLimitConfig = RATE_LIMITS[endpoint];

    if (!rateLimitConfig) {
      return new Response(JSON.stringify({ allowed: true, message: 'No rate limit configured' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const windowStart = new Date();
    windowStart.setMinutes(windowStart.getMinutes() - rateLimitConfig.windowMinutes);

    // Check current usage in the time window
    const { data: existingLimit } = await supabase
      .from('rate_limits')
      .select('*')
      .eq('user_id', user.id)
      .eq('endpoint', endpoint)
      .gte('window_start', windowStart.toISOString())
      .single();

    if (existingLimit) {
      if (existingLimit.requests_count >= rateLimitConfig.maxRequests) {
        const resetTime = new Date(existingLimit.window_start);
        resetTime.setMinutes(resetTime.getMinutes() + rateLimitConfig.windowMinutes);
        
        return new Response(JSON.stringify({
          allowed: false,
          message: 'Rate limit exceeded',
          limit: rateLimitConfig.maxRequests,
          windowMinutes: rateLimitConfig.windowMinutes,
          resetAt: resetTime.toISOString(),
          current: existingLimit.requests_count
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Increment counter
      await supabase
        .from('rate_limits')
        .update({
          requests_count: existingLimit.requests_count + 1
        })
        .eq('id', existingLimit.id);

      return new Response(JSON.stringify({
        allowed: true,
        remaining: rateLimitConfig.maxRequests - (existingLimit.requests_count + 1),
        limit: rateLimitConfig.maxRequests,
        windowMinutes: rateLimitConfig.windowMinutes
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create new rate limit record
    await supabase
      .from('rate_limits')
      .insert({
        user_id: user.id,
        endpoint,
        requests_count: 1,
        window_start: new Date().toISOString()
      });

    return new Response(JSON.stringify({
      allowed: true,
      remaining: rateLimitConfig.maxRequests - 1,
      limit: rateLimitConfig.maxRequests,
      windowMinutes: rateLimitConfig.windowMinutes
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in rate limiter:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});