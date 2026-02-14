import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { notifyPaymentProcessed } from '@/lib/bot-manager';

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const topic = searchParams.get('topic');

    // Mercado Pago notifies about different topics, we only care about 'payment'
    if (topic === 'payment' && id) {
      console.log(`[MP-WEBHOOK] Notificação de pagamento recebida: ${id}`);
      
      // Get Access Token from settings
      const setting = await prisma.settings.findUnique({ where: { key: 'mercadopago_access_token' } });
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
        // O transaction_id do nosso banco deve bater com o ID do pagamento do MP
        console.log(`[MP-WEBHOOK] ✅ Pagamento ${externalId} APROVADO!`);

        // Update database and trigger delivery
        const order = await prisma.order.findUnique({
             where: { transaction_id: externalId }
        });

        if (order && order.status === 'pending') {
          await prisma.order.update({
            where: { id: order.id },
            data: { 
                status: 'paid', // Bot manager change to 'delivered' afterwards
                updated_at: new Date()
            }
          });

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
