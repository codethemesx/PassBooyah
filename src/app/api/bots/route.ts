
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const bots = await prisma.bot.findMany({
    orderBy: { created_at: 'desc' }
  });
  return NextResponse.json(bots);
}

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get('auth-token')?.value;
    const user = token ? await verifyToken(token) : null;

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { name, token: botToken, allowed_groups } = body;

    if (!name || !botToken) {
        return NextResponse.json({ error: 'Nome e Token são obrigatórios' }, { status: 400 });
    }

    const bot = await prisma.bot.create({
        data: {
            name,
            token: botToken,
            status: 'inactive',
            allowed_groups: allowed_groups || [],
            owner_id: user.userId as string, // Vincula ao usuário logado
            config: {
                welcome_display_mode: 'TEXT',
                ask_id_display_mode: 'TEXT',
                confirm_id_display_mode: 'TEXT',
                ask_promo_display_mode: 'TEXT',
                ask_promo_code_display_mode: 'TEXT'
            }
        }
    });

    return NextResponse.json(bot);
  } catch(e: any) {
      return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
      const body = await req.json();
      const { id, ...data } = body;

      if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

      const bot = await prisma.bot.update({
          where: { id },
          data
      });
      return NextResponse.json(bot);
  } catch(e: any) {
      return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
      const { searchParams } = new URL(req.url);
      const id = searchParams.get('id');

      if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });
      
      // Delete logs first if cascade is not set in DB (Prisma handles relations if configured, but safe to delete manually)
      await prisma.botLog.deleteMany({ where: { bot_id: id } });
      
      await prisma.bot.delete({ where: { id } });

      return NextResponse.json({ success: true });
  } catch(e: any) {
      return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
