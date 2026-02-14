import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { notifyPaymentProcessed } from '@/lib/bot-manager';

export async function POST(req: NextRequest) {
  try {
    const { orderId } = await req.json();

    if (!orderId) {
      return NextResponse.json({ error: 'orderId é obrigatório' }, { status: 400 });
    }

    // 1. Get order
    const order = await prisma.order.findUnique({
        where: { id: orderId }
    });
    
    if (!order) {
        return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 });
    }

    if (order.status === 'delivered') {
        return NextResponse.json({ error: 'Este pedido já foi entregue' }, { status: 400 });
    }

    // 2. Update status to paid if it was pending
    await prisma.order.update({
        where: { id: orderId },
        data: { status: 'paid', updated_at: new Date() }
    });

    // 3. Trigger delivery logic (LikesFF + Telegram msg)
    // notifyPaymentProcessed handles both the status update to 'delivered' and the bot messages
    await notifyPaymentProcessed(order.transaction_id || order.id);

    return NextResponse.json({ success: true, message: 'Pedido aprovado e entrega disparada!' });

  } catch (error: any) {
    console.error('[APPROVE-API] Error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
