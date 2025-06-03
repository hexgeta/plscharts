import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Force dynamic rendering since we use request headers
export const dynamic = 'force-dynamic';

interface ValidatorHistoryData {
  date: string;
  total_validators: number;
  active_validators: number;
  total_staked: string; // Changed to string for NUMERIC field
  total_staked_formatted: number; // in PLS
  withdrawal_addresses: number;
  average_per_address: string; // Changed to string for NUMERIC field
  average_per_address_formatted: number; // in PLS
  timestamp: string;
}

async function fetchValidatorData(): Promise<ValidatorHistoryData> {
  const response = await fetch(`${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'}/api/validators`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch validator data: ${response.status}`);
  }
  
  const data = await response.json();
  
  if (!data.success) {
    throw new Error('Validator API returned error');
  }
  
  const now = new Date();
  const timestamp = now.toISOString();
  const date = now.toISOString().split('T')[0]; // YYYY-MM-DD format
  
  // Calculate metrics with proper number handling
  const totalValidators = data.data.count || 0;
  const activeValidators = data.data.activeCount || 0;
  const totalStaked = Number(data.data.totalStaked) || 0; // Convert to proper number
  const totalStakedFormatted = totalStaked / 1e9; // Convert to PLS
  const withdrawalAddresses = data.data.groupedValidators?.length || 0;
  const averagePerAddress = withdrawalAddresses > 0 ? totalStaked / withdrawalAddresses : 0;
  const averagePerAddressFormatted = averagePerAddress / 1e9; // Convert to PLS
  
  console.log(`Validator metrics for ${date}:`);
  console.log(`- Total validators: ${totalValidators.toLocaleString()}`);
  console.log(`- Active validators: ${activeValidators.toLocaleString()}`);
  console.log(`- Total staked (raw): ${totalStaked}`);
  console.log(`- Total staked: ${totalStakedFormatted.toLocaleString()} PLS`);
  console.log(`- Withdrawal addresses: ${withdrawalAddresses.toLocaleString()}`);
  console.log(`- Average per address: ${averagePerAddressFormatted.toLocaleString()} PLS`);
  
  return {
    date,
    total_validators: totalValidators,
    active_validators: activeValidators,
    total_staked: totalStaked.toString(), // Convert to string for NUMERIC field
    total_staked_formatted: totalStakedFormatted,
    withdrawal_addresses: withdrawalAddresses,
    average_per_address: averagePerAddress.toString(), // Convert to string for NUMERIC field
    average_per_address_formatted: averagePerAddressFormatted,
    timestamp
  };
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

    console.log('Starting daily validator data collection...');
    
    // Fetch validator data
    const validatorData = await fetchValidatorData();
    
    console.log(`Validator data collection took ${Date.now() - startTime}ms`);
    
    // Save to Supabase using upsert
    console.log('Saving to Supabase...');
    console.log('Validator data to save:', JSON.stringify(validatorData, null, 2));
    
    const { data: upsertedData, error: upsertError } = await supabase
      .from('daily_validator_history')
      .upsert([validatorData], {
        onConflict: 'date',
        ignoreDuplicates: false
      });
    
    if (upsertError) {
      console.error('Error upserting validator data:', upsertError);
      throw new Error(`Failed to save validator data: ${upsertError.message}`);
    }
    
    console.log('Successfully saved validator data to database');
    
    const executionTime = Date.now() - startTime;
    
    console.log(`=== VALIDATOR CRON SUMMARY ===`);
    console.log(`Date: ${validatorData.date}`);
    console.log(`Total validators: ${validatorData.total_validators.toLocaleString()}`);
    console.log(`Active validators: ${validatorData.active_validators.toLocaleString()}`);
    console.log(`Total staked: ${validatorData.total_staked_formatted.toLocaleString()} PLS`);
    console.log(`Withdrawal addresses: ${validatorData.withdrawal_addresses.toLocaleString()}`);
    console.log(`Execution time: ${executionTime}ms`);
    
    return NextResponse.json({ 
      success: true,
      data: validatorData,
      summary: {
        date: validatorData.date,
        totalValidators: validatorData.total_validators,
        activeValidators: validatorData.active_validators,
        totalStakedPLS: validatorData.total_staked_formatted,
        withdrawalAddresses: validatorData.withdrawal_addresses,
        executionTimeMs: executionTime,
        timestamp: validatorData.timestamp
      }
    });
    
  } catch (error: any) {
    const executionTime = Date.now() - startTime;
    console.error('Validator cron job failed:', error);
    console.error('Execution time before failure:', executionTime, 'ms');
    
    return NextResponse.json(
      { 
        error: 'Failed to collect validator data', 
        details: error.message,
        executionTimeMs: executionTime
      },
      { status: 500 }
    );
  }
}