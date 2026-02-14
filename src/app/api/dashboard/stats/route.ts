
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    // Parallelize queries
    const [salesCount, salesData, recentOrders, settings] = await Promise.all([
      prisma.order.count({ where: { status: { in: ['paid', 'delivered'] } } }),
      prisma.order.findMany({
          where: { status: { in: ['paid', 'delivered'] } },
          select: { amount: true }
      }),
      prisma.order.findMany({
          take: 5,
          orderBy: { created_at: 'desc' }
      }),
      prisma.settings.findMany({
          where: { key: { in: ['likesff_api_key', 'likesff_email'] } }
      })
    ]);

    // 3. Process Orders for Revenue
    // Using simple iteration to calculate revenue from paid/delivered orders
    const paidOrders = recentOrders.filter((o: any) => o.status === 'paid' || o.status === 'delivered');
    const totalRevenue = paidOrders.reduce((sum: number, order: any) => sum + (Number(order.amount) || 0), 0);

    // 4. API Keys Status
    const likesKey = settings.find((s: any) => s.key === 'likesff_api_key')?.value;

    return NextResponse.json({
        totalSales: salesCount,
        revenue: totalRevenue,
        recentOrders,
        likesff: likesKey
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
