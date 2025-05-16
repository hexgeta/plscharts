import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// Log environment variables (masking sensitive data)
console.log('[Historic API] Supabase URL:', process.env.SUPABASE_URL ? '✓ Found' : '✗ Missing')
console.log('[Historic API] Supabase Anon Key:', process.env.SUPABASE_ANON_KEY ? '✓ Found' : '✗ Missing')

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
)

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const symbol = searchParams.get('symbol')
  const field = searchParams.get('field')

  console.log('[Historic API] Request:', { symbol, field })

  if (!symbol || !field) {
    return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
  }

  try {
    console.log('[Historic API] Querying Supabase for:', field)
    
    // Fetch all data for this token, matching the original query
    const { data: rows, error } = await supabase
      .from('historic_prices')
      .select(`date, ${field}`)
      .not(field, 'is', null)
      .order('date', { ascending: true })

    if (error) {
      console.error('[Historic API] Supabase Error:', error)
      throw error
    }

    if (!rows || rows.length === 0) {
      console.log('[Historic API] No data found')
      return NextResponse.json({ data: null })
    }

    // Parse dates and prices exactly as before
    const parsed = rows.map((row: any) => ({
      date: new Date(row.date),
      price: parseFloat(row[field]),
    })).filter((row: any) => !isNaN(row.price))

    if (parsed.length === 0) {
      console.log('[Historic API] No valid data after parsing')
      return NextResponse.json({ data: null })
    }

    console.log('[Historic API] Success, returned rows:', parsed.length)
    return NextResponse.json({ data: rows })
  } catch (error) {
    console.error('[Historic API] Error fetching historic prices:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 