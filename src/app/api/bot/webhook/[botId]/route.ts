import { NextRequest, NextResponse } from 'next/server';
import { Telegraf } from 'telegraf';
import { prisma } from '@/lib/db';

export async function POST(req: NextRequest, { params }: { params: Promise<{ botId: string }> }) {
  try {
    const { botId } = await params;
    const body = await req.json();
    
    console.log(`[BOT-WEBHOOK] Recebido update para bot ${botId}`);
    
    // Check if bot is running in this process
    const botData = await prisma.bot.findUnique({
        where: { id: botId },
        select: { token: true }
    });

    if (!botData?.token) {
        return NextResponse.json({ error: 'Bot not found' }, { status: 404 });
    }

    // Initialize temporary bot instance to handle webhook
    const bot = new Telegraf(botData.token);
    
    // Dynamic import to avoid circular dependency issues
    const { setupBotLogic } = await import('@/lib/bot-manager') as any;
    setupBotLogic(bot, botId);

    await bot.handleUpdate(body);

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('[BOT-WEBHOOK] Error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
