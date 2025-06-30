import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const batch = searchParams.get('batch') || '1'
  const test = searchParams.get('test') === 'true'
  
  const startTime = Date.now()
  
  // Simulate processing
  await new Promise(resolve => setTimeout(resolve, 100))
  
  const mockData = {
    success: true,
    batch: parseInt(batch),
    testMode: test,
    summary: {
      totalHolders: test ? 100 : 10000,
      recordsSaved: test ? 100 : 10000,
      contractHolders: test ? 15 : 1500,
      eoaHolders: test ? 85 : 8500,
      totalBalance: test ? 1000000 : 100000000,
      executionTimeSeconds: (Date.now() - startTime) / 1000,
      timestamp: new Date().toISOString()
    }
  }
  
  return NextResponse.json(mockData)
} 