import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.45.0';
serve(async () => {
  try {
    const client = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { error } = await client.from('profiles').select('id', { head: true }).limit(1).abortSignal(AbortSignal.timeout(8000));
    if (error) throw error;
    return Response.json({ ok: true, database: 'reachable', timestamp: new Date().toISOString() }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    console.error('Sprouttie health check: database unavailable');
    return Response.json({ ok: false, database: 'unavailable' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
});
