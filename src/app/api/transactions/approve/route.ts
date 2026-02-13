import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { notifyPaymentProcessed } from '@/lib/bot-manager';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { orderId } = await req.json();

    if (!orderId) {
      return NextResponse.json({ error: 'orderId é obrigatório' }, { status: 400 });
    }

    // 1. Get order
    const { data: order, error: orderErr } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();
    
    if (orderErr || !order) {
        return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 });
    }

    if (order.status === 'delivered') {
        return NextResponse.json({ error: 'Este pedido já foi entregue' }, { status: 400 });
    }

    // 2. Update status to paid if it was pending
    const { error: updateErr } = await supabase
        .from('orders')
        .update({ status: 'paid', updated_at: new Date().toISOString() })
        .eq('id', orderId);

    if (updateErr) throw updateErr;

    // 3. Trigger delivery logic (LikesFF + Telegram msg)
    // notifyPaymentProcessed handles both the status update to 'delivered' and the bot messages
    await notifyPaymentProcessed(order.external_id);

    return NextResponse.json({ success: true, message: 'Pedido aprovado e entrega disparada!' });

  } catch (error: any) {
    console.error('[APPROVE-API] Error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
