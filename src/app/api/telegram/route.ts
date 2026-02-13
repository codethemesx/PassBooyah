import { NextRequest, NextResponse } from 'next/server';

// Esta rota de webhook está desativada em favor do Polling no bot-manager.ts
// Retornamos 200 OK para o Telegram não ficar re-enviando atualizações pendentes
export async function POST(req: NextRequest) {
  return NextResponse.json({ ok: true, message: 'Webhook disabled, use polling' });
}

export async function GET(req: NextRequest) {
  return NextResponse.json({ ok: true });
}
