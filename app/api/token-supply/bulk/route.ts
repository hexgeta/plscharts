import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Hardcoded supplies that don't change
const HARDCODED_SUPPLIES: Record<string, number> = {
  'PLS': 137000000000000, // 137T
  // Add other static supplies here if needed
};

// Calculate seconds until next 1 AM UTC
function getSecondsUntilNext1AMUTC(): number {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(1, 0, 0, 0);
  return Math.floor((tomorrow.getTime() - now.getTime()) / 1000);
}

export async function GET(request: NextRequest) {
  try {
    // Initialize Supabase client
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get the latest supply for all tokens in one query
    const { data, error } = await supabase
      .from('daily_token_supplies')
      .select('ticker, total_supply_formatted, created_at')
      .order('created_at', { ascending: false })
      .limit(10000); // Increase limit to ensure we get all tokens

    if (error) {
      console.error('[Bulk API] Supabase error:', error);
      return NextResponse.json({ error: 'Failed to fetch token supplies' }, { status: 500 });
    }

    console.log('[Bulk API] Total rows returned:', data?.length);

    // Group by ticker and get the latest entry for each
    const latestSupplies: Record<string, number> = {};
    const processedTickers = new Set<string>();

    // Process results to get latest supply for each ticker
    for (const row of data) {
      if (!processedTickers.has(row.ticker)) {
        latestSupplies[row.ticker] = row.total_supply_formatted;
        processedTickers.add(row.ticker);
      }
    }

    // Add hardcoded supplies (only for tokens not found in DB)
    for (const [ticker, supply] of Object.entries(HARDCODED_SUPPLIES)) {
      if (!(ticker in latestSupplies)) {
        latestSupplies[ticker] = supply;
      }
    }

    // Calculate cache duration until next 1 AM UTC
    const maxAge = getSecondsUntilNext1AMUTC();
    
    return new NextResponse(JSON.stringify({
      supplies: latestSupplies,
      lastUpdated: new Date().toISOString(),
      count: Object.keys(latestSupplies).length
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': `public, max-age=${maxAge}, s-maxage=${maxAge}, stale-while-revalidate=60`,
        'CDN-Cache-Control': `public, max-age=${maxAge}`,
        'Vercel-CDN-Cache-Control': `public, max-age=${maxAge}`,
      }
    });

  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 