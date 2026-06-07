import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { email, passcode } = req.body || {};

    if (!email || !passcode) {
      return res.status(400).json({ error: 'Faltan parámetros requeridos (email, passcode)' });
    }

    const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://ceijlgurveaalvjmptns.supabase.co';
    // Use service role key if available, fallback to anon key for local sandboxing
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 
                           process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ||
                           process.env.VITE_SUPABASE_ANON_KEY;

    const sbAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const cleanEmail = email.trim().toLowerCase();
    const passcodeStr = String(passcode).trim();

    // Query staff_profiles with this passcode (bypassing RLS safely on server side)
    const { data: profiles, error: pinErr } = await sbAdmin
      .from('staff_profiles')
      .select('*')
      .eq('passcode', passcodeStr);

    if (pinErr) {
      console.error('Error fetching staff profile by PIN:', pinErr);
      return res.status(500).json({ error: `Database error: ${pinErr.message}` });
    }

    let matchedStaff = null;
    if (profiles && profiles.length > 0) {
      for (const profile of profiles) {
        const storedEmail = (profile.staff_email || profile.name || '').toLowerCase();
        if (storedEmail.includes(cleanEmail) || cleanEmail.includes(storedEmail)) {
          matchedStaff = profile;
          break;
        }
      }
    }

    if (matchedStaff) {
      const { data: tenant } = await sbAdmin
        .from('tenants')
        .select('*')
        .eq('id', matchedStaff.tenant_id)
        .maybeSingle();

      return res.status(200).json({
        success: true,
        profile: matchedStaff,
        tenantName: tenant?.business_name || 'ELEVORE EMPIRE'
      });
    }

    return res.status(401).json({ success: false, error: 'No matching legacy PIN passcode found.' });
  } catch (error) {
    console.error('Error in login-staff API:', error);
    return res.status(500).json({ error: error.message });
  }
}
