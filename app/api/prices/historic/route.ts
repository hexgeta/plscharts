import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Create Supabase client with server-side env variables
const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_ANON_KEY || ''
)

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const symbol = searchParams.get('symbol')
    const startDate = searchParams.get('startDate')
    const field = searchParams.get('field')

    if (!symbol || !field) {
      return NextResponse.json(
        { error: 'Symbol and field parameters are required' },
        { status: 400 }
      )
    }

    let query = supabase
      .from('historic_prices')
      .select(`date, ${field}`)
      .not(field, 'is', null)
      .order('date', { ascending: true })

    if (startDate) {
      query = query.gte('date', startDate)
    }

    const { data, error } = await query

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json(
        { error: 'Database query failed' },
        { status: 500 }
      )
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 