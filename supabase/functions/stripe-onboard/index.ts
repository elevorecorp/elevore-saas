import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@11.1.0?target=deno'

// 1. Initialize Stripe with your Secret Key (will be loaded from Supabase Secrets)
// const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') as string, {
//   apiVersion: '2022-11-15',
//   httpClient: Stripe.createFetchHttpClient(),
// })

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 2. Parse request
    const { tenant_id } = await req.json()

    if (!tenant_id) {
      throw new Error('Tenant ID is required')
    }

    // [MOCK]
    // Since we don't have a Stripe account yet, we return a simulated success URL.
    // In production, this will be:
    // const account = await stripe.accounts.create({ type: 'standard' });
    // const accountLink = await stripe.accountLinks.create({
    //   account: account.id,
    //   refresh_url: 'https://elevore-saas.vercel.app/dashboard',
    //   return_url: 'https://elevore-saas.vercel.app/dashboard?stripe_connected=true',
    //   type: 'account_onboarding',
    // });
    // return new Response(JSON.stringify({ url: accountLink.url }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const mockUrl = "https://connect.stripe.com/express/oauth/authorize?response_type=code&client_id=ca_MOCK&scope=read_write"
    
    return new Response(JSON.stringify({ url: mockUrl, mock: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
