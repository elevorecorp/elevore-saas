import { createClient } from '@supabase/supabase-js';

// Initialize Supabase using environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const sb = (supabaseUrl && supabaseServiceKey) ? createClient(supabaseUrl, supabaseServiceKey) : null;

export default async function handler(req, res) {
  // CORS configuration
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
    const { businessName, ownerPhone, ownerName, tenantId } = req.body || {};

    if (!tenantId) {
      return res.status(400).json({ error: 'Missing tenantId parameter' });
    }

    if (!sb) {
      return res.status(500).json({ error: 'Supabase client is not initialized' });
    }

    // 1. Save owner phone in tenant settings
    const formattedPhone = ownerPhone ? ownerPhone.replace(/\D/g, '') : '';
    console.log(`Setting phone number for tenant ${tenantId}: ${ownerPhone}`);
    await sb
      .from('tenant_settings')
      .update({ 
        zelle_phone: ownerPhone || '(407) 952-4228',
        business_full_name: businessName || 'Elevore Premium Services'
      })
      .eq('tenant_id', tenantId);

    // 2. Create a mock lead mission to simulate client quote portal
    console.log(`Creating mock onboarding mission for tenant ${tenantId}...`);
    const { data: mission, error: mErr } = await sb
      .from('elevore_missions')
      .insert({
        tenant_id: tenantId,
        client_name: "John Doe (Simulado)",
        client_phone: "(407) 555-0199",
        client_email: "john.doe@example.com",
        address: "1600 Amphitheatre Pkwy, Mountain View, CA",
        service_type: "Limpieza Profunda",
        status: "lead",
        total_price: 180,
        specs: { is_onboarding_demo: true, lang: 'es' }
      })
      .select()
      .single();

    if (mErr || !mission) {
      throw new Error(`Failed to create mock mission: ${mErr?.message}`);
    }

    const host = req.headers.host || 'elevore-saas.vercel.app';
    const protocol = host.includes('localhost') || host.includes('127.0.0.1') ? 'http' : 'https';
    const portalUrl = `${protocol}://${host}/?propuesta=${mission.id}`;

    // 3. WhatsApp Integration (Meta Cloud API / Twilio)
    // Check if WhatsApp tokens are configured in the serverless environment
    const metaToken = process.env.META_ACCESS_TOKEN;
    const phoneId = process.env.META_PHONE_NUMBER_ID;

    if (metaToken && phoneId && formattedPhone) {
      console.log(`Sending real WhatsApp template message to ${formattedPhone}...`);
      try {
        const whatsappUrl = `https://graph.facebook.com/v18.0/${phoneId}/messages`;
        const response = await fetch(whatsappUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${metaToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: formattedPhone,
            type: "template",
            template: {
              name: "elevore_onboarding_demo",
              language: { code: "es" },
              components: [
                {
                  type: "body",
                  parameters: [
                    { type: "text", text: ownerName || "Socio" },
                    { type: "text", text: businessName || "tu negocio" }
                  ]
                },
                {
                  type: "button",
                  index: "0",
                  sub_type: "url",
                  parameters: [
                    { type: "text", text: `?propuesta=${mission.id}` }
                  ]
                }
              ]
            }
          })
        });

        if (!response.ok) {
          const errText = await response.text();
          console.warn(`Meta API failed to send WhatsApp message: ${errText}`);
        } else {
          console.log(`WhatsApp message sent successfully to ${formattedPhone}`);
          return res.status(200).json({ success: true, missionId: mission.id, portalUrl, mock: false });
        }
      } catch (err) {
        console.warn('Failed to send WhatsApp due to exception:', err.message);
      }
    }

    // Return mock fallback if credentials are not present or if WhatsApp fails
    console.log('⚠️ [WhatsApp Cloud API Sandbox]: Sending via mock simulation.');
    return res.status(200).json({ success: true, missionId: mission.id, portalUrl, mock: true });

  } catch (error) {
    console.error('Error in onboarding-start:', error);
    return res.status(500).json({ error: error.message });
  }
}
