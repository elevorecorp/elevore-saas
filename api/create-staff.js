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
    const { email, password, name, role, tenant_id, passcode, phone, payout_pct } = req.body || {};

    if (!email || !password || !name || !role || !tenant_id) {
      return res.status(400).json({ error: 'Faltan parámetros requeridos (email, password, name, role, tenant_id)' });
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

    // 1. Create the user in Auth
    const { data: authData, error: authError } = await sbAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, role, tenant_id }
    });

    if (authError) {
      console.error('Error creating auth user:', authError);
      return res.status(400).json({ error: `Error de Autenticación Supabase: ${authError.message}` });
    }

    const userId = authData.user?.id;

    // 2. Create or link the profile in staff_profiles
    const { data: existingProfile } = await sbAdmin
      .from('staff_profiles')
      .select('*')
      .eq('staff_email', email)
      .maybeSingle();

    let staffProfile = null;

    if (existingProfile) {
      // Update existing profile
      const { data, error: updateErr } = await sbAdmin
        .from('staff_profiles')
        .update({
          user_id: userId,
          name,
          role,
          passcode: passcode || existingProfile.passcode,
          phone: phone !== undefined ? phone : existingProfile.phone,
          payout_pct: payout_pct !== undefined ? payout_pct : existingProfile.payout_pct,
          tenant_id
        })
        .eq('id', existingProfile.id)
        .select()
        .single();
      if (updateErr) throw updateErr;
      staffProfile = data;
    } else {
      // Insert new profile
      const { data, error: insertErr } = await sbAdmin
        .from('staff_profiles')
        .insert({
          tenant_id,
          user_id: userId,
          name,
          role,
          passcode: passcode || 'staff' + Math.floor(1000 + Math.random() * 9000),
          staff_email: email,
          phone: phone || null,
          payout_pct: payout_pct !== undefined ? payout_pct : null
        })
        .select()
        .single();
      
      if (insertErr) {
        console.error('Error inserting staff profile:', insertErr);
        // Rollback auth user creation to avoid orphan auth accounts
        await sbAdmin.auth.admin.deleteUser(userId);
        return res.status(400).json({ error: `Error al crear perfil de empleado: ${insertErr.message}` });
      }
      staffProfile = data;
    }

    return res.status(200).json({ success: true, user: authData.user, profile: staffProfile });
  } catch (error) {
    console.error('Error in create-staff API:', error);
    return res.status(500).json({ error: error.message });
  }
}
