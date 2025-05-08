import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import type { NextRequest } from 'next/server';
import { PROTECTED_PAGES } from './config/protected-pages';

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Handle protected pages
  if (PROTECTED_PAGES.some(page => path.startsWith(page))) {
    // Skip middleware for API routes
    if (path.startsWith('/api/')) {
      return NextResponse.next();
    }

    try {
      const session = await getToken({ 
        req: request, 
        secret: process.env.NEXTAUTH_SECRET 
      });

      if (!session?.email) {
        return NextResponse.next();
      }

      const response = await fetch(`${process.env.NEXTAUTH_URL}/api/whitelist/check`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: session.email }),
      });

      const { isWhitelisted } = await response.json();

      if (!isWhitelisted) {
        return NextResponse.next();
      }

      return NextResponse.next();
    } catch (error) {
      console.error('Middleware error:', error);
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: PROTECTED_PAGES.filter(page => !page.startsWith('/api/'))
}; 