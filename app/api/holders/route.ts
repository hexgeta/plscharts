import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Token configurations - matching the main tokens used in LeagueDistributionChart
const TOKENS = [
  { name: 'plsx', table: 'league_plsx' },
  { name: 'hex', table: 'league_hex' },
  { name: 'hdrn', table: 'league_hdrn' },
  { name: 'com', table: 'league_com' },
  { name: 'inc', table: 'league_inc' },
  { name: 'icsa', table: 'league_icsa' }
];

async function getLatestDate(tableName: string) {
  const { data, error } = await supabase
    .from(tableName)
    .select('date')
    .order('date', { ascending: false })
    .limit(1)
    .single();
    
  if (error) {
    return null;
  }
  
  return data?.date;
}

async function getTokenLeagueData(tokenName: string, tableName: string) {
  try {
    // Get the latest date for this token
    const latestDate = await getLatestDate(tableName);
    if (!latestDate) {
      return null;
    }
    
    // Get league data for the latest date - include TOTAL for percentage calculations
    const { data, error } = await supabase
      .from(tableName)
      .select('league_name, user_holders')
      .eq('date', latestDate)
      .order('league_name');
      
    if (error) {
      return null;
    }
    
    if (!data || data.length === 0) {
      return null;
    }
    
    // Return data in the format expected by the chart component
    return data;
    
  } catch (error) {
    return null;
  }
}

export async function GET() {
  try {
    // Fetch data for all tokens in parallel
    const tokenDataPromises = TOKENS.map(token => 
      getTokenLeagueData(token.name, token.table)
    );
    
    const tokenResults = await Promise.all(tokenDataPromises);
    
    // Build response object in the format expected by the chart
    const response: any = {};
    
    TOKENS.forEach((token, index) => {
      const tokenData = tokenResults[index];
      if (tokenData) {
        response[token.name] = tokenData;
      } else {
        response[token.name] = [];
      }
    });
    
    return NextResponse.json(response);
    
  } catch (error) {
    return NextResponse.json({ 
      error: 'Failed to fetch holder data', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
} 