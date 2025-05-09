import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '@/supabaseClient';

export const config = {
  api: {
    externalResolver: true,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { data, error } = await supabaseAdmin
      .from('token_data')
      .select('*')
      .eq('id', 'latest')
      .single();

    if (error) {
      throw error;
    }

    return res.status(200).json({
      updated_at: data.updated_at,
      data: data.data
    });
  } catch (error) {
    console.error('Failed to fetch token data:', error);
    return res.status(500).json({ error: 'Failed to fetch token data' });
  }
} 