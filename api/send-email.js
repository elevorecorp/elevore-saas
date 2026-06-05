import { sendEmail } from "../src/lib/email.js";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://ceijlgurveaalvjmptns.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const sb = (supabaseUrl && supabaseAnonKey) ? createClient(supabaseUrl, supabaseAnonKey) : null;

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
    const { to, subject, html, tenant_id } = req.body || {};
    if (!to || !subject || !html) {
      return res.status(400).json({ error: 'Missing required email fields (to, subject, html)' });
    }

    let apiKeyOverride = null;
    let fromName = null;
    let senderEmailOverride = null;

    if (tenant_id && sb) {
      const { data: settings } = await sb
        .from('tenant_settings')
        .select('custom_resend_key, business_full_name, sender_email')
        .eq('tenant_id', tenant_id)
        .maybeSingle();

      if (settings) {
        if (settings.custom_resend_key) {
          apiKeyOverride = settings.custom_resend_key;
        }
        if (settings.business_full_name) {
          fromName = settings.business_full_name;
        }
        if (settings.sender_email) {
          senderEmailOverride = settings.sender_email;
        }
      }
    }

    const result = await sendEmail({ to, subject, html, apiKeyOverride, fromName, senderEmailOverride });
    return res.status(200).json({ status: 'ok', id: result.id });
  } catch (error) {
    console.error('Error sending direct email:', error);
    return res.status(500).json({ error: error.message });
  }
}
