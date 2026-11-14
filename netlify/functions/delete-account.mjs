import { createClient } from '@supabase/supabase-js';

export default async function handler(request) {
  if (request.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405 });
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_4RBWDj3boR-Fi5aRaGrhyQ_fQ_0ui_W';
  if (!url) return Response.json({ error: 'Account deletion service is not configured' }, { status: 503 });
  const authorization = request.headers.get('authorization') || '';
  if (!authorization.startsWith('Bearer ')) return Response.json({ error: 'Authentication required' }, { status: 401 });
  try {
    const body = await request.json();
    if (body.confirm !== true) return Response.json({ error: 'Confirmation required' }, { status: 400 });
    const client = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: authorization } }
    });
    const { data, error } = await client.auth.getUser(authorization.slice(7));
    if (error || !data.user || data.user.is_anonymous) {
      return Response.json({ error: 'Invalid or expired session' }, { status: 401 });
    }
    const { error: deletionError } = await client.rpc('stonino_delete_devotional_profile');
    if (deletionError) throw deletionError;
    return Response.json({ ok: true });
  } catch (error) {
    console.error('Sto. Niño account deletion:', error.code ?? error.name);
    return Response.json({ error: 'Unable to complete deletion; contact support' }, { status: 500 });
  }
}
