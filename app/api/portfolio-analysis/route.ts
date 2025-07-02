import { NextRequest, NextResponse } from 'next/server'
import { generateText } from 'ai'
import { openai } from '@ai-sdk/openai'

// Simple in-memory rate limiting (use Redis in production)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

const RATE_LIMIT = 100 // requests per day
const RATE_LIMIT_WINDOW = 24 * 60 * 60 * 1000 // 24 hours in milliseconds

function getRateLimitKey(request: NextRequest): string {
  // Try to get a unique identifier for the client
  const forwarded = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')
  const ip = forwarded?.split(',')[0] || realIP || 'unknown'
  
  // Also include user agent for additional uniqueness
  const userAgent = request.headers.get('user-agent') || 'unknown'
  const fingerprint = `${ip}-${userAgent.slice(0, 50)}` // Truncate UA
  
  return fingerprint
}

function checkRateLimit(key: string): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now()
  const record = rateLimitMap.get(key)
  
  if (!record || now > record.resetTime) {
    // Reset or create new record
    const newRecord = { count: 1, resetTime: now + RATE_LIMIT_WINDOW }
    rateLimitMap.set(key, newRecord)
    return { allowed: true, remaining: RATE_LIMIT - 1, resetTime: newRecord.resetTime }
  }
  
  if (record.count >= RATE_LIMIT) {
    return { allowed: false, remaining: 0, resetTime: record.resetTime }
  }
  
  record.count++
  rateLimitMap.set(key, record)
  return { allowed: true, remaining: RATE_LIMIT - record.count, resetTime: record.resetTime }
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting check
    const rateLimitKey = getRateLimitKey(request)
    const { allowed, remaining, resetTime } = checkRateLimit(rateLimitKey)
    
    if (!allowed) {
      const resetDate = new Date(resetTime).toISOString()
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded', 
          message: `You've reached the daily limit of ${RATE_LIMIT} portfolio analyses. Try again after ${resetDate}`,
          resetTime: resetDate
        }, 
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': RATE_LIMIT.toString(),
            'X-RateLimit-Remaining': remaining.toString(),
            'X-RateLimit-Reset': resetTime.toString()
          }
        }
      )
    }

    const { portfolioData } = await request.json()
    
    if (!portfolioData) {
      return NextResponse.json({ error: 'Portfolio data is required' }, { status: 400 })
    }

    // Enhanced prompt with portfolio size context and 3rd person perspective
    const getPortfolioSize = (size: string) => {
      switch(size) {
        case 'whale': return 'whale-tier'
        case 'large': return 'substantial'
        case 'medium': return 'decent-sized'
        default: return 'small'
      }
    }

    const analysisPrompt = `This user has a ${getPortfolioSize(portfolioData.portfolioSize)} portfolio worth $${portfolioData.totalValue?.toLocaleString() || 'N/A'}.

Holdings breakdown: ${portfolioData.topHoldings?.map(h => `${h.symbol} (${h.percentage}%)`).join(', ') || 'Loading...'}

HEX Staking: ${portfolioData.activeStakes || 0} currently active stakes${portfolioData.endedStakes > 0 ? `, ${portfolioData.endedStakes} successfully completed` : ''}${portfolioData.earlyEndStakes > 0 ? `, ${portfolioData.earlyEndStakes} early ended (EES)` : ', no early ends'}. Average stake duration: ${Math.round((portfolioData.avgStakeDuration || 0) / 365 * 10) / 10} years${portfolioData.avgAPY ? `, ~${portfolioData.avgAPY}% APY` : ''}.

${portfolioData.isOGHexican ? `OG Status: Been staking since ${portfolioData.firstStakeYear} - original Hexican!` : portfolioData.firstStakeYear ? `Started staking in ${portfolioData.firstStakeYear}.` : ''}

Write a witty 2-3 sentence analysis starting with "This user" about their crypto behavior and strategy. Include actual numbers. Be humorous about any shitcoin dabbling, early ends, or diamond hands behavior.`

    console.log('=== PORTFOLIO ANALYSIS DEBUG ===')
    console.log('Portfolio Data:', JSON.stringify(portfolioData, null, 2))
    console.log('Analysis Prompt:', analysisPrompt)

    const { text: analysis } = await generateText({
      model: openai('o3-mini'),
      prompt: analysisPrompt,
      maxTokens: 400,
      temperature: 0.7,
      providerOptions: {
        openai: { 
          reasoningEffort: 'low' // Use low effort for faster responses
        }
      }
    })

    console.log('Final Analysis:', analysis)
    
    // Return response with rate limit headers
    return NextResponse.json(
      { analysis, prompt: analysisPrompt, portfolioData },
      {
        headers: {
          'X-RateLimit-Limit': RATE_LIMIT.toString(),
          'X-RateLimit-Remaining': remaining.toString(),
          'X-RateLimit-Reset': resetTime.toString()
        }
      }
    )
  } catch (error) {
    console.error('Portfolio analysis error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 