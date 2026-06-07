import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');

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

  const action = req.query.action || '';

  if (action === 'intent') {
    try {
      const { amount, currency = 'usd', metadata = {} } = req.body || {};

      if (!amount || isNaN(amount)) {
        return res.status(400).json({ error: 'Invalid or missing amount' });
      }

      if (!process.env.STRIPE_SECRET_KEY) {
        return res.status(400).json({ error: 'STRIPE_SECRET_KEY is not configured on the server' });
      }

      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount),
        currency,
        metadata,
        automatic_payment_methods: {
          enabled: true,
        },
      });

      return res.status(200).json({
        clientSecret: paymentIntent.client_secret,
      });
    } catch (error) {
      console.error('Error creating payment intent:', error);
      return res.status(500).json({ error: error.message });
    }
  } else {
    // Default fallback is session creation (handling both 'session' action and no action parameter)
    try {
      const { mode, tenant_id, plan, amount, currency = 'usd', client_name, client_email, client_phone, address, service_type, specs = {}, mission_id, payment_type } = req.body || {};

      if (!mode || !['subscription', 'payment'].includes(mode)) {
        return res.status(400).json({ error: 'Invalid or missing mode parameter' });
      }

      if (!tenant_id) {
        return res.status(400).json({ error: 'Missing tenant_id parameter' });
      }

      const host = req.headers.host || 'elevore-saas.vercel.app';
      const protocol = host.includes('localhost') || host.includes('127.0.0.1') ? 'http' : 'https';
      const origin = `${protocol}://${host}`;

      // --- MOCK CHECKOUT FLOW ---
      if (!process.env.STRIPE_SECRET_KEY) {
        console.log('⚠️ [Stripe Sandbox]: STRIPE_SECRET_KEY is not configured. Redirecting to simulator.');
        const sessionId = 'cs_mock_' + Math.random().toString(36).substring(2, 11);
        
        let redirectUrl = '';
        if (mode === 'subscription') {
          redirectUrl = `${origin}/?view=settings&settingsTab=billing&checkout_success=true&session_id=${sessionId}&tenant_id=${tenant_id}&plan=${plan}`;
        } else {
          if (mission_id) {
            redirectUrl = `${origin}/?propuesta=${mission_id}&payment_success=true&session_id=${sessionId}&mock=true&amount=${amount}`;
          } else {
            const queryParams = new URLSearchParams({
              booking_success: 'true',
              session_id: sessionId,
              tenant_id,
              client_name: client_name || '',
              client_email: client_email || '',
              client_phone: client_phone || '',
              address: address || '',
              service_type: service_type || '',
              amount: String(amount || 0),
              specs: JSON.stringify(specs)
            }).toString();
            redirectUrl = `${origin}/?${queryParams}`;
          }
        }

        return res.status(200).json({ url: redirectUrl, mock: true });
      }

      // --- REAL STRIPE CHECKOUT FLOW ---
      if (mode === 'subscription') {
        const planPrices = {
          basic: 4900,
          premium: 9900,
          vip: 19900
        };

        const priceAmount = planPrices[plan] || 9900;
        const planName = `Elevore SaaS Subscription - Plan ${plan.toUpperCase()}`;

        const session = await stripe.checkout.sessions.create({
          payment_method_types: ['card'],
          mode: 'subscription',
          line_items: [
            {
              price_data: {
                currency: 'usd',
                product_data: {
                  name: planName,
                  description: `Acceso Premium para ${tenant_id}`,
                },
                unit_amount: priceAmount,
                recurring: {
                  interval: 'month',
                },
              },
              quantity: 1,
            },
          ],
          metadata: {
            mode: 'subscription',
            tenant_id,
            plan
          },
          success_url: `${origin}/?view=settings&settingsTab=billing&checkout_success=true&session_id={CHECKOUT_SESSION_ID}&tenant_id=${tenant_id}&plan=${plan}`,
          cancel_url: `${origin}/?view=settings&settingsTab=billing&checkout_cancel=true`,
        });

        return res.status(200).json({ url: session.url });
      } else {
        if (sb && !mission_id) {
          try {
            const { data: tenantData } = await sb
              .from('tenants')
              .select('stripe_subscription_status')
              .eq('id', tenant_id)
              .single();

            if (tenantData && tenantData.stripe_subscription_status === 'free') {
              const startOfMonth = new Date();
              startOfMonth.setDate(1);
              startOfMonth.setHours(0,0,0,0);

              const { count, error: countErr } = await sb
                .from('elevore_missions')
                .select('id', { count: 'exact', head: true })
                .eq('tenant_id', tenant_id)
                .gte('created_at', startOfMonth.toISOString());

              if (!countErr && count >= 2) {
                console.warn(`[Limit Blocked]: Tenant ${tenant_id} on Free Plan reached monthly limit (2 jobs).`);
                return res.status(403).json({ 
                  error: 'Free Plan limit exceeded. The business owner has reached the maximum limit of 2 missions per month for the Free Tier. Please ask them to upgrade.' 
                });
              }
            }
          } catch (dbErr) {
            console.error('Error verifying free plan limits:', dbErr);
          }
        }

        if (!amount || isNaN(amount)) {
          return res.status(400).json({ error: 'Amount is required for payment mode' });
        }

        const totalCents = Math.round(Number(amount) * 100);

        let successUrl = `${origin}/?booking_success=true&session_id={CHECKOUT_SESSION_ID}&tenant_id=${tenant_id}&client_name=${encodeURIComponent(client_name)}&client_email=${encodeURIComponent(client_email)}&client_phone=${encodeURIComponent(client_phone)}&address=${encodeURIComponent(address)}&service_type=${encodeURIComponent(service_type)}&amount=${amount}&specs=${encodeURIComponent(JSON.stringify(specs))}`;
        let cancelUrl = `${origin}/?booking_cancel=true&t=${tenant_id}`;

        if (mission_id) {
          successUrl = `${origin}/?propuesta=${mission_id}&payment_success=true&session_id={CHECKOUT_SESSION_ID}`;
          cancelUrl = `${origin}/?propuesta=${mission_id}&payment_cancel=true`;
        }

        const session = await stripe.checkout.sessions.create({
          payment_method_types: ['card'],
          mode: 'payment',
          customer_email: client_email || undefined,
          line_items: [
            {
              price_data: {
                currency,
                product_data: {
                  name: `${service_type.toUpperCase()} - ${payment_type === 'deposit' ? 'Depósito de Reserva' : 'Servicio de Limpieza'}`,
                  description: `Servicio programado en ${address}`,
                },
                unit_amount: totalCents,
              },
              quantity: 1,
            },
          ],
          metadata: {
            mode: 'payment',
            tenant_id,
            client_name,
            client_email,
            client_phone,
            address,
            service_type,
            specs: JSON.stringify(specs),
            mission_id: mission_id || '',
            payment_type: payment_type || ''
          },
          success_url: successUrl,
          cancel_url: cancelUrl,
        });

        return res.status(200).json({ url: session.url });
      }
    } catch (error) {
      console.error('Error in create-checkout-session:', error);
      return res.status(500).json({ error: error.message });
    }
  }
}
