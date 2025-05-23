import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// We need dynamic for query params
export const dynamic = 'force-dynamic';

// Log environment variables (masking sensitive data)
console.log('[Historic API] Supabase URL:', process.env.SUPABASE_URL ? '✓ Found' : '✗ Missing')
console.log('[Historic API] Supabase Anon Key:', process.env.SUPABASE_ANON_KEY ? '✓ Found' : '✗ Missing')

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
)

// Calculate seconds until next UTC+1
function getSecondsUntilNextUTC1(): number {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(1, 0, 0, 0);
  return Math.floor((tomorrow.getTime() - now.getTime()) / 1000);
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const symbol = searchParams.get('symbol')
  const field = searchParams.get('field')

  console.log('[Historic API] Request:', { symbol, field })

  if (!symbol || !field) {
    return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
  }

  try {
    console.log('[Historic API] Querying Supabase for:', field)
    
    // Fetch all data for this token, matching the original query
    const { data: rows, error } = await supabase
      .from('historic_prices')
      .select(`date, ${field}`)
      .not(field, 'is', null)
      .order('date', { ascending: true })

    if (error) {
      console.error('[Historic API] Supabase Error:', error)
      throw error
    }

    if (!rows || rows.length === 0) {
      console.log('[Historic API] No data found')
      return NextResponse.json({ data: null })
    }

    // Parse dates and prices exactly as before
    const parsed = rows.map((row: any) => ({
      date: new Date(row.date),
      price: parseFloat(row[field]),
    })).filter((row: any) => !isNaN(row.price))

    if (parsed.length === 0) {
      console.log('[Historic API] No valid data after parsing')
      return NextResponse.json({ data: null })
    }

    console.log('[Historic API] Success, returned rows:', parsed.length)

    // Calculate cache duration until next UTC+1
    const maxAge = getSecondsUntilNextUTC1();
    
    // Return response with caching headers that expire at UTC+1
    return new NextResponse(JSON.stringify({ data: rows }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': `public, max-age=${maxAge}, s-maxage=${maxAge}, stale-while-revalidate=60`,
        'CDN-Cache-Control': `public, max-age=${maxAge}`,
        'Vercel-CDN-Cache-Control': `public, max-age=${maxAge}`,
      }
    });
  } catch (error) {
    console.error('[Historic API] Error fetching historic prices:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 