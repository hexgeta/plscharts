import { NextApiRequest, NextApiResponse } from 'next'

const CACHE_DURATION = 500 // 500ms cache
let cachedData: any = null
let lastFetch = 0

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const now = Date.now()
  
  // Return cached data if it's fresh
  if (cachedData && (now - lastFetch) < CACHE_DURATION) {
    console.log('Returning cached price:', cachedData.price)
    return res.status(200).json(cachedData)
  }

  try {
    console.log('Fetching fresh price from DexScreener')
    // Fetch new data from DexScreener
    const response = await fetch(
      'https://api.dexscreener.com/latest/dex/pairs/pulsechain/0xf1f4ee610b2babb05c635f726ef8b0c568c8dc65'
    )
    const data = await response.json()
    
    if (!data.pairs?.[0]) {
      throw new Error('No pair data found')
    }

    // Format the response
    cachedData = {
      price: parseFloat(data.pairs[0].priceUsd),
      priceChange24h: parseFloat(data.pairs[0].priceChange.h24) / 100,
      lastUpdated: new Date(),
    }
    
    lastFetch = now
    console.log('New price fetched:', cachedData.price)
    
    res.status(200).json(cachedData)
  } catch (error) {
    console.error('Error fetching HEX price:', error)
    res.status(500).json({ error: 'Failed to fetch price data' })
  }
} 