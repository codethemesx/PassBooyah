import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';
import { notifyPaymentProcessed } from '../../../../lib/bot-manager';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.json();
    console.log('[WEBHOOK-SYNC] Payload recebido:', JSON.stringify(rawBody));

    // Support nested data if any
    const body = rawBody.data || rawBody;
    
    // Support multiple ID and status keys
    const identifier = body.identifier || body.id || body.txid || body.external_id || rawBody.identifier || rawBody.id;
    const status = body.status || body.payment_status || body.state || rawBody.status;

    if (!identifier || !status) {
      console.warn('[WEBHOOK-SYNC] Campos obrigatórios faltando. Identificador:', identifier, 'Status:', status);
      return NextResponse.json({ 
        error: 'Payload invalido', 
        received: rawBody,
        expected: 'identifier and status' 
      }, { status: 400 });
    }

    // 1. Busca pedido no banco pelo ID externo (identifier)
    // Buscamos tanto como UUID quanto como string no campo external_id
    const { data: order, error } = await supabase
      .from('orders')
      .select('*')
      .eq('external_id', identifier)
      .maybeSingle();

    if (error || !order) {
      console.error('[WEBHOOK-SYNC] Pedido não encontrado no banco:', identifier);
      return NextResponse.json({ error: 'Pedido nao encontrado' }, { status: 404 });
    }

    console.log(`[WEBHOOK-SYNC] Processando pedido ${order.id} | Status recebido: ${status}`);

    // 2. Se já foi pago/entregue, ignora
    if (order.status === 'delivered' || order.status === 'paid') {
        console.log(`[WEBHOOK-SYNC] Pedido ${identifier} já estava processado.`);
        return NextResponse.json({ message: 'Ja processado' });
    }

    // 3. Verifica se o status é de pagamento CONFIRMADO
    const isPaid = ['PAID', 'APPROVED', 'CONFIRMED', 'COMPLETED', 'SUCESSO', 'APROVADO'].includes(status.toUpperCase());

    if (isPaid) {
        console.log(`[WEBHOOK-SYNC] ✅ Pagamento CONFIRMADO para pedido ${order.id}!`);
        
        const { error: updateErr } = await supabase
            .from('orders')
            .update({ status: 'paid', updated_at: new Date().toISOString() })
            .eq('id', order.id);

        if (updateErr) {
            console.error('[WEBHOOK-SYNC] Erro ao atualizar status:', updateErr);
            throw updateErr;
        }

        // 4. Dispara processo de notificação e envio via Bot Manager
        // Usamos o identifier original (da SyncPay)
        notifyPaymentProcessed(identifier).catch((err: any) => {
            console.error('[WEBHOOK-SYNC] Erro ao disparar entrega:', err);
        });
        
        return NextResponse.json({ success: true, message: 'Processado e entrega disparada' });
    } else {
        console.log(`[WEBHOOK-SYNC] ℹ️ Status ignorado: ${status}`);
        return NextResponse.json({ received: true, message: 'Status ignorado' });
    }

  } catch (error: any) {
    console.error('[WEBHOOK-SYNC] Erro Fatal:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
