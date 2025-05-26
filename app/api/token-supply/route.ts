import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Only PLS should be hardcoded as requested
const HARDCODED_SUPPLIES: Record<string, number> = {
  'PLS': 137000000000000, // 137T
};

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const ticker = searchParams.get('ticker');

  console.log(`[Token Supply API] Fetching supply for ${ticker}`);

  if (!ticker) {
    console.log('[Token Supply API] No ticker provided');
    return NextResponse.json({ error: 'Missing ticker parameter' }, { status: 400 });
  }

  // Check for hardcoded supply first (only PLS)
  if (ticker in HARDCODED_SUPPLIES) {
    console.log(`[Token Supply API] Using hardcoded supply for ${ticker}`);
    return NextResponse.json({
      ticker,
      totalSupply: HARDCODED_SUPPLIES[ticker]
    });
  }

  try {
    // Initialize Supabase client with service role key
    console.log(`[Token Supply API] Initializing Supabase client for ${ticker}`);
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get the latest supply for the token from daily_token_supplies table
    console.log(`[Token Supply API] Querying daily_token_supplies for ${ticker}`);
    const { data, error } = await supabase
      .from('daily_token_supplies')
      .select('total_supply_formatted')
      .eq('ticker', ticker)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      console.error('[Token Supply API] Supabase error:', error);
      return NextResponse.json({ error: 'Failed to fetch token supply' }, { status: 500 });
    }

    if (!data) {
      console.log(`[Token Supply API] No supply data found for ${ticker}`);
      return NextResponse.json({ error: 'Token supply not found' }, { status: 404 });
    }

    console.log(`[Token Supply API] Found supply for ${ticker}:`, data.total_supply_formatted);
    return NextResponse.json({
      ticker,
      totalSupply: data.total_supply_formatted
    });

  } catch (error) {
    console.error('[Token Supply API] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 