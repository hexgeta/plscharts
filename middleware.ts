import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import type { NextRequest } from 'next/server';
import { PROTECTED_PAGES } from './config/protected-pages';

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Skip middleware for API routes
  if (path.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Check if the page is protected
  if (!PROTECTED_PAGES.includes(path)) {
    return NextResponse.next();
  }

  try {
    // Get the user's session
    const session = await getToken({ 
      req: request, 
      secret: process.env.NEXTAUTH_SECRET 
    });

    // If no session, allow access but content will be hidden behind auth overlay
    if (!session?.email) {
      return NextResponse.next();
    }

    // Check whitelist status
    const response = await fetch(`${process.env.NEXTAUTH_URL}/api/whitelist/check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: session.email }),
    });

    const { isWhitelisted } = await response.json();

    // If not whitelisted, allow access but content will be hidden behind paywall
    if (!isWhitelisted) {
      return NextResponse.next();
    }

    // If whitelisted, allow full access
    return NextResponse.next();
  } catch (error) {
    console.error('Middleware error:', error);
    // On error, redirect to home page
    return NextResponse.redirect(new URL('/', request.url));
  }
}

// Only run middleware on non-API routes that are protected
export const config = {
  matcher: PROTECTED_PAGES.filter(page => !page.startsWith('/api/'))
}; 