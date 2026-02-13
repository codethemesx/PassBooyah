import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Telegraf } from 'telegraf';

// In Next.js, we don't have easy access to the in-memory runningBots Map from other requests easily if using serverless.
// But if running in a persistent environment (like the user is doing with npm run dev), it's the same process.
// However, to be safe and robust, we should try to get the bot instance.

export async function POST(req: NextRequest, { params }: { params: Promise<{ botId: string }> }) {
  try {
    const { botId } = await params;
    const body = await req.json();
    
    console.log(`[BOT-WEBHOOK] Recebido update para bot ${botId}`);

    // Import bot manager dynamically to avoid circular dependencies if any
    const { getRunningBots, startBot } = await import('@/lib/bot-manager');
    
    // Check if bot is running in this process
    const { data: botData } = await createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    ).from('bots').select('token').eq('id', botId).single();

    if (!botData?.token) {
        return NextResponse.json({ error: 'Bot not found' }, { status: 404 });
    }

    // In a real production serverless environment, we would need to initialize the bot here
    // and handle the update. Telegraf has a handleUpdate method.
    
    const bot = new Telegraf(botData.token);
    // Note: We might want to cache these instances or use the one from bot-manager if possible.
    // For now, let's use a fresh instance to handle the webhook update.
    
    // We need to setup the logic again or export setupBotLogic.
    const { setupBotLogic } = await import('@/lib/bot-manager') as any;
    setupBotLogic(bot, botId);

    await bot.handleUpdate(body);

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('[BOT-WEBHOOK] Error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
