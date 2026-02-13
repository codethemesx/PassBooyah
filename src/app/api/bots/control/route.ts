import { NextRequest, NextResponse } from 'next/server';
import { startBot, stopBot, isRunning, getRunningBots } from '../../../../lib/bot-manager';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// POST: Start or stop a bot
export async function POST(req: NextRequest) {
  try {
    const { action, botId } = await req.json();

    if (action === 'start') {
      if (!botId) return NextResponse.json({ error: 'botId é obrigatório' }, { status: 400 });
      const { data: bot } = await supabase.from('bots').select('*').eq('id', botId).single();
      if (!bot) return NextResponse.json({ error: 'Bot não encontrado' }, { status: 404 });
      if (!bot.token) return NextResponse.json({ error: 'Token não configurado' }, { status: 400 });

      const result = await startBot(botId, bot.token);
      return NextResponse.json(result);
    }

    if (action === 'stop') {
      if (!botId) return NextResponse.json({ error: 'botId é obrigatório' }, { status: 400 });
      const result = await stopBot(botId);
      return NextResponse.json(result);
    }

    if (action === 'sync') {
      const { syncBots } = await import('@/lib/bot-manager');
      const result = await syncBots();
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: 'Ação inválida. Use "start", "stop" ou "sync".' }, { status: 400 });
  } catch (e: any) {
    console.error('Bot control error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// GET: List running bots
export async function GET() {
  const { data: bots } = await supabase.from('bots').select('id, use_webhooks, status');
  const runningInMem = getRunningBots();
  
  const allActive = bots
    ?.filter(b => runningInMem.includes(b.id) || (b.use_webhooks && b.status === 'active'))
    .map(b => b.id) || [];

  return NextResponse.json({ running: allActive });
}
