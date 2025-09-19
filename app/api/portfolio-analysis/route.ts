import { NextRequest, NextResponse } from 'next/server'
import { generateText } from 'ai'
import { openai } from '@ai-sdk/openai'

// Remove edge runtime and force-dynamic exports
// export const runtime = 'edge'
// export const dynamic = 'force-dynamic'

// Simple in-memory rate limiting (use Redis in production)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

const RATE_LIMIT = 10 // requests per day
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
    // Basic validation
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({
        error: 'Configuration Error',
        message: 'OpenAI API key is not configured',
      }, { status: 500 })
    }

    const body = await request.json()
    if (!body?.portfolioData) {
      return NextResponse.json({
        error: 'Invalid Request',
        message: 'Portfolio data is required',
      }, { status: 400 })
    }

    const { portfolioData } = body

    // Construct the prompt
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

HEX History: This user has successfully completed all ${portfolioData.hexStakes || 0} of their stakes, showing a strong track record:
• ${portfolioData.endedStakes > 0 ? `${portfolioData.endedStakes} completed normally to full term` : '0 completed normally'}
• ${portfolioData.earlyEndStakes > 0 ? `${portfolioData.earlyEndStakes} ended early (EES)` : '0 ended early'}
• ${portfolioData.lateEndStakes > 0 ? `${portfolioData.lateEndStakes} ended late` : '0 ended late'}
• ${portfolioData.bpdStakes || 0} BPD stakes
Their completed stakes averaged ${Math.round((portfolioData.avgStakeDuration || 0) * 10) / 10} days${portfolioData.avgAPY ? ` with ~${portfolioData.avgAPY}% APY` : ''}.
${portfolioData.maxStakeLength ? `Longest completed stake was ${portfolioData.maxStakeLength} days.` : ''}
${portfolioData.isOGHexican ? `OG Status: Original Hexican - first stake in ${portfolioData.firstStakeYear}!` : portfolioData.firstStakeYear ? `Started staking in ${portfolioData.firstStakeYear}.` : ''}
After successfully completing all their stakes, they are now holding their HEX in liquid form.

Write a witty 2-3 sentence analysis starting with "This user" about their crypto behavior and strategy. Focus on their successful staking history - they completed ${portfolioData.hexStakes} stakes without any failures, preferred ${portfolioData.maxStakeLength}-day stakes, and are now holding liquid. Are they an OG Hexican? Include actual numbers and be humorous about their disciplined staking behavior and current liquid position.`

    try {
      // Use AI SDK to generate text with o3-mini
      const { text: analysis } = await generateText({
        model: openai('o3-mini'),
        prompt: analysisPrompt,
        providerOptions: {
          openai: { 
            reasoningEffort: 'medium',  // balanced approach
            temperature: 0.5,
            max_tokens: 500
          },
        },
      })

      if (!analysis) {
        return NextResponse.json({
          error: 'Invalid Response',
          message: 'AI returned an empty response',
        }, { status: 500 })
      }

      return NextResponse.json({ analysis, prompt: analysisPrompt, portfolioData })

    } catch (aiError) {
      return NextResponse.json({ 
        error: 'AI Generation Error',
        message: aiError instanceof Error ? aiError.message : 'Failed to generate analysis',
        details: aiError instanceof Error ? aiError.stack : undefined
      }, { status: 500 })
    }
  } catch (error) {
    return NextResponse.json({ 
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Failed to process request',
      details: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
} 