import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const symbol = searchParams.get('symbol')
  const field = searchParams.get('field')

  if (!symbol || !field) {
    return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
  }

  try {
    // Your existing logic to fetch historic prices
    // For now, return mock data
    return NextResponse.json({
      data: [
        { date: new Date().toISOString(), [field]: "0.0001" }
      ]
    })
  } catch (error) {
    console.error('Error fetching historic prices:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 