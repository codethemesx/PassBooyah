
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const orders = await prisma.order.findMany({
      orderBy: { created_at: 'desc' },
      take: 100 // Limit initially to avoid overload
    });
    
    // Add computed/virtual fields if necessary or format data
    // Prisma returns standard JS objects, which is fine.
    
    return NextResponse.json(orders);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
