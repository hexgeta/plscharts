import { handler as cronHandler } from '@/pages/api/cron/oa-movement-cron'
import type { NextApiRequest, NextApiResponse } from 'next'

// This is a debug endpoint that wraps the cron handler
export default async function debugHandler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Not found' })
  }

  console.log('Debug endpoint called at:', new Date().toISOString())
  
  // Add the authorization header that Vercel would normally add
  req.headers.authorization = `Bearer ${process.env.CRON_SECRET}`
  
  // Call the actual cron handler
  return cronHandler(req, res)
} 