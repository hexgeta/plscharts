import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Force dynamic rendering since we use request headers
export const dynamic = 'force-dynamic';

const HEX_CONTRACT = '0x2b591e99afE9f32eAA6214f7B7629768c40Eeb39';
const HEX_DECIMALS = 8;

// Function to get total supply from database
async function getTotalSupply(supabase: any) {
  const { data, error } = await supabase
    .from('daily_token_supplies')
    .select('total_supply_formatted')
    .eq('ticker', 'HEX')
    .order('date', { ascending: false })
    .limit(1);

  if (error) {
    throw error;
  }

  return data?.[0]?.total_supply_formatted || 0;
}

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

// League thresholds in percentages
interface League {
  name: string;
  percentage: number | null;
}

const LEAGUES: League[] = [
  { name: '🔱', percentage: 10 },
  { name: '🐋', percentage: 1 },
  { name: '🦈', percentage: 0.1 },
  { name: '🐬', percentage: 0.01 },
  { name: '🦑', percentage: 0.001 },
  { name: '🐢', percentage: 0.0001 },
  { name: '🦀', percentage: 0.00001 },
  { name: '🦐', percentage: 0.000001 },
  { name: '🐚', percentage: 0.0000001 },
  { name: '🐌', percentage: 0.00000001 },
  { name: 'DUST', percentage: 0 },
  { name: 'TOTAL', percentage: null } // No percentage for total
];

interface HexHolder {
  address: string;
  isContract: boolean;
  balance: number;
}

// Function to get league for a holder
function getLeague(balance: number, totalSupply: number): League {
  const percentage = (balance / totalSupply) * 100;
  
  for (let i = 0; i < LEAGUES.length - 1; i++) { // Skip TOTAL league
    const league = LEAGUES[i];
    const nextLeague = LEAGUES[i + 1];
    
    if (league.percentage === null) continue;
    if (nextLeague.percentage === null) continue;
    
    if (percentage > league.percentage) {
      return league;
    }
  }
  
  return LEAGUES[LEAGUES.length - 2]; // Return DUST league
}

// Function to calculate league statistics
async function calculateLeagueStats(
  holders: HexHolder[],
  supabase: any,
  date: string
) {
  // Calculate total supply
  const totalSupply = await getTotalSupply(supabase);
  const totalHolders = await getTotalHolders();

  // Get current data to use as last week's data
  const { data: currentData, error: currentError } = await supabase
    .from('league_hex')
    .select('league_name, user_holders')
    .eq('date', date);

  if (currentError) {
    console.error('Error fetching current data:', currentError);
  }

  const currentMap = new Map<string, number>(
    currentData?.map((d: { league_name: string; user_holders: number }) => [d.league_name, d.user_holders]) || []
  );

  // Calculate statistics for each league
  const leagueStats = LEAGUES.map(league => {
    if (league.name === 'TOTAL') {
      const lastWeekHolders = currentMap.get(league.name) || 0;
      return {
        league_name: league.name,
        percentage: null,
        all_holders: totalHolders,
        user_holders: totalHolders,
        last_week_holders: lastWeekHolders,
        holder_change: totalHolders - lastWeekHolders,
        date,
        timestamp: new Date().toISOString()
      };
    }

    const holdersInLeague = holders.filter(holder => {
      const holderLeague = getLeague(holder.balance, totalSupply);
      return holderLeague.name === league.name;
    });

    const userHolders = holdersInLeague.filter(h => !h.isContract);
    const lastWeekHolders = currentMap.get(league.name) || 0;
    const currentUserHolders = userHolders.length;

    // If we have no holders in our sample for this league threshold, mark it as N/A
    const hasHoldersInRange = holders.some(holder => {
      if (league.percentage === null) return false;
      const percentage = (holder.balance / totalSupply) * 100;
      const nextLeagueIndex = LEAGUES.findIndex(l => l.name === league.name) + 1;
      const nextLeague = LEAGUES[nextLeagueIndex];
      return percentage <= league.percentage && (!nextLeague || !nextLeague.percentage || percentage > nextLeague.percentage);
    });

    return {
      league_name: league.name,
      percentage: league.percentage,
      all_holders: hasHoldersInRange ? holdersInLeague.length : -1,
      user_holders: hasHoldersInRange ? currentUserHolders : -1,
      last_week_holders: lastWeekHolders,
      holder_change: hasHoldersInRange ? currentUserHolders - lastWeekHolders : -1,
      date,
      timestamp: new Date().toISOString()
    };
  });

  // Store league statistics
  const { error: statsError } = await supabase
    .from('league_hex')
    .upsert(leagueStats, {
      onConflict: 'league_name,date'
    });

  if (statsError) {
    throw statsError;
  }

  console.log('League statistics stored successfully');
}

async function fetchAllHexHolders(): Promise<HexHolder[]> {
  const baseUrl = `https://api.scan.pulsechain.com/api/v2/tokens/${HEX_CONTRACT}/holders`;
  const holders: HexHolder[] = [];
  let hasNextPage = true;
  let nextPageParams = {};
  let pageCount = 0;
  const maxPages =200; // Fetch 500 holders (50 per page * 50 pages)
  const DELAY_BETWEEN_REQUESTS = 500; // Increased delay to 500ms
  let consecutive404s = 0; // Track consecutive 404 errors

  while (hasNextPage && pageCount < maxPages) {
    try {
      const queryParams = Object.keys(nextPageParams).length > 0
        ? '?' + new URLSearchParams(nextPageParams as Record<string, string>).toString()
        : '';
      
      console.log(`Fetching page ${pageCount + 1}...`);
      
      // Add retries for failed requests
      let retries = 3;
      let response;
      let got404 = false;
      
      while (retries > 0) {
        try {
          response = await fetch(baseUrl + queryParams);
          if (response.ok) {
            consecutive404s = 0; // Reset counter on successful request
            break;
          }
          
          if (response.status === 404) {
            got404 = true;
          }
          
          console.log(`Retry ${4-retries}/3: Got status ${response.status}, waiting before retry...`);
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s before retry
          retries--;
        } catch (error) {
          if (retries === 1) throw error; // Only throw on last retry
          console.log(`Retry ${4-retries}/3: Request failed, waiting before retry...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
          retries--;
        }
      }
      
      if (got404) {
        consecutive404s++;
        if (consecutive404s >= 3) {
          console.log('Got 3 consecutive 404s, assuming we have reached the end of available data');
          break;
        }
      }
      
      if (!response || !response.ok) {
        throw new Error(`HTTP error! status: ${response?.status}`);
      }
      
      const data = await response.json();
      
      if (!data?.items?.length) {
        hasNextPage = false;
        break;
      }

      const newHolders = data.items.map((item: any) => ({
        address: item.address.hash,
        isContract: item.address.is_contract,
        balance: Number(item.value) / Math.pow(10, HEX_DECIMALS)
      }));

      holders.push(...newHolders);
      nextPageParams = data.next_page_params;
      hasNextPage = !!nextPageParams;
      pageCount++;

      // Increased delay between requests to avoid rate limits
      if (hasNextPage) {
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_REQUESTS));
      }

      console.log(`Fetched ${holders.length} holders so far...`);
    } catch (error) {
      console.error('Error fetching HEX holders:', error);
      // Don't immediately fail on error, try to continue with next page
      if (nextPageParams) {
        console.log('Continuing to next page despite error...');
        pageCount++;
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_REQUESTS * 2));
        continue;
      }
      throw error;
    }
  }

  console.log(`Completed fetching ${holders.length} total holders`);
  return holders;
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

    console.log('Starting daily HEX holders collection...');
    
    // Get current date info
    const now = new Date();
    const timestamp = now.toISOString();
    const date = now.toISOString().split('T')[0]; // YYYY-MM-DD format

    // Fetch all holders
    const holders = await fetchAllHexHolders();
    console.log(`Fetched ${holders.length} total holders`);

    // Prepare data for insertion
    const holderRecords: Array<{
      address: string;
      is_contract: boolean;
      balance: number;
      date: string;
      timestamp: string;
    }> = holders.map(holder => ({
      address: holder.address,
      is_contract: holder.isContract,
      balance: holder.balance,
      date,
      timestamp
    }));

    // Validate data before insertion
    console.log('Validating data...');
    const invalidRecords = holderRecords.filter(record => 
      !record.address || 
      record.is_contract === undefined || 
      record.balance === undefined ||
      !record.date ||
      !record.timestamp
    );
    
    if (invalidRecords.length > 0) {
      console.error(`Found ${invalidRecords.length} invalid records:`, invalidRecords.slice(0, 3));
      throw new Error(`Data validation failed: ${invalidRecords.length} invalid records found`);
    }
    
    console.log('Data validation passed');

    // Insert holder data in batches
    const batchSize = 1000;
    let totalUpserted = 0;
    
    for (let i = 0; i < holderRecords.length; i += batchSize) {
      const batch = holderRecords.slice(i, i + batchSize);
      const batchNum = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(holderRecords.length / batchSize);
      
      console.log(`Processing batch ${batchNum}/${totalBatches} (${batch.length} records)...`);
      
      try {
        // First check if table is empty
        const { data, error: countError } = await supabase
          .from('hex_holders')
          .select('id')
          .limit(1);

        if (countError) {
          throw countError;
        }

        const isEmpty = !data || data.length === 0;

        if (isEmpty) {
          // If table is empty, do a simple insert
          const { error: insertError } = await supabase
            .from('hex_holders')
            .insert(batch);

          if (insertError) {
            throw insertError;
          }
        } else {
          // If table has data, do an upsert
          const { error: upsertError } = await supabase
            .from('hex_holders')
            .upsert(batch, {
              onConflict: 'address',
              ignoreDuplicates: false
            });

          if (upsertError) {
            throw upsertError;
          }
        }
        
        totalUpserted += batch.length;
        console.log(`✅ Batch ${batchNum} processed successfully (${batch.length} records)`);
      } catch (error) {
        console.error(`Error processing batch ${batchNum}:`, error);
      }
      
      // Small delay between batches
      if (i + batchSize < holderRecords.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // Calculate and store league statistics
    console.log('Calculating league statistics...');
    await calculateLeagueStats(holders, supabase, date);
    
    const duration = (Date.now() - startTime) / 1000;
    console.log(`Successfully processed all ${totalUpserted} records`);
    
    // Summary statistics
    const totalBalance = holders.reduce((sum, holder) => sum + holder.balance, 0);
    const contractHolders = holders.filter(h => h.isContract).length;
    
    console.log(`=== FINAL SUMMARY ===`);
    console.log(`Total holders processed: ${holders.length}`);
    console.log(`Records saved to DB: ${totalUpserted}`);
    console.log(`Contract holders: ${contractHolders}`);
    console.log(`EOA holders: ${holders.length - contractHolders}`);
    console.log(`Total HEX held: ${totalBalance.toLocaleString()}`);
    console.log(`Execution time: ${duration.toFixed(2)}s`);
    
    return NextResponse.json({ 
      success: true,
      summary: {
        totalHolders: holders.length,
        recordsSaved: totalUpserted,
        contractHolders,
        eoaHolders: holders.length - contractHolders,
        totalBalance,
        executionTimeSeconds: parseFloat(duration.toFixed(2)),
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error in daily HEX holders cron:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 