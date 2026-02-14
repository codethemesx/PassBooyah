
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyPassword, signToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email e senha são obrigatórios' }, { status: 400 });
    }

    console.log('[LOGIN] Tentativa de login:', email);

    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      console.log('[LOGIN] Usuário não encontrado:', email);
      return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 });
    }

    const isValid = await verifyPassword(password, user.password);

    if (!isValid) {
      console.log('[LOGIN] Senha inválida para:', email);
      return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 });
    }

    console.log('[LOGIN] Sucesso para:', email);

    // Generate JWT
    const token = await signToken({ userId: user.id, email: user.email, role: user.role });

    // Set Cookie
    const response = NextResponse.json({ success: true, user: { name: user.name, email: user.email } });
    
    response.cookies.set({
      name: 'auth-token',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 // 1 day
    });

    return response;

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
