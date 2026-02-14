
import { NextResponse, type NextRequest } from 'next/server'
import { verifyToken } from './lib/auth'

export async function middleware(request: NextRequest) {
  // 1. Check for Auth Token
  const token = request.cookies.get('auth-token')?.value;
  let user = null;

  if (token) {
      user = await verifyToken(token);
  }

  // 2. Protect Routes
  const isDashboard = request.nextUrl.pathname.startsWith('/dashboard');
  const isProtectedApi = request.nextUrl.pathname.startsWith('/api') && 
                         !request.nextUrl.pathname.startsWith('/api/auth') &&
                         !request.nextUrl.pathname.startsWith('/api/mercadopago/webhook') && 
                         !request.nextUrl.pathname.startsWith('/api/bot/webhook');

  if (isDashboard || isProtectedApi) {
      if (!user) {
          if (isProtectedApi) {
              return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
          } else {
              return NextResponse.redirect(new URL('/login', request.url));
          }
      }
  }

  // 3. Redirects
  if (request.nextUrl.pathname === '/') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }
  
  if (request.nextUrl.pathname === '/login' && user) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
