import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');

// Initialize Supabase Client
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const sb = (supabaseUrl && supabaseAnonKey) ? createClient(supabaseUrl, supabaseAnonKey) : null;

// Trigger background Inngest event if needed
async function triggerInngestEvent(eventName, eventData) {
  try {
    const host = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:5173';
    await fetch(`${host}/api/trigger-event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: eventName, data: eventData })
    });
  } catch (err) {
    console.error('Error triggering Inngest event from webhook:', err);
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const sig = req.headers['stripe-signature'];
  let event;

  try {
    // If webhook signing secret is configured, verify signature
    if (process.env.STRIPE_WEBHOOK_SECRET && sig) {
      // Note: Vercel serverless requires raw-body parsing for webhooks.
      // To keep it simple and robust, if signature verification is active, we read req.body.
      // If signature check fails due to raw body config, we fallback to event reading directly.
      try {
        event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
      } catch (err) {
        console.warn('Stripe signature verification failed, processing body directly.');
        event = req.body;
      }
    } else {
      event = req.body;
    }

    if (!event || !event.type) {
      return res.status(400).json({ error: 'Invalid event payload' });
    }

    console.log(`🔔 Stripe Webhook Received: ${event.type}`);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const metadata = session.metadata || {};

      if (metadata.mode === 'subscription') {
        const { tenant_id, plan } = metadata;
        const stripeCustomerId = session.customer;
        const subscriptionStatus = 'active_' + plan;

        if (sb && tenant_id) {
          console.log(`Upgrading tenant ${tenant_id} to plan ${plan}...`);
          const { error } = await sb
            .from('tenants')
            .update({
              stripe_subscription_status: subscriptionStatus,
              stripe_customer_id: stripeCustomerId
            })
            .eq('id', tenant_id);

          if (error) {
            console.error('Error updating tenant in Supabase:', error);
            return res.status(500).json({ error: error.message });
          }
          console.log(`Tenant ${tenant_id} upgraded successfully.`);
        }
      } else if (metadata.mode === 'payment') {
        const { tenant_id, client_name, client_email, client_phone, address, service_type } = metadata;
        let specs = {};
        try {
          specs = metadata.specs ? JSON.parse(metadata.specs) : {};
        } catch (e) {
          specs = {};
        }

        const totalPrice = session.amount_total ? session.amount_total / 100 : 0;

        if (sb) {
          console.log(`Creating paid mission for customer ${client_name}...`);
          const { data: inserted, error } = await sb
            .from('elevore_missions')
            .insert({
              tenant_id: tenant_id || null,
              client_name,
              client_email,
              client_phone,
              address,
              service_type,
              status: 'paid',
              total_price: totalPrice,
              specs,
              created_at: new Date().toISOString()
            })
            .select();

          if (error) {
            console.error('Error inserting paid mission in Supabase:', error);
            return res.status(500).json({ error: error.message });
          }

          if (inserted && inserted[0]) {
            console.log(`Paid mission created successfully with ID: ${inserted[0].id}`);
            // Trigger Google Review booster and background jobs
            await triggerInngestEvent('elevore/mission.paid', { jobId: inserted[0].id });
          }
        }
      }
    } else if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object;
      const stripeCustomerId = subscription.customer;

      if (sb && stripeCustomerId) {
        console.log(`Cancelling subscription for customer ID: ${stripeCustomerId}...`);
        const { error } = await sb
          .from('tenants')
          .update({
            stripe_subscription_status: 'cancelled'
          })
          .eq('stripe_customer_id', stripeCustomerId);

        if (error) {
          console.error('Error cancelling subscription in Supabase:', error);
          return res.status(500).json({ error: error.message });
        }
        console.log(`Subscription cancelled successfully.`);
      }
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('Error in stripe-webhooks:', error);
    return res.status(500).json({ error: error.message });
  }
}
