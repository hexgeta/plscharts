import type { NextApiRequest, NextApiResponse } from 'next'
import { Resend } from 'resend'

interface TokenConfig {
  id: string          // CoinGecko ID
  symbol: string      // Token symbol
  name: string        // Token name
  threshold: number   // Alert when price changes by this percentage
}

const MONITORED_TOKENS: TokenConfig[] = [
  {
    id: 'ethereum',
    symbol: 'ETH',
    name: 'Ethereum',
    threshold: 1 // 5% change
  },
  {
    id: 'hex',
    symbol: 'HEX',
    name: 'HEX',
    threshold: 1 // 5% change
  },
  {
    id: 'pulsechain',
    symbol: 'PLS',
    name: 'PulseChain',
    threshold: 1 // 5% change
  },
  {
    id: 'plsx',
    symbol: 'PLSX',
    name: 'PulseX',
    threshold: 1 // 5% change
  }
]

// Store last known prices
let lastPrices: { [key: string]: number } = {}

const resendApiKey = process.env.RESEND_API_KEY
const toEmail = process.env.TO_EMAIL
const fromEmail = process.env.FROM_EMAIL
const cronSecret = process.env.CRON_SECRET

async function fetchPrices(): Promise<{ [key: string]: { usd: number, usd_24h_change: number } }> {
  const ids = MONITORED_TOKENS.map(token => token.id).join(',')
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`
  
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error('Failed to fetch prices from CoinGecko')
  }
  
  return response.json()
}

function formatPriceChange(change: number): string {
  const direction = change > 0 ? '📈' : '📉'
  return `${direction} ${Math.abs(change).toFixed(2)}%`
}

function formatPrice(price: number): string {
  if (price < 0.01) {
    return price.toFixed(8)
  } else if (price < 1) {
    return price.toFixed(4)
  } else {
    return price.toFixed(2)
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  console.log('Price alert cron started at:', new Date().toISOString())

  // Check for authentication
  const authHeader = req.headers.authorization
  if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
    console.error('Authentication failed')
    return res.status(401).json({ message: 'Unauthorized' })
  }

  if (!resendApiKey || !toEmail || !fromEmail) {
    console.error('Missing required environment variables')
    return res.status(500).json({ message: 'Missing required environment variables' })
  }

  try {
    const prices = await fetchPrices()
    const significantChanges: { token: TokenConfig, currentPrice: number, change24h: number }[] = []

    // Check each token for significant price changes
    for (const token of MONITORED_TOKENS) {
      const priceData = prices[token.id]
      
      if (!priceData?.usd || priceData?.usd_24h_change === undefined) {
        console.warn(`No price data for ${token.name}`)
        continue
      }

      const currentPrice = priceData.usd
      const change24h = priceData.usd_24h_change

      // Check if 24h change exceeds threshold
      if (Math.abs(change24h) >= token.threshold) {
        significantChanges.push({
          token,
          currentPrice,
          change24h
        })
      }
    }

    // If we found significant changes, send an email
    if (significantChanges.length > 0) {
      const currentTime = new Date().toLocaleString('en-US', {
        timeZone: 'America/New_York',
        hour12: true,
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: 'numeric'
      })

      const resend = new Resend(resendApiKey)
      
      const emailContent = `
        <h2>🚨 Significant 24h Price Changes Detected</h2>
        <p><strong>Time:</strong> ${currentTime}</p>
        <div style="margin-top: 20px;">
          ${significantChanges.map(({ token, currentPrice, change24h }) => `
            <div style="margin-bottom: 20px; padding: 15px; border: 1px solid #eee; border-radius: 5px;">
              <h3>${token.name} (${token.symbol})</h3>
              <p><strong>Current Price:</strong> $${formatPrice(currentPrice)}</p>
              <p><strong>24h Change:</strong> ${formatPriceChange(change24h)}</p>
            </div>
          `).join('')}
        </div>
        <p style="margin-top: 20px;">
          <a href="https://www.coingecko.com" style="color: #0066cc;">View on CoinGecko</a>
        </p>
      `

      const emailResponse = await resend.emails.send({
        from: fromEmail,
        to: toEmail,
        subject: `🚨 24h Crypto Price Alert - ${currentTime}`,
        html: emailContent
      })

      console.log('Email sent successfully:', emailResponse)

      return res.status(200).json({
        message: 'Price changes detected and email sent',
        changes: significantChanges,
        response: emailResponse
      })
    }

    // If no significant changes, just return success
    return res.status(200).json({
      message: 'Check completed, no significant price changes',
      changes: 0
    })

  } catch (error) {
    console.error('Error in price alert cron:', error)
    return res.status(500).json({ message: 'Failed to process price alerts', error: error.message })
  }
} 