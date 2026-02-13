import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const botId = url.searchParams.get('botId')
    
    if (!botId) {
      return new Response(JSON.stringify({ error: 'Missing botId' }), { status: 400 })
    }

    const payload = await req.json()
    console.log(`[TELEGRAM-WEBHOOK] Received update for bot ${botId}`)

    // Forward to Next.js App
    let appUrl = Deno.env.get('NEXT_PUBLIC_APP_URL')
    if (!appUrl) {
       console.error('[TELEGRAM-WEBHOOK] NEXT_PUBLIC_APP_URL not set')
       return new Response(JSON.stringify({ error: 'App URL not configured' }), { status: 500 })
    }

    // Clean trailing slash
    appUrl = appUrl.replace(/\/$/, '')

    const forwardUrl = `${appUrl}/api/bot/webhook/${botId}`
    console.log(`[TELEGRAM-WEBHOOK] Forwarding to: ${forwardUrl}`)

    const response = await fetch(forwardUrl, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'User-Agent': 'SupabaseEdgeFunction'
      },
      body: JSON.stringify(payload)
    })

    console.log(`[TELEGRAM-WEBHOOK] Next.js responded with status: ${response.status}`)
    
    // Attempt to get response body if possible for debugging
    let resData = {};
    try {
        resData = await response.json();
    } catch (e) {
        resData = { message: 'Non-JSON response' };
    }
    
    return new Response(JSON.stringify(resData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: response.status,
    })

  } catch (error) {
    console.error('[TELEGRAM-WEBHOOK] Error:', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
