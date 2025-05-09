import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '@/supabaseClient';
import { calculateTokenData } from '../tokens2/index';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Verify cron secret to ensure this is called by Vercel
    if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!supabaseAdmin) {
      throw new Error('Supabase admin client is not available');
    }

    // Calculate token data
    const data = await calculateTokenData();

    // Store the calculated data in Supabase
    const { error } = await supabaseAdmin
      .from('token_data')
      .upsert({
        id: 'latest',
        data,
        updated_at: new Date().toISOString()
      });

    if (error) throw error;

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Cron job failed:', error);
    return res.status(500).json({ error: 'Failed to update token data' });
  }
} 