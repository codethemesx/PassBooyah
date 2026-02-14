import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const data = await prisma.promoCode.findMany({
      orderBy: { code: 'asc' }
    });
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { code, discount_amount, max_uses, expires_in_hours } = await req.json();

    if (!code || !discount_amount) {
        return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
    }

    let expires_at = null;
    if (expires_in_hours) {
        const date = new Date();
        date.setHours(date.getHours() + parseInt(expires_in_hours));
        expires_at = date; // Prisma aceita Date object
    }

    const data = await prisma.promoCode.create({
      data: {
        code: code.toUpperCase().trim(),
        discount_amount: parseFloat(discount_amount),
        is_active: true,
        max_uses: max_uses ? parseInt(max_uses) : null,
        expires_at: expires_at,
        used_count: 0
      }
    });

    return NextResponse.json(data);
  } catch (e: any) {
    // Unique constraint error check could be improved here
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const code = searchParams.get('code');

        if (!code) return NextResponse.json({ error: 'Código necessário' }, { status: 400 });

        await prisma.promoCode.delete({
            where: { code: code }
        });

        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
