import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import type { NextRequest } from 'next/server';
import { PROTECTED_PAGES } from './config/protected-pages';

const STREAM_URL = 'https://x.com/i/broadcasts/1kvKpynqlqdGE'

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Handle /live route with any query parameters
  if (path === '/live') {
    const userAgent = request.headers.get('user-agent') || '';
    const isBot = userAgent.toLowerCase().includes('bot') || 
                 userAgent.toLowerCase().includes('twitter') ||
                 userAgent.toLowerCase().includes('facebook') ||
                 userAgent.toLowerCase().includes('discord');

    // For bots, serve a static page with meta tags
    if (isBot) {
      const response = new NextResponse(
        `<!DOCTYPE html>
        <html>
          <head>
            <title>Live Stream</title>
            <meta property="og:title" content="Live Stream" />
            <meta property="og:description" content="Watch our live stream!" />
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content="Live Stream" />
            <meta name="twitter:description" content="Watch our live stream!" />
          </head>
          <body>
            <h1>Live Stream</h1>
            <p>Redirecting to live stream...</p>
          </body>
        </html>`,
        {
          headers: {
            'content-type': 'text/html',
            'cache-control': 'no-cache, no-store, must-revalidate',
          },
        }
      );
      return response;
    }

    // For regular users, redirect to the stream
    // Preserve any query parameters by using request.nextUrl
    const streamUrl = new URL(STREAM_URL);
    return NextResponse.redirect(streamUrl);
  }

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

// Only run middleware on protected pages and /live route
export const config = {
  matcher: ['/live', ...PROTECTED_PAGES.filter(page => !page.startsWith('/api/'))]
}; 