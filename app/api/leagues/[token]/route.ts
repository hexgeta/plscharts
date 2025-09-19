import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Force dynamic rendering since we use request headers
export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const token = params.token.toLowerCase()
    
    // Validate token parameter
    const validTokens = ['hex', 'plsx', 'inc', 'hdrn', 'icsa', 'com']
    if (!validTokens.includes(token)) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 400 })
    }

    // Initialize Supabase client
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const tableName = `league_${token}`

    // Get the latest date from the league table
    const { data: latestDateData, error: latestDateError } = await supabase
      .from(tableName)
      .select('date')
      .order('date', { ascending: false })
      .limit(1)

    if (latestDateError) {
      throw latestDateError
    }

    if (!latestDateData || latestDateData.length === 0) {
      return NextResponse.json({ error: `No data available for ${token}` }, { status: 404 })
    }

    const latestDate = latestDateData[0].date

    // Get all league data for the latest date
    const { data: leagueData, error: leagueError } = await supabase
      .from(tableName)
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