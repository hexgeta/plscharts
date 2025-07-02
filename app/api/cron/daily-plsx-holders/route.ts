import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Force dynamic rendering since we use request headers
export const dynamic = 'force-dynamic';

const PLSX_CONTRACT = '0x95B303987A60C71504D99Aa1b13B4DA07b0790ab';
const PLSX_DECIMALS = 18;
const JOB_NAME = 'plsx-holders-collection';

// Add league calculation types and constants
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

interface PlsxHolder {
  address: string;
  is_contract: boolean;
  balance: number;
  rawValue?: string; // Optional for progress tracking
}

// League definitions (ordered from highest to lowest percentage)
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

const TOTAL_LEAGUE = { name: 'TOTAL', emoji: 'TOTAL', minPercentage: 0, maxPercentage: 100 };

// Constants
const MAX_HOLDERS_TO_COLLECT = 50000;
const PAGES_PER_RUN = 10;

// Use the global fetch in Next.js API routes
const fetchWithRetry = async (url: string, retries = 3, delay = 1000) => {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response;
    } catch (error) {
      if (i === retries - 1) throw error;
      console.log(`Retry ${i + 1}/${retries}: Request failed, waiting before retry...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('All retries failed');
};

interface ProgressState {
  lastPage: number;
  nextPageParams: any;
  totalCollected: number;
  isComplete: boolean;
}

async function getOrCreateProgress(supabase: any, date: string): Promise<ProgressState> {
  // Try to get existing progress for today
  const { data: existing, error: fetchError } = await supabase
    .from('cron_progress')
    .select('*')
    .eq('job_name', JOB_NAME)
    .eq('date', date)
    .single();

  if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = no rows returned
    throw fetchError;
  }

  if (existing && !existing.is_complete) {
    console.log(`📄 Resuming from page ${existing.last_page + 1}, collected ${existing.total_collected} holders so far`);
    
    // Build next_page_params from stored values
    const nextPageParams = existing.last_address_hash ? {
      address_hash: existing.last_address_hash,
      items_count: 50
      // Skip value for PLSX to avoid bigint overflow
    } : null;
    
    return {
      lastPage: existing.last_page,
      nextPageParams,
      totalCollected: existing.total_collected,
      isComplete: false
    };
  }

  // Create new progress entry
  const { error: insertError } = await supabase
    .from('cron_progress')
    .insert({
      job_name: JOB_NAME,
      date,
      last_page: 0,
      total_collected: 0,
      is_complete: false
    });

  if (insertError) {
    throw insertError;
  }

  console.log('📄 Starting fresh collection from page 1');
  return {
    lastPage: 0,
    nextPageParams: null,
    totalCollected: 0,
    isComplete: false
  };
}

async function updateProgress(supabase: any, date: string, progress: Partial<ProgressState>, lastItem?: any) {
  const updateData: any = {
    updated_at: new Date().toISOString()
  };

  if (progress.lastPage !== undefined) updateData.last_page = progress.lastPage;
  if (progress.totalCollected !== undefined) updateData.total_collected = progress.totalCollected;
  if (progress.isComplete !== undefined) updateData.is_complete = progress.isComplete;
  
  if (lastItem) {
    updateData.last_address_hash = lastItem.address;
    updateData.last_value = lastItem.value;
  }

  const { error } = await supabase
    .from('cron_progress')
    .update(updateData)
    .eq('job_name', JOB_NAME)
    .eq('date', date);

  if (error) {
    console.error('Error updating progress:', error);
  }
}

async function fetchPlsxHoldersFromPage(
  startPage: number, 
  nextPageParams: any, 
  maxPages: number = 200
): Promise<{ holders: PlsxHolder[], totalPages: number, isComplete: boolean }> {
  const baseUrl = `https://api.scan.pulsechain.com/api/v2/tokens/${PLSX_CONTRACT}/holders`;
  const holders: PlsxHolder[] = [];
  let hasNextPage = true;
  let currentPageParams = nextPageParams;
  let pageCount = startPage;
  const DELAY_BETWEEN_REQUESTS = 50;
  let consecutive404s = 0;

  console.log(`🔄 Starting collection from page ${startPage + 1}, maxPages: ${maxPages}`);

  while (hasNextPage && pageCount < startPage + maxPages) {
    try {
      const queryParams = currentPageParams
        ? '?' + new URLSearchParams(currentPageParams as Record<string, string>).toString()
        : '';
      
      console.log(`📊 Fetching page ${pageCount + 1}...`);
      
      let retries = 3;
      let response;
      let got404 = false;
      
      while (retries > 0) {
        try {
          response = await fetch(baseUrl + queryParams);
          if (response.ok) {
            consecutive404s = 0;
            break;
          }
          
          if (response.status === 404) {
            got404 = true;
          }
          
          console.log(`Retry ${4-retries}/3: Got status ${response.status}, waiting before retry...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
          retries--;
        } catch (error) {
          if (retries === 1) throw error;
          console.log(`Retry ${4-retries}/3: Request failed, waiting before retry...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
          retries--;
        }
      }
      
      if (got404) {
        consecutive404s++;
        if (consecutive404s >= 3) {
          console.log('🏁 Got 3 consecutive 404s, assuming end of data reached');
          hasNextPage = false;
          break;
        }
      }
      
      if (!response || !response.ok) {
        throw new Error(`HTTP error! status: ${response?.status}`);
      }
      
      const data = await response.json();
      
      if (!data?.items?.length) {
        console.log('🏁 No more items, collection complete');
        hasNextPage = false;
        break;
      }

      const newHolders = data.items.map((item: any) => ({
        address: item.address.hash,
        is_contract: item.address.is_contract,
        balance: Number(item.value) / Math.pow(10, PLSX_DECIMALS),
        rawValue: item.value // Store raw API value for progress tracking
      }));

      holders.push(...newHolders);
      currentPageParams = data.next_page_params;
      hasNextPage = !!currentPageParams;
      pageCount++;

      if (hasNextPage) {
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_REQUESTS));
      }

      console.log(`✅ Page ${pageCount} completed. Total holders: ${holders.length}`);
    } catch (error) {
      console.error('❌ Error fetching page:', error);
      throw error;
    }
  }

  const isComplete = !hasNextPage || consecutive404s >= 3;
  console.log(`📊 Batch complete. Collected ${holders.length} holders in ${pageCount - startPage} pages. Complete: ${isComplete}`);
  
  return { 
    holders, 
    totalPages: pageCount, 
    isComplete 
  };
}

// League calculation helper functions
async function getTotalSupply(supabase: any): Promise<number> {
  try {
    console.log('📊 Fetching PLSX total supply from database...');
    
    const { data, error } = await supabase
      .from('daily_token_supplies')
      .select('total_supply_formatted')
      .eq('ticker', 'PLSX')
      .eq('chain', 369) // PulseChain
      .order('id', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      console.error('Error fetching PLSX supply from database:', error);
      throw error;
    }

    if (!data) {
      throw new Error('No PLSX supply data found in database');
    }

    const totalSupply = parseFloat(data.total_supply_formatted);
    console.log('📊 PLSX Total Supply from DB:', totalSupply.toLocaleString());
    return totalSupply;
  } catch (error) {
    console.error('Error fetching PLSX supply:', error);
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

async function getAllHolders(supabase: any): Promise<PlsxHolder[]> {
  const today = new Date().toISOString().split('T')[0];
  
  console.log('📊 Fetching all PLSX holders from database...');
  
  // First get the count to make sure we fetch all records
  const { count } = await supabase
    .from('plsx_holders')
    .select('*', { count: 'exact', head: true })
    .eq('date', today);
  
  console.log(`📊 Total PLSX holders in database: ${count}`);
  
  // Supabase has a default limit of 1000, so we need to paginate
  const allHolders: PlsxHolder[] = [];
  const pageSize = 1000;
  let from = 0;
  
  while (from < (count || 0)) {
    console.log(`📊 Fetching page: ${from} to ${from + pageSize - 1}`);
    
    const { data, error } = await supabase
      .from('plsx_holders')
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

  console.log('🗑️ Clearing league_plsx table for fresh start...');

  try {
    const { error } = await supabase
      .from('league_plsx')
      .delete()
      .eq('date', today);

    if (error) {
      console.error('Error clearing league_plsx table:', error);
      throw error;
    }

    console.log('✅ league_plsx table cleared successfully');
  } catch (error) {
    console.error('❌ Error during league table cleanup:', error);
    throw error;
  }
}

async function getTotalHolders() {
  try {
    console.log('📊 Fetching total holders count from API...');
    const url = `https://api.scan.pulsechain.com/api/v2/tokens/${PLSX_CONTRACT}/counters`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const totalHolders = parseInt(data.token_holders_count) || 0;
    
    console.log(`📊 Total PLSX holders from API: ${totalHolders.toLocaleString()}`);
    return totalHolders;
  } catch (error) {
    console.error('Error fetching total holders from API:', error);
    // Fallback to a reasonable estimate if API fails
    console.log('📊 Using fallback estimate: 367,867 holders');
    return 367867;
  }
}

async function calculateLeagueStatistics(holders: PlsxHolder[], totalSupply: number): Promise<Record<string, LeagueStats>> {
  console.log('📊 Calculating PLSX league statistics...');
  console.log(`📊 Total PLSX Supply: ${totalSupply.toLocaleString()}`);
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
    all_holders: totalHoldersFromAPI, // Use API total, not just our collected sample
    user_holders: totalHoldersFromAPI, // Assume most are users (we can adjust this later)
    last_week_holders: 0,
    holder_change: 0,
    date: new Date().toISOString().split('T')[0]
  };

  // Log results
  console.log('\n🏆 PLSX League Distribution:');
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
    .from('league_plsx')
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
  console.log('\n🏆 Starting PLSX league calculation...');
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
      .from('league_plsx')
      .insert(leagueArray);

    if (insertError) {
      console.error('❌ Database insert error:', insertError);
      throw insertError;
    }

    // Summary
    const userHolders = allHolders.filter(h => !h.is_contract).length;
    const contractHolders = allHolders.length - userHolders;
    const executionTime = (Date.now() - leagueStartTime) / 1000;

    console.log('\n📈 PLSX LEAGUE CALCULATION SUMMARY');
    console.log('=====================================');
    console.log(`💰 Total PLSX Supply: ${totalSupply.toLocaleString()}`);
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

    console.log('🚀 Starting PLSX holders collection...');
    
    // Get current date info
    const now = new Date();
    const timestamp = now.toISOString();
    const date = now.toISOString().split('T')[0]; // YYYY-MM-DD format

    // Get or create progress for today
    const progress = await getOrCreateProgress(supabase, date);
    
    // If this is a fresh start, backup and clear tables
    if (progress.lastPage === 0 && progress.totalCollected === 0) {
      console.log('📋 Fresh start - backing up current data...');
      
      // First, clear the backup table
      const { error: clearBackupError } = await supabase
        .from('plsx_holders_last_week')
        .delete()
        .neq('id', 0);
      
      if (clearBackupError) {
        console.error('❌ Error clearing backup table:', clearBackupError);
      } else {
        console.log('✅ Cleared plsx_holders_last_week table');
      }
      
      // Copy current data to backup table
      const { data: currentData, error: fetchError } = await supabase
        .from('plsx_holders')
        .select('*');
      
      if (fetchError) {
        console.error('❌ Error fetching current data:', fetchError);
      } else if (currentData && currentData.length > 0) {
        console.log(`📋 Found ${currentData.length} records to backup`);
        
        const backupData = currentData.map(({ id, ...rest }) => rest);
        
        const { error: backupError } = await supabase
          .from('plsx_holders_last_week')
          .insert(backupData);
        
        if (backupError) {
          console.error('❌ Error backing up data:', backupError);
        } else {
          console.log('✅ Successfully backed up data');
        }
      } else {
        console.log('📋 No existing data to backup');
      }
      
      // Clear the main table
      console.log('🗑️ Clearing plsx_holders table...');
      const { error: clearMainError } = await supabase
        .from('plsx_holders')
        .delete()
        .neq('id', 0);
      
      if (clearMainError) {
        console.error('❌ Error clearing main table:', clearMainError);
        throw clearMainError;
      } else {
        console.log('✅ Main table cleared - ready for fresh data');
      }
    }

    // Check if we've collected enough holders
    if (progress.totalCollected >= MAX_HOLDERS_TO_COLLECT) {
      console.log(`🎯 Target reached! Collected ${progress.totalCollected} holders (target: ${MAX_HOLDERS_TO_COLLECT})`);
      console.log('🏆 Starting league calculation...');
      
      const leagueResult = await calculateLeagues(supabase);
      
      const totalExecutionTime = (Date.now() - startTime) / 1000;
      
      return NextResponse.json({
        success: true,
        message: 'Collection target reached - leagues calculated',
        executionTimeSeconds: totalExecutionTime,
        collectionSummary: {
          totalPages: progress.lastPage,
          totalHolders: progress.totalCollected,
          collectionComplete: true
        },
        leagueCalculation: leagueResult
      });
    }

    // Fetch next batch of holders
    const result = await fetchPlsxHoldersFromPage(
      progress.lastPage, 
      progress.nextPageParams, 
      PAGES_PER_RUN
    );

    console.log(`📊 Batch fetched: ${result.holders.length} holders`);

    if (result.holders.length > 0) {
      // Prepare data for insertion
      const holderRecords = result.holders.map(holder => ({
        address: holder.address,
        is_contract: holder.is_contract,
        balance: holder.balance,
        last_week_balance: null,
        date,
        timestamp
      }));

      // Insert holder data in batches
      const batchSize = 1000;
      let totalInserted = 0;
      
      for (let i = 0; i < holderRecords.length; i += batchSize) {
        const batch = holderRecords.slice(i, i + batchSize);
        const batchNum = Math.floor(i / batchSize) + 1;
        const totalBatches = Math.ceil(holderRecords.length / batchSize);
        
        console.log(`💾 Processing batch ${batchNum}/${totalBatches} (${batch.length} records)...`);
        
        try {
          const { error: insertError } = await supabase
            .from('plsx_holders')
            .insert(batch);

          if (insertError) {
            throw insertError;
          }

          totalInserted += batch.length;
          console.log(`✅ Batch ${batchNum} saved (${batch.length} records)`);
        } catch (error) {
          console.error(`❌ Error saving batch ${batchNum}:`, error);
          throw error;
        }
        
        if (i + batchSize < holderRecords.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

            // Update progress with last item for next page params
      const lastItem = result.holders[result.holders.length - 1];
      await updateProgress(supabase, date, {
        lastPage: result.totalPages,
        totalCollected: progress.totalCollected + result.holders.length,
        isComplete: result.isComplete
      }, {
        address: lastItem.address,
        value: null // Skip value for PLSX due to bigint overflow with 18 decimals
      });

      console.log(`✅ Progress updated: Page ${result.totalPages}, Total: ${progress.totalCollected + result.holders.length}`);

      // Check if we've reached our target after this batch
      const newTotal = progress.totalCollected + result.holders.length;
      if (newTotal >= MAX_HOLDERS_TO_COLLECT) {
        console.log(`🎯 Target reached! Collected ${newTotal} holders (target: ${MAX_HOLDERS_TO_COLLECT})`);
        console.log('🏆 Starting league calculation...');
        
        const leagueResult = await calculateLeagues(supabase);
        
        const totalExecutionTime = (Date.now() - startTime) / 1000;
        
        return NextResponse.json({
          success: true,
          message: 'Collection target reached - leagues calculated',
          executionTimeSeconds: totalExecutionTime,
          collectionSummary: {
            totalPages: result.totalPages,
            totalHolders: newTotal,
            collectionComplete: true
          },
          leagueCalculation: leagueResult,
          nextRunTriggered: false,
          leagueCalculationTriggered: false // Already calculated inline
        });
      }

      // Save progress
      await supabase
        .from('cron_progress')
        .update({ 
          last_processed_page: result.totalPages,
          last_address_hash: lastItem.address,
          last_address_value: null, // Skip value for PLSX due to bigint overflow
          total_holders_collected: progress.totalCollected + result.holders.length
        })
        .eq('job_name', JOB_NAME)
        .eq('date', date);

      console.log(`✅ Progress saved. Next run will start from page ${result.totalPages + 1}`);

      const totalExecutionTime = (Date.now() - startTime) / 1000;
      const currentTotal = progress.totalCollected + result.holders.length;
      
      console.log('\n📊 RUN SUMMARY');
      console.log('=====================================');
      console.log(`📄 Pages Processed This Run: ${result.totalPages - progress.lastPage + 1}`);
      console.log(`👥 New Holders This Run: ${result.holders.length}`);
      console.log(`👥 Total Holders Collected: ${currentTotal}`);
      console.log(`🎯 Target: ${MAX_HOLDERS_TO_COLLECT} holders`);
      console.log(`⏱️ Execution Time: ${totalExecutionTime.toFixed(2)}s`);

      // Check if we've reached our target
      if (currentTotal >= MAX_HOLDERS_TO_COLLECT) {
        console.log('🎯 Target reached! Will calculate leagues on next run.');
      } else {
        console.log('🔄 Triggering next run to continue collection...');
        
        // Trigger next run automatically
        setTimeout(async () => {
          try {
            const baseUrl = process.env.VERCEL_URL 
              ? `https://${process.env.VERCEL_URL}` 
              : 'http://localhost:3000';
            
            const response = await fetch(`${baseUrl}/api/cron/daily-plsx-holders`, {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${process.env.CRON_SECRET}`
              }
            });
            
            if (response.ok) {
              console.log('✅ Successfully triggered next run');
            } else {
              console.log(`⚠️ Next run trigger got status: ${response.status}`);
            }
          } catch (error) {
            console.log('❌ Failed to trigger next run:', error.message);
          }
        }, 2000); // 2 second delay
      }

      return NextResponse.json({
        success: true,
        message: `Processed ${result.holders.length} holders (${currentTotal}/${MAX_HOLDERS_TO_COLLECT})`,
        executionTimeSeconds: totalExecutionTime,
        collectionSummary: {
          pagesProcessedThisRun: result.totalPages - progress.lastPage + 1,
          totalPages: result.totalPages,
          newHoldersThisRun: result.holders.length,
          totalHolders: currentTotal,
          collectionComplete: currentTotal >= MAX_HOLDERS_TO_COLLECT
        },
        nextRunTriggered: currentTotal < MAX_HOLDERS_TO_COLLECT
      });
    } else {
      // Mark as complete if no holders returned
      await updateProgress(supabase, date, { isComplete: true });

      // Mark collection as complete and calculate leagues
      await supabase
        .from('cron_progress')
        .update({ 
          collection_complete: true,
          last_processed_page: progress.lastPage,
          total_holders_collected: progress.totalCollected
        })
        .eq('job_name', JOB_NAME)
        .eq('date', date);

      console.log('\n🎉 COLLECTION COMPLETE! All pages processed.');
      console.log('🏆 Starting league calculation...');
      
      // Calculate leagues immediately
      const leagueResult = await calculateLeagues(supabase);
      
      const totalExecutionTime = (Date.now() - startTime) / 1000;
      
      console.log('\n🏁 FINAL SUMMARY');
      console.log('=====================================');
      console.log(`📄 Total Pages Processed: ${progress.lastPage}`);
      console.log(`👥 Total Holders Collected: ${progress.totalCollected.toLocaleString()}`);
      console.log(`⏱️ Total Execution Time: ${totalExecutionTime.toFixed(2)}s`);
      console.log(`🏆 League Calculation: ${leagueResult.success ? 'Success' : 'Failed'}`);

      return NextResponse.json({
        success: true,
        message: 'Collection complete - all pages processed and leagues calculated',
        executionTimeSeconds: totalExecutionTime,
        collectionSummary: {
          totalPages: progress.lastPage,
          totalHolders: progress.totalCollected,
          collectionComplete: true
        },
        leagueCalculation: leagueResult,
        nextRunTriggered: false,
        leagueCalculationTriggered: false // Already calculated inline
      });
    }

  } catch (error) {
    console.error('❌ Error in PLSX holders collection:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 