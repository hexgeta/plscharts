import type { NextApiRequest, NextApiResponse } from 'next';

const BANKX_CONTRACT = '0x2b591e99afE9f32eAA6214f7B7629768c40Eeb39';
const TARGET_ADDRESS = '0x705C053d69eB3B8aCc7C404690bD297700cCf169';
const USDC_CONTRACT = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY;

let cache: {
  data: { ehex: number; eth: number; usdc: number } | null;
  timestamp: number;
} = { data: null, timestamp: 0 };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const now = Date.now();
  if (cache.data && now - cache.timestamp < 60_000) {
    return res.status(200).json(cache.data);
  }
  let ehex = 0, eth = 0, usdc = 0;
  try {
    // eHEX
    const ehexUrl = `https://api.etherscan.io/api?module=account&action=tokenbalance&contractaddress=${BANKX_CONTRACT}&address=${TARGET_ADDRESS}&tag=latest&apikey=${ETHERSCAN_API_KEY}`;
    const ehexRes = await fetch(ehexUrl);
    const ehexData = await ehexRes.json();
    ehex = ehexData.status === '1' && ehexData.result ? Number(ehexData.result) / 1e8 : 0;
  } catch {}
  try {
    // ETH
    const ethUrl = `https://api.etherscan.io/api?module=account&action=balance&address=${TARGET_ADDRESS}&tag=latest&apikey=${ETHERSCAN_API_KEY}`;
    const ethRes = await fetch(ethUrl);
    const ethData = await ethRes.json();
    eth = ethData.status === '1' && ethData.result ? Number(ethData.result) / 1e18 : 0;
  } catch {}
  try {
    // USDC
    const usdcUrl = `https://api.etherscan.io/api?module=account&action=tokenbalance&contractaddress=${USDC_CONTRACT}&address=${TARGET_ADDRESS}&tag=latest&apikey=${ETHERSCAN_API_KEY}`;
    const usdcRes = await fetch(usdcUrl);
    const usdcData = await usdcRes.json();
    usdc = usdcData.status === '1' && usdcData.result ? Number(usdcData.result) / 1e6 : 0;
  } catch {}
  const result = { ehex, eth, usdc };
  cache = { data: result, timestamp: now };
  res.status(200).json(result);
} 