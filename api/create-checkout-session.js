import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');

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
    const { mode, tenant_id, plan, amount, currency = 'usd', client_name, client_email, client_phone, address, service_type, specs = {} } = req.body || {};

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
    // If STRIPE_SECRET_KEY is missing, generate a highly functional mock redirect
    if (!process.env.STRIPE_SECRET_KEY) {
      console.log('⚠️ [Stripe Sandbox]: STRIPE_SECRET_KEY is not configured. Redirecting to simulator.');
      const sessionId = 'cs_mock_' + Math.random().toString(36).substring(2, 11);
      
      let redirectUrl = '';
      if (mode === 'subscription') {
        redirectUrl = `${origin}/?view=settings&settingsTab=billing&checkout_success=true&session_id=${sessionId}&tenant_id=${tenant_id}&plan=${plan}`;
      } else {
        // Encode metadata & specs to pass back to client portal
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

      return res.status(200).json({ url: redirectUrl, mock: true });
    }

    // --- REAL STRIPE CHECKOUT FLOW ---
    if (mode === 'subscription') {
      const planPrices = {
        basic: 4900,     // $49.00
        premium: 9900,   // $99.00
        vip: 19900       // $199.00
      };

      const priceAmount = planPrices[plan] || 9900;
      const planName = `Elevore SaaS Subscription - Plan ${plan.toUpperCase()}`;

      // Create checkout session for subscription
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
      // payment mode for cleaning customer
      if (!amount || isNaN(amount)) {
        return res.status(400).json({ error: 'Amount is required for payment mode' });
      }

      const totalCents = Math.round(Number(amount) * 100);

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: 'payment',
        customer_email: client_email || undefined,
        line_items: [
          {
            price_data: {
              currency,
              product_data: {
                name: `${service_type.toUpperCase()} - Servicio de Limpieza`,
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
          specs: JSON.stringify(specs)
        },
        success_url: `${origin}/?booking_success=true&session_id={CHECKOUT_SESSION_ID}&tenant_id=${tenant_id}&client_name=${encodeURIComponent(client_name)}&client_email=${encodeURIComponent(client_email)}&client_phone=${encodeURIComponent(client_phone)}&address=${encodeURIComponent(address)}&service_type=${encodeURIComponent(service_type)}&amount=${amount}&specs=${encodeURIComponent(JSON.stringify(specs))}`,
        cancel_url: `${origin}/?booking_cancel=true&t=${tenant_id}`,
      });

      return res.status(200).json({ url: session.url });
    }
  } catch (error) {
    console.error('Error in create-checkout-session:', error);
    return res.status(500).json({ error: error.message });
  }
}
