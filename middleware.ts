import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { PROTECTED_PAGES } from './config/protected-pages';
import { isHandleWhitelisted } from './config/whitelisted-handles';

export async function middleware(req: NextRequest) {
  // Early return if not a protected pages
  if (!PROTECTED_PAGES.includes(req.nextUrl.pathname)) {
    return NextResponse.next();
  }

  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });
  
  try {
    const { data: { session } } = await supabase.auth.getSession();

    // Create base URL for redirects
    const baseUrl = new URL('/', req.url).toString();

    if (!session) {
      // If no session, redirect to home
      return NextResponse.redirect(baseUrl);
    }

    // Check if the user's Twitter handle is whitelisted
    const twitterHandle = session.user?.user_metadata?.user_name;
    if (!twitterHandle || !isHandleWhitelisted(twitterHandle)) {
      // If handle is not whitelisted, redirect to home
      return NextResponse.redirect(baseUrl);
    }

    return res;
  } catch (error) {
    console.error('Middleware error:', error);
    // In case of error, redirect to home
    const baseUrl = new URL('/', req.url).toString();
    return NextResponse.redirect(baseUrl);
  }
}

export const config = {
  matcher: [
    '/gas',
    '/delta-discounts',
    '/projections',
    '/prices',
    '/leagues',
    '/stats',
    '/pls-sac',
    '/oa-stakes'
  ]
}; 