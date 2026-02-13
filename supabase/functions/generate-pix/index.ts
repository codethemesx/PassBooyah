
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import * as qrcode from 'https://deno.land/x/qrcode/mod.ts' // Deno compatible QR lib

// SyncPay Config
const SYNC_BASE_URL = 'https://api.syncpayments.com.br/api/partner/v1';
const SYNC_AUTH_URL = `${SYNC_BASE_URL}/auth`;
const SYNC_CASH_IN_URL = `${SYNC_BASE_URL}/cash-in`;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    const { amount, description, customer_id, ff_id } = await req.json()

    // 1. Get Credentials (from DB settings or ENV secrets)
    // For Edge Functions, better to use Deno.env (set secrets via CLI or dashboard)
    // Or fetch from 'settings' table if preferred.
    
    // Attempt logic: Env first, then DB fallback
    let clientKey = Deno.env.get('SYNCPAY_CLIENT_KEY');
    let clientSecret = Deno.env.get('SYNCPAY_CLIENT_SECRET');

    if (!clientKey || !clientSecret) {
         const { data: k } = await supabase.from('settings').select('value').eq('key', 'syncpay_client_key').single();
         const { data: s } = await supabase.from('settings').select('value').eq('key', 'syncpay_client_secret').single();
         clientKey = k?.value;
         clientSecret = s?.value;
    }

    if (!clientKey || !clientSecret) {
      throw new Error('Missing SyncPay credentials')
    }

    // 2. Auth
    console.log('Authenticating with SyncPay...')
    const authRes = await fetch(SYNC_AUTH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            client_id: clientKey,
            client_secret: clientSecret,
             grant_type: 'client_credentials'
        })
    });

    if (!authRes.ok) {
        const txt = await authRes.text();
        throw new Error(`Auth Error: ${authRes.status} - ${txt}`)
    }

    const authData = await authRes.json();
    const token = authData.access_token;

    // 3. Generate Pix
    console.log('Generating Pix...')
    
    // Webhook needs to be publicly accessible (your production URL)
    // Deno.env.get('APP_URL') should be set to your deployed frontend URL
    const webhookUrl = Deno.env.get('WEBHOOK_URL') || `https://${Deno.env.get('SUPABASE_PROJECT_ID')}.supabase.co/functions/v1/payment-webhook`; 

    const payload = {
        amount: Number(amount),
        description: description,
        webhook_url: webhookUrl
    }

    const pixRes = await fetch(SYNC_CASH_IN_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });

    if (!pixRes.ok) {
        const txt = await pixRes.text();
        throw new Error(`Pix Error: ${pixRes.status} - ${txt}`)
    }

    const pixData = await pixRes.json();
    const pixCode = pixData.pix_code || pixData.qr_code;
    const txId = pixData.identifier || pixData.id;

    // Generate QR Base64 (using Deno lib)
    const qrImage = await qrcode.qrcode(pixCode) // returns base64 string directly
    const qrBase64 = qrImage.replace(/^data:image\/png;base64,/, '');

    // Return success
    return new Response(
      JSON.stringify({ 
          id: txId, 
          qr_code: pixCode, 
          qr_code_base64: qrBase64,
          raw: pixData 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Edge Function Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
