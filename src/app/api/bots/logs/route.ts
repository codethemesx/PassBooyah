
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const botId = searchParams.get('botId');

    if (!botId) return NextResponse.json({ error: 'Bot ID required' }, { status: 400 });

    const logs = await prisma.botLog.findMany({
        where: { bot_id: botId },
        orderBy: { created_at: 'desc' },
        take: 50
    });

    return NextResponse.json(logs);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
