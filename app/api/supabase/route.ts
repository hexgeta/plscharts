import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Create Supabase client with server-side env variables
const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_ANON_KEY || ''
)

export async function GET() {
  try {
    // Example endpoint - modify based on your needs
    const { data, error } = await supabase
      .from('prices')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(1)

    if (error) throw error

    return NextResponse.json({ data })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
} 