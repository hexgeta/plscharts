import { NextApiRequest, NextApiResponse } from 'next'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only show this in development
  if (process.env.NODE_ENV !== 'development') {
    return res.status(404).json({ error: 'Not found' })
  }

  const envVars = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'set' : 'not set',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'set' : 'not set',
    NODE_ENV: process.env.NODE_ENV,
  }

  res.status(200).json({
    envVars,
    allKeys: Object.keys(process.env).filter(key => key.includes('SUPABASE'))
  })
} 