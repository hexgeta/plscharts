import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Force dynamic rendering since we use request headers
export const dynamic = 'force-dynamic';

const HEX_CONTRACT = '0x2b591e99afE9f32eAA6214f7B7629768c40Eeb39';
const HEX_DECIMALS = 8;
const JOB_NAME = 'hex-holders-collection';

// League definitions (ordered from highest to lowest percentage)
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

// Constants
const MAX_HOLDERS_TO_COLLECT = 50000;
const PAGES_PER_RUN = 10;

interface LeagueStats {
  league_name: string;
  percentage: number | null;
  all_holders: number;
  user_holders: number;
  last_week_holders: number;
  holder_change: number;
  date: string;
}

interface LeagueData {
  name: string;
  emoji: string;
  minPercentage: number;
  maxPercentage: number;
}

interface HexHolder {
  address: string;
  is_contract: boolean;
  balance: number;
  rawValue?: string;
}

async function getTotalSupply(supabase: any): Promise<number> {
  try {
    console.log('📊 Fetching HEX total supply from database...');
    
    const { data, error } = await supabase
      .from('daily_token_supplies')
      .select('total_supply_formatted')
      .eq('ticker', 'HEX')
      .eq('chain', 369) // PulseChain
      .order('id', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      console.error('Error fetching HEX supply from database:', error);
      throw error;
    }

    if (!data) {
      throw new Error('No HEX supply data found in database');
    }

    const totalSupply = parseFloat(data.total_supply_formatted);
    console.log('📊 HEX Total Supply from DB:', totalSupply.toLocaleString());
    return totalSupply;
  } catch (error) {
    console.error('Error fetching HEX supply:', error);
    throw error;
  }
}

function getLeague(percentage: number): LeagueData {
  for (const league of LEAGUES) {
    if (percentage >= league.minPercentage && percentage < league.maxPercentage) {
      return league;
    }
  }
  return LEAGUES[LEAGUES.length - 1]; // Default to Shell
}

async function getAllHolders(supabase: any): Promise<HexHolder[]> {
  const today = new Date().toISOString().split('T')[0];
  
  console.log('📊 Fetching all HEX holders from database...');
  
  // First get the count to make sure we fetch all records
  const { count } = await supabase
    .from('hex_holders')
    .select('*', { count: 'exact', head: true })
    .eq('date', today);
  
  console.log(`📊 Total HEX holders in database: ${count}`);
  
  // Supabase has a default limit of 1000, so we need to paginate
  const allHolders: HexHolder[] = [];
  const pageSize = 1000;
  let from = 0;
  
  while (from < (count || 0)) {
    console.log(`📊 Fetching page: ${from} to ${from + pageSize - 1}`);
    
    const { data, error } = await supabase
      .from('hex_holders')
      .select('address, is_contract, balance')
      .eq('date', today)
      .order('balance', { ascending: false })
      .range(from, from + pageSize - 1);

    if (error) {
      console.error('Error fetching holders page:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      break;
    }

    allHolders.push(...data);
    from += pageSize;
    
    console.log(`✅ Loaded ${data.length} holders from this page. Total so far: ${allHolders.length}`);
  }

  console.log(`✅ Final total: ${allHolders.length} holders loaded from database`);
  
  return allHolders;
}

async function clearLeagueTable(supabase: any): Promise<void> {
  const today = new Date().toISOString().split('T')[0];

  console.log('🗑️ Clearing league_hex table for fresh start...');

  try {
    const { error } = await supabase
      .from('league_hex')
      .delete()
      .eq('date', today);

    if (error) {
      console.error('Error clearing league_hex table:', error);
      throw error;
    }

    console.log('✅ league_hex table cleared successfully');
  } catch (error) {
    console.error('❌ Error during league table cleanup:', error);
    throw error;
  }
}

async function getTotalHolders() {
  try {
    console.log('📊 Fetching total holders count from API...');
    const url = `https://api.scan.pulsechain.com/api/v2/tokens/${HEX_CONTRACT}/counters`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const totalHolders = parseInt(data.token_holders_count) || 0;
    
    console.log(`📊 Total HEX holders from API: ${totalHolders.toLocaleString()}`);
    return totalHolders;
  } catch (error) {
    console.error('Error fetching total holders from API:', error);
    // Fallback to a reasonable estimate if API fails
    console.log('📊 Using fallback estimate: 300,000 holders');
    return 300000;
  }
}

async function calculateLeagueStatistics(holders: HexHolder[], totalSupply: number): Promise<Record<string, LeagueStats>> {
  console.log('📊 Calculating HEX league statistics...');
  console.log(`📊 Total HEX Supply: ${totalSupply.toLocaleString()}`);
  console.log(`📊 Total Holders to Process: ${holders.length}`);
  
  // Get total holders from API
  const totalHoldersFromAPI = await getTotalHolders();
  
  // Initialize league stats
  const leagueStats: Record<string, LeagueStats> = {};
  
  // Add regular leagues
  LEAGUES.forEach(league => {
    leagueStats[league.emoji] = {
      league_name: league.emoji,
      percentage: league.minPercentage,
      all_holders: 0,
      user_holders: 0,
      last_week_holders: 0,
      holder_change: 0,
      date: new Date().toISOString().split('T')[0]
    };
  });

  // Process each holder and categorize them
  let totalUserHolders = 0;
  let totalAllHolders = 0;
  
  for (const holder of holders) {
    const percentage = (holder.balance / totalSupply) * 100;
    const league = getLeague(percentage);
    
    // Debug first few holders
    if (totalAllHolders < 5) {
      console.log(`📊 Holder ${totalAllHolders + 1}: Balance=${holder.balance.toLocaleString()}, Percentage=${percentage.toFixed(8)}%, League=${league.emoji} ${league.name}`);
    }
    
    // Update stats
    leagueStats[league.emoji].all_holders++;
    totalAllHolders++;
    
    if (!holder.is_contract) {
      leagueStats[league.emoji].user_holders++;
      totalUserHolders++;
    }
  }
  
  // Add TOTAL league with API total holders count
  leagueStats[TOTAL_LEAGUE.emoji] = {
    league_name: TOTAL_LEAGUE.emoji,
    percentage: null,
    all_holders: totalHoldersFromAPI,
    user_holders: totalHoldersFromAPI,
    last_week_holders: 0,
    holder_change: 0,
    date: new Date().toISOString().split('T')[0]
  };

  // Log results
  console.log('\n🏆 HEX League Distribution:');
  LEAGUES.forEach(league => {
    const stats = leagueStats[league.emoji];
    console.log(`${league.emoji} ${league.name.padEnd(8)}: ${stats.user_holders.toString().padStart(6)} users, ${stats.all_holders.toString().padStart(6)} total`);
  });
  
  console.log(`${TOTAL_LEAGUE.emoji} ${TOTAL_LEAGUE.name.padEnd(8)}: ${leagueStats[TOTAL_LEAGUE.emoji].user_holders.toString().padStart(6)} users, ${leagueStats[TOTAL_LEAGUE.emoji].all_holders.toString().padStart(6)} total`);

  return leagueStats;
}

async function getLastWeekHolders(supabase: any): Promise<Record<string, number>> {
  const lastWeek = new Date();
  lastWeek.setDate(lastWeek.getDate() - 7);
  
  try {
    const { data, error } = await supabase
      .from('league_hex')
      .select('league_name, user_holders')
      .gte('date', lastWeek.toISOString().split('T')[0])
      .order('date', { ascending: false })
      .limit(LEAGUES.length);

    if (error) {
      console.error('Error fetching last week holders:', error);
      return {};
    }

    return data.reduce((acc: Record<string, number>, curr: any) => {
      acc[curr.league_name] = curr.user_holders;
      return acc;
    }, {});
  } catch (error) {
    console.error('Error in getLastWeekHolders:', error);
    return {};
  }
}

async function calculateLeagues(supabase: any): Promise<any> {
  console.log('\n🏆 Starting HEX league calculation...');
  const leagueStartTime = Date.now();

  try {
    // Clear the league table first
    await clearLeagueTable(supabase);

    // Get total supply and all holders
    const [totalSupply, allHolders] = await Promise.all([
      getTotalSupply(supabase),
      getAllHolders(supabase)
    ]);

    // Calculate league statistics
    const leagueStats = await calculateLeagueStatistics(allHolders, totalSupply);
    
    // Get last week's data for comparison
    const lastWeekHolders = await getLastWeekHolders(supabase);
    
    // Update holder change calculations
    Object.keys(leagueStats).forEach(leagueEmoji => {
      const lastWeekCount = lastWeekHolders[leagueEmoji] || 0;
      leagueStats[leagueEmoji].last_week_holders = lastWeekCount;
      leagueStats[leagueEmoji].holder_change = leagueStats[leagueEmoji].user_holders - lastWeekCount;
    });

    // Store results in database
    const leagueArray = Object.values(leagueStats);
    const { error: insertError } = await supabase
      .from('league_hex')
      .insert(leagueArray);

    if (insertError) {
      console.error('❌ Database insert error:', insertError);
      throw insertError;
    }

    // Summary
    const userHolders = allHolders.filter(h => !h.is_contract).length;
    const contractHolders = allHolders.length - userHolders;
    const executionTime = (Date.now() - leagueStartTime) / 1000;

    console.log('\n📈 HEX LEAGUE CALCULATION SUMMARY');
    console.log('=====================================');
    console.log(`💰 Total HEX Supply: ${totalSupply.toLocaleString()}`);
    console.log(`👥 Total Holders: ${allHolders.length.toLocaleString()}`);
    console.log(`👤 User Holders: ${userHolders.toLocaleString()}`);
    console.log(`🤖 Contract Holders: ${contractHolders.toLocaleString()}`);
    console.log(`⏱️ League Calculation Time: ${executionTime.toFixed(2)}s`);
    console.log(`✅ Successfully stored ${leagueArray.length} league records`);

    return {
      success: true,
      summary: {
        totalSupply,
        totalHolders: allHolders.length,
        userHolders,
        contractHolders,
        executionTimeSeconds: executionTime,
        leaguesProcessed: leagueArray.length
      }
    };

  } catch (error) {
    const executionTime = (Date.now() - leagueStartTime) / 1000;
    console.error('❌ League calculation failed:', error);
    console.log(`⏱️ League calculation failed after ${executionTime.toFixed(2)}s`);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      executionTimeSeconds: executionTime
    };
  }
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Verify cron secret to ensure this is called by Vercel
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Initialize Supabase client
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    console.log('🚀 Starting HEX holders collection...');
    
    // Get current date info
    const now = new Date();
    const timestamp = now.toISOString();
    const date = now.toISOString().split('T')[0]; // YYYY-MM-DD format

    // Start league calculation
    console.log('🏆 Starting league calculation...');
    const leagueResult = await calculateLeagues(supabase);
    
    const totalExecutionTime = (Date.now() - startTime) / 1000;
    
    return NextResponse.json({
      success: true,
      message: 'Collection complete - leagues calculated',
      executionTimeSeconds: totalExecutionTime,
      leagueCalculation: leagueResult
    });

  } catch (error) {
    console.error('❌ Error in HEX holders collection:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 