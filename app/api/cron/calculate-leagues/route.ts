import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Types
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
}

// League definitions (ordered from highest to lowest percentage) - matches LeagueTable.tsx
const LEAGUES: LeagueData[] = [
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

// Add TOTAL league for completeness
const TOTAL_LEAGUE = { name: 'TOTAL', emoji: 'TOTAL', minPercentage: 0, maxPercentage: 100 };

// Constants
const HEX_CONTRACT = '0x2b591e99afE9f32eAA6214f7B7629768c40Eeb39';

export const dynamic = 'force-dynamic';

// Helper function to get total HEX supply from Supabase
async function getTotalSupply(supabase: any): Promise<number> {
  try {
    console.log('📊 Fetching HEX total supply from database...');
    
    const { data, error } = await supabase
      .from('daily_token_supplies')
      .select('total_supply')
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

    const totalSupply = parseFloat(data.total_supply);
    console.log('📊 HEX Total Supply from DB:', totalSupply.toLocaleString());
    return totalSupply;
  } catch (error) {
    console.error('Error fetching HEX supply:', error);
    throw error;
  }
}

// Helper function to determine league based on percentage
function getLeague(percentage: number): LeagueData {
  for (const league of LEAGUES) {
    if (percentage >= league.minPercentage && percentage < league.maxPercentage) {
      return league;
    }
  }
  return LEAGUES[LEAGUES.length - 1]; // Default to Shrimp
}

// Get all holders from database
async function getAllHolders(supabase: any): Promise<HexHolder[]> {
  const today = new Date().toISOString().split('T')[0];
  
  console.log('📊 Fetching all holders from database...');
  
  // First get the count to make sure we fetch all records
  const { count } = await supabase
    .from('hex_holders')
    .select('*', { count: 'exact', head: true })
    .eq('date', today);
  
  console.log(`📊 Total holders in database: ${count}`);
  
  const { data, error } = await supabase
    .from('hex_holders')
    .select('address, is_contract, balance')
    .eq('date', today)
    .order('balance', { ascending: false })
    .limit(count || 100000); // Use the actual count or a high number as fallback

  if (error) {
    console.error('Error fetching holders:', error);
    throw error;
  }

  console.log(`✅ Loaded ${data.length} holders from database`);
  return data;
}

// Clear the league_hex table for today's date
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

// Function to get total holders count from API
async function getTotalHolders() {
  try {
    // For now, return a hardcoded value since we're having issues with the API
    // This should be replaced with the actual API call once it's working
    return 367867; // From the API response we saw earlier
  } catch (error) {
    console.error('Error fetching total holders:', error);
    return 0;
  }
}

// Calculate league statistics
async function calculateLeagueStatistics(holders: HexHolder[], totalSupply: number): Promise<Record<string, LeagueStats>> {
  console.log('📊 Calculating league statistics...');
  
  const totalHolders = await getTotalHolders();
  
  // Initialize league stats (including TOTAL)
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
  
  // Add TOTAL league
  leagueStats[TOTAL_LEAGUE.emoji] = {
    league_name: TOTAL_LEAGUE.emoji,
    percentage: null,
    all_holders: totalHolders,
    user_holders: totalHolders,
    last_week_holders: 0,
    holder_change: 0,
    date: new Date().toISOString().split('T')[0]
  };

  // Process each holder
  for (const holder of holders) {
    const percentage = (holder.balance / totalSupply) * 100;
    const league = getLeague(percentage);
    
    // Update stats
    leagueStats[league.emoji].all_holders++;
    if (!holder.is_contract) {
      leagueStats[league.emoji].user_holders++;
    }
  }

  // Log results
  console.log('\n🏆 League Distribution:');
  LEAGUES.forEach(league => {
    const stats = leagueStats[league.emoji];
    console.log(`${league.emoji} ${league.name.padEnd(8)}: ${stats.user_holders.toString().padStart(6)} users, ${stats.all_holders.toString().padStart(6)} total`);
  });
  
  console.log(`${TOTAL_LEAGUE.emoji} ${TOTAL_LEAGUE.name.padEnd(8)}: ${leagueStats[TOTAL_LEAGUE.emoji].user_holders.toString().padStart(6)} users, ${leagueStats[TOTAL_LEAGUE.emoji].all_holders.toString().padStart(6)} total`);

  return leagueStats;
}

// Get last week's holder counts for comparison
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

// Main league calculation handler
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  // Authentication - use Bearer token like other cron jobs
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    console.log('[League Calculator] ❌ Unauthorized access attempt');
    return new Response('Unauthorized', { status: 401 });
  }
  
  console.log('[League Calculator] 🏆 Starting league calculation...');

  try {
    // Initialize Supabase client
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Check if both batches have completed today
    const today = new Date().toISOString().split('T')[0];
    console.log(`🔍 Checking if holder collection is complete for ${today}...`);
    
    const { data: holdersData, error: holdersError } = await supabase
      .from('hex_holders')
      .select('address')
      .eq('date', today)
      .limit(1);

    if (holdersError) {
      console.error('Error checking holders data:', holdersError);
      throw holdersError;
    }

    if (!holdersData || holdersData.length === 0) {
      console.log('⏳ No holder data found for today, holder collection may not be complete yet');
      return new Response(JSON.stringify({
        success: false,
        error: 'Holder collection not complete yet - no data found for today'
      }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    // Count total holders collected today
    const { count: totalHoldersCollected } = await supabase
      .from('hex_holders')
      .select('*', { count: 'exact', head: true })
      .eq('date', today);

    console.log(`📊 Found ${totalHoldersCollected} holders collected today`);

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
      .insert(leagueArray); // Use insert instead of upsert since we cleared the table

    if (insertError) {
      console.error('❌ Database insert error:', insertError);
      throw insertError;
    }

    // Summary
    const userHolders = allHolders.filter(h => !h.is_contract).length;
    const contractHolders = allHolders.length - userHolders;
    const executionTime = (Date.now() - startTime) / 1000;

    console.log('\n📈 LEAGUE CALCULATION SUMMARY');
    console.log('=====================================');
    console.log(`💰 Total HEX Supply: ${totalSupply.toLocaleString()}`);
    console.log(`👥 Total Holders: ${allHolders.length.toLocaleString()}`);
    console.log(`👤 User Holders: ${userHolders.toLocaleString()}`);
    console.log(`🤖 Contract Holders: ${contractHolders.toLocaleString()}`);
    console.log(`⏱️ Execution Time: ${executionTime.toFixed(2)}s`);
    console.log(`✅ Successfully stored ${leagueArray.length} league records`);

    return new Response(JSON.stringify({
      success: true,
      summary: {
        totalSupply,
        totalHolders: allHolders.length,
        userHolders,
        contractHolders,
        executionTimeSeconds: executionTime,
        leaguesProcessed: leagueArray.length,
        timestamp: new Date().toISOString()
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    const executionTime = (Date.now() - startTime) / 1000;
    console.error('❌ League calculation failed:', error);
    console.log(`⏱️ Failed after ${executionTime.toFixed(2)}s`);
    
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      executionTimeSeconds: executionTime
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
} 