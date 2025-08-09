import { PairData } from '@/types/crypto'

export interface TokenConfig {
  chain: number
  a: string
  dexs: string | string[]
  ticker: string
  decimals: number
  name: string
  origin?: [number, string]
  supply?: number
  type?: "lp" | "token"
  platform?: string
}

export const MORE_COINS = [
  {
    "chain": 369,
    "a": "0x6Afd30110e9fF1b29dB3c4DAf31EF0045a6552cB",
    "dexs": "",
    "ticker": "YEET",
    "decimals": 18,
    "name": "YEET",
  }, {
    "chain": 369,
    "name": "B9",
    "a": "0xE676a1E969Feaef164198496bd787e0269f7b237",
    "ticker": "B9",
    "decimals": 8,
  }, {
    chain: 369,
    a: "0xb55ee890426341fe45ee6dc788d2d93d25b59063",
    dexs: "0xeffb56e3402f1993a34887eecaaa3d63da8e3f85",
    ticker: "LOVE",
    decimals: 18,
    name: "Love.io"
  }, {
    chain: 369,
    a: "0xc59be55d22cb7967ee95e5be0770e263ee014f78",
    dexs: "0x2eba3cf4872aa3b6fa88a53de1eb0cb6802f8a2d",
    ticker: "OPHIR",
    decimals: 18,
    name: "Ophir"
  }, {
    chain: 369,
    a: "0xbd63fa573a120013804e51b46c56f9b3e490f53c",
    dexs: "0x4581e25b434c1ced7a93449b229469f03ca4451e",
    ticker: "SOIL",
    decimals: 18,
    name: "SUN Minimeal (New)"
  }, {
    chain: 369,
    a: "0x697fc467720b2a8e1b2f7f665d0e3f28793e65e8",
    dexs: "0xb2045a428b6661e7e16fa1aecd77ec03912828c7",
    ticker: "A1A",
    decimals: 18,
    name: "TokenA1A"
  }, {
    chain: 369,
    a: "0x0b1307dc5d90a0b60be18d2634843343ebc098af",
    dexs: "0xac73dcc5b4410fad1077d0b0b1459e1e6dbce736",
    ticker: "LEGAL",
    decimals: 18,
    name: "Legal"
  }, {
    chain: 369,
    a: "0xdf6a16689a893095c721542e5d3ce55bbcc23ac6",
    dexs: "0x5383c25d3d86070311946812d022dc0420eed4cb",
    ticker: "TWO",
    decimals: 18,
    name: "2"
  }, {
    chain: 369,
    a: "0xde65090088df0b2d80a5ec6a7b56ece36ee83ce8",
    dexs: "0x8bc1d454542265fc82a23750696f770634e92bf9",
    ticker: "POPPY",
    decimals: 18,
    name: "Poppy"
  }, {
    chain: 369,
    a: "0xc91562626b9a697af683555da9946986278ac9a5",
    dexs: "0x2eff73dca3edb60019834a21758a468cbb22eb4c",
    ticker: "TYRH",
    decimals: 18,
    name: "TYRH"
  }, {
    chain: 369,
    a: "0xa685c45fd071df23278069db9137e124564897d0",
    dexs: "0x39211d8120de9fb5d56e2e8cbeed726edd252eff",
    ticker: "PLN",
    decimals: 18,
    name: "PulseLN Founder Token"
  }, {
    chain: 369,
    a: "0xeb2ceed77147893ba8b250c796c2d4ef02a72b68",
    dexs: "0x25d240831a9c0cb981506538e810d32487d291af",
    ticker: "PDRIP",
    decimals: 18,
    name: "Pulse Drip"
  }, {
    chain: 369,
    a: "0xc589905ef2c8892af8ecef36b1190cd0141e3199",
    dexs: "0x9030a2cb6e52f523c91d3ae8fbd7ffa23b8737ba",
    ticker: "H2O",
    decimals: 18,
    name: "Pulse Drip H2O"
  }, {
    chain: 369,
    a: "0x5a9780bfe63f3ec57f01b087cd65bd656c9034a8",
    dexs: "0x5137a308dbf822aae9fb34467633baaa516ed099",
    ticker: "stpCOM",
    decimals: 12,
    name: "Staked Communis on Pls"
  },  {
    chain: 1,
    a: "",
    dexs: "",
    ticker: "steCOM",
    decimals: 12,
    name: "Staked Communis on Eth"
    }
];

export const API_ENDPOINTS = {
  historic_pulsechain: 'https://hexdailystats.com/fulldatapulsechain',
  historic_ethereum: 'https://hexdailystats.com/fulldata',
  livedata: 'https://hexdailystats.com/livedata'
}

// LP Token detection is now handled via the `type: "lp"` field in TOKEN_CONSTANTS
// To add a new LP token:
// 1. Add the token to TOKEN_CONSTANTS with type: "lp" and platform: "PLSX V2" 
// 2. The Portfolio component will automatically detect and price it

const getLogoPath = (ticker: string): string | null => {
  // Remove chain prefixes if they exist
  const cleanTicker = ticker.replace(/^[ep]/, '');
  
  // Try different paths
  const paths = [
    `/coin-logos/${cleanTicker}.svg`,
    `/coin-logos/${ticker}.svg`
  ];
  
  // Return the first path that exists
  return paths[0]; // For now return first path, we'll validate existence later
}

