import type { NextApiRequest, NextApiResponse } from 'next';
import path from 'path';
import fs from 'fs';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const dataPath = path.join(process.cwd(), 'public', 'data2.json');
    const jsonData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    res.status(200).json(jsonData);
  } catch (error) {
    console.error('Error loading data:', error);
    res.status(500).json({ error: 'Failed to load data' });
  }
} 