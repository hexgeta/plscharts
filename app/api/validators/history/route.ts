import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Force dynamic rendering since we're fetching live data
export const dynamic = 'force-dynamic';

// Calculate seconds until next UTC+1
function getSecondsUntilNextUTC1(): number {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(1, 0, 0, 0);
  return Math.floor((tomorrow.getTime() - now.getTime()) / 1000);
}

interface ValidatorHistoryPoint {
  date: string;
  total_validators: number;
  active_validators: number;
  total_staked: string;
  total_staked_formatted: number;
  withdrawal_addresses: number;
  average_per_address: string;
  average_per_address_formatted: number;
  timestamp: string;
}

export async function GET(request: NextRequest) {
  try {
    // Initialize Supabase client
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Fetch historical validator data ordered by date
    const { data: historyData, error } = await supabase
      .from('daily_validator_history')
      .select('*')
      .order('date', { ascending: true });

    if (error) {
      console.error('Error fetching validator history:', error);
      throw new Error(`Database error: ${error.message}`);
    }

    if (!historyData || historyData.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No historical validator data found',
        data: []
      });
    }

    // Format data for chart consumption
    const chartData = historyData.map((point: ValidatorHistoryPoint, index: number) => ({
      date: point.date,
      validators: point.active_validators,
      totalValidators: point.total_validators,
      totalStaked: Number(point.total_staked),
      totalStakedFormatted: point.total_staked_formatted,
      withdrawalAddresses: point.withdrawal_addresses,
      averagePerAddress: Number(point.average_per_address),
      averagePerAddressFormatted: point.average_per_address_formatted,
      index: index,
      displayLabel: index === 0 ? new Date(point.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 
                   index === historyData.length - 1 ? 'Now' : ''
    }));

    // Calculate cache duration until next UTC+1
    const maxAge = getSecondsUntilNextUTC1();
    
    // Return response with caching headers that expire at UTC+1
    return new NextResponse(JSON.stringify({
      success: true,
      data: chartData,
      summary: {
        totalDays: historyData.length,
        startDate: historyData[0].date,
        endDate: historyData[historyData.length - 1].date,
        currentValidators: historyData[historyData.length - 1].active_validators,
        startValidators: historyData[0].active_validators
      },
      message: `Successfully retrieved ${historyData.length} days of validator history`
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': `public, max-age=${maxAge}, s-maxage=${maxAge}, stale-while-revalidate=60`,
        'CDN-Cache-Control': `public, max-age=${maxAge}`,
        'Vercel-CDN-Cache-Control': `public, max-age=${maxAge}`,
      }
    });

  } catch (error: any) {
    console.error('Validator history API error:', error);
    
    return NextResponse.json(
      { 
        success: false,
        message: 'Failed to fetch validator history',
        error: error.message,
        data: []
      },
      { status: 500 }
    );
  }
} 