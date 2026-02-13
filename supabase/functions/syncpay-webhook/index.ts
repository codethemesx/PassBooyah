import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const body = await req.json()
    console.log('[SYNC-WEBHOOK] Webhook recebido:', JSON.stringify(body))

    // Handle nested data if any
    const data = body.data || body;

    // SyncPay can send identifier or id
    const identifier = data.identifier || data.id || data.external_id || data.txid || body.identifier;
    const status = data.status || data.payment_status || data.state || body.status;

    if (!identifier || !status) {
      console.warn('[SYNC-WEBHOOK] Campos obrigatórios faltando. Identificador:', identifier, 'Status:', status)
      // Return 200 but log error to avoid gateway retries if data is weird
      return new Response(JSON.stringify({ error: 'Missing fields', received: body }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      })
    }

    const isPaid = ['PAID', 'APPROVED', 'CONFIRMED', 'COMPLETED', 'SUCESSO', 'APROVADO'].includes(status.toUpperCase())
    console.log(`[SYNC-WEBHOOK] Transação: ${identifier} | Status: ${status} | Pago: ${isPaid}`)

    if (isPaid) {
      // 1. Buscar pedido (opcional aqui, apenas para log)
      const { data: order } = await supabaseClient
        .from('orders')
        .select('id, status')
        .eq('external_id', identifier)
        .maybeSingle()

      console.log(`[SYNC-WEBHOOK] Pedido encontrado no banco: ${order?.id || 'NÃO ENCONTRADO'}`)

      // 2. Notificar o App Next.js
      let appUrl = Deno.env.get('NEXT_PUBLIC_APP_URL')
      if (appUrl) {
          appUrl = appUrl.replace(/\/$/, '')
          const forwardUrl = `${appUrl}/api/syncpay/webhook`
          console.log(`[SYNC-WEBHOOK] Encaminhando para: ${forwardUrl}`)
          
          try {
            const response = await fetch(forwardUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            })
            console.log(`[SYNC-WEBHOOK] Next.js respondeu: ${response.status}`)
          } catch (e) {
            console.error('[SYNC-WEBHOOK] Erro ao conectar no Next.js:', e.message)
          }
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('[SYNC-WEBHOOK] Erro fatal:', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
