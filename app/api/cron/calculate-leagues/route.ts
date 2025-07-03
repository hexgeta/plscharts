import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// League definitions (matching the structure used in individual cron jobs)
const LEAGUES = [
  { name: 'Poseidon', emoji: '🔱', minPercentage: 10, maxPercentage: 100 },
  { name: 'Whale', emoji: '🐋', minPercentage: 1, maxPercentage: 10 },
  { name: 'Shark', emoji: '🦈', minPercentage: 0.1, maxPercentage: 1 },
  { name: 'Dolphin', emoji: '🐬', minPercentage: 0.01, maxPercentage: 0.1 },
  { name: 'Squid', emoji: '🦑', minPercentage: 0.001, maxPercentage: 0.01 },
  { name: 'Turtle', emoji: '🐢', minPercentage: 0.0001, maxPercentage: 0.001 },
  { name: 'Crab', emoji: '🦀', minPercentage: 0.00001, maxPercentage: 0.0001 },
  { name: 'Shrimp', emoji: '🦐', minPercentage: 0.000001, maxPercentage: 0.00001 },
  { name: 'Shell', emoji: '🐚', minPercentage: 0, maxPercentage: 0.000001 }
];

const TOTAL_LEAGUE = { name: 'TOTAL', emoji: 'TOTAL', minPercentage: 0, maxPercentage: 100 };

interface LeagueStats {
  league_name: string;
  percentage: number | null;
  all_holders: number;
  user_holders: number;
  last_week_holders: number;
  holder_change: number;
  date: string;
}

interface TokenConfig {
  ticker: string;
  tableName: string;
  chain: number;
  decimals: number;
}

// Token configurations
const TOKENS: TokenConfig[] = [
  { ticker: 'HEX', tableName: 'hex_holders', chain: 369, decimals: 8 },
  { ticker: 'PLSX', tableName: 'plsx_holders', chain: 369, decimals: 18 },
  { ticker: 'INC', tableName: 'inc_holders', chain: 369, decimals: 18 },
  { ticker: 'ICSA', tableName: 'icsa_holders', chain: 369, decimals: 18 },
  { ticker: 'HDRN', tableName: 'hdrn_holders', chain: 369, decimals: 9 },
  { ticker: 'COM', tableName: 'com_holders', chain: 369, decimals: 18 }
];

function getLeague(percentage: number) {
  for (const league of LEAGUES) {
    if (percentage >= league.minPercentage) {
      return league;
    }
  }
  return LEAGUES[LEAGUES.length - 1]; // Default to Shell
}

async function getTotalSupply(supabase: any, ticker: string, chain: number): Promise<number> {
  const { data, error } = await supabase
    .from('daily_token_supplies')
    .select('total_supply_formatted')
    .eq('ticker', ticker)
    .eq('chain', chain)
    .order('id', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    throw new Error(`No ${ticker} supply data found in database`);
  }

  return parseFloat(data.total_supply_formatted);
}

async function getTotalHolders(ticker: string): Promise<number> {
  const apiUrl = `https://api.scan.pulsechain.com/api/v2/tokens/${getTokenAddress(ticker)}/counters`;
  
  try {
    console.log(`📊 Fetching total ${ticker} holders count from API...`);
    const response = await fetch(apiUrl, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'PLSCharts/1.0'
      }
    });

    if (!response.ok) {
      throw new Error(`API response not ok: ${response.status}`);
    }

    const data = await response.json();
    const totalHolders = parseInt(data.token_holders_count) || 0;
    console.log(`📊 Total ${ticker} holders from API: ${totalHolders.toLocaleString()}`);
    return totalHolders;
  } catch (error) {
    console.error(`Error fetching total ${ticker} holders from API:`, error);
    console.warn(`⚠️ Using fallback estimate for ${ticker}: 0`);
    return 0;
  }
}

function getTokenAddress(ticker: string): string {
  const addresses: { [key: string]: string } = {
    'HEX': '0x2b591e99afE9f32eAA6214f7B7629768c40Eeb39',
    'PLSX': '0x95B303987A60C71504D99Aa1b13B4DA07b0790ab',
    'INC': '0x2fa878Ab3F87CC1C9737Fc071108F904c0B0C95d',
    'ICSA': '0x1e4746dC744503b53b4A082cB3607B169a289090',
    'HDRN': '0x3819f64f282bf135d62168C1e513280dAF905e06',
    'COM': '0x7b47f41Ad4b8C56E6b8b7E8C593F35c3e7bCFCDD'
  };
  return addresses[ticker] || '';
}

async function calculateLeagueStatistics(
  supabase: any, 
  ticker: string, 
  tableName: string, 
  totalSupply: number
): Promise<{ leagueStats: Record<string, LeagueStats>, actualDate: string }> {
  console.log(`📊 Calculating ${ticker} league statistics...`);
  
  // Get the latest date that has data first
  const { data: latestData, error: dateError } = await supabase
    .from(tableName)
    .select('date')
    .order('date', { ascending: false })
    .limit(1)
    .single();

  if (dateError || !latestData) {
    throw new Error(`No ${ticker} holder data found in table ${tableName}`);
  }

  const actualDate = latestData.date;
  console.log(`📊 Using ${ticker} data from date: ${actualDate}`);

  // Initialize league stats (using emojis as keys, just like the individual cron jobs)
  const leagueStats: Record<string, LeagueStats> = {};
  LEAGUES.forEach(league => {
    leagueStats[league.emoji] = {
      league_name: league.emoji,
      percentage: league.minPercentage,
      all_holders: 0,
      user_holders: 0,
      last_week_holders: 0,
      holder_change: 0,
      date: actualDate // Now actualDate is properly defined
    };
  });

  // Get ALL holders from the table for the latest date (with pagination like HEX route)
  console.log(`📊 Fetching all ${ticker} holders from database...`);
  
  // First get the count to make sure we fetch all records
  const { count } = await supabase
    .from(tableName)
    .select('*', { count: 'exact', head: true })
    .eq('date', actualDate);
  
  console.log(`📊 Total ${ticker} holders in database: ${count}`);
  
  if (!count || count === 0) {
    console.log(`⚠️ No ${ticker} holders found for date ${actualDate}`);
    return { leagueStats, actualDate };
  }
  
  // Supabase has a default limit of 1000, so we need to paginate
  const allHolders: any[] = [];
  const pageSize = 1000;
  let from = 0;
  
  while (from < count) {
    console.log(`📊 Fetching ${ticker} page: ${from} to ${from + pageSize - 1}`);
    
    const { data, error } = await supabase
      .from(tableName)
      .select('address, is_contract, balance')
      .eq('date', actualDate)
      .order('balance', { ascending: false })
      .range(from, from + pageSize - 1);

    if (error) {
      console.error(`Error fetching ${ticker} holders page:`, error);
      throw error;
    }

    if (!data || data.length === 0) {
      break;
    }

    allHolders.push(...data);
    from += pageSize;
    
    console.log(`✅ Loaded ${data.length} ${ticker} holders from this page. Total so far: ${allHolders.length}`);
  }

  console.log(`✅ Final total: ${allHolders.length} ${ticker} holders loaded from database`);
  
  const holders = allHolders;
  console.log(`📊 Processing ${holders.length} ${ticker} holders...`);

  // Process each holder
  let totalUserHolders = 0;
  let totalAllHolders = 0;

  for (const holder of holders) {
    const percentage = (holder.balance / totalSupply) * 100;
    const league = getLeague(percentage);

    // Update stats
    leagueStats[league.emoji].all_holders++;
    totalAllHolders++;

    if (!holder.is_contract) {
      leagueStats[league.emoji].user_holders++;
      totalUserHolders++;
    }
  }

  // Add TOTAL league placeholder (will be updated with API data in main function)
  leagueStats[TOTAL_LEAGUE.emoji] = {
    league_name: TOTAL_LEAGUE.emoji,
    percentage: null,
    all_holders: totalAllHolders, // Temporary - will be replaced with API total
    user_holders: totalUserHolders, // Temporary - will be replaced with API total
    last_week_holders: 0,
    holder_change: 0,
    date: actualDate
  };

  console.log(`📊 ${ticker} Summary: ${totalAllHolders} total holders, ${totalUserHolders} user holders`);
  
  return { leagueStats, actualDate };
}

async function clearLeagueTable(supabase: any, ticker: string, date: string): Promise<void> {
  console.log(`🗑️ Clearing ALL records from league_${ticker.toLowerCase()} table...`);

  try {
    // Delete ALL entries (not just for this date) since we're recalculating the entire league structure
    const { error } = await supabase
      .from('league_' + ticker.toLowerCase())
      .delete()
      .neq('id', 0); // This deletes all records (neq with impossible condition)

    if (error) {
      console.error(`Error clearing league_${ticker.toLowerCase()} table:`, error);
      throw error;
    }

    console.log(`✅ league_${ticker.toLowerCase()} table cleared successfully (all records)`);
  } catch (error) {
    console.error(`❌ Error during league table cleanup for ${ticker}:`, error);
    throw error;
  }
}

async function saveLeagueStatistics(
  supabase: any,
  ticker: string,
  leagueStats: Record<string, LeagueStats>,
  totalHoldersFromAPI: number,
  date: string
) {
  console.log(`💾 Saving ${ticker} league statistics...`);

  // Clear existing data for this ticker and date (same as individual cron jobs)
  await clearLeagueTable(supabase, ticker, date);

  // Prepare records for insertion (convert from emoji-keyed object to array, just like HEX route)
  const leagueArray = Object.values(leagueStats);

  // Insert new records
  const { error: insertError } = await supabase
    .from('league_' + ticker.toLowerCase())
    .insert(leagueArray);

  if (insertError) {
    throw new Error(`Error inserting ${ticker} league data: ${insertError.message}`);
  }

  console.log(`✅ ${ticker} league statistics saved successfully - ${leagueArray.length} records inserted`);
}

export async function GET(request: NextRequest) {
  try {
    // Verify authorization
    const authHeader = request.headers.get('authorization');
    const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;
    
    if (!authHeader || authHeader !== expectedAuth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🏆 Starting league calculations for all tokens...');
    
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const date = new Date().toISOString().split('T')[0];
    const results: any = {};

    // Process each token
    for (const token of TOKENS) {
      try {
        console.log(`\n🎯 Processing ${token.ticker}...`);

        // Check if table exists by trying to get one record
        const { data: testData, error: testError } = await supabase
          .from(token.tableName)
          .select('id')
          .limit(1);

        if (testError) {
          console.log(`⚠️ Skipping ${token.ticker}: table ${token.tableName} does not exist`);
          results[token.ticker] = { status: 'skipped', reason: 'table_not_found' };
          continue;
        }

        // Get total supply
        const totalSupply = await getTotalSupply(supabase, token.ticker, token.chain);
        console.log(`📊 ${token.ticker} Total Supply: ${totalSupply.toLocaleString()}`);

                 // Calculate league statistics first (to get holder counts)
         const { leagueStats, actualDate } = await calculateLeagueStatistics(
           supabase, 
           token.ticker, 
           token.tableName, 
           totalSupply
         );

         // Get total holders from API (just like the individual cron jobs)
         const totalHoldersFromAPI = await getTotalHolders(token.ticker);
         
         // Update TOTAL league with API data (just like HEX route does)
         leagueStats[TOTAL_LEAGUE.emoji] = {
           league_name: TOTAL_LEAGUE.emoji,
           percentage: null,
           all_holders: totalHoldersFromAPI, // Use API total, not just our collected sample
           user_holders: totalHoldersFromAPI, // Assume most are users (can adjust later)
           last_week_holders: 0,
           holder_change: 0,
           date: actualDate
         };

         // Save league statistics
         await saveLeagueStatistics(
           supabase,
           token.ticker,
           leagueStats,
           totalHoldersFromAPI,
           actualDate
         );

                 results[token.ticker] = { 
           status: 'success', 
           totalSupply: totalSupply.toLocaleString(),
           totalHoldersAPI: totalHoldersFromAPI,
           actualDate: actualDate,
           leagueDistribution: leagueStats
         };

      } catch (error: any) {
        console.error(`❌ Error processing ${token.ticker}:`, error.message);
        results[token.ticker] = { 
          status: 'error', 
          error: error.message 
        };
      }
    }

    console.log('\n🏆 League calculation completed for all tokens');

    return NextResponse.json({
      message: 'League calculations completed',
      date,
      results
    });

  } catch (error: any) {
    console.error('❌ Fatal error in league calculation:', error);
    return NextResponse.json({
      error: 'League calculation failed',
      details: error.message
    }, { status: 500 });
  }
} 