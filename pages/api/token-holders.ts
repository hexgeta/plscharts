import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { contractAddress } = req.query;

  if (!contractAddress) {
    return res.status(400).json({ error: 'Contract address is required' });
  }

  try {
    const response = await fetch(
      `https://scan.pulsechain.com/api?module=token&action=tokenholderlist&contractaddress=${contractAddress}&page=1&offset=100`
    );

    if (!response.ok) {
      throw new Error(`PulseChain API error: ${response.status}`);
    }

    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    console.error('Error fetching token holders:', error);
    res.status(500).json({ error: 'Failed to fetch token holders' });
  }
} 