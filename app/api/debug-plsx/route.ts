import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const today = new Date().toISOString().split('T')[0];
    
    // Get total supply
    const { data: supplyData, error: supplyError } = await supabase
      .from('daily_token_supplies')
      .select('total_supply_formatted')
      .eq('ticker', 'PLSX')
      .eq('chain', 369)
      .order('id', { ascending: false })
      .limit(1)
      .single();

    if (supplyError) {
      return NextResponse.json({ error: 'Supply fetch error', details: supplyError });
    }

    const totalSupply = parseFloat(supplyData.total_supply_formatted);

    // Get top 20 holders
    const { data: holdersData, error: holdersError } = await supabase
      .from('plsx_holders')
      .select('address, balance, is_contract')
      .eq('date', today)
      .order('balance', { ascending: false })
      .limit(20);

    if (holdersError) {
      return NextResponse.json({ error: 'Holders fetch error', details: holdersError });
    }

    // Calculate percentages and league assignments
    const results = holdersData?.map((holder, index) => {
      const percentage = (holder.balance / totalSupply) * 100;
      let league = 'Shell';
      
      if (percentage >= 10) league = 'Poseidon';
      else if (percentage >= 1) league = 'Whale';
      else if (percentage >= 0.1) league = 'Shark';
      else if (percentage >= 0.01) league = 'Dolphin';
      
      return {
        rank: index + 1,
        address: holder.address,
        balance: holder.balance,
        percentage: percentage,
        league: league,
        is_contract: holder.is_contract
      };
    }) || [];

    const poseidonCount = results.filter(r => r.league === 'Poseidon').length;

    return NextResponse.json({
      totalSupply: totalSupply,
      totalSupplyFormatted: totalSupply.toLocaleString(),
      totalHolders: holdersData?.length || 0,
      poseidonCount: poseidonCount,
      top20Holders: results
    });

  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 