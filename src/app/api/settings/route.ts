
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  const settings = await prisma.settings.findMany();
  // Convert array to object { key: value }
  const settingsMap = settings.reduce((acc: any, s: any) => {
    acc[s.key] = s.value;
    return acc;
  }, {});
  return NextResponse.json(settingsMap);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Body should be an object { key: value, ... }
    const updates = [];
    for (const [key, value] of Object.entries(body)) {
        if (typeof value === 'string') {
             updates.push(prisma.settings.upsert({
                 where: { key },
                 create: { key, value },
                 update: { value }
             }));
        }
    }
    
    await prisma.$transaction(updates);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
