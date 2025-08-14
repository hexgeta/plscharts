import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    // Initialize Supabase client
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '30');
    const days = parseInt(searchParams.get('days') || '30');

    // Calculate date filter
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);
    const fromDateStr = fromDate.toISOString().split('T')[0];

    console.log(`📊 Fetching PLS pool data (last ${days} days, limit ${limit})`);

    // Fetch data from Supabase
    const { data, error } = await supabase
      .from('pls_api_data')
      .select('*')
      .gte('date', fromDateStr)
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('❌ Supabase error:', error);
      throw new Error(`Database error: ${error.message}`);
    }

    console.log(`✅ Retrieved ${data?.length || 0} PLS pool data records`);

    // Transform data for response
    const transformedData = data?.map(record => ({
      poolAddress: record.pool_address,
      chainId: record.chain_id,
      virtualPriceRaw: record.virtual_price_raw,
      virtualPriceFormatted: parseFloat(record.virtual_price_formatted),
      contractAddress: record.contract_address,
      timestamp: record.timestamp,
      date: record.date,
      id: record.id,
      createdAt: record.created_at
    })) || [];

    return NextResponse.json({
      success: true,
      data: transformedData,
      meta: {
        count: transformedData.length,
        days,
        limit,
        fromDate: fromDateStr
      }
    });

  } catch (error) {
    console.error('💥 Error fetching PLS pool data:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      data: []
    }, { status: 500 });
  }
}
