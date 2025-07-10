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
    console.error(`Error getting latest date for ${tableName}:`, error);
    return null;
  }
  
  return data?.date;
}

async function getTokenLeagueData(tokenName: string, tableName: string) {
  try {
    console.log(`📊 Fetching ${tokenName} data from ${tableName}...`);
    
    // Get the latest date for this token
    const latestDate = await getLatestDate(tableName);
    if (!latestDate) {
      console.log(`❌ No date found for ${tokenName}`);
      return null;
    }
    
    console.log(`📊 Using ${tokenName} data from date: ${latestDate}`);
    
    // Get league data for the latest date - include TOTAL for percentage calculations
    const { data, error } = await supabase
      .from(tableName)
      .select('league_name, user_holders')
      .eq('date', latestDate)
      .order('league_name');
      
    if (error) {
      console.error(`❌ Error fetching ${tokenName} league data:`, error);
      return null;
    }
    
    if (!data || data.length === 0) {
      console.log(`⚠️ No league data found for ${tokenName} on ${latestDate}`);
      return null;
    }
    
    console.log(`✅ Found ${data.length} league records for ${tokenName}`);
    
    // Return data in the format expected by the chart component
    return data;
    
  } catch (error) {
    console.error(`❌ Exception fetching ${tokenName} data:`, error);
    return null;
  }
}

export async function GET() {
  try {
    console.log('🚀 Starting holders API call...');
    
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
        console.log(`✅ ${token.name}: ${tokenData.length} league records processed`);
      } else {
        console.log(`❌ ${token.name}: No data available`);
        response[token.name] = [];
      }
    });
    
    console.log('🎉 API call completed successfully');
    console.log('Response structure:', Object.keys(response));
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('❌ Error in holders API:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch holder data', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
} 