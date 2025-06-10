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
}

export const TOKEN_CONSTANTS = [{
  chain: 1,
  a: "0x0",
  dexs: "0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640",
  ticker: "ETH",
  decimals: 18,
  name: "Ethereum"
}, {
  chain: 1,
  a: "0x3819f64f282bf135d62168c1e513280daf905e06",
  dexs: "0x035a397725d3c9fc5ddd3e56066b7b64c749014e",
  ticker: "eHDRN",
  decimals: 9,
  name: "Hedron on Ethereum"
}, {
  chain: 1,
  a: "0xfc4913214444af5c715cc9f7b52655e788a569ed",
  dexs: "0xbaaf3b7a0b9de67de3097420d31800a885db6b41",
  ticker: "eICSA",
  decimals: 9,
  name: "ICSA on Ethereum"
}, {
  chain: 1,
  a: "0xe9f84d418b008888a992ff8c6d22389c2c3504e0",
  dexs: "0xe181f3d1cf81c94d770768d48d42d07a9e9819c7",
  ticker: "eBASE",
  decimals: 8,
  name: "BASE on Ethereum",
  supply: 70668766.59912861
}, {
  chain: 1,
  a: "0xf55cd1e399e1cc3d95303048897a680be3313308",
  dexs: ["0x0f3c6134f4022d85127476bc4d3787860e5c5569"],
  ticker: "eTRIO",
  decimals: 8,
  name: "TRIO on Ethereum",
  supply: 69617911.47775
}, {
  chain: 1,
  a: "0x6b0956258ff7bd7645aa35369b55b61b8e6d6140",
  dexs: "0x7327325e5f41d4c1922a9dfc87d8a3b3f1ae5c1f",
  ticker: "eLUCKY",
  decimals: 8,
  name: "LUCKY on Ethereum",
  supply: 74985501.67671512
}, {
  chain: 1,
  a: "0x6b32022693210cd2cfc466b9ac0085de8fc34ea6",
  dexs: "0xf6ed2390be39c783ae78893c91669eeb635d0429",
  ticker: "eDECI",
  decimals: 8,
  name: "DECI on Ethereum",
  supply: 565991987.7294711
}, {
  chain: 1,
  a: "0x0d86eb9f43c57f6ff3bc9e23d8f9d82503f0e84b",
  dexs: "0x2ae4517b2806b84a576c10f698d6567ce80a6490",
  ticker: "eMAXI",
  decimals: 8,
  name: "MAXI on Ethereum",
  supply: 274546065
}, {
  chain: 1,
  a: "0x4581af35199bbde87a89941220e04e27ce4b0099",
  dexs: "0x7a1f65ff0deb5912792979c596c8f9688b652598",
  ticker: "ePARTY",
  decimals: 18,
  name: "Pool Party on Ethereum"
}, {
  chain: 1,
  a: "0xa882606494d86804b5514e07e6bd2d6a6ee6d68a",
  dexs: ["0x0"],
  ticker: "WPLS",
  decimals: 18,
  name: "Wrapped PLS from PulseChain",
  origin: [369, "0x0"]
},  {
  chain: 1,
  a: "0x5a9780bfe63f3ec57f01b087cd65bd656c9034a8",
  dexs: "0x8ffdc8c69e1c1afdbd4d37e9df98eba3e3aca92d",
  ticker: "eCOM",
  decimals: 12,
  name: "Communis on Eth"
}, {
  chain: 1,
  a: "0x0a58153a0cd1cfaea94ce1f7fdc5d7e679eca936",
  dexs: "0xa6237656d15a7f15348c7fd9a0e11551c516e378",
  ticker: "eIM",
  decimals: 18,
  name: "IM on Ethereum"
}, {
  chain: 1,
  a: "0x06450dee7fd2fb8e39061434babcfc05599a6fb8",
  dexs: "0xc0d776e2223c9a2ad13433dab7ec08cb9c5e76ae",
  ticker: "eXEN",
  decimals: 18,
  name: "XEN Crypto"
}, {
  chain: 1,
  a: "0x80f0c1c49891dcfdd40b6e0f960f84e6042bcb6f",
  dexs: "0x7f808fd904ffa3eb6a6f259e6965fb1466a05372",
  ticker: "DXN",
  decimals: 18,
  name: "DBXen"
}, {
  chain: 1,
  a: "0x5ee84583f67d5ecea5420dbb42b462896e7f8d06",
  dexs: "0xa5ef2a6bbe8852bd6fd2ef6ab9bb45081a6f531c",
  ticker: "PLSB",
  decimals: 12,
  name: "PLSB on Ethereum"
}, {
  chain: 1,
  a: "0xfd8b9ba4845fb38c779317ec134b298c064937a2",
  dexs: "0xe0533126c4013e2f5bcf44a2c84a396219be2d9d",
  ticker: "9INCH",
  decimals: 18,
  name: "9inch on Ethereum"
}, {
  chain: 1,
  a: "0x015628ce9150db1bce2fbb717a09e846f8a32436",
  dexs: "0xcb1a01c4b3217472ba74ca3e8f217ee0d0531ed6",
  ticker: "eBBC",
  decimals: 18,
  name: "BBC on Ethereum"
}, {
  chain: 1,
  a: "0xb55ee890426341fe45ee6dc788d2d93d25b59063",
  dexs: "0x7bfa17e9d4296bf9697769a55b6654222e36097e",
  ticker: "LOVE",
  decimals: 18,
  name: "Love.io"
}, {
  chain: 1,
  a: "0x54f667db585b7b10347429c72c36c8b59ab441cb",
  dexs: "0xf3f3dccc31235b22d0e5624283e36922c754dc7b",
  ticker: "eGOFURS",
  decimals: 18,
  name: "GOFURS on Eth"
}, {
  chain: 1,
  a: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
  dexs: null,
  ticker: "USDC",
  decimals: 6,
  name: "USDC on Ethereum"
}, {
  chain: 1,
  a: "0xdac17f958d2ee523a2206206994597c13d831ec7",
  dexs: null,
  ticker: "USDT",
  decimals: 6,
  name: "Tether on Ethereum"
}, {
  chain: 1,
  a: "0x6b175474e89094c44da98b954eedeac495271d0f",
  dexs: null,
  ticker: "DAI",
  decimals: 18,
  name: "DAI on Ethereum"
}, {
  chain: 1,
  a: "0x4fabb145d64652a948d72533023f6e7a623c7c53",
  dexs: null,
  ticker: "BUSD",
  decimals: 18,
  name: "Binance USD"
}, {
  chain: 1,
  a: "0x0000000000085d4780b73119b644ae5ecd22b376",
  dexs: null,
  ticker: "TUSD",
  decimals: 18,
  name: "TrueUSD"
}, {
  chain: 1,
  a: "0x8e870d67f660d95d5be530380d0ec0bd388289e1",
  dexs: null,
  ticker: "USDP",
  decimals: 18,
  name: "Paxos USD"
}, {
  chain: 1,
  a: "0x5f98805a4e8be255a32880fdec7f6728c6568ba0",
  dexs: null,
  ticker: "LUSD",
  decimals: 18,
  name: "Liquity USD"
}, {
  chain: 1,
  a: "0x056fd409e1d7a124bd7017459dfea2f387b6d5cd",
  dexs: null,
  ticker: "GUSD",
  decimals: 2,
  name: "Gemini Dollar"
}, {
  chain: 1,
  a: "0x1abaea1f7c830bd89acc67ec4af516284b1bc33c",
  dexs: "0x95dbb3c7546f22bce375900abfdd64a4e5bd73d6",
  ticker: "EURS",
  decimals: 6,
  name: "EURO Coin"
}, {
  chain: 1,
  a: "0x95ad61b0a150d79219dcf64e1e6cc01f0b64c4ce",
  dexs: "0x2f62f2b4c5fcd7570a709dec05d68ea19c82a9ec",
  ticker: "eSHIB",
  decimals: 18,
  name: "Shiba Inu on Ethereum"
}, {
  chain: 1,
  a: "0x4d224452801aced8b2f0aebe155379bb5d594381",
  dexs: "0xac4b3dacb91461209ae9d41ec517c2b9cb1b7daf",
  ticker: "APE",
  decimals: 18,
  name: "ApeCoin"
}, {
  chain: 1,
  a: "0x6982508145454ce325ddbe47a25d4ec3d2311933",
  dexs: "0x11950d141ecb863f01007add7d1a342041227b58",
  ticker: "ePEPE",
  decimals: 18,
  name: "Pepe on Ethereum"
}, {
  chain: 1,
  a: "0xf0f9d895aca5c8678f706fb8216fa22957685a13",
  dexs: "0x5281e311734869c64ca60ef047fd87759397efe6",
  ticker: "CULT",
  decimals: 18,
  name: "Cult DAO"
}, {
  chain: 1,
  a: "0x1f9840a85d5af5bf1d1762f925bdaddc4201f984",
  dexs: "0x1d42064fc4beb5f8aaf85f4617ae8b3b5b8bd801",
  ticker: "eUNI",
  decimals: 18,
  name: "Uniswap on Ethereum"
}, {
  chain: 1,
  a: "0x111111111117dc0aa78b770fa6a738034120c302",
  dexs: "0x9febc984504356225405e26833608b17719c82ae",
  ticker: "1INCH",
  decimals: 18,
  name: "1inch"
}, {
  chain: 1,
  a: "0x6b3595068778dd592e39a122f4f5a5cf09c90fe2",
  dexs: "0x795065dcc9f64b5614c407a6efdc400da6221fb0",
  ticker: "eSUSHI",
  decimals: 18,
  name: "Sushiswap"
}, {
  chain: 1,
  a: "0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9",
  dexs: "0x5ab53ee1d50eef2c1dd3d5402789cd27bb52c1bb",
  ticker: "AAVE",
  decimals: 18,
  name: "Aave"
}, {
  chain: 1,
  a: "0xc00e94cb662c3520282e6f5717214004a7f26888",
  dexs: "0x31503dcb60119a812fee820bb7042752019f2355",
  ticker: "eCOMP",
  decimals: 18,
  name: "Compound"
}, {
  chain: 1,
  a: "0xd533a949740bb3306d119cc777fa900ba034cd52",
  dexs: "0x919fa96e88d67499339577fa202345436bcdaf79",
  ticker: "eCRV",
  decimals: 18,
  name: "Curve"
}, {
  chain: 1,
  a: "0x9f8f72aa9304c8b593d555f12ef6589cc3a579a2",
  dexs: "0xe8c6c9227491c0a8156a0106a0204d881bb7e531",
  ticker: "eMKR",
  decimals: 18,
  name: "Maker"
}, {
  chain: 1,
  a: "0x5a98fcbea516cf06857215779fd812ca3bef1b32",
  dexs: "0xa3f558aebaecaf0e11ca4b2199cc5ed341edfd74",
  ticker: "eLDO",
  decimals: 18,
  name: "Lido DAO"
}, {
  chain: 1,
  a: "0xae78736cd615f374d3085123a210448e74fc6393",
  dexs: "0xa4e0faa58465a2d369aa21b3e42d43374c6f9613",
  ticker: "rETH",
  decimals: 18,
  name: "Rocket Pool ETH"
}, {
  chain: 1,
  a: "0x83f20f44975d03b1b09e64809b757c47f942beea",
  dexs: "0x422a29a465e4f8acc85cee8e0c7058dff28e7196",
  ticker: "sDAI",
  decimals: 18,
  name: "Savings DAI"
}, {
  chain: 1,
  a: "0x2ba592f78db6436527729929aaf6c908497cb200",
  dexs: "0xf169cea51eb51774cf107c88309717dda20be167",
  ticker: "CREAM",
  decimals: 18,
  name: "Cream"
}, {
  chain: 1,
  a: "0x7d1afa7b718fb893db30a3abc0cfc608aacfebb0",
  dexs: "0x290a6a7460b308ee3f19023d2d00de604bcf5b42",
  ticker: "MATIC",
  decimals: 18,
  name: "Polygon on Ethereum"
}, {
  chain: 1,
  a: "0xb50721bcf8d664c30412cfbc6cf7a15145234ad1",
  dexs: "0x755e5a186f0469583bd2e80d1216e02ab88ec6ca",
  ticker: "ARB",
  decimals: 18,
  name: "Arbitrum on Ethereum"
}, {
  chain: 1,
  a: "0x45804880de22913dafe09f4980848ece6ecbaf78",
  dexs: "0x9c4fe5ffd9a9fc5678cfbd93aa2d4fd684b67c4c",
  ticker: "PAXG",
  decimals: 18,
  name: "Paxos Gold"
}, {
  chain: 1,
  a: "0x68749665ff8d2d112fa859aa293f07a622782f38",
  dexs: "0x6546055f46e866a4b9a4a13e81273e3152bae5da",
  ticker: "XAUt",
  decimals: 6,
  name: "Tether Gold",
  origin: [1, "0x45804880de22913dafe09f4980848ece6ecbaf78"]
}, {
  chain: 1,
  a: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
  dexs: "0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640",
  ticker: "WETH",
  decimals: 18,
  name: "Wrapped Ether on Eth",
  origin: [1, "0x0"]
}, {
  chain: 1,
  a: "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599",
  dexs: "0x4585fe77225b41b697c938b018e2ac67ac5a20c0",
  ticker: "WBTC",
  decimals: 8,
  name: "Wrapped BTC"
}, {
  chain: 1,
  a: "0xae7ab96520de3a18e5e111b5eaab095312d7fe84",
  dexs: "0x4028daac072e492d34a3afdbef0ba7e35d8b55c4",
  ticker: "stETH",
  decimals: 18,
  name: "Staked ETH"
}, {
  chain: 1,
  a: "0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0",
  dexs: "0x109830a1aaad605bbf02a9dfa7b0b92ec2fb7daa",
  ticker: "wstETH",
  decimals: 18,
  name: "Wrapped stETH 2.0"
}, {
  chain: 1,
  a: "0x0f5d2fb29fb7d3cfee444a200298f468908cc942",
  dexs: "0x8661ae7918c0115af9e3691662f605e9c550ddc9",
  ticker: "MANA",
  decimals: 18,
  name: "Decentraland"
}, {
  chain: 1,
  a: "0x3845badade8e6dff049820680d1f14bd3903a5d0",
  dexs: "0x3dd49f67e9d5bc4c5e6634b3f70bfd9dc1b6bd74",
  ticker: "SAND",
  decimals: 18,
  name: "Sandbox"
}, {
  chain: 1,
  a: "0x514910771af9ca656af840dff83e8264ecf986ca",
  dexs: "0xa6cc3c2531fdaa6ae1a3ca84c2855806728693e8",
  ticker: "eLINK",
  decimals: 18,
  name: "ChainLink"
}, {
  chain: 1,
  a: "0x0d8775f648430679a709e98d2b0cb6250d2887ef",
  dexs: "0xae614a7a56cb79c04df2aeba6f5dab80a39ca78e",
  ticker: "BAT",
  decimals: 18,
  name: "Basic Attention Token"
}, {
  chain: 1,
  a: "0xc944e90c64b2c07662a292be6244bdf05cda44a7",
  dexs: "0x0e2c4be9f3408e5b1ff631576d946eb8c224b5ed",
  ticker: "eGRT",
  decimals: 18,
  name: "Graph Token"
}, {
  chain: 1,
  a: "0x582d872a1b094fc48f5de31d3b73f2d9be47def1",
  dexs: "0x4b62fa30fea125e43780dc425c2be5acb4ba743b",
  ticker: "TON",
  decimals: 9,
  name: "Toncoin"
}, {
  chain: 1,
  a: "0xc18360217d8f7ab5e7c516566761ea12ce7f9d72",
  dexs: "0x92560c178ce069cc014138ed3c2f5221ba71f58a",
  ticker: "ENS",
  decimals: 18,
  name: "Ethereum Name Service"
}, {
  chain: 1,
  a: "0xc669928185dbce49d2230cc9b0979be6dc797957",
  dexs: "0x2d0ba902badaa82592f0e1c04c71d66cea21d921",
  ticker: "BTT",
  decimals: 18,
  name: "BitTorrent"
}, {
  chain: 1,
  a: "0x5afe3855358e112b5647b952709e6165e1c1eeee",
  dexs: "0xbb0eccb680ff8b2cbbb239b200cc6f9927b4aacb",
  ticker: "SAFE",
  decimals: 18,
  name: "Safe Token"
}, {
  chain: 1,
  a: "0xec213f83defb583af3a000b1c0ada660b1902a0f",
  dexs: "0x19a573b228468f3bf917389f4e2d4f2997610f71",
  ticker: "PRE",
  decimals: 18,
  name: "Presearch"
}, {
  chain: 1,
  a: "0xa87135285ae208e22068acdbff64b11ec73eaa5a",
  dexs: "0x48b9edf67d2e9f092bcc1cb43e9f6581baf9f815",
  ticker: "LUNR",
  decimals: 4,
  name: "LunarCrush"
}, {
  chain: 1,
  a: "0x6de037ef9ad2725eb40118bb1702ebb27e4aeb24",
  dexs: "0xe936f0073549ad8b1fa53583600d629ba9375161",
  ticker: "RNDR",
  decimals: 18,
  name: "Render Token"
}, {
  chain: 1,
  a: "0x444444444444c1a66f394025ac839a535246fcc8",
  dexs: "0xf60afed42d276507b6bcae93157c66bee2cf332b",
  ticker: "GENI",
  decimals: 9,
  name: "Genius"
}, {
  chain: 1,
  a: "0x66a0f676479cee1d7373f3dc2e2952778bff5bd6",
  dexs: "0x21b8065d10f73ee2e260e5b47d3344d3ced7596e",
  ticker: "WISE",
  decimals: 18,
  name: "Wise Token"
}, {
  chain: 1,
  a: "0x5283d291dbcf85356a21ba090e6db59121208b44",
  dexs: "0x824a30f2984f9013f2c8d0a29c0a3cc5fd5c0673",
  ticker: "BLUR",
  decimals: 18,
  name: "Blur"
}, {
  chain: 1,
  a: "0xaea46a60368a7bd060eec7df8cba43b7ef41ad85",
  dexs: "0x948b54a93f5ad1df6b8bff6dc249d99ca2eca052",
  ticker: "eFET",
  decimals: 18,
  name: "Fetch"
}, {
  chain: 1,
  a: "0xf57e7e7c23978c3caec3c3548e3d615c346e79ff",
  dexs: "0x81fbbc40cf075fd7de6afce1bc72eda1bb0e13aa",
  ticker: "IMX",
  decimals: 18,
  name: "Immutable X"
}, {
  chain: 369,
  a: "0x0",
  dexs: "0xe56043671df55de5cdf8459710433c10324de0ae",
  ticker: "PLS",
  decimals: 18,
  name: "Pulse"
}, {
  chain: 369,
  a: "0x95b303987a60c71504d99aa1b13b4da07b0790ab",
  dexs: "0x1b45b9148791d3a104184cd5dfe5ce57193a3ee9",
  ticker: "PLSX",
  decimals: 18,
  name: "PulseX"
}, {
  chain: 369,
  a: "0x2b591e99afe9f32eaa6214f7b7629768c40eeb39",
  dexs: "0xf1f4ee610b2babb05c635f726ef8b0c568c8dc65",
  ticker: "HEX",
  decimals: 8,
  name: "HEX on PulseChain"
}, {
  chain: 369,
  a: "0x2fa878ab3f87cc1c9737fc071108f904c0b0c95d",
  dexs: "0xf808bb6265e9ca27002c0a04562bf50d4fe37eaa",
  ticker: "INC",
  decimals: 18,
  name: "Incentive"
}, {
  chain: 369,
  a: "0x3819f64f282bf135d62168c1e513280daf905e06",
  dexs: "0x5f4cb14a7858bdb9066f9e4b561cdc1623807da0",
  ticker: "HDRN",
  decimals: 9,
  name: "Hedron on PulseChain"
}, {
  chain: 369,
  a: "0xfc4913214444af5c715cc9f7b52655e788a569ed",
  dexs: "0xe5bb65e7a384d2671c96cfe1ee9663f7b03a573e",
  ticker: "ICSA",
  decimals: 9,
  name: "ICSA on PulseChain"
}, {
  chain: 369,
  a: "0xe9f84d418b008888a992ff8c6d22389c2c3504e0",
  dexs: "0xb39490b46d02146f59e80c6061bb3e56b824d672",
  ticker: "BASE",
  decimals: 8,
  name: "BASE on PulseChain",
  supply: 54165743.289
}, {
  chain: 369,
  a: "0xf55cd1e399e1cc3d95303048897a680be3313308",
  dexs: "0x0b0f8f6c86c506b70e2a488a451e5ea7995d05c9",
  ticker: "TRIO",
  decimals: 8,
  name: "TRIO on PulseChain",
  supply: 69617911.47775
}, {
  chain: 369,
  a: "0x6b0956258ff7bd7645aa35369b55b61b8e6d6140",
  dexs: "0x52d4b3f479537a15d0b37b6cdbdb2634cc78525e",
  ticker: "LUCKY",
  decimals: 8,
  name: "LUCKY on PulseChain",
  supply: 74985501.67671512
}, {
  chain: 369,
  a: "0x6b32022693210cd2cfc466b9ac0085de8fc34ea6",
  dexs: "0x969af590981bb9d19ff38638fa3bd88aed13603a",
  ticker: "DECI",
  decimals: 8,
  name: "DECI on PulseChain",
  supply: 565991987.7294711
}, {
  chain: 369,
  a: "0x0d86eb9f43c57f6ff3bc9e23d8f9d82503f0e84b",
  dexs: "0xbfb22cc394c53c14dc8a5840a246dfdd2f7b2507",
  ticker: "MAXI",
  decimals: 8,
  name: "Maxi on PulseChain",
  supply: 274546065
}, {
  chain: 369,
  a: "0xb7c9e99da8a857ce576a830a9c19312114d9de02",
  dexs: "0x55b4387ff2cf168801ec64ca8221e035fd07b81d",
  ticker: "TEAM",
  decimals: 8,
  name: "Team on PulseChain"
}, {
  chain: 369,
  a: "0x9d93692e826a4bd9e903e2a27d7fbd1e116efdad",
  dexs: "0x63d8d45240efcb3b2ac7acf9e8708a4712b072e1",
  ticker: "POLY",
  decimals: 9,
  name: "Poly Maximus"
}, {
  chain: 369,
  a: "0x4581af35199bbde87a89941220e04e27ce4b0099",
  dexs: "0x70966CcB20C10Ae326D6368A107C80fb825F3028",
  ticker: "PARTY",
  decimals: 18,
  name: "Pool Party on PulseChain"
}, 
{
  chain: 369,
  a: "0xbbcf895bfcb57d0f457d050bb806d1499436c0ce",
  dexs: "0x6312a9477e3BC81D5e3a44d77F0A43630904fF69",
  ticker: "IM",
  decimals: 18,
  name: "Internet Money on PulseChain"
}, {
  chain: 369,
  a: "0xa1077a294dde1b09bb078844df40758a5d0f9a27",
  dexs: "0xe56043671df55de5cdf8459710433c10324de0ae",
  ticker: "WPLS",
  decimals: 18,
  name: "Wrapped PLS",
  origin: [369, "0x0"]
}, {
  chain: 369,
  a: "0x02dcdd04e3f455d838cd1249292c58f3b79e3c3c",
  dexs: ["0x0"],
  ticker: "WETH",
  decimals: 18,
  name: "Wrapped WETH from Eth",
  origin: [1, "0x0"]
},  {
  chain: 369,
  a: "0xefd766ccb38eaf1dfd701853bfce31359239f305",
  dexs: null,
  ticker: "weDAI",
  decimals: 18,
  name: "Wrapped DAI from Eth",
  origin: [1, "0x6b175474e89094c44da98b954eedeac495271d0f"]
}, {
  chain: 369,
  a: "0x15d38573d2feeb82e7ad5187ab8c1d52810b1f07",
  dexs: "0x52ca8c5c6a5c7c56cf5e01bde9473b3b7f7c0b1e",
  ticker: "weUSDC",
  decimals: 6,
  name: "Wrapped USDC from Eth",
  origin: [1, "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"]
}, {
  chain: 369,
  a: "0x0cb6f5a34ad42ec934882a05265a7d5f59b51a2f",
  dexs: "0xc8bbdb5a0652877eb1f774cba684eb8fbdd7bbb7",
  ticker: "weUSDT",
  decimals: 6,
  name: "Wrapped USDT from Eth",
  origin: [1, "0xdac17f958d2ee523a2206206994597c13d831ec7"]
}, {
  chain: 369,
  a: "0xabf663531fa10ab8116cbf7d5c6229b018a26ff9",
  dexs: ["0x3819f64f282bf135d62168c1e513280daf905e06"],
  ticker: "weHDRN",
  decimals: 9,
  name: "Wrapped HDRN from Eth",
  origin: [1, "0x3819f64f282bf135d62168c1e513280daf905e06"]
}, {
  chain: 369,
  a: "0xb4d363d5df85f0fbc746c236fd410d82bf856f78",
  dexs: ["0xfc4913214444af5c715cc9f7b52655e788a569ed"],
  ticker: "weICSA",
  decimals: 9,
  name: "Wrapped ICSA from Eth",
  origin: [1, "0xfc4913214444af5c715cc9f7b52655e788a569ed"]
}, {
  chain: 369,
  a: "0x3ab667c153b8dd2248bb96e7a2e1575197667784",
  dexs: ["0x95ad61b0a150d79219dcf64e1e6cc01f0b64c4ce"],
  ticker: "weSHIB",
  decimals: 18,
  name: "Wrapped SHIB from Eth",
  origin: [1, "0x95ad61b0a150d79219dcf64e1e6cc01f0b64c4ce"]
}, {
  chain: 369,
  a: "0xb17d901469b9208b17d916112988a3fed19b5ca1",
  dexs: ["0x2260fac5e5542a773aa44fbcfedf7c193bc2c599"],
  ticker: "weWBTC",
  decimals: 8,
  name: "Wrapped BTC from Eth",
  origin: [1, "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599"]
}, {
  chain: 369,
  a: "0xee2d275dbb79c7871f8c6eb2a4d0687dd85409d1",
  dexs: ["0x514910771af9ca656af840dff83e8264ecf986ca"],
  ticker: "weLINK",
  decimals: 18,
  name: "Wrapped LINK from Eth",
  origin: [1, "0x514910771af9ca656af840dff83e8264ecf986ca"]
}, {
  chain: 369,
  a: "0x3f105121a10247de9a92e818554dd5fcd2063ae7",
  dexs: ["0x1f9840a85d5af5bf1d1762f925bdaddc4201f984"],
  ticker: "weUNI",
  decimals: 18,
  name: "Wrapped UNI from Eth",
  origin: [1, "0x1f9840a85d5af5bf1d1762f925bdaddc4201f984"]
}, {
  chain: 369,
  a: "0x4d3aea379b7689e0cb722826c909fab39e54123d",
  dexs: ["0x6982508145454ce325ddbe47a25d4ec3d2311933"],
  ticker: "wePEPE",
  decimals: 18,
  name: "Wrapped PEPE from Eth",
  origin: [1, "0x6982508145454ce325ddbe47a25d4ec3d2311933"]
}, {
  chain: 369,
  a: "0xda073388422065fe8d3b5921ec2ae475bae57bed",
  dexs: ["0xe9f84d418b008888a992ff8c6d22389c2c3504e0"],
  ticker: "weBASE",
  decimals: 8,
  name: "Wrapped BASE from Eth",
  origin: [1, "0xe9f84d418b008888a992ff8c6d22389c2c3504e0"],
  supply: 70668766.59912861
}, {
  chain: 369,
  a: "0x0f3c6134f4022d85127476bc4d3787860e5c5569",
  dexs: "0x518b8CE0C7CE74a85774814fBFac7ADCDf702b2C",
  ticker: "weTRIO",
  decimals: 8,
  name: "Wrapped TRIO from Eth",
  origin: [1, "0xf55cd1e399e1cc3d95303048897a680be3313308"],
  supply: 69617911.47775
}, {
  chain: 369,
  a: "0x8924f56df76ca9e7babb53489d7bef4fb7caff19",
  dexs: ["0x6b0956258ff7bd7645aa35369b55b61b8e6d6140"],
  ticker: "weLUCKY",
  decimals: 8,
  name: "Wrapped LUCKY from Eth",
  origin: [1, "0x6b0956258ff7bd7645aa35369b55b61b8e6d6140"],
  supply: 74985501.67671512
}, {
  chain: 369,
  a: "0x189a3ca3cc1337e85c7bc0a43b8d3457fd5aae89",
  dexs: "0x39e87e2baa67f3c7f1dd58f58014f23f97e3265e",
  ticker: "weDECI",
  decimals: 8,
  name: "Wrapped DECI from Eth",
  origin: [1, "0x6b32022693210cd2cfc466b9ac0085de8fc34ea6"],
  supply: 565991987.7294711
}, {
  chain: 369,
  a: "0x352511c9bc5d47dbc122883ed9353e987d10a3ba",
  dexs: "0x90b629cbbefc1efcae0b4cb027a51f0e0c3dcd76",
  ticker: "weMAXI",
  decimals: 8,
  name: "Wrapped MAXI from Eth",
  origin: [1, "0x0d86eb9f43c57f6ff3bc9e23d8f9d82503f0e84b"],
  supply: 274546065
}, {
  chain: 369,
  a: "0x518076cce3729ef1a3877ea3647a26e278e764fe",
  dexs: "0x441da3eb677b23e498a3ea9fb11af15030b14d09",
  ticker: "WBNB",
  decimals: 18,
  name: "Wrapped BNB from BSC"
}, {
  chain: 369,
  a: "0x600136da8cc6d1ea07449514604dc4ab7098db82",
  dexs: "0x284a7654b90d3c2e217b6da9fac010e6c4b54610",
  ticker: "CST",
  decimals: 6,
  name: "Coast"
}, {
  chain: 369,
  a: "0x0deed1486bc52aa0d3e6f8849cec5add6598a162",
  dexs: "0x27557d148293d1c8e8f8c5deeab93545b1eb8410",
  ticker: "USDL",
  decimals: 18,
  name: "USDL"
}, {
  chain: 369,
  a: "0xeb6b7932da20c6d7b3a899d5887d86dfb09a6408",
  dexs: "0xabb36512813194b12a82a319783dbb455652440a",
  ticker: "PXDC",
  decimals: 18,
  name: "Powercity PXDC"
}, {
  chain: 369,
  a: "0x9c6fa17d92898b684676993828143596894aa2a6",
  dexs: "0x476d63ab94b4e86614df0c3d5a27e9e22631d062",
  ticker: "FLEX",
  decimals: 8,
  name: "Powercity FLEX"
}, {
  chain: 369,
  a: "0x1fe0319440a672526916c232eaee4808254bdb00",
  dexs: "0x9756f095dfa27d4c2eae0937a7b8a6603d99affb",
  ticker: "HEXDC",
  decimals: 8,
  name: "HEXDC Stablecoin"
}, {
  chain: 369,
  a: "0x3693693695e7a8ac0ee0ff2f2c4e7b85eab6c555",
  dexs: "0xbe065ff9fa2e86f201db2b85e52d10f94505e3c1",
  ticker: "PHL",
  decimals: 8,
  name: "PulseHotList"
}, {
  chain: 369,
  a: "0xb55ee890426341fe45ee6dc788d2d93d25b59063",
  dexs: "0xeffb56e3402f1993a34887eecaaa3d63da8e3f85",
  ticker: "LOVE",
  decimals: 18,
  name: "Love.io"
}, {
  chain: 369,
  a: "0x96e035ae0905efac8f733f133462f971cfa45db1",
  dexs: "0xfe75839c16a6516149d0f7b2208395f54a5e16e8",
  ticker: "PHIAT",
  decimals: 18,
  name: "Phiat"
}, {
  chain: 369,
  a: "0x8854bc985fb5725f872c8856bea11b917caeb2fe",
  dexs: "0xf64602fd08245d1d27f7d9452814bea1451bd502",
  ticker: "PHAME",
  decimals: 18,
  name: "Phamous"
}, {
  chain: 369,
  a: "0x4243568fa2bbad327ee36e06c16824cad8b37819",
  dexs: "0x0a022e7591749b0ed0d9e3b7b978f26978440dc7",
  ticker: "TSFi",
  decimals: 18,
  name: "T-Share Finance"
}, {
  chain: 369,
  a: "0xc59be55d22cb7967ee95e5be0770e263ee014f78",
  dexs: "0x2eba3cf4872aa3b6fa88a53de1eb0cb6802f8a2d",
  ticker: "OPHIR",
  decimals: 18,
  name: "Ophir"
}, {
  chain: 369,
  a: "0x8bdb63033b02c15f113de51ea1c3a96af9e8ecb5",
  dexs: "0xdaa4b508e1a958038f0f0b1f2eac796a2fc17bb8",
  ticker: "AXIS",
  decimals: 18,
  name: "AxisAlive"
}, {
  chain: 369,
  a: "0x8da17db850315a34532108f0f5458fc0401525f6",
  dexs: "0xa1186671046c7e19f1083b93b8e72c297e5ba7f7",
  ticker: "SOLIDX",
  decimals: 18,
  name: "Solid X"
}, {
  chain: 369,
  a: "0xf330cb1d41052dbc74d3325376cb82e99454e501",
  dexs: "0xa68a7c219bc12cb31ff4747c7efb75a5c37e2fe4",
  ticker: "FIRE",
  decimals: 18,
  name: "HEXFIRE"
}, {
  chain: 369,
  a: "0x207e6b4529840a4fd518f73c68bc9c19b2a15944",
  dexs: "0x5f2d8624e6abea8f679a1095182f4bc84fe148e0",
  ticker: "MINT",
  decimals: 18,
  name: "Mintra"
}, {
  chain: 369,
  a: "0xc52f739f544d20725ba7ad47bb42299034f06f4f",
  dexs: "0x5da3f2b568073cc04b136e866a44f920603556b4",
  ticker: "PLSP",
  decimals: 18,
  name: "PulsePot"
}, {
  chain: 369,
  a: "0x444444444444c1a66f394025ac839a535246fcc8",
  dexs: "0xe1ef8b1bfe5a1dbb3fc2f0c3405f54a9e6f32840",
  ticker: "GENI",
  decimals: 9,
  name: "Genius"
}, {
  chain: 369,
  a: "0xe101c848620e762ecb942356962dd415342b4feb",
  dexs: "0x6c4f0bd9eb4328490a5bb8e0b682e28db52df2b3",
  ticker: "LAUNCH",
  decimals: 18,
  name: "Pulse Launch"
}, {
  chain: 369,
  a: "0x2460328e89260ddfba4a942a0cfa417f202c04c2",
  dexs: "0x13d8d27a257da38ba7b705d1f05ebfea5340a90b",
  ticker: "SUN",
  decimals: 2,
  name: "Minimeal (Legacy1)"
}, {
  chain: 369,
  a: "0xbd63fa573a120013804e51b46c56f9b3e490f53c",
  dexs: "0x4581e25b434c1ced7a93449b229469f03ca4451e",
  ticker: "SOIL",
  decimals: 18,
  name: "SUN Minimeal (New)"
}, {
  chain: 369,
  a: "0xcc78a0acdf847a2c1714d2a925bb4477df5d48a6",
  dexs: "0x859b67601353d6b6cfb8f52edf83de9c5b90b0d2",
  ticker: "ATROPA",
  decimals: 18,
  name: "Atropa"
}, {
  chain: 369,
  a: "0xd6c31ba0754c4383a41c0e9df042c62b5e918f6d",
  dexs: "0x31ef9a41500e6bd18524404ac9c5b88d04aa924e",
  ticker: "BEAR",
  decimals: 18,
  name: "Teddy Bear"
}, {
  chain: 369,
  a: "0x463413c579d29c26d59a65312657dfce30d545a1",
  dexs: "0xe56688a3d6b3f9717b3e9cfe1577aa02dfefdc2f",
  ticker: "TBILL",
  decimals: 18,
  name: "Treasury Bill"
}, {
  chain: 369,
  a: "0xf8ab3393b1f5cd6184fb6800a1fc802043c4063e",
  dexs: "0x71423f29f8376ef8efdb9207343a5ff32604c2e3",
  ticker: "MONAT",
  decimals: 18,
  name: "Monat Money"
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
  a: "0xde4ef7ea464c7771803b9838aea07ce41089b054",
  dexs: "0x070f760b51285cb775e2e2353927c4bfacc8b6aa",
  ticker: "PNS",
  decimals: 18,
  name: "Greenland"
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
  a: "0x2a06a971fe6ffa002fd242d437e3db2b5cc5b433",
  dexs: "0xe98250bb335f5662edca64c76c37c95a3334f358",
  ticker: "PTS",
  decimals: 18,
  name: "Piteas"
}, {
  chain: 369,
  a: "0x6386704cd6f7a584ea9d23ccca66af7eba5a727e",
  dexs: "0x1b044593a78e374bd0e558aa6633d2ff13fd5bb7",
  ticker: "SPARK",
  decimals: 18,
  name: "Sparkswap"
}, {
  chain: 369,
  a: "0x3ca80d83277e721171284667829c686527b8b3c5",
  dexs: "0x1164dab36cd7036668ddcbb430f7e0b15416ef0b",
  ticker: "9INCH",
  decimals: 18,
  name: "9inch"
}, {
  chain: 369,
  a: "0x8b4cfb020af9acad95ad80020ce8f67fbb2c700e",
  dexs: "0xb543812ddebc017976f867da710ddb30cca22929",
  ticker: "BBC",
  decimals: 18,
  name: "Big Bonus Coin"
}, {
  chain: 369,
  a: "0xb6b57227150a7097723e0c013752001aad01248f",
  dexs: "0x53264c3ee2e1b1f470c9884e7f9ae03613868a96",
  ticker: "PRS",
  decimals: 18,
  name: "PulseReflections"
}, {
  chain: 369,
  a: "0x7663e79e09d78142e3f6e4dca19faf604159842d",
  dexs: "0x9a72a8f918edc3c5e53bcbf8667045b6a4d43943",
  ticker: "DAIX",
  decimals: 18,
  name: "DaiX"
}, {
  chain: 369,
  a: "0x8c5eb0f7007c374d6fe14627259b99a5e9613c84",
  dexs: "0x1aa434f653232a35b0559d5c4b33ab7fbaad80d6",
  ticker: "CAVIAR",
  decimals: 18,
  name: "Caviar"
}, {
  chain: 369,
  a: "0xaec4c07537b03e3e62fc066ec62401aed5fdd361",
  dexs: "0xfd21a7889729095fefce07a0ef9f9faa0b07a119",
  ticker: "TETRA",
  decimals: 18,
  name: "TETRAp"
}, {
  chain: 369,
  a: "0x7b39712ef45f7dced2bbdf11f3d5046ba61da719",
  dexs: "0xa2b8f577ab43bc7d01ba96b743e8641748d6db3c",
  ticker: "9MM",
  decimals: 18,
  name: "9mm"
}, {
  chain: 369,
  a: "0xd22e78c22d7e77229d60cc9fc57b0e294f54488e",
  dexs: "0x7f2de21b3f45cef665f97eb928e16dfbd8ecef6f",
  ticker: "HOC",
  decimals: 18,
  name: "Hocus Pocus"
}, {
  chain: 369,
  a: "0x5f63bc3d5bd234946f18d24e98c324f629d9d60e",
  dexs: "0xf121e6e093e2c070f2d982f85726084a776a963f",
  ticker: "IMPLS",
  decimals: 18,
  name: "IMPLS Token"
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
  a: "0xb5c4ecef450fd36d0eba1420f6a19dbfbee5292e",
  dexs: "0x9977e170c9b6e544302e8db0cf01d12d55555289",
  ticker: "pSSH",
  decimals: 9,
  name: "SuperStake"
}, {
  chain: 369,
  a: "0x17637e738d095f4e480cabbf55038e4e9e2b235e",
  dexs: "0x6eb99c82e081dab9c58a2d995bb27cbab23ae6a7",
  ticker: "DRS",
  decimals: 9,
  name: "DAI Reflections"
}, {
  chain: 369,
  a: "0xf876bdf9d6403aa7d5bf7f523e8f440a841cc596",
  dexs: "0x6292f579606108a285ff7b75efad54dc12576385",
  ticker: "RFX",
  decimals: 18,
  name: "Reflux"
}, {
  chain: 369,
  a: "0x73d8a4d01d658e565cf83068397fd39baf386c48",
  dexs: "0xea693bcd6ea8dd3ce1d6df683be302027ea0e6db",
  ticker: "VRX",
  decimals: 18,
  name: "Vortex"
}, {
  chain: 369,
  a: "0x9159f1d2a9f51998fc9ab03fbd8f265ab14a1b3b",
  dexs: "0x6d69654390c70d9e8814b04c69a542632dc93161",
  ticker: "LOAN",
  decimals: 18,
  name: "LOAN"
}, {
  chain: 369,
  a: "0x319e55be473c77c35316651995c048a415219604",
  dexs: "0x2e109c85ca018d14f86e81e28063446cc1500203",
  ticker: "ZKZX",
  decimals: 18,
  name: "ZKZX"
}, {
  chain: 369,
  a: "0xdfdc2836fd2e63bba9f0ee07901ad465bff4de71",
  dexs: "0x956f097e055fa16aad35c339e17accbf42782de6",
  ticker: "WATT",
  decimals: 18,
  name: "Powercity WATT"
}, {
  chain: 369,
  a: "0xb513038bbfdf9d40b676f41606f4f61d4b02c4a2",
  dexs: "0xed77cbbb80e5a5c3a1fe664419d6f690766b5913",
  ticker: "EARN",
  decimals: 18,
  name: "Powercity EARN"
}, {
  chain: 369,
  a: "0xbd2826b7823537fcd30d738abe4250ad6262209c",
  dexs: "0xe33020168e9ee49a9fd9ad8b8f174e895945c703",
  ticker: "iBURN",
  decimals: 9,
  name: "Icosa Burn"
}, {
  chain: 369,
  a: "0x79bb3a0ee435f957ce4f54ee8c3cfadc7278da0c",
  dexs: "0x46814b3f18d90625b6e166bc2917bb64a635d797",
  ticker: "vPLS",
  decimals: 18,
  name: "Vouch Staked PLS"
}, {
  chain: 369,
  a: "0x54f667db585b7b10347429c72c36c8b59ab441cb",
  dexs: "0xe34c1a936aa844da23fb6e70aa143e97135691d5",
  ticker: "GOFURS",
  decimals: 18,
  name: "GOFURS on PulseChain"
}, {
  chain: 369,
  a: "0x880dd541e00b966d829968c3198f11c8ca38a877",
  dexs: "0xb8efccb3fa5d4bc68524989173dc603e1acc0362",
  ticker: "PTP",
  decimals: 18,
  name: "PulseTrailerPark"
}, {
  chain: 369,
  a: "0x749ccf4c4308490f3c395de897f58e091090b461",
  dexs: "0x88fb694a376be1b9b2be9212a76348d4ee69b4a0",
  ticker: "RH404",
  decimals: 18,
  name: "RH404"
}, {
  chain: 369,
  a: "0x5a24d7129b6f3fcad2220296df28911880ad22b0",
  dexs: "0xdfc23736c6910dc27e7fb60553cd1f44d65eb556",
  ticker: "PZEN",
  decimals: 9,
  name: "PLSZEN"
}, {
  chain: 369,
  a: "0xbeef3bb9da340ebdf0f5bae2e85368140d7d85d0",
  dexs: "0xbd1364edba35a7284ebac9710894c9b2d5ebf8c5",
  ticker: "MORE",
  decimals: 18,
  name: "More"
}, {
  chain: 369,
  a: "0x0567ca0de35606e9c260cc2358404b11de21db44",
  dexs: "0x2772cb1ac353b4ae486f5bac196f20dcbd8a097f",
  ticker: "HELGO",
  decimals: 18,
  name: "Helgo"
}, {
  chain: 369,
  a: "0x131bf51e864024df1982f2cd7b1c786e1a005152",
  dexs: "0x5cebb68fd22a385b039efd50db6b2597bd425bf1",
  ticker: "UP",
  decimals: 18,
  name: "uP"
}, {
  chain: 369,
  a: "0x664e58570e5835b99d281f12dd14d350315d7e2a",
  dexs: "0x547d2d9eb1493c8de0a64bb34daa4ad8060fcb3a",
  ticker: "UPX",
  decimals: 18,
  name: "uPX"
}, {
  chain: 369,
  a: "0x2556f7f8d82ebcdd7b821b0981c38d9da9439cdd",
  dexs: "0xe1d2bdba58d34109c547883dc9c2f9e01cebb003",
  ticker: "DOWN",
  decimals: 18,
  name: "dOWN"
}, {
  chain: 369,
  a: "0x6de1bb62c13394b7db57a25477dbedd76b3e9a90",
  dexs: "0x3ef52b65223af427b4c5ce6e7ba4f0ed2ba41f40",
  ticker: "CEREAL",
  decimals: 9,
  name: "Cereal"
}, {
  chain: 369,
  a: "0xbb101431d43b0e1fc31f000bf96826794806e0b4",
  dexs: "0x17e9abc8da9c86aca035bd4716e41839ddf2d661",
  ticker: "APC",
  decimals: 18,
  name: "Apin Pulse"
}, {
  chain: 369,
  a: "0xcf409c91b49dd3f796d20eec20535fdc79a08798",
  dexs: "0xa6c466e31538439040f4753c3f4562c294ee3d96",
  ticker: "DMND",
  decimals: 18,
  name: "Diamond"
}, {
  chain: 369,
  a: "0x637ecd6b33bd8d5a550939a2e6058dd7dc52812e",
  dexs: "0x592c495aaf8649eab16670ccc4354c3b6b3fd14e",
  ticker: "BAANA",
  decimals: 18,
  name: "Baaana Massik"
}, {
  chain: 369,
  a: "0x94534eeee131840b1c0f61847c572228bdfdde93",
  dexs: "0xf5a89a6487d62df5308cdda89c566c5b5ef94c11",
  ticker: "pTGC",
  decimals: 18,
  name: "Grays Currency"
}, {
  chain: 369,
  a: "0x456548a9b56efbbd89ca0309edd17a9e20b04018",
  dexs: "0xbea0e55b82eb975280041f3b49c4d0bd937b72d5",
  ticker: "UFO",
  decimals: 18,
  name: "UFO"
}, {
  chain: 369,
  a: "0x1b7b541bea3af39292fce08649e4c4e1bee408a1",
  dexs: "0x57b329880e4fbfe5b58d078bd13d0da30ce1ef2b",
  ticker: "ALIEN",
  decimals: 18,
  name: "Alien"
}, {
  chain: 369,
  a: "0x677090251191ab1ae104e4f6919431e19361c893",
  dexs: "0xf8b31d515ca0318c766e020cf1fbebfb3e2d063e",
  ticker: "BTR",
  decimals: 18,
  name: "Booster"
}, {
  chain: 369,
  a: "0x35f525bee58624b89879cdafada040f5840d4460",
  dexs: "0x5aa1a2044d3ff041c6d97b939f183f989c511f10",
  ticker: "NBA",
  decimals: 18,
  name: "Basketball"
}, {
  chain: 369,
  a: "0xe35a842eb1edca4c710b6c1b1565ce7df13f5996",
  dexs: "0x163088ca79b196bac86295041e69536e9a3d9da4",
  ticker: "BFF",
  decimals: 18,
  name: "\uD804\uDC2D\uD804\uDC2D\uD804\uDC2D\uD804\uDC2D\uD804\uDC2D"
}, {
  chain: 369,
  a: "0x6a44be19d96f087494bafa66ee5df1bf7aaf220f",
  dexs: "0xa755a5dd5aac63f9e8869a0f25905ae6b635a92c",
  ticker: "BLAST",
  decimals: 9,
  name: "Blastar"
}, {
  chain: 369,
  a: "0xf5d0140b4d53c9476dc1488bc6d8597d7393f074",
  dexs: "0x64a34effab883d001eb006f3ead1c90ac1d6fb54",
  ticker: "GOAT",
  decimals: 18,
  name: "Degen Protocol"
}, {
  chain: 369,
  a: "0x8d36123903f504eb81eeb832727af517c0db26bd",
  dexs: "0xb823f30963511fb0a083073763f55d1285900c0c",
  ticker: "NOPE",
  decimals: 18,
  name: "Nope"
}, {
  chain: 369,
  a: "0x57953dac106a4cda11d90273b1b9d59e169533c0",
  dexs: "0x635969e2c12ab4938f9b31bf69aca724df1f2c42",
  ticker: "DEX",
  decimals: 18,
  name: "DexTop"
}, {
  chain: 369,
  a: "0x4c8218dc22e478963c02748857245fad79aad0c6",
  dexs: "0x62f2a746a140621a02ae75b6ac30db53fa868d19",
  ticker: "PLSC",
  decimals: 18,
  name: "PulseCoin"
}, {
  chain: 369,
  a: "0xa8dcd0eb29f6f918289b5c14634c1b5f443af826",
  dexs: "0x6547f88d725201d3119c5bbb6045a4059f5d2181",
  ticker: "MIKE",
  decimals: 9,
  name: "Monsters INC"
}, {
  chain: 369,
  a: "0xc42945a98eaaae8fafbc76bace473c90d8100967",
  dexs: "0x5e39d583d9385006285d0d26eb7adf8671a2a24a",
  ticker: "MAGIC",
  decimals: 18,
  name: "Magic Carpet Ride"
}, {
  chain: 369,
  a: "0xaebcd0f8f69ecf9587e292bdfc4d731c1abedb68",
  dexs: "0x3584ae4d7046c160ba9c64bb53951285c4b2abfd",
  ticker: "DWB",
  decimals: 18,
  name: "DickWifButt"
}, {
  chain: 369,
  a: "0xb6bad00525221eb28eb911a0b1162a0709b4ce57",
  dexs: "0x3dceaf41a2f1d50adf09fc8adabaf37491d5f718",
  ticker: "HARD",
  decimals: 9,
  name: "DaiHard"
}, {
  chain: 369,
  a: "0x8c4a50c87e348f602ac6a59f4da857ee23307a42",
  dexs: "0xe7726e023ae722ac180e7fcbd4bf028950fefa4e",
  ticker: "ICARUS",
  decimals: 18,
  name: "Icarus"
}, {
  chain: 369,
  a: "0x401464296a7e0cd14d85ab6baf0dc91b5ad5ad1b",
  dexs: "0x5ce2e1b0d987e17ceec95363bd2097855b1940c1",
  ticker: "BRO",
  decimals: 18,
  name: "BROmance"
}, {
  chain: 369,
  a: "0xec4252e62c6de3d655ca9ce3afc12e553ebba274",
  dexs: "0x96fefb743b1d180363404747bf09bd32657d8b78",
  ticker: "PUMP",
  decimals: 18,
  name: "PUMP.tires"
}, {
  chain: 369,
  a: "0xe33a5ae21f93acec5cfc0b7b0fdbb65a0f0be5cc",
  dexs: "0x908b5490414518981ce5c473ff120a6b338fef67",
  ticker: "MOST",
  decimals: 18,
  name: "MostWanted"
}, {
  chain: 369,
  a: "0x8cc6d99114edd628249fabc8a4d64f9a759a77bf",
  dexs: "0x2e2a603a35bff3c3e6a21a289dfd5144d921d3a0",
  ticker: "TRUMP",
  decimals: 18,
  name: "Trump"
}, {
  chain: 369,
  a: "0x7901a3569679aec3501dbec59399f327854a70fe",
  dexs: "0xd1a2518754796016f177e1759f4ae50a4dcda333",
  ticker: "HOA",
  decimals: 18,
  name: "Hex Orange Address"
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
  a: "0xca35638a3fddd02fec597d8c1681198c06b23f58",
  dexs: "0xefab2c9c33c42960f2ff653adb39dc5c4c10630e",
  ticker: "TIME",
  decimals: 18,
  name: "TIME on PulseChain"
}, {
  chain: 369,
  a: "0x5a9780bfe63f3ec57f01b087cd65bd656c9034a8",
  dexs: "0x5137a308dbf822aae9fb34467633baaa516ed099",
  ticker: "COM",
  decimals: 12,
  name: "Communis on Pls"
}, {
  chain: 369,
  a: "0xcfcffe432a48db53f59c301422d2edd77b2a88d7",
  dexs: "0x53bf2cc26381ea7ebb927e220008bbff3447a2ec",
  ticker: "TEXAN",
  decimals: 18,
  name: "Texan on PulseChain"
}, {
  chain: 369,
  a: "0x9565c2036963697786705120fc59310f747bcfd0",
  dexs: "0x329958477eaa4bfc9a036ba620a7e71de75d44d4",
  ticker: "PP",
  decimals: 18,
  name: "PoorPleb on PulseChain"
}, {
  chain: 369,
  a: "0x26179a4d4b58b4456f28d19507546596c9058ee5",
  dexs: "0xfa43662b83b8827a4f0427d70a31884f86cddad2",
  ticker: "WAIT",
  decimals: 8,
  name: "Wait on PulseChain"
}, {
  chain: 369,
  a: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
  dexs: "0x6444456960c3f95b5b408f4d9e00220643f06f94",
  ticker: "pUSDC",
  decimals: 6,
  name: "USDC on PulseChain"
}, {
  chain: 369,
  a: "0xdac17f958d2ee523a2206206994597c13d831ec7",
  dexs: "0xfadc475639131c1eac3655c37eda430851d53716",
  ticker: "pUSDT",
  decimals: 6,
  name: "USDT on PulseChain"
}, {
  chain: 369,
  a: "0x6b175474e89094c44da98b954eedeac495271d0f",
  dexs: "0xfc64556faa683e6087f425819c7ca3c558e13ac1",
  ticker: "pDAI",
  decimals: 18,
  name: "DAI on PulseChain"
}, {
  chain: 369,
  a: "0x8a7fdca264e87b6da72d000f22186b4403081a2a",
  dexs: "0x61c8d2dee20f8e303b999d485cfa577054196b40",
  ticker: "pXEN",
  decimals: 18,
  name: "XEN on PulseChain"
}, {
  chain: 369,
  a: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
  dexs: "0x7994d526a127979bcb9ec7c98509bb5c7ebd78fd",
  ticker: "pWETH",
  decimals: 18,
  name: "pWETH on PulseChain"
}, {
  chain: 369,
  a: "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599",
  dexs: "0x46e27ea3a035ffc9e6d6d56702ce3d208ff1e58c",
  ticker: "pWBTC",
  decimals: 8,
  name: "WBTC on PulseChain"
}, {
  chain: 369,
  a: "0x514910771af9ca656af840dff83e8264ecf986ca",
  dexs: "0x5f445cd298318bbe33eb2ab060f483327eee25a3",
  ticker: "pLINK",
  decimals: 18,
  name: "LINK on PulseChain"
}, {
  chain: 369,
  a: "0x1f9840a85d5af5bf1d1762f925bdaddc4201f984",
  dexs: "0xa9889269c6d42d91303539b6588637d42677e716",
  ticker: "pUNI",
  decimals: 18,
  name: "UNI on PulseChain"
}, {
  chain: 369,
  a: "0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9",
  dexs: "0x99e4f4b99ebb3407c9fa656d7650232ec9a4c65c",
  ticker: "pAAVE",
  decimals: 18,
  name: "Aave on PulseChain"
}, {
  chain: 369,
  a: "0x95ad61b0a150d79219dcf64e1e6cc01f0b64c4ce",
  dexs: "0xe11ae46aa5200984d59ff54f3b2c7ff6ac6ef749",
  ticker: "pSHIB",
  decimals: 18,
  name: "Shiba Inu on PulseChain"
}, {
  chain: 369,
  a: "0x6982508145454ce325ddbe47a25d4ec3d2311933",
  dexs: "0xddaa0f4bf2eaee8e13b2045d03075c1822856dc6",
  ticker: "pPEPE",
  decimals: 18,
  name: "Pepe on PulseChain"
}, {
  chain: 369,
  a: "0xa0b73e1ff0b80914ab6fe0444e65848c4c34450b",
  dexs: "0xb3ed95b7c4bb0f532745873fe4a8fdaf4a4b7dae",
  ticker: "pCRO",
  decimals: 8,
  name: "Cronos on PulseChain"
}, {
  chain: 369,
  a: "0x9f8f72aa9304c8b593d555f12ef6589cc3a579a2",
  dexs: "0x4012809a1daa8de48703dcb097d1ef85b4ecad2b",
  ticker: "pMKR",
  decimals: 18,
  name: "Maker on PulseChain"
}, {
  chain: 369,
  a: "0x6810e776880c02933d47db1b9fc05908e5386b96",
  dexs: "0x7c69b191990891392ea6909e5c8679e16ae9efd5",
  ticker: "pGNO",
  decimals: 18,
  name: "Gnosis on PulseChain"
}, {
  chain: 369,
  a: "0x3845badade8e6dff049820680d1f14bd3903a5d0",
  dexs: "0x6675d999f0fadede8ac34a270f94534391b83178",
  ticker: "pSAND",
  decimals: 18,
  name: "SAND on PulseChain"
}, {
  chain: 369,
  a: "0x2ba592f78db6436527729929aaf6c908497cb200",
  dexs: "0x81d5656ac4b88520fa961c61051fc1c8a430d85a",
  ticker: "pCREAM",
  decimals: 18,
  name: "Cream on PulseChain"
}, {
  chain: 369,
  a: "0x45804880de22913dafe09f4980848ece6ecbaf78",
  dexs: "0x6d74443bb2d50785989a7212ebfd3a8dbabd1f60",
  ticker: "pPAXG",
  decimals: 18,
  name: "Paxos Gold on PulseChain"
}, {
  chain: 369,
  a: "0xba100000625a3754423978a60c9317c58a424e3d",
  dexs: "0xbbc3e76168708069a2889a1c179b14d56522102a",
  ticker: "pBAL",
  decimals: 18,
  name: "Balancer on PulseChain"
}, {
  chain: 369,
  a: "0x0000000000085d4780b73119b644ae5ecd22b376",
  dexs: "0x0c330f304ba67cd4a41538bdebb7f20d057d965c",
  ticker: "pTUSD",
  decimals: 18,
  name: "TrueUSD on PulseChain"
}, {
  chain: 369,
  a: "0x6de037ef9ad2725eb40118bb1702ebb27e4aeb24",
  dexs: "0xbde8ed758636a1625cf787e7902bf42389a7d4d7",
  ticker: "pRNDR",
  decimals: 18,
  name: "Render on PulseChain"
}, {
  chain: 369,
  a: "0x5a98fcbea516cf06857215779fd812ca3bef1b32",
  dexs: "0x36d26c73725c68c3b08ab212c69062ea66db0c63",
  ticker: "pLDO",
  decimals: 18,
  name: "LDO on PulseChain"
}, {
  chain: 369,
  a: "0x4d224452801aced8b2f0aebe155379bb5d594381",
  dexs: "0x03b979d18ecac073a71542a3438b6f62c1123bca",
  ticker: "pAPE",
  decimals: 18,
  name: "ApeCoin on PulseChain"
}, {
  chain: 369,
  a: "0x0d8775f648430679a709e98d2b0cb6250d2887ef",
  dexs: "0xff11034318cfc2c128ab768a381121f78635fe6b",
  ticker: "pBAT",
  decimals: 18,
  name: "BAT on PulseChain"
}, {
  chain: 369,
  a: "0xc00e94cb662c3520282e6f5717214004a7f26888",
  dexs: "0x57251492b7f9b8ecd8a7209c9eef555501c268bb",
  ticker: "pCOMP",
  decimals: 18,
  name: "Compound on Pls"
}, {
  chain: 369,
  a: "0xc18360217d8f7ab5e7c516566761ea12ce7f9d72",
  dexs: "0x9c0b6be9d7fa8d5aca34feadf43869645001a506",
  ticker: "pENS",
  decimals: 18,
  name: "ENS on PulseChain"
}, {
  chain: 369,
  a: "0xaea46a60368a7bd060eec7df8cba43b7ef41ad85",
  dexs: "0x3f66977a6cb836331b3f086aecb7badc037dc2bb",
  ticker: "pFET",
  decimals: 18,
  name: "Fetch on PulseChain"
}, {
  chain: 369,
  a: "0xc944e90c64b2c07662a292be6244bdf05cda44a7",
  dexs: "0xff7677255c18cc79a4519d8900b8127eec540bff",
  ticker: "pGRT",
  decimals: 18,
  name: "GRT on PulseChain"
}, {
  chain: 369,
  a: "0xf57e7e7c23978c3caec3c3548e3d615c346e79ff",
  dexs: "0x39b9628cfac12d8c3bbe39ff7c4a8e8e8c4c8e77",
  ticker: "pIMX",
  decimals: 18,
  name: "IMX on PulseChain"
}, {
  chain: 369,
  a: "0x0f5d2fb29fb7d3cfee444a200298f468908cc942",
  dexs: "0x4c3f603c3d7105f22c3b18df4383ed8e13a7a516",
  ticker: "pMANA",
  decimals: 18,
  name: "Mana on PulseChain"
}, {
  chain: 369,
  a: "0x75231f58b43240c9718dd58b4967c5114342a86c",
  dexs: "0xbc4d066edac47c96741d4f252bc8ca7cafa12984",
  ticker: "pOKB",
  decimals: 18,
  name: "OKB on PulseChain"
}, {
  chain: 369,
  a: "0x582d872a1b094fc48f5de31d3b73f2d9be47def1",
  dexs: "0x3d7790b8ba13ffa1d68e2dfe3cf4bb391d05a986",
  ticker: "pTON",
  decimals: 9,
  name: "Toncoin on PulseChain"
}, {
  chain: 369,
  a: "0x0bc529c00c6401aef6d220be8c6ea1667f6ad93e",
  dexs: "0xb11c910451be27fbedd28ea0ecf723a3263ccd48",
  ticker: "pYFI",
  decimals: 18,
  name: "YFI on PulseChain"
}, {
  chain: 369,
  a: "0xd46ba6d942050d489dbd938a2c909a5d5039a161",
  dexs: "0xf0970343ebd446c46353ad50628c2c177dc2cc87",
  ticker: "pAMPL",
  decimals: 9,
  name: "Ampleforth on PulseChain"
}, {
  chain: 369,
  a: "0xc669928185dbce49d2230cc9b0979be6dc797957",
  dexs: "0x7d52a084db5c8a0f51b3b1828a12eaee8c25985f",
  ticker: "pBTT",
  decimals: 18,
  name: "BitTorrent on PulseChain"
}, {
  chain: 369,
  a: "0xae7ab96520de3a18e5e111b5eaab095312d7fe84",
  dexs: "0xefe14ed5fc8fa9c3bd87cd3e0017235bcccf763e",
  ticker: "pSTETH",
  decimals: 18,
  name: "Staked ETH on PulseChain"
}, {
  chain: 1,
  a: "0x2b591e99afe9f32eaa6214f7b7629768c40eeb39",
  dexs: "0x9e0905249ceefffb9605e034b534544684a58be6",
  ticker: "eHEX",
  decimals: 8,
  name: "HEX on Ethereum"
},
{
  chain: 369,
  a: "0x57fde0a71132198BBeC939B98976993d8D89D225",
  dexs: "0x922723FC4de3122F7DC837E2CD2b82Dce9dA81d2",
  ticker: "weHEX",
  decimals: 8,
  name: "Wrapped HEX from Eth"
}];

export const API_ENDPOINTS = {
  historic_pulsechain: 'https://hexdailystats.com/fulldatapulsechain',
  historic_ethereum: 'https://hexdailystats.com/fulldata',
  livedata: 'https://hexdailystats.com/livedata'
}

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

