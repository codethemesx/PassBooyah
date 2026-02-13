import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { notifyPaymentProcessed } from '@/lib/bot-manager';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const topic = searchParams.get('topic');

    // Mercado Pago notifies about different topics, we only care about 'payment'
    if (topic === 'payment' && id) {
      console.log(`[MP-WEBHOOK] Notificação de pagamento recebida: ${id}`);
      
      // Get Access Token from settings
      const { data: setting } = await supabase.from('settings').select('value').eq('key', 'mercadopago_access_token').single();
      const accessToken = setting?.value;

      if (!accessToken) throw new Error('MP Access Token not configured');

      // Fetch payment details from MP
      const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${id}`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });

      if (!mpRes.ok) return NextResponse.json({ ok: false });

      const payment = await mpRes.json();
      
      if (payment.status === 'approved') {
        const externalId = payment.id.toString();
        console.log(`[MP-WEBHOOK] ✅ Pagamento ${externalId} APROVADO!`);

        // Update database and trigger delivery
        const { data: order } = await supabase
          .from('orders')
          .select('id, status')
          .eq('external_id', externalId)
          .maybeSingle();

        if (order && order.status === 'pending') {
          await supabase.from('orders').update({ 
            status: 'paid', 
            updated_at: new Date().toISOString() 
          }).eq('id', order.id);

          // Trigger bot delivery
          await notifyPaymentProcessed(externalId);
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('[MP-WEBHOOK] Error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
