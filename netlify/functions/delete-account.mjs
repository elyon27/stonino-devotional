// Configure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Netlify environment variables.
// Never put the service-role key in client assets/config.js.
import { createClient } from '@supabase/supabase-js';
export default async (request) => {
  if (request.method !== 'POST') return Response.json({error:'Method not allowed'},{status:405});
  const url=process.env.SUPABASE_URL, key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!key) return Response.json({error:'Account deletion service is not configured'},{status:503});
  const bearer=request.headers.get('authorization')||'';
  if(!bearer.startsWith('Bearer ')) return Response.json({error:'Authentication required'},{status:401});
  try {
    const body=await request.json();if(body.confirm!==true)return Response.json({error:'Confirmation required'},{status:400});
    const admin=createClient(url,key,{auth:{autoRefreshToken:false,persistSession:false}});
    const {data,error}=await admin.auth.getUser(bearer.slice(7));
    if(error||!data?.user) return Response.json({error:'Invalid or expired session'},{status:401});
    const userId=data.user.id;
    // Remove profile first; if deletion fails, do not claim success.
    const {error:dbError}=await admin.from('stonino_profiles').delete().eq('user_id',userId);
    if(dbError)throw dbError;
    const {error:authError}=await admin.auth.admin.deleteUser(userId);
    if(authError)throw authError;
    return Response.json({ok:true});
  } catch(e){console.error('Account deletion error',e);return Response.json({error:'Unable to complete deletion; contact support'},{status:500})}
};
