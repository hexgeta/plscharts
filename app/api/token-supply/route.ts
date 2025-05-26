import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const ticker = searchParams.get('ticker');

  if (!ticker) {
    return NextResponse.json({ error: 'Missing ticker parameter' }, { status: 400 });
  }

  try {
    // Initialize Supabase client with server-side credentials
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Fetch the latest supply data for the token
    const { data, error: supabaseError } = await supabase
      .from('daily_token_supplies')
      .select('total_supply_formatted')
      .eq('ticker', ticker)
      .order('date', { ascending: false })
      .limit(1)
      .single();

    if (supabaseError) {
      console.error('Supabase error:', supabaseError);
      return NextResponse.json(
        { error: `Failed to fetch supply data: ${supabaseError.message}` },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: `No supply data found for ${ticker}` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ticker,
      totalSupply: data.total_supply_formatted
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 