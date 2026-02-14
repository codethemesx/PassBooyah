import { NextRequest, NextResponse } from 'next/server';
import { startBot, stopBot, isRunning, getRunningBots, syncBots } from '../../../../lib/bot-manager';
import { prisma } from '@/lib/db';

// POST: Start or stop a bot
export async function POST(req: NextRequest) {
  try {
    const { action, botId } = await req.json();

    if (action === 'start') {
      if (!botId) return NextResponse.json({ error: 'botId é obrigatório' }, { status: 400 });
      
      const bot = await prisma.bot.findUnique({ where: { id: botId } });
      
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
  const bots = await prisma.bot.findMany({
      select: { id: true, config: true }
  });
  
  const runningInMem = getRunningBots();
  
  // Check if bot is active in DB (config is JSON, need to parse or check fields if migrated to columns)
  // In our schema, we don't have a specific 'status' column on Bot model yet, but Supabase had.
  // We should add 'status' and 'use_webhooks' to Schema or infer from config.
  // For now, let's assume if it's in memory it's running.
  
  // TODO: Add status/use_webhooks to Prisma Schema
  
  const allActive = bots
    .filter((b: { id: string; config: any }) => runningInMem.includes(b.id)) // Simplified logic for now
    .map((b: { id: string; config: any }) => b.id);

  return NextResponse.json({ running: allActive });
}

