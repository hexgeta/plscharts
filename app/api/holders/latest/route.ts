import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Force dynamic rendering since we use request headers
export const dynamic = 'force-dynamic'

interface HexHolder {
  address: string;
  isContract: boolean;
  balance: number;
  date: string;
  timestamp: string;
}

export async function GET() {
  try {
    // Initialize Supabase client
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get the latest date from the league_hex table
    const { data: latestDateData, error: latestDateError } = await supabase
      .from('league_hex')
      .select('date')
      .order('date', { ascending: false })
      .limit(1)

    if (latestDateError) {
      throw latestDateError
    }

    if (!latestDateData || latestDateData.length === 0) {
      return NextResponse.json({ error: 'No data available' }, { status: 404 })
    }

    const latestDate = latestDateData[0].date

    // Get all league data for the latest date
    const { data: leagueData, error: leagueError } = await supabase
      .from('league_hex')
      .select('*')
      .eq('date', latestDate)
      .order('percentage', { ascending: false, nullsFirst: false })

    if (leagueError) {
      throw leagueError
    }

    return NextResponse.json({ data: leagueData })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch league data' },
      { status: 500 }
    )
  }
} 