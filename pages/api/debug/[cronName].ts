import { handler as oaMovementHandler } from '@/pages/api/cron/oa-movement-cron'
import { handler as bankxMovementHandler } from '@/pages/api/cron/bankx-movement-cron'
import cryptoPriceAlertsHandler from '@/pages/api/cron/crypto-price-alerts'
import handler from '@/pages/api/cron/crypto-price-tweets'
import type { NextApiRequest, NextApiResponse } from 'next'

const handlers = {
  'oa-movement-cron': oaMovementHandler,
  'bankx-movement-cron': bankxMovementHandler,
  'crypto-price-alerts': cryptoPriceAlertsHandler,
  'crypto-price-tweets': handler
}

// This is a debug endpoint that wraps any cron handler
export default async function debugHandler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Not found' })
  }

  // Get the cron job name from the URL path
  const cronName = req.query.cronName as string

  if (!cronName) {
    return res.status(400).json({ 
      error: 'Missing cron name in URL',
      availableEndpoints: Object.keys(handlers).map(name => `/api/debug/${name}`)
    })
  }

  const handler = handlers[cronName]
  if (!handler) {
    return res.status(400).json({ 
      error: `Invalid cron name: ${cronName}`,
      availableEndpoints: Object.keys(handlers).map(name => `/api/debug/${name}`)
    })
  }

  console.log(`Debug endpoint called for ${cronName} at:`, new Date().toISOString())
  
  // Add the authorization header that Vercel would normally add
  req.headers.authorization = `Bearer ${process.env.CRON_SECRET}`
  
  // Call the actual cron handler
  return handler(req, res)
} 