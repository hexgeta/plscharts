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
    a: "0x444444444444c1a66f394025ac839a535246fcc8",
    dexs: "0xe1ef8b1bfe5a1dbb3fc2f0c3405f54a9e6f32840",
    ticker: "GENI",
    decimals: 9,
    name: "Genius"
  }, {
    chain: 369,
    a: "0x8c5eb0f7007c374d6fe14627259b99a5e9613c84",
    dexs: "0x1aa434f653232a35b0559d5c4b33ab7fbaad80d6",
    ticker: "CAVIAR",
    decimals: 18,
    name: "Caviar"
  },  {
    chain: 369,
    a: "0x8c4a50c87e348f602ac6a59f4da857ee23307a42",
    dexs: "0xe7726e023ae722ac180e7fcbd4bf028950fefa4e",
    ticker: "ICARUS",
    decimals: 18,
    name: "Icarus"
  }, {
    chain: 369,
    a: "0xb6bad00525221eb28eb911a0b1162a0709b4ce57",
    dexs: "0x3dceaf41a2f1d50adf09fc8adabaf37491d5f718",
    ticker: "HARD",
    decimals: 9,
    name: "DaiHard"
  }, {
    chain: 369,
    a: "0x401464296a7e0cd14d85ab6baf0dc91b5ad5ad1b",
    dexs: "0x5ce2e1b0d987e17ceec95363bd2097855b1940c1",
    ticker: "BRO",
    decimals: 18,
    name: "BROmance"
  }, {
    chain: 369,
    a: "0xa5beb85e5f82419ab6bd0c13f6c3f66bb95c79da",
    dexs: "0x5ac9ce15e67ac2c76c030b149eee4cc73e3238ae",
    ticker: "PEAR",
    decimals: 18,
    name: "Rick Ross Pear"
  }, {
    chain: 369,
    a: "0xabeb72f153e050b3f8cca3dd93fe1eead51123db",
    dexs: "0x7462c049c531e46530d66bb527b1865143100385",
    ticker: "CHIITAN",
    decimals: 18,
    name: "Chiitan"
  }, {
    chain: 369,
    a: "0x7e461d9b06e8b7a4806beb6b9c5c5cb44da3e555",
    dexs: "0xe2ad430832b86bbbf99c1a83a75b0b48dcf39af3",
    ticker: "COOKIES",
    decimals: 18,
    name: "Cookies"
  }, {
    chain: 369,
    a: "0x3cc6704b0902475587363defbd6dab2ec0581628",
    dexs: "0xec1415fdc0a7f2b8cbce45d183eb02b487db00f2",
    ticker: "PEACH",
    decimals: 18,
    name: "Freedom of Peach"
  }, {
    chain: 369,
    a: "0xa12e2661ec6603cbbb891072b2ad5b3d5edb48bd",
    dexs: "0x7c670cee36baf10ad0d547ec4c3c6b5aa32c1fd7",
    ticker: "PINU",
    decimals: 12,
    name: "Pulse Inu"
  }, {
    chain: 369,
    a: "0x43eaba2E2d2F32f1207A11a18679287Dc7700015",
    dexs: "",
    ticker: "RBC",
    decimals: 18,
    name: "Real BIG Coin"
  }, {
    chain: 369,
    a: "0xe83034a7a78fc148c69defebd6d4c80f8bb4f710",
    dexs: "0x709fc9d014ae3e6387e2856762f64ae341063065",
    ticker: "PINU2",
    decimals: 18,
    name: "Pulse Inu Puppy"
  }, {
    chain: 369,
    a: "0x9cc7437978255e2c38b0d3d4671fb9ac411a68ac",
    dexs: "0xf30034233d8da99aa61758b8acde1eedee8fb1f1",
    ticker: "DOGE",
    decimals: 18,
    name: "DOGE on Pulse"
  }, {
    chain: 369,
    a: "0x34f0915a5f15a66eba86f6a58be1a471fb7836a7",
    dexs: "0x8534edb4061c69317425ab3d93caea4d3cea4b15",
    ticker: "PLSD",
    decimals: 12,
    name: "PLSD on PulseChain"
  }, {
    chain: 369,
    a: "0x5ee84583f67d5ecea5420dbb42b462896e7f8d06",
    dexs: "0x894167362577ea6ec0ac01ab56a7b2d3946ead55",
    ticker: "PLSB",
    decimals: 12,
    name: "PLSB on PulseChain"
  }, {
    chain: 369,
    a: "0x347a96a5bd06d2e15199b032f46fb724d6c73047",
    dexs: "0xf6dbd79f24fa1c9c44999b707f0e0c3ff2e6e361",
    ticker: "ASIC",
    decimals: 12,
    name: "ASIC on PulseChain"
  }, {
    chain: 369,
    a: "0xsss",
    dexs: "0xe7726e023ae722ac180e7fcbd4bf028950fefa4e",
    ticker: "stICARUS",
    decimals: 18,
    name: "Staked Icarus"
  }, {
    chain: 369,
    a: "0xe101c848620e762ecb942356962dd415342b4feb",
    dexs: "0x6c4f0bd9eb4328490a5bb8e0b682e28db52df2b3",
    ticker: "LAUNCH",
    decimals: 18,
    name: "Pulse Launch"
  }, {
    chain: 369,
    a: "0x99F58b6979756fc129a33797eF796a6178D8A5De",
    dexs: "0x03bb886995f4F699dE817582859686388aCB1D56",
    ticker: "TFC",
    decimals: 18,
    name: "TFC"
  }, {
    chain: 369,
    a: "0x3D7eaf3a2406DFaD68be0dA504eCD690B80AAE48",
    dexs: null,
    ticker: "PLSCX",
    decimals: 18,
    name: "PLSCX"
  }, {
    chain: 369,
    a: "eee",
    dexs: "0x5137a308dbf822aae9fb34467633baaa516ed099",
    ticker: "stpCOM",
    decimals: 12,
    name: "Staked Communis on Pls"
  }, {
    chain: 369,
    a: "0xxx",
    dexs: "0x6d69654390c70d9e8814b04c69a542632dc93161",
    ticker: "stpLOAN",
    decimals: 18,
    name: "Staked LOAN on Pls"
  }, {
    chain: 369,
    a: "0xsss",
    dexs: "0x5f2d8624e6abea8f679a1095182f4bc84fe148e0",
    ticker: "stMINT",
    decimals: 18,
    name: "Staked Mintra"
  }, {
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

