import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Force dynamic rendering since we use request headers
export const dynamic = 'force-dynamic';

const HEX_CONTRACT = '0x2b591e99afE9f32eAA6214f7B7629768c40Eeb39';
const HEX_DECIMALS = 8;

interface HexHolder {
  address: string;
  isContract: boolean;
  balance: number;
}

async function fetchHexHoldersBatch2(): Promise<HexHolder[]> {
  const baseUrl = `https://api.scan.pulsechain.com/api/v2/tokens/${HEX_CONTRACT}/holders`;
  const holders: HexHolder[] = [];
  let hasNextPage = true;
  let nextPageParams = {};
  let pageCount = 0;
  const startPage = 251; // Start from page 501
  const maxPages = 250; // Fetch another 500 pages (pages 501-1000)
  const DELAY_BETWEEN_REQUESTS = 500; // Same delay as batch 1
  let consecutive404s = 0;

  console.log(`Starting batch 2: fetching pages ${startPage} to ${startPage + maxPages - 1}`);

  // Skip to page 501 by making initial requests to get to the right pagination point
  console.log('Skipping to page 501...');
  for (let i = 0; i < startPage - 1; i++) {
    try {
      const queryParams = Object.keys(nextPageParams).length > 0
        ? '?' + new URLSearchParams(nextPageParams as Record<string, string>).toString()
        : '';
      
      if (i % 100 === 0) {
        console.log(`Skipping page ${i + 1}/${startPage - 1}...`);
      }
      
      const response = await fetch(baseUrl + queryParams);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      if (!data?.next_page_params) {
        console.log('Reached end of data while skipping to start page');
        return [];
      }
      
      nextPageParams = data.next_page_params;
      
      // Small delay to avoid rate limits during skipping
      await new Promise(resolve => setTimeout(resolve, 50));
    } catch (error) {
      console.error(`Error while skipping to page ${i + 1}:`, error);
      throw error;
    }
  }

  console.log(`Successfully skipped to page ${startPage}, starting collection...`);

  // Now collect the actual data starting from page 1001
  while (hasNextPage && pageCount < maxPages) {
    try {
      const queryParams = Object.keys(nextPageParams).length > 0
        ? '?' + new URLSearchParams(nextPageParams as Record<string, string>).toString()
        : '';
      
      const currentPageNumber = startPage + pageCount;
      console.log(`Fetching page ${currentPageNumber}...`);
      
      // Add retries for failed requests
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

      if (hasNextPage) {
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_REQUESTS));
      }

      console.log(`Fetched ${holders.length} holders so far...`);
    } catch (error) {
      console.error('Error fetching HEX holders in batch 2:', error);
      if (nextPageParams) {
        console.log('Continuing to next page despite error...');
        pageCount++;
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_REQUESTS * 2));
        continue;
      }
      throw error;
    }
  }

  console.log(`Batch 2 completed: fetched ${holders.length} total holders from pages ${startPage} to ${startPage + pageCount - 1}`);
  return holders;
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Initialize Supabase client
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    console.log('Starting daily HEX holders collection - BATCH 2...');
    
    // Get current date info
    const now = new Date();
    const timestamp = now.toISOString();
    const date = now.toISOString().split('T')[0];

    // Check if batch 1 has completed
    console.log('Checking if batch 1 has completed...');
    const { data: batch1Data, error: batch1Error } = await supabase
      .from('hex_holders')
      .select('address')
      .eq('date', date)
      .limit(1);

    if (batch1Error) {
      console.error('Error checking batch 1 completion:', batch1Error);
      return NextResponse.json({ error: 'Failed to verify batch 1 completion' }, { status: 500 });
    }

    if (!batch1Data || batch1Data.length === 0) {
      console.log('Batch 1 has not completed yet. Batch 2 will not run.');
      return NextResponse.json({ 
        success: false, 
        message: 'Batch 1 has not completed yet. Run batch 1 first.' 
      });
    }

    console.log('Batch 1 confirmed completed. Starting batch 2...');

    // Fetch holders for batch 2
    const holders = await fetchHexHoldersBatch2();
    console.log(`Batch 2 fetched ${holders.length} total holders`);

    if (holders.length === 0) {
      console.log('No additional holders found in batch 2');
      return NextResponse.json({ 
        success: true,
        message: 'No additional holders found in batch 2',
        summary: {
          totalHolders: 0,
          recordsSaved: 0,
          contractHolders: 0,
          eoaHolders: 0,
          totalBalance: 0,
          executionTimeSeconds: (Date.now() - startTime) / 1000,
          timestamp: new Date().toISOString()
        }
      });
    }

    // Prepare data for simple insertion (no last_week_balance yet)
    const holderRecords = holders.map(holder => ({
      address: holder.address,
      is_contract: holder.isContract,
      balance: holder.balance,
      last_week_balance: null, // Will be set in cleanup step
      date,
      timestamp
    }));

    // Validate data
    console.log('Validating batch 2 data...');
    const invalidRecords = holderRecords.filter(record => 
      !record.address || 
      record.is_contract === undefined || 
      record.balance === undefined ||
      !record.date ||
      !record.timestamp
    );
    
    if (invalidRecords.length > 0) {
      console.error(`Found ${invalidRecords.length} invalid records in batch 2:`, invalidRecords.slice(0, 3));
      throw new Error(`Batch 2 data validation failed: ${invalidRecords.length} invalid records found`);
    }
    
    console.log('Batch 2 data validation passed');

    // Insert holder data in batches
    const batchSize = 1000;
    let totalInserted = 0;
    
    for (let i = 0; i < holderRecords.length; i += batchSize) {
      const batch = holderRecords.slice(i, i + batchSize);
      const batchNum = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(holderRecords.length / batchSize);
      
      console.log(`Processing batch 2 DB batch ${batchNum}/${totalBatches} (${batch.length} records)...`);
      
      try {
        // Simple insert
        const { error: insertError } = await supabase
          .from('hex_holders')
          .insert(batch);

        if (insertError) {
          throw insertError;
        }
        
        totalInserted += batch.length;
        console.log(`✅ Batch 2 DB batch ${batchNum} processed successfully (${batch.length} records)`);
      } catch (error) {
        console.error(`Error in batch 2 DB batch ${batchNum}:`, error);
        throw error;
      }
      
      // Small delay between DB batches
      if (i + batchSize < holderRecords.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    console.log(`Batch 2 successfully inserted ${totalInserted} records`);

    // === CLEANUP PHASE: Match last week's balances and delete old records ===
    console.log('Starting cleanup phase: matching last week balances and removing old data...');
    
    const lastWeekDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    console.log(`Fetching last week's data from ${lastWeekDate}...`);
    
    // Get last week's data
    const { data: lastWeekData, error: lastWeekError } = await supabase
      .from('hex_holders')
      .select('address, balance')
      .eq('date', lastWeekDate);

    if (lastWeekError) {
      console.error('Error fetching last week data:', lastWeekError);
    } else {
      console.log(`Found ${lastWeekData?.length || 0} holders from last week for comparison`);
      
      if (lastWeekData && lastWeekData.length > 0) {
        // Create a map for fast lookup
        const lastWeekMap = new Map<string, number>(
          lastWeekData.map((item: { address: string; balance: number }) => [item.address, item.balance])
        );

        // Update current week's records with last_week_balance
        console.log('Updating current records with last week balances...');
        let updateCount = 0;
        const updateBatchSize = 1000;
        
        // Get all current week addresses to update
        const { data: currentWeekAddresses, error: currentError } = await supabase
          .from('hex_holders')
          .select('address')
          .eq('date', date);

        if (currentError) {
          console.error('Error fetching current week addresses:', currentError);
        } else if (currentWeekAddresses) {
          // Process updates in batches
          for (let i = 0; i < currentWeekAddresses.length; i += updateBatchSize) {
            const addressBatch = currentWeekAddresses.slice(i, i + updateBatchSize);
            
            for (const { address } of addressBatch) {
              const lastWeekBalance = lastWeekMap.get(address);
              if (lastWeekBalance !== undefined) {
                const { error: updateError } = await supabase
                  .from('hex_holders')
                  .update({ last_week_balance: lastWeekBalance })
                  .eq('address', address)
                  .eq('date', date);

                if (updateError) {
                  console.error(`Error updating last_week_balance for ${address}:`, updateError);
                } else {
                  updateCount++;
                }
              }
            }
            
            if (i % 5000 === 0) {
              console.log(`Updated ${updateCount} records so far...`);
            }
          }
        }
        
        console.log(`Successfully updated ${updateCount} records with last week balances`);
      }
    }

    // Delete last week's records
    console.log(`Deleting old records from ${lastWeekDate}...`);
    const { error: deleteError, count: deletedCount } = await supabase
      .from('hex_holders')
      .delete()
      .eq('date', lastWeekDate);

    if (deleteError) {
      console.error('Error deleting last week data:', deleteError);
    } else {
      console.log(`Successfully deleted ${deletedCount || 0} old records from ${lastWeekDate}`);
    }

    const duration = (Date.now() - startTime) / 1000;
    
    // Summary statistics
    const totalBalance = holders.reduce((sum, holder) => sum + holder.balance, 0);
    const contractHolders = holders.filter(h => h.isContract).length;
    
    console.log(`=== BATCH 2 FINAL SUMMARY ===`);
    console.log(`Total holders processed: ${holders.length}`);
    console.log(`Records saved to DB: ${totalInserted}`);
    console.log(`Contract holders: ${contractHolders}`);
    console.log(`EOA holders: ${holders.length - contractHolders}`);
    console.log(`Total HEX held: ${totalBalance.toLocaleString()}`);
    console.log(`Cleanup completed: updated balances and deleted old records`);
    console.log(`Execution time: ${duration.toFixed(2)}s`);
    
    return NextResponse.json({ 
      success: true,
      summary: {
        totalHolders: holders.length,
        recordsSaved: totalInserted,
        contractHolders,
        eoaHolders: holders.length - contractHolders,
        totalBalance,
        cleanupCompleted: true,
        executionTimeSeconds: parseFloat(duration.toFixed(2)),
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error in daily HEX holders cron - BATCH 2:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 