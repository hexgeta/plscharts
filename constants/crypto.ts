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
  hardcodedPrice?: number
}

export const TOKEN_CONSTANTS = [{
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
  name: "HEX on Pls"
}, {
  chain: 369,
  a: "0x2fa878ab3f87cc1c9737fc071108f904c0b0c95d",
  dexs: "0xf808bb6265e9ca27002c0a04562bf50d4fe37eaa",
  ticker: "INC",
  decimals: 18,
  name: "Incentive"
}, {
  chain: 369,
  a: "0xaE8429918FdBF9a5867e3243697637Dc56aa76A1",
  dexs: null,
  ticker: "DAI \/ WPLS (v2)",
  decimals: 18,
  name: "PulseX V2",
  type: "lp",
  platform: "PLSX V2"
}, {
  chain: 369,
  a: "0x19bb45a7270177e303dee6eaa6f5ad700812ba98",
  dexs: null,
  ticker: "HEX \/ WPLS (v2)",
  decimals: 18,
  name: "PulseX V2",
  type: "lp",
  platform: "PLSX V2"
}, {
  chain: 369,
  a: "0x149b2c629e652f2e89e11cd57e5d4d77ee166f9f",
  dexs: null,
  ticker: "PLSX \/ WPLS (v2)",
  decimals: 18,
  name: "PulseX V2",
  type: "lp",
  platform: "PLSX V2"
}, {
  chain: 369,
  a: "0x29d66D5900Eb0d629E1e6946195520065A6c5aeE",
  dexs: null,
  ticker: "WETH \/ WPLS (v2)",
  decimals: 18,
  name: "PulseX V2",
  type: "lp",
  platform: "PLSX V2"
}, {
  chain: 369,
  a: "0x922723FC4de3122F7DC837E2CD2b82Dce9dA81d2",
  dexs: null,
  ticker: "HEX \/ weHEX (v2)",
  decimals: 18,
  name: "PulseX V2",
  type: "lp",
  platform: "PLSX V2"
}, {
  chain: 369,
  a: "0x78D58247BE592F3Cb7B87A5650c6B466Ce4a5476",
  dexs: null,
  ticker: "pWBTC \/ DAI (v2)",
  decimals: 18,
  name: "PulseX V2",
  type: "lp",
  platform: "PLSX V2"
}, {
  chain: 369,
  a: "0xC475332e92561CD58f278E4e2eD76c17D5b50f05",
  dexs: null,
  ticker: "USDC \/ HEX (v2)",
  decimals: 18,
  name: "PulseX V2",
  type: "lp",
  platform: "PLSX V2"
}, {
  chain: 369,
  a: "0xF0eA3efE42C11c8819948Ec2D3179F4084863D3F",
  dexs: null,
  ticker: "weHEX \/ WPLS (v2)",
  decimals: 18,
  name: "PulseX V2",
  type: "lp",
  platform: "PLSX V2"
}, {
  chain: 369,
  a: "0x31eF9a41500E6BD18524404aC9c5B88D04AA924E",
  dexs: null,
  ticker: "WPLS \/ BEAR (v2)",
  decimals: 18,
  name: "PulseX V2",
  type: "lp",
  platform: "PLSX V2"
}, {
  chain: 369,
  a: "0xe0e1f83a1c64cf65c1a86d7f3445fc4f58f7dcbf",
  dexs: null,
  ticker: "pWBTC \/ WPLS (v2)",
  decimals: 18,
  name: "PulseX V2",
  type: "lp",
  platform: "PLSX V2"
}, {
  chain: 369,
  a: "0x5B9661276708202DD1A0dD2346A3856b00d3c251",
  dexs: null,
  ticker: "INC \/ WPLS (v2)",
  decimals: 18,
  name: "PulseX V2",
  type: "lp",
  platform: "PLSX V2"
}, {
  chain: 369,
  a: "0x9b82FeE4e54011fe7e5352317d6C7fDc5d2c1ACe",
  dexs: null,
  ticker: "HEX \/ WPLS (Alt)",
  decimals: 18,
  name: "PulseX V2",
  type: "lp",
  platform: "PLSX V2"
}, {
  chain: 369,
  a: "0x9b82FeE4e54011fe7e5352317d6C7fDc5d2c1ACe",
  dexs: null,
  ticker: "HEX (from pump.tires)  \/ WPLS",
  decimals: 18,
  name: "PulseX V2",
  type: "lp",
  platform: "PLSX V2"
}, {
  chain: 369,
  a: "0x6f7736Da2965cC49a1e43a5D449a7bAF7011E524",
  dexs: null,
  ticker: "WETH  \/ PLSX (v2)",
  decimals: 18,
  name: "PulseX V2",
  type: "lp",
  platform: "PLSX V2"
}, {
  chain: 369,
  a: "0xfC64556FAA683e6087F425819C7Ca3C558e13aC1",
  dexs: null,
  ticker: "pDAI  \/ weDAI (v2)",
  decimals: 18,
  name: "PulseX V2",
  type: "lp",
  platform: "PLSX V2"
}, {
  chain: 369,
  a: "0xeC052d46D3115DF7F6058160Cd0b87b272201341",
  dexs: null,
  ticker: "WPLS  \/ DAI (from pump.tires)",
  decimals: 18,
  name: "PulseX V2",
  type: "lp",
  platform: "PLSX V2"
}, {
  chain: 369,
  a: "0xE3acFA6C40d53C3faf2aa62D0a715C737071511c",
  dexs: null,
  ticker: "USDT  \/ USDC \/ DAI",
  decimals: 18,
  name: "PulseX Stable Pool",
  type: "lp",
  platform: "PulseX Stable Pool"
}, {
  chain: 369,
  a: "0xE56043671df55dE5CDf8459710433C10324DE0aE",
  dexs: null,
  ticker: "WPLS \/ weDAI (v1)",
  decimals: 18,
  name: "PulseX V1",
  type: "lp",
  platform: "PLSX V1"
}, {
  chain: 369,
  a: "0x42AbdFDB63f3282033C766E72Cc4810738571609",
  dexs: null,
  ticker: "WETH \/ WPLS (v1)",
  decimals: 18,
  name: "PulseX V1",
  type: "lp",
  platform: "PLSX V1"
}, {
  chain: 369,
  a: "0x1b45b9148791d3a104184Cd5DFE5CE57193a3ee9",
  dexs: null,
  ticker: "PLSX \/ WPLS (v1)",
  decimals: 18,
  name: "PulseX V1",
  type: "lp",
  platform: "PLSX V1"
}, {
  chain: 369,
  a: "0x6753560538ECa67617A9Ce605178F788bE7E524E",
  dexs: null,
  ticker: "weUSDC \/ WPLS",
  decimals: 18,
  name: "PulseX V1",
  type: "lp",
  platform: "PLSX V1"
}, {
  chain: 369,
  a: "0xf1f4ee610b2babb05c635f726ef8b0c568c8dc65",
  dexs: null,
  ticker: "HEX \/ WPLS (v1)",
  decimals: 18,
  name: "PulseX V1",
  type: "lp",
  platform: "PLSX V1"
}, {
  chain: 369,
  a: "0x03250E1f707E9Fb1CD41B8C2696c0e8eab5B42De",
  dexs: null,
  ticker: "WPLS \/ PCOCK (v1)",
  decimals: 18,
  name: "PulseX V1",
  type: "lp",
  platform: "PLSX V1"
}, {
  chain: 369,
  a: "0x322Df7921F28F1146Cdf62aFdaC0D6bC0Ab80711",
  dexs: null,
  ticker: "weUSDT \/ WPLS (v1)",
  decimals: 18,
  name: "PulseX V1",
  type: "lp",
  platform: "PLSX V1"
}, {
  chain: 369,
  a: "0xf808Bb6265e9Ca27002c0A04562Bf50d4FE37EAA",
  dexs: null,
  ticker: "INC \/ WPLS (v1)",
  decimals: 18,
  name: "PulseX V1",
  type: "lp",
  platform: "PLSX V1"
}, {
  chain: 369,
  a: "0x46E27Ea3A035FfC9e6d6D56702CE3D208FF1e58c",
  dexs: null,
  ticker: "pWBTC \/ WPLS (v1)",
  decimals: 18,
  name: "PulseX V1",
  type: "lp",
  platform: "PLSX V1"
}, 
{
  chain: 369,
  a: "0x7Dbeca4c74d01cd8782D4EF5C05C0769723fb0ea",
  dexs: null,
  ticker: "INC \/ PLSX (v1)",
  decimals: 18,
  name: "PulseX V1",
  type: "lp",
  platform: "PLSX V1"
}, {
  chain: 369,
  a: "0x03bb886995f4F699dE817582859686388aCB1D56",
  dexs: null,
  ticker: "TFC \/ WPLS (v1)",
  decimals: 18,
  name: "PulseX V1",
  type: "lp",
  platform: "PLSX V1"
}, {
  chain: 369,
  a: "0x947b4633e32E0c7f2c76753B43F008480715416D",
  dexs: null,
  ticker: "pDAI \/ WPLS (v1)",
  decimals: 18,
  name: "PulseX V1",
  type: "lp",
  platform: "PLSX V1"
}, {
  chain: 369,
  a: "0x5EF7AaC0DE4F2012CB36730Da140025B113FAdA4",
  dexs: null,
  ticker: "pDAI \/ ATROPA (v1)",
  decimals: 18,
  name: "PulseX V1",
  type: "lp",
  platform: "PLSX V1"
}, {
  chain: 369,
  a: "0x6F1747370B1CAcb911ad6D4477b718633DB328c8",
  dexs: null,
  ticker: "HEX \/ weDAI (v1)",
  decimals: 18,
  name: "PulseX V1",
  type: "lp",
  platform: "PLSX V1"
}, {
  chain: 369,
  a: "0x1dA059091d5fe9F2d3781e0FdA238BB109FC6218",
  dexs: null,
  ticker: "HEX \/ weHEX (v1)",
  decimals: 18,
  name: "PulseX V1",
  type: "lp",
  platform: "PLSX V1"
}, {
  chain: 369,
  a: "0xa04620601d7DAdc3BD1c99312A699aDe8e6C16d2",
  dexs: null,
  ticker: "HEX \/ PLSX (v1)",
  decimals: 18,
  name: "PulseX V1",
  type: "lp",
  platform: "PLSX V1"
}, {
  chain: 369,
  a: "0xcBBad671CA3A46A565551335C10144e75554B367",
  dexs: null,
  ticker: "WPLS \/ ATROPA (v1)",
  decimals: 18,
  name: "PulseX V1",
  type: "lp",
  platform: "PLSX V1"
}, {
  chain: 369,
  a: "0x6444456960C3f95b5b408f4d9E00220643f06F94",
  dexs: null,
  ticker: "pUSDC \/ WPLS (v1)",
  decimals: 18,
  name: "PulseX V1",
  type: "lp",
  platform: "PLSX V1"
}, {
  chain: 369,
  a: "0xc10A4Ed9b4042222d69ff0B374eddd47ed90fC1F",
  dexs: "0x03250E1f707E9Fb1CD41B8C2696c0e8eab5B42De",
  ticker: "PCOCK",
  decimals: 18,
  name: "PCOCK"
}, {
  chain: 369,
  a: "0xE9E1340A2b31d5D2a2dB28FB854a794E106b430a",
  dexs: null,
  ticker: "HTT3000",
  decimals: 8,
  name: "HEX Time Token - 3k Days"
}, {
  chain: 369,
  a: "0xE2D03779147A32064511dd2b9D37F66f3EeFAd7C",
  dexs: "0x290e43f97a071f7513f55B534b2C196b9eFa364C",
  ticker: "HTT5000",
  decimals: 8,
  name: "HEX Time Token - 5k Days"
}, {
  chain: 369,
  a: "0x47810bb3ECDc6b080CeB2d39E769F21Ff14AB7E9",
  dexs: "0x0d37481cD2c2E1a309a159Fd08D9F6eFd0a1F224",
  ticker: "HTT7000",
  decimals: 8,
  name: "HEX Time Token - 7k Days"
}, {
  chain: 369,
  a: "0x5e01BBc8944D3e10141B1Dabc626d9D37bc9Ad41",
  dexs: "0x7c189232df88431017A471a1333acDA05E25d8f3",
  ticker: "ALAMO",
  decimals: 18,
  name: "The Alamo"
}, {
  chain: 369,
  a: "0xA80736067abDc215a3b6B66a57c6e608654d0C9a",
  dexs: "0xD8836E8975A6BBeafBDe651E4D1fF59Dc99D45c0",
  ticker: "BRIAH",
  decimals: 18,
  name: "Briah"
}, 
{
  chain: 369,
  a: "0x57fde0a71132198BBeC939B98976993d8D89D225",
  dexs: "0x922723FC4de3122F7DC837E2CD2b82Dce9dA81d2",
  ticker: "weHEX",
  decimals: 8,
  name: "Wrapped HEX from Eth"
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
  dexs: ["0x29d66D5900Eb0d629E1e6946195520065A6c5aeE"],
  ticker: "weWETH",
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
  a: "0x3819f64f282bf135d62168c1e513280daf905e06",
  dexs: "0x5f4cb14a7858bdb9066f9e4b561cdc1623807da0",
  ticker: "HDRN",
  decimals: 9,
  name: "Hedron on Pls"
}, {
  chain: 369,
  a: "0xfc4913214444af5c715cc9f7b52655e788a569ed",
  dexs: "0xe5bb65e7a384d2671c96cfe1ee9663f7b03a573e",
  ticker: "ICSA",
  decimals: 9,
  name: "ICSA on Pls"
}, 
{
  chain: 369,
  a: "0x5a9780bfe63f3ec57f01b087cd65bd656c9034a8",
  dexs: "0x5137a308dbf822aae9fb34467633baaa516ed099",
  ticker: "COM",
  decimals: 12,
  name: "Communis on Pls"
},  
{
  chain: 369,
  a: "0x7FB5120D2DB148e91f572d2f69bC04FE454Dbd9b",
  dexs: "0x0b353e0328C519F35B30BD0B4ceaF753b2bBbAAB",
  ticker: "uPLS",
  decimals: 18,
  name: "PlusX's Liquid Staked PLS"
},
{
  chain: 369,
  a: "0x79BB3A0Ee435f957ce4f54eE8c3CFADc7278da0C",
  dexs: "0x46814b3f18D90625B6E166bC2917Bb64a635d797",
  ticker: "vPLS",
  decimals: 18,
  name: "Vouch Staked PLS"
},
{
  chain: 369,
  a: "0x21dCB2c16C3773A565AcB45f6c34348EC78a8385",
  dexs: "0x9CB24fBC2f1454aF20e3c14b0d1f50c9376CfA82",
  ticker: "stPLS",
  decimals: 18,
  name: "Project Pi Liquid Staking Token"
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
  a: "0xabf663531fa10ab8116cbf7d5c6229b018a26ff9",
  dexs: ["0x989963cACdc93470bD733bcb926475817b1ce03E"],
  ticker: "weHDRN",
  decimals: 9,
  name: "Wrapped HDRN from Eth",
  origin: [1, "0x3819f64f282bf135d62168c1e513280daf905e06"]
}, {
  chain: 369,
  a: "0xb4d363d5df85f0fbc746c236fd410d82bf856f78",
  dexs: ["0xEE0395AEa26fE8B5ca6BDF73a746cecc105d3ECF"],
  ticker: "weICSA",
  decimals: 9,
  name: "Wrapped ICSA from Eth",
  origin: [1, "0xfc4913214444af5c715cc9f7b52655e788a569ed"]
},{
  chain: 369,
  a: "0xda073388422065fe8d3b5921ec2ae475bae57bed",
  dexs: ["0xe9f84d418b008888a992ff8c6d22389c2c3504e0"],
  ticker: "weBASE",
  decimals: 8,
  name: "Wrapped BASE from Eth",
  origin: [1, "0xe9f84d418b008888a992ff8c6d22389c2c3504e0"],
  supply: 70668766.59912861,
  stakeType: 'rolling',
  launchDate: new Date('2024-10-26'),
  stakePrinciple: 88475347.99948653,
  tokenSupply: 70668766.59912861,
  tshares: 2939.965758095464,
  stakeStartDate: new Date('2024-10-26'),
  stakeEndDate: new Date('2025-10-30'),
  totalStakedDays: 369
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
  name: "PXDC Stablecoin (Powercity)"
}, {
  chain: 369,
  a: "0x9c6fa17d92898b684676993828143596894aa2a6",
  dexs: "0x476d63ab94b4e86614df0c3d5a27e9e22631d062",
  ticker: "FLEX",
  decimals: 8,
  name: "Powercity FLEX"
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
  a: "0x0d86eb9f43c57f6ff3bc9e23d8f9d82503f0e84b",
  dexs: "0xbfb22cc394c53c14dc8a5840a246dfdd2f7b2507",
  ticker: "MAXI",
  decimals: 8,
  name: "Maxi on PulseChain",
  supply: 274546065,
  stakeType: 'fixed',
  launchDate: new Date('2022-05-01'),
  tshares: 42104.43801001704,
  stakePrinciple: 294323603.76679647,
  tokenSupply: 274546065,
  stakeStartDate: new Date('2022-05-01'),
  stakeEndDate: new Date('2037-07-16'),
  totalStakedDays: 5555,
}, {
  chain: 369,
  a: "0x6b32022693210cd2cfc466b9ac0085de8fc34ea6",
  dexs: "0x969af590981bb9d19ff38638fa3bd88aed13603a",
  ticker: "DECI",
  decimals: 8,
  name: "DECI on PulseChain",
  supply: 565991987.7294711,
  stakeType: 'rolling',
  launchDate: new Date('2022-09-27'),
  stakePrinciple: 565991987.7294711,
  tokenSupply: 565991987.7294711,
  tshares: 71337.83,
  stakeStartDate: new Date('2022-09-27'),
  stakeEndDate: new Date('2032-11-09'),
  totalStakedDays: 3696,
  pair: {
    pairAddress: '0x969af590981bb9d19ff38638fa3bd88aed13603a',
    chain: 'pulsechain'
  }
}, {
  chain: 369,
  a: "0x6b0956258ff7bd7645aa35369b55b61b8e6d6140",
  dexs: "0x52d4b3f479537a15d0b37b6cdbdb2634cc78525e",
  ticker: "LUCKY",
  decimals: 8,
  name: "LUCKY on PulseChain",
  supply: 74985501.67671512,
  stakeType: 'rolling',
  launchDate: new Date('2022-09-27'),
  stakePrinciple: 74985501.67671512,
  tokenSupply: 74985501.67671512,
  tshares: 7524.68,
  stakeStartDate: new Date('2022-09-27'),
  stakeEndDate: new Date('2029-09-25'),
  totalStakedDays: 2555,
  pair: {
    pairAddress: '0x52d4b3f479537a15d0b37b6cdbdb2634cc78525e',
    chain: 'pulsechain'
  }
}, {
  chain: 369,
  a: "0xf55cd1e399e1cc3d95303048897a680be3313308",
  dexs: "0x0b0f8f6c86c506b70e2a488a451e5ea7995d05c9",
  ticker: "TRIO",
  decimals: 8,
  name: "TRIO on PulseChain",
  supply: 69617911.47775,
  stakeType: 'rolling',
  launchDate: new Date('2022-09-27'),
  stakePrinciple: 69617911.47775,
  tokenSupply: 69617911.47775,
  tshares: 4698.32,
  stakeStartDate: new Date('2022-09-27'),
  stakeEndDate: new Date('2025-10-12'),
  totalStakedDays: 1111,
}, {
  chain: 369,
  a: "0xe9f84d418b008888a992ff8c6d22389c2c3504e0",
  dexs: "0xb39490b46d02146f59e80c6061bb3e56b824d672",
  ticker: "BASE",
  decimals: 8,
  name: "BASE on PulseChain",
  supply: 54165743.289,
  launchDate: new Date('2024-09-23'),
  stakePrinciple: 67444991.8094404,
  tokenSupply: 54165743.289,
  tshares: 2232.801612927137,
  stakeStartDate: new Date('2024-09-23'),
  stakeEndDate: new Date('2025-10-27'),
  totalStakedDays: 369
}, {
  chain: 369,
  a: "0xb7c9e99da8a857ce576a830a9c19312114d9de02",
  dexs: "0x55b4387ff2cf168801ec64ca8221e035fd07b81d",
  ticker: "TEAM",
  decimals: 8,
  name: "Team on PulseChain"
}, {
  chain: 369,
  a: "0x4581af35199bbde87a89941220e04e27ce4b0099",
  dexs: "0x70966CcB20C10Ae326D6368A107C80fb825F3028",
  ticker: "PARTY",
  decimals: 18,
  name: "Pool Party on PulseChain"
}, {
  chain: 369,
  a: "0x207e6b4529840a4fd518f73c68bc9c19b2a15944",
  dexs: "0x5f2d8624e6abea8f679a1095182f4bc84fe148e0",
  ticker: "MINT",
  decimals: 18,
  name: "Mintra"
}, {
  chain: 369,
  a: "0x9159f1d2a9f51998fc9ab03fbd8f265ab14a1b3b",
  dexs: "0x6d69654390c70d9e8814b04c69a542632dc93161",
  ticker: "LOAN",
  decimals: 18,
  name: "LOAN"
},  {
  chain: 369,
  a: "0xcc78a0acdf847a2c1714d2a925bb4477df5d48a6",
  dexs: "0x859b67601353d6b6cfb8f52edf83de9c5b90b0d2",
  ticker: "ATROPA",
  decimals: 18,
  name: "Atropa"
},  {
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
  a: "0xde4ef7ea464c7771803b9838aea07ce41089b054",
  dexs: "0x070f760b51285cb775e2e2353927c4bfacc8b6aa",
  ticker: "PNS",
  decimals: 18,
  name: "Greenland"
},  {
  chain: 369,
  a: "0x2a06a971fe6ffa002fd242d437e3db2b5cc5b433",
  dexs: "0xe98250bb335f5662edca64c76c37c95a3334f358",
  ticker: "PTS",
  decimals: 18,
  name: "Piteas"
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
  a: "0xbeef3bb9da340ebdf0f5bae2e85368140d7d85d0",
  dexs: "0xbd1364edba35a7284ebac9710894c9b2d5ebf8c5",
  ticker: "MORE",
  decimals: 18,
  name: "More"
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
  a: "0x94534eeee131840b1c0f61847c572228bdfdde93",
  dexs: "0xf5a89a6487d62df5308cdda89c566c5b5ef94c11",
  ticker: "PTGC",
  decimals: 18,
  name: "Grays Currency"
}, {
  chain: 369,
  a: "0x456548a9b56efbbd89ca0309edd17a9e20b04018",
  dexs: "0x5b002c8ad3c23b4021f75003fEcf01a10b11F6Ca",
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
  a: "0xaebcd0f8f69ecf9587e292bdfc4d731c1abedb68",
  dexs: "0x3584ae4d7046c160ba9c64bb53951285c4b2abfd",
  ticker: "DWB",
  decimals: 18,
  name: "DickWifButt"
}, {
  chain: 369,
  a: "0xe33a5ae21f93acec5cfc0b7b0fdbb65a0f0be5cc",
  dexs: "0x908b5490414518981ce5c473ff120a6b338fef67",
  ticker: "MOST",
  decimals: 18,
  name: "MostWanted from pump.tires (@36DC0C)"
}, {
  chain: 369,
  a: "0xec4252e62c6de3d655ca9ce3afc12e553ebba274",
  dexs: "0x96fefb743b1d180363404747bf09bd32657d8b78",
  ticker: "PUMP",
  decimals: 18,
  name: "PUMP from pump.tires (@36DC0C)"
}, {
  chain: 369,
  a: "0x8cC6d99114Edd628249fAbc8a4d64F9A759a77Bf",
  dexs: "0x2e2A603a35bff3c3e6a21A289Dfd5144d921d3a0",
  ticker: "TRUMP",
  decimals: 18,
  name: "Trump from pump.tires (@36DC0C)"
}, {
  chain: 369,
  a: "0x7901a3569679aec3501dbec59399f327854a70fe",
  dexs: "0xd1a2518754796016f177e1759f4ae50a4dcda333",
  ticker: "HOA",
  decimals: 18,
  name: "Hex Orange Address"
}, {
  chain: 369,
  a: "0xa73f450e3f17468a64bfdd222b099857db76634d",
  dexs: "0x6c66a53f9B66736Cf2AFfC4396F7C58a91dF73C6",
  ticker: "LHEX",
  decimals: 8,
  name: "Liquid HEX"
},  {
  chain: 369,
  a: "0xca35638a3fddd02fec597d8c1681198c06b23f58",
  dexs: "0xefab2c9c33c42960f2ff653adb39dc5c4c10630e",
  ticker: "TIME",
  decimals: 18,
  name: "T.I.M.E. Dividend on PulseChain"
}, {
  chain: 369,
  a: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
  dexs: "0x6444456960C3f95b5b408f4d9E00220643f06F94",
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
  ticker: "pstETH",
  decimals: 18,
  name: "Staked ETH on PulseChain"
}, {
  chain: 1,
  a: "0x2b591e99afe9f32eaa6214f7b7629768c40eeb39",
  dexs: "0x9e0905249ceefffb9605e034b534544684a58be6",
  ticker: "eHEX",
  decimals: 8,
  name: "HEX on Eth"
}, {
  chain: 369,
  a: "0x3ab667c153b8dd2248bb96e7a2e1575197667784",
  dexs: ["0xe48476645462B7F7Ddc0E4D20eC5DD1AD56203dE"],
  ticker: "weSHIB",
  decimals: 18,
  name: "Wrapped SHIB from Eth",
  origin: [1, "0x95ad61b0a150d79219dcf64e1e6cc01f0b64c4ce"]
}, {
  chain: 369,
  a: "0xb17d901469b9208b17d916112988a3fed19b5ca1",
  dexs: ["0x8c52470a05eEB2fCe4905688Ec59bFDd32E71D07"],
  ticker: "weWBTC",
  decimals: 8,
  name: "Wrapped BTC from Eth",
  origin: [1, "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599"]
}, {
  chain: 369,
  a: "0xee2d275dbb79c7871f8c6eb2a4d0687dd85409d1",
  dexs: ["0xf1D8a2242A03957eEd09607CeA29B3cDeF2628cd"],
  ticker: "weLINK",
  decimals: 18,
  name: "Wrapped LINK from Eth",
  origin: [1, "0x514910771af9ca656af840dff83e8264ecf986ca"]
}, {
  chain: 369,
  a: "0x1fe0319440a672526916c232eaee4808254bdb00",
  dexs: "0x9756f095dfa27d4c2eae0937a7b8a6603d99affb",
  ticker: "HEXDC",
  decimals: 8,
  name: "HEXDC Stablecoin"
}, {
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
name: "Hedron on Eth"
}, {
chain: 1,
a: "0xfc4913214444af5c715cc9f7b52655e788a569ed",
dexs: "0xbaaf3b7a0b9de67de3097420d31800a885db6b41",
ticker: "eICSA",
decimals: 9,
name: "ICSA on Eth"
}, {
chain: 1,
a: "0xe9f84d418b008888a992ff8c6d22389c2c3504e0",
dexs: "0xe181f3d1cf81c94d770768d48d42d07a9e9819c7",
ticker: "eBASE",
decimals: 8,
name: "BASE on Ethereum",
supply: 70668766.59912861,
stakeType: 'rolling',
launchDate: new Date('2024-10-26'),
stakePrinciple: 88475347.99948653,
tokenSupply: 70668766.59912861,
tshares: 2939.965758095464,
stakeStartDate: new Date('2024-10-26'),
stakeEndDate: new Date('2025-10-30'),
totalStakedDays: 369
}, {
chain: 1,
a: "0xf55cd1e399e1cc3d95303048897a680be3313308",
dexs: "0x0f3c6134f4022d85127476bc4d3787860e5c5569",
ticker: "eTRIO",
decimals: 8,
name: "TRIO on Ethereum",
supply: 69617911.47775,
stakeType: 'rolling',
relatedStakes: ['eTRIO'],
currentActiveStake: 'eTRIO',
launchDate: new Date('2022-09-27'),
stakePrinciple: 69617911.47775,
tokenSupply: 69617911.47775,
tshares: 4698.32,
stakeStartDate: new Date('2022-09-27'),
stakeEndDate: new Date('2025-10-12'),
totalStakedDays: 1111,
}, {
chain: 1,
a: "0x6b0956258ff7bd7645aa35369b55b61b8e6d6140",
dexs: "0x7327325e5f41d4c1922a9dfc87d8a3b3f1ae5c1f",
ticker: "eLUCKY",
decimals: 8,
name: "LUCKY on Ethereum",
supply: 74985501.67671512,
stakeType: 'rolling',
launchDate: new Date('2022-09-27'),
stakePrinciple: 74985501.67671512,
tokenSupply: 74985501.67671512,
tshares: 7524.68,
stakeStartDate: new Date('2022-09-27'),
stakeEndDate: new Date('2029-09-25'),
totalStakedDays: 2555,
}, {
chain: 1,
a: "0x6b32022693210cd2cfc466b9ac0085de8fc34ea6",
dexs: "0xf6ed2390be39c783ae78893c91669eeb635d0429",
ticker: "eDECI",
decimals: 8,
name: "DECI on Ethereum",
supply: 565991987.7294711,
stakeType: 'rolling',
launchDate: new Date('2022-09-27'),
stakePrinciple: 565991987.7294711,
tokenSupply: 565991987.7294711,
tshares: 71337.83,
stakeStartDate: new Date('2022-09-27'),
stakeEndDate: new Date('2032-11-09'),
totalStakedDays: 3696,
}, {
chain: 1,
a: "0x0d86eb9f43c57f6ff3bc9e23d8f9d82503f0e84b",
dexs: "0x2ae4517b2806b84a576c10f698d6567ce80a6490",
ticker: "eMAXI",
decimals: 8,
name: "MAXI on Ethereum",
supply: 274546065,
stakeType: 'fixed',
launchDate: new Date('2022-05-01'),
tshares: 42104.43801001704,
stakePrinciple: 294323603.76679647,
tokenSupply: 274546065,
stakeStartDate: new Date('2022-05-01'),
stakeEndDate: new Date('2037-07-16'),
totalStakedDays: 5555,
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
ticker: "pWPLS",
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
ticker: "ePLSB",
decimals: 12,
name: "PulseBitcoin on Ethereum"
}, {
chain: 1,
a: "0xfd8b9ba4845fb38c779317ec134b298c064937a2",
dexs: "0xe0533126c4013e2f5bcf44a2c84a396219be2d9d",
ticker: "e9INCH",
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
ticker: "westETH",
decimals: 18,
name: "Wrapped stETH"
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
name: "Genius on Ethereum"
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
  a: "0x545998ABCbf0633C83bA20Cb94f384925BE75dd5",
  dexs: null,
  ticker: "Prime PHUX",
  decimals: 18,
  type: "lp",
  platform: "PHUX",
  name: "PHUX LP",
  composition: [
    { ticker: "PHUX", weight: 80.0 },
    { ticker: "WPLS", weight: 20.0 }
  ]
}, {
  chain: 369,
  a: "0xF96d60e9444f19Fe5126888BD53BdE80e58c2851",
  dexs: null,
  ticker: "BridgedSP",
  decimals: 18,
  type: "lp",
  platform: "PHUX",
  name: "PHUX LP"
},     {
  chain: 369,
  a: "0xcE3181167c03AB5a6D84c1a93716521E83A6300b",
  dexs: null,
  ticker: "RH Maxi",
  decimals: 18,
  type: "lp",
  platform: "PHUX",
  name: "RH Maxi",
  composition: [
    { ticker: "WPLS", weight: 40.00 },
    { ticker: "PLSX", weight: 25.00 },
    { ticker: "HEX", weight: 20.00 },
    { ticker: "weHEX", weight: 10.00 },
    { ticker: "INC", weight: 5.00 }
  ]
}, {
  chain: 369,
  a: "0xedd845207362Da4e1950BE55bF72584318A0a4b3",
  dexs: null,
  ticker: "Piteas Prime",
  decimals: 18,
  name: "PHUX LP",
  type: "lp",
  platform: "PHUX",
  composition: [
    { symbol: "PTS", weight: 80.0 },
    { symbol: "WPLS", weight: 20.0 }
  ]
},     {
  chain: 369,
  a: "0xb584A3754C3219187bb05474579dfa11cBb960C4", 
  dexs: null,
  ticker: "Great Time",
  decimals: 18,
  name: "PHUX LP",
  type: "lp",
  platform: "PHUX",
  composition: [
    { ticker: "TIME", weight: 80.0 },
    { ticker: "WPLS", weight: 20.0 }
  ]
},     {
  chain: 369,
  a: "0x7962F72Cb8D2A1924cb49e718be2C370CF578432", 
  dexs: null,
  ticker: "Maximus Perps Maxi",
  decimals: 18,
  name: "PHUX LP",
  type: "lp",
  platform: "PHUX",
  composition: [
    { ticker: "HEX", weight: 30.0 },
    { ticker: "MAXI", weight: 25.0 },
    { ticker: "DECI", weight: 25.0 },
    { ticker: "LUCKY", weight: 8.0 },
    { ticker: "BASE", weight: 6.0 },
    { ticker: "TRIO", weight: 6.0 }
  ]
},     {
  chain: 369,
  a: "0xC116c38B1eF97fE0adB32C96672Ac85079D4e3c0", 
  dexs: null,
  ticker: "Alex Hedron Maxi",
  decimals: 18,
  name: "PHUX LP",
  type: "lp",
  platform: "PHUX",
  composition: [
    { ticker: "HDRN", weight: 41.98 },
    { ticker: "HEX", weight: 40.00 },
    { ticker: "weHDRN", weight: 10.01 },
    { ticker: "ICSA", weight: 7.00 },
    { ticker: "weICSA", weight: 1.01 }
  ]
}, {
  chain: 369,
  a: "0x014F2620A91aD4541b7DD9A1191ACb0909d71494", // Placeholder address - needs to be updated
  dexs: null,
  ticker: "Pareto Pool",
  decimals: 18,
  name: "PHUX LP",
  type: "lp",
  platform: "PHUX",
  composition: [
    { ticker: "PHAME", weight: 80.0 },
    { ticker: "WPLS", weight: 20.0 }
  ]
}, {
  chain: 369,
  a: "0x4942Ab2e69deD72627EeC632bC30e246e5d0ef88", // Placeholder address - needs to be updated
  dexs: null,
  ticker: "Piteas Maxi Pool",
  decimals: 18,
  name: "PHUX LP",
  type: "lp",
  platform: "PHUX",
  composition: [
    { ticker: "PTS", weight: 50.0 },
    { ticker: "WPLS", weight: 25.0 },
    { ticker: "pHEX", weight: 15.0 },
    { ticker: "PLSX", weight: 10.0 }
  ]
}, {
  chain: 369,
  a: "0x7801654b9367eF5d8A460DE8B675E1cb3d65dAEA", // Placeholder address - needs to be updated
  dexs: null,
  ticker: "PLSX Single Sided Staking (Almost)",
  decimals: 18,
  name: "PHUX LP",
  type: "lp",
  platform: "PHUX",
  composition: [
    { ticker: "PLSX", weight: 90.0 },
    { ticker: "Prime PHUX", weight: 5.0 },
    { ticker: "Bridged Stable Pool", weight: 5.0 }
  ]
}, {
  chain: 369,
  a: "0xc2f68C33AE1a60C438DA70396E213d9EF57bAf5F", // Placeholder address - needs to be updated
  dexs: null,
  ticker: "33puP-33WBTC-33uPX",
  decimals: 18,
  name: "PHUX LP",
  type: "lp",
  platform: "PHUX",
  composition: [
    { ticker: "puP", weight: 33.0 },
    { ticker: "WBTC", weight: 33.0 },
    { ticker: "uPX", weight: 33.0 }
  ]
}, {
  chain: 369,
  a: "0x9a8c76db183b47233DAFd42fE07DcE1f7F9ABC15", // Placeholder address - needs to be updated
  dexs: null,
  ticker: "RH PHLPV2",
  decimals: 18,
  name: "PHUX LP",
  type: "lp",
  platform: "PHUX",
  composition: [
    { ticker: "PHLPv2", weight: 50.0 },
    { ticker: "WPLS", weight: 20.0 },
    { ticker: "pHEX", weight: 15.0 },
    { ticker: "PLSX", weight: 15.0 }
  ]
}, {
  chain: 369,
  a: "0xF5bbe8F8B6048aBCb4C733E7360534B8B7336e3A", // Placeholder address - needs to be updated
  dexs: null,
  ticker: "PHORGY Pool",
  decimals: 18,
  name: "PHUX LP",
  type: "lp",
  platform: "PHUX",
  composition: [
    { ticker: "PHLP", weight: 50.0 },
    { ticker: "PHAME", weight: 30.0 },
    { ticker: "PHUX", weight: 10.0 },
    { ticker: "PHIAT", weight: 10.0 }
  ]
}, {
  chain: 369,
  a: "0x7EC26455B86C8e2c61842353365D8Db9ACADCf7E", // Placeholder address - needs to be updated
  dexs: null,
  ticker: "SOLaPLSooZa",
  decimals: 18,
  name: "PHUX LP",
  type: "lp",
  platform: "PHUX",
  composition: [
    { ticker: "SOL", weight: 80.0 },
    { ticker: "WPLS", weight: 20.0 }
  ]
}, {
  chain: 369,
  a: "0x77F2Bc68c9ff4b098Fdec62f9B25D94209023B42", // Placeholder address - needs to be updated
  dexs: null,
  ticker: "Native PHLPV2",
  decimals: 18,
  name: "PHUX LP",
  type: "lp",
  platform: "PHUX",
  composition: [
    { ticker: "PHLPv2", weight: 50.0 },
    { ticker: "wWETH", weight: 13.0 },
    { ticker: "SOL", weight: 13.0 },
    { ticker: "WPLS", weight: 13.0 },
    { ticker: "wWBTC", weight: 13.0 }
  ]
}, {
  chain: 369,
  a: "0x3Bbe6141E5624461Dee48b9673c6A8D22ff3ABBc", // Placeholder address - needs to be updated
  dexs: null,
  ticker: "BriBerry Farm🍓",
  decimals: 18,
  name: "PHUX LP",
  type: "lp",
  platform: "PHUX",
  composition: [
    { ticker: "BRIBE", weight: 50.0 },
    { ticker: "2PHUX", weight: 50.0 }
  ]
}, {
  chain: 369,
  a: "0x08a2807b8191F23F3E55206705901CBE8B61289E", // Placeholder address - needs to be updated
  dexs: null,
  ticker: "Staked Pulse Multivault🏛",
  decimals: 18,
  name: "PHUX LP",
  type: "lp",
  platform: "PHUX",
  composition: [
    { ticker: "stPLS", weight: 25.0 },
    { ticker: "vPLS", weight: 25.0 },
    { ticker: "uPLS", weight: 25.0 },
    { ticker: "WPLS", weight: 25.0 }
  ]
}, {
  chain: 369,
  a: "0xDd0076e21c29E4eFAb9F03dbceAAFcA912d2165F", // Placeholder address - needs to be updated
  dexs: null,
  ticker: "NOPEpls",
  decimals: 18,
  name: "PHUX LP",
  type: "lp",
  platform: "PHUX",
  composition: [
    { ticker: "NOPE", weight: 75.0 },
    { ticker: "WPLS", weight: 25.0 }
  ]
}, {
  chain: 369,
  a: "0x73e2218D8cF33B0bfcBf124c09b00e973A2BBaE3", // Placeholder address - needs to be updated
  dexs: null,
  ticker: "Quad Pool",
  decimals: 18,
  name: "PHUX LP",
  type: "lp",
  platform: "PHUX",
  composition: [
    { ticker: "pHEX", weight: 30.0 },
    { ticker: "WPLS", weight: 30.0 },
    { ticker: "pHDRN", weight: 20.0 },
    { ticker: "PLSX", weight: 20.0 }
  ]
}, {
  chain: 369,
  a: "0x74832257BD59097766F7B03212c21006F6F990f5", // Placeholder address - needs to be updated
  dexs: null,
  ticker: "50uPX-50DAI",
  decimals: 18,
  name: "PHUX LP",
  type: "lp",
  platform: "PHUX",
  composition: [
    { ticker: "uPX", weight: 50.0 },
    { ticker: "DAI", weight: 50.0 }
  ]
}, {
  chain: 369,
  a: "0x5205517e12A6737a8628afBa3eDe2cbDa62AAF7F", // Placeholder address - needs to be updated
  dexs: null,
  ticker: "33puP-33uPX-33DAI",
  decimals: 18,
  name: "PHUX LP",
  type: "lp",
  platform: "PHUX",
  composition: [
    { ticker: "uPX", weight: 33.0 },
    { ticker: "puP", weight: 33.0 },
    { ticker: "DAI", weight: 33.0 }
  ]
}, {
  chain: 369,
  a: "0x9009c1de3220cAF855F83140E5Ac18A43272eC01", // Placeholder address - needs to be updated
  dexs: null,
  ticker: "CST Stable Pool",
  decimals: 18,
  name: "PHUX LP",
  type: "lp",
  platform: "PHUX",
  composition: [
    { ticker: "wUSDC", weight: 50.0 },
    { ticker: "CST", weight: 50.0 }
  ]
}, {
  chain: 369,
  a: "0x05aC1846d32728C28b798212F3Da687052002F5B", // Placeholder address - needs to be updated
  dexs: null,
  ticker: "MAXIMUS TEAM Pool",
  decimals: 18,
  name: "PHUX LP",
  type: "lp",
  platform: "PHUX",
  composition: [
    { ticker: "pMAXI", weight: 50.0 },
    { ticker: "pTEAM", weight: 50.0 }
  ]
}, {
  chain: 369,
  a: "0x5AA6F61D7df42064E9D2ad80D4C8A9E7c3Cb1f61", // Placeholder address - needs to be updated
  dexs: null,
  ticker: "Fire Whale🔥🐋",
  decimals: 18,
  name: "PHUX LP",
  type: "lp",
  platform: "PHUX",
  composition: [
    { ticker: "INC", weight: 50.0 },
    { ticker: "SOLIDX", weight: 50.0 }
  ]
}, {
  chain: 369,
  a: "0x5928C6434398D9B9bEDEe8D1CdD2F98f054f0F20", // Placeholder address - needs to be updated
  dexs: null,
  ticker: "Quattro Rico's Heart",
  decimals: 18,
  name: "PHUX LP",
  type: "lp",
  platform: "PHUX",
  composition: [
    { ticker: "RPE", weight: 80.0 },
    { ticker: "WPLS", weight: 20.0 }
  ]
}, {
  chain: 369,
  a: "0x7b70F6C77F7e3EfFe28495dbBd146F9a8af1aFE5", // Placeholder address - needs to be updated
  dexs: null,
  ticker: "2Solid Pool",
  decimals: 18,
  name: "PHUX LP",
  type: "lp",
  platform: "PHUX",
  composition: [
    { ticker: "2PHUX", weight: 33.0 },
    { ticker: "AXIS", weight: 15.0 },
    { ticker: "NOPE", weight: 15.0 },
    { ticker: "SOLIDX", weight: 15.0 },
    { ticker: "FIRE", weight: 15.0 },
    { ticker: "WPLS", weight: 7.0 }
  ]
}, {
  chain: 369,
  a: "0xe00A24da1720086AC87cDD89230497047c64f61A", // Placeholder address - needs to be updated
  dexs: null,
  ticker: "PULSING for PHIAT",
  decimals: 18,
  name: "PHUX LP",
  type: "lp",
  platform: "PHUX",
  composition: [
    { ticker: "PHIAT", weight: 50.0 },
    { ticker: "WPLS", weight: 50.0 }
  ]
}, {
  chain: 369,
  a: "0xF004CE3606A8C42b49706AB006021913002A1741", // Placeholder address - needs to be updated
  dexs: null,
  ticker: "FUSION",
  decimals: 18,
  name: "PHUX LP",
  type: "lp",
  platform: "PHUX",
  composition: [
    { ticker: "AXIS", weight: 50.0 },
    { ticker: "ALIVE", weight: 50.0 }
  ]
}, {
  chain: 369,
  a: "0x16e337b6B59b28466F8eafd7d473b332934f2454", // Placeholder address - needs to be updated
  dexs: null,
  ticker: "REFINERY",
  decimals: 18,
  name: "PHUX LP",
  type: "lp",
  platform: "PHUX",
  composition: [
    { ticker: "COM", weight: 40.0 },
    { ticker: "ALIVE", weight: 40.0 },
    { ticker: "HEX", weight: 20.0 }
  ]
}, {
  chain: 369,
  a: "0x0be65a722FCF4802D055645BA3371A99509e9E38", // Placeholder address - needs to be updated
  dexs: null,
  ticker: "TETRA Gas Station",
  decimals: 18,
  name: "PHUX LP",
  type: "lp",
  platform: "PHUX",
  composition: [
    { ticker: "TETRAp", weight: 80.0 },
    { ticker: "WPLS", weight: 20.0 }
  ]
}, {
  chain: 369,
  a: "0x98fd442C2F7106f839069D89C770BD4E218E9218", // Placeholder address - needs to be updated
  dexs: null,
  ticker: "Quattro Rico's Pool",
  decimals: 18,
  name: "PHUX LP",
  type: "lp",
  platform: "PHUX",
  composition: [
    { ticker: "HEX", weight: 20.0 },
    { ticker: "INC", weight: 20.0 },
    { ticker: "RPE", weight: 20.0 },
    { ticker: "PLSX", weight: 20.0 },
    { ticker: "WPLS", weight: 20.0 }
  ]
}, {
  chain: 369,
  a: "0xAD4550155F7D62F1378b12c36F2e4FB3aF618521", // Placeholder address - needs to be updated
  dexs: null,
  ticker: "Jeet Pool",
  decimals: 18,
  name: "PHUX LP",
  type: "lp",
  platform: "PHUX",
  composition: [
    { ticker: "USDT", weight: 20.0 },
    { ticker: "USDC", weight: 20.0 },
    { ticker: "PHUX", weight: 20.0 },
    { ticker: "WPLS", weight: 20.0 },
    { ticker: "DAI", weight: 20.0 }
  ]
}, {
  chain: 369,
  a: "0x9D24CDCD25F13c42AAd946Dc4c4Db668a3f7e3D6", // Placeholder address - needs to be updated
  dexs: null,
  ticker: "Pulsechain Dark Web Pool 🧿",
  decimals: 18,
  name: "PHUX LP",
  type: "lp",
  platform: "PHUX",
  composition: [
    { ticker: "DAI", weight: 23.0 },
    { ticker: "ATROPA", weight: 23.0 },
    { ticker: "TEDDY BEAR", weight: 23.0 },
    { ticker: "INC", weight: 10.0 },
    { ticker: "TSFi", weight: 10.0 },
    { ticker: "WPLS", weight: 10.0 }
  ]
}, {
  chain: 369,
  a: "0x451E27F0608A5503416b8a70d9E213dC33D2427c", // Placeholder address - needs to be updated
  dexs: null,
  ticker: "Vouch Liquid Staked PLS Pool",
  decimals: 18,
  name: "PHUX LP",
  type: "lp",
  platform: "PHUX",
  composition: [
    { ticker: "vPLS", weight: 50.0 },
    { ticker: "WPLS", weight: 50.0 }
  ]
}, {
  chain: 369,
  a: "0xAFbff831203514B154b5488Cd11874bFa17A7348", // Placeholder address - needs to be updated
  dexs: null,
  ticker: "HEXFIRE 🔥",
  decimals: 18,
  name: "PHUX LP",
  type: "lp",
  platform: "PHUX",
  composition: [
    { ticker: "FIRE", weight: 34.0 },
    { ticker: "HEX", weight: 33.0 },
    { ticker: "HEX", weight: 33.0 }
  ]
}, {
  chain: 369,
  a: "0x6987772330A72637dee68Ae3Dd4b55CF643190bd", // Placeholder address - needs to be updated
  dexs: null,
  ticker: "She'll be apples",
  decimals: 18,
  name: "PHUX LP",
  type: "lp",
  platform: "PHUX",
  composition: [
    { ticker: "PHIAT", weight: 63.0 },
    { ticker: "HEX", weight: 37.0 }
  ]
}, {
  chain: 369,
  a: "0xFa41C8cb4D02D1AB4536c27a664CBb8b3C0937a0", // Placeholder address - needs to be updated
  dexs: null,
  ticker: "USDL Stable Pool",
  decimals: 18,
  name: "PHUX LP",
  type: "lp",
  platform: "PHUX",
  composition: [
    { ticker: "USDT", weight: 25.0 },
    { ticker: "USDL", weight: 25.0 },
    { ticker: "USDC", weight: 25.0 },
    { ticker: "DAI", weight: 25.0 }
  ]
}, {
  chain: 369,
  a: "0x0B41674002756D967bF99F6C7D98bb4f7e3c9294", // Placeholder address - needs to be updated
  dexs: null,
  ticker: "CODEAK Communis Maxi",
  decimals: 18,
  name: "PHUX LP",
  type: "lp",
  platform: "PHUX",
  composition: [
    { ticker: "COM", weight: 80.0 },
    { ticker: "HEX", weight: 20.0 }
  ]
}, {
  chain: 369,
  a: "0xA0305707793014c9C43EdFC09e1314845A5be6CE", // Placeholder address - needs to be updated
  dexs: null,
  ticker: "RH Stable Stack 🏛",
  decimals: 18,
  name: "PHUX LP",
  type: "lp",
  platform: "PHUX",
  composition: [
    { ticker: "USDL", weight: 20.0 },
    { ticker: "INCD", weight: 20.0 },
    { ticker: "HEXDC", weight: 20.0 },
    { ticker: "PXDC", weight: 20.0 },
    { ticker: "DAI", weight: 20.0 }
  ]
}, {
  chain: 369,
  a: "0xbCce7cB56218E7cEd5Be2C5Ec0bf9B84783A69AD", // Placeholder address - needs to be updated
  dexs: null,
  ticker: "HEX Time Complex",
  decimals: 18,
  name: "PHUX LP",
  type: "lp",
  platform: "PHUX",
  composition: [
    { ticker: "HEX", weight: 25.0 },
    { ticker: "MAXI", weight: 15.0 },
    { ticker: "HTT-7000", weight: 15.0 },
    { ticker: "DECI", weight: 15.0 },
    { ticker: "HTT-5000", weight: 15.0 },
    { ticker: "HTT-3000", weight: 15.0 }
  ]
}, {
  chain: 369,
  a: "0xCa994c176c00FCB3D2ffc3d4DF41885fB978cE42", // Placeholder address - needs to be updated
  dexs: null,
  ticker: "eMaximus Perps Maxi",
  decimals: 18,
  name: "PHUX LP",
  type: "lp",
  platform: "PHUX",
  composition: [
    { ticker: "eMAXI", weight: 39.0 },
    { ticker: "eLUCKY", weight: 25.0 },
    { ticker: "eDECI", weight: 20.0 },
    { ticker: "eHEX", weight: 15.0 },
    { ticker: "eTRIO", weight: 1.0 }
  ]
},{
  chain: 369,
  a: "0x0",
  dexs: "0x",
  ticker: "PLS (PHIAT deposit)",
  decimals: 18,
  name: "PLS (PHIAT deposit)"
},  {
  chain: 369,
  a: "0x",
  dexs: "0x1b45b9148791d3a104184cd5dfe5ce57193a3ee9",
  ticker: "PLSX (PHIAT deposit)",
  decimals: 18,
  name: "PLSX (PHIAT deposit)"
},  {
  chain: 369,
  a: "0x",
  dexs: "0xf1f4ee610b2babb05c635f726ef8b0c568c8dc65",
  ticker: "HEX (PHIAT deposit)",
  decimals: 8,
  name: "HEX (PHIAT deposit)"
},  {
  chain: 369,
  a: "0x",
  dexs: "0xf808bb6265e9ca27002c0a04562bf50d4fe37eaa",
  ticker: "INC (PHIAT deposit)",
  decimals: 18,
  name: "Incentive (PHIAT deposit)"
},   {
  chain: 369,
  a: "0x",
  dexs: "",
  ticker: "weDAI (PHIAT deposit)",
  decimals: 18,
  name: "DAI from ETH (PHIAT deposit)"
},   {
  chain: 369,
  a: "0x",
  dexs: "0x52ca8c5c6a5c7c56cf5e01bde9473b3b7f7c0b1e",
  ticker: "weUSDC (PHIAT deposit)",
  decimals: 6,
  name: "USDC from ETH (PHIAT deposit)"
},   {
  chain: 369,
  a: "0x",
  dexs: "0xc8bbdb5a0652877eb1f774cba684eb8fbdd7bbb7",
  ticker: "weUSDT (PHIAT deposit)",
  decimals: 6,
  name: "USDT from ETH (PHIAT deposit)"
},   {
  chain: 369,
  a: "0x",
  dexs: "0x27557d148293d1c8e8f8c5deeab93545b1eb8410",
  ticker: "USDL (PHIAT deposit)",
  decimals: 18,
  name: "USDL (PHIAT deposit)"
},   {
  chain: 369,
  a: "0x",
  dexs: "0xabb36512813194b12a82a319783dbb455652440a",
  ticker: "PXDC (PHIAT deposit)",
  decimals: 18,
  name: "PXDC (PHIAT deposit)"
},   {
  chain: 369,
  a: "0x",
  dexs: "0x9756f095dfa27d4c2eae0937a7b8a6603d99affb",
  ticker: "HEXDC (PHIAT deposit)",
  decimals: 8,
  name: "HEXDC (PHIAT deposit)"
},   {
  chain: 369,
  a: "0x",
  dexs: "0x29d66D5900Eb0d629E1e6946195520065A6c5aeE",
  ticker: "weWETH (PHIAT deposit)",
  decimals: 18,
  name: "WETH from ETH (PHIAT deposit)"
},   {
  chain: 369,
  a: "0x",
  dexs: "0x8c52470a05eEB2fCe4905688Ec59bFDd32E71D07",
  ticker: "weWBTC (PHIAT deposit)",
  decimals: 8,
  name: "WBTC Coin from ETH (PHIAT deposit)"
},   {
  chain: 369,
  a: "0x0",
  dexs: "0x",
  ticker: "PLS (PHAME deposit)",
  decimals: 18,
  name: "PLS (PHAME deposit)"
},  {
  chain: 369,
  a: "0x",
  dexs: "0x",
  ticker: "PLSX (PHAME deposit)",
  decimals: 18,
  name: "PLSX (PHAME deposit)"
},  {
  chain: 369,
  a: "0x",
  dexs: "0x",
  ticker: "HEX (PHAME deposit)",
  decimals: 8,
  name: "HEX (PHAME deposit)"
},  {
  chain: 369,
  a: "0x",
  dexs: "0x",
  ticker: "INC (PHAME deposit)",
  decimals: 18,
  name: "Incentive (PHAME deposit)"
},     {
  chain: 369,
  a: "0x",
  dexs: "",
  ticker: "weDAI from ETH (PHAME deposit)",
  decimals: 18,
  name: "DAI from ETH (PHAME deposit)"
}, {
  chain: 369,
  a: "0x",
  dexs: "0x29d66D5900Eb0d629E1e6946195520065A6c5aeE",
  ticker: "weWETH from ETH (PHAME deposit)",
  decimals: 18,
  name: "WETH from ETH (PHAME deposit)"
}, {
  chain: 369,
  a: "0x",
  dexs: "0x8c52470a05eEB2fCe4905688Ec59bFDd32E71D07",
  ticker: "weWBTC Coin from ETH (PHAME deposit)",
  decimals: 8,
  name: "WBTC Coin from ETH (PHAME deposit)"
}, {
  chain: 369,
  a: "0x",
  dexs: "",
  ticker: "wSOL from Ethereum (PHAME deposit)",
  decimals: 9,
  name: "wSOL from Ethereum (PHAME deposit)"
}, {
  chain: 369,
  a: "0x",
  dexs: "0x52ca8c5c6a5c7c56cf5e01bde9473b3b7f7c0b1e",
  ticker: "weUSDC from ETH (PHAME deposit)",
  decimals: 6,
  name: "USDC from ETH (PHAME deposit)"
}, {
  chain: 369,
  a: "0x",
  dexs: "0xc8bbdb5a0652877eb1f774cba684eb8fbdd7bbb7",
  ticker: "weUSDT from ETH (PHAME deposit)",
  decimals: 6,
  name: "USDT from ETH (PHAME deposit)"
}, {
  chain: 369,
  a: "0x",
  dexs: "0xf64602fd08245d1d27f7d9452814bea1451bd502",
  ticker: "stPHAME",
  decimals: 18,
  name: "Staked Phamous"
}, 
// Farm entries
{
chain: 369,
a: "0x1b45b9148791d3a104184Cd5DFE5CE57193a3ee9", // Real LP token address for PLSX / WPLS (v1)
dexs: "0x1b45b9148791d3a104184Cd5DFE5CE57193a3ee9", // Use LP token address for price lookup
ticker: "PLSX \/ WPLS",
decimals: 18,
name: "PLSX V1 Farm",
type: "farm"
},
{
chain: 369,
a: "0xE56043671df55dE5CDf8459710433C10324DE0aE", // Real LP token address for WPLS / weDAI (v1)
dexs: "0xE56043671df55dE5CDf8459710433C10324DE0aE", // Use LP token address for price lookup
ticker: "WPLS \/ weDAI",
decimals: 18,
name: "PLSX V1 Farm",
type: "farm"
},
{
chain: 369,
a: "0x6753560538ECa67617A9Ce605178F788bE7E524E", // Real LP token address for weUSDC / WPLS (v1)
dexs: "0x6753560538ECa67617A9Ce605178F788bE7E524E", // Use LP token address for price lookup
ticker: "weUSDC \/ WPLS",
decimals: 18,
name: "PLSX V1 Farm",
type: "farm"
},
{
chain: 369,
a: "0x42AbdFDB63f3282033C766E72Cc4810738571609", // Real LP token address for WETH / WPLS (v1)
dexs: "0x42AbdFDB63f3282033C766E72Cc4810738571609", // Use LP token address for price lookup
ticker: "WETH \/ WPLS",
decimals: 18,
name: "PLSX V1 Farm",
type: "farm"
},
{
chain: 369,
a: "0x322Df7921F28F1146Cdf62aFdaC0D6bC0Ab80711", // Real LP token address for weUSDT / WPLS (v1)
dexs: "0x322Df7921F28F1146Cdf62aFdaC0D6bC0Ab80711", // Use LP token address for price lookup
ticker: "weUSDT \/ WPLS",
decimals: 18,
name: "PLSX V1 Farm",
type: "farm"
},
{
chain: 369,
a: "0xf1f4ee610b2babb05c635f726ef8b0c568c8dc65", // Real LP token address for HEX / WPLS (v1)
dexs: "0xf1f4ee610b2babb05c635f726ef8b0c568c8dc65", // Use LP token address for price lookup
ticker: "HEX \/ WPLS",
decimals: 18,
name: "PLSX V1 Farm",
type: "farm"
},
{
chain: 369,
a: "0xf808Bb6265e9Ca27002c0A04562Bf50d4FE37EAA", // Real LP token address for INC / WPLS (v1)
dexs: "0xf808Bb6265e9Ca27002c0A04562Bf50d4FE37EAA", // Use LP token address for price lookup
ticker: "INC \/ WPLS",
decimals: 18,
name: "PLSX V1 Farm",
type: "farm"
},
{
chain: 369,
a: "0x7Dbeca4c74d01cd8782D4EF5C05C0769723fb0ea", // Real LP token address for INC / PLSX (v1)
dexs: "0x7Dbeca4c74d01cd8782D4EF5C05C0769723fb0ea", // Use LP token address for price lookup
ticker: "INC \/ PLSX",
decimals: 18,
name: "PLSX V1 Farm",
type: "farm"
},
// PHUX Farm entries
{
chain: 369,
a: "0xFARMPHUX0000000000000000000000000000001", // Placeholder - not a real token contract
dexs: "0xFARM000000000000000000000000000000000003", // Placeholder - use mapping for price lookup
ticker: "Prime PHUX (f)",
decimals: 18,
name: "PHUX Farm",
type: "farm"
},
{
chain: 369,
a: "0xFARMPHUX0000000000000000000000000000002", // Placeholder - not a real token contract
dexs: "0xFARM000000000000000000000000000000000004", // Placeholder - use mapping for price lookup
ticker: "BridgedSP (f)",
decimals: 18,
name: "PHUX Farm",
type: "farm"
},
{
chain: 369,
a: "0xFARMPHUX0000000000000000000000000000003", // Placeholder - not a real token contract
dexs: "0xFARM000000000000000000000000000000000000", // Placeholder - use mapping for price lookup
ticker: "RH Maxi (f)",
decimals: 18,
name: "PHUX Farm",
type: "farm"
},
{
chain: 369,
a: "0xFARMPHUX0000000000000000000000000000004", // Placeholder - not a real token contract
dexs: "0xFARM000000000000000000000000000000000000", // Placeholder - use mapping for price lookup
ticker: "Piteas Prime (f)",
decimals: 18,
name: "PHUX Farm",
type: "farm"
},
{
chain: 369,
a: "0xFARMPHUX0000000000000000000000000000005", // Placeholder - not a real token contract
dexs: "0xFARM000000000000000000000000000000000000", // Placeholder - use mapping for price lookup
ticker: "Great Time (f)",
decimals: 18,
name: "PHUX Farm",
type: "farm"
},
{
chain: 369,
a: "0xFARMPHUX0000000000000000000000000000006", // Placeholder - not a real token contract
dexs: "0xFARM000000000000000000000000000000000000", // Placeholder - use mapping for price lookup
ticker: "Maximus Perps Maxi (f)",
decimals: 18,
name: "PHUX Farm",
type: "farm"
},
{
chain: 369,
a: "0xFARMPHUX0000000000000000000000000000007", // Placeholder - not a real token contract
dexs: "0xFARM000000000000000000000000000000000000", // Placeholder - use mapping for price lookup
ticker: "Alex Hedron Maxi (f)",
decimals: 18,
name: "PHUX Farm",
type: "farm"
},
{
chain: 369,
a: "0xFARMPHUX0000000000000000000000000000008", // Placeholder - not a real token contract
dexs: "0xFARM000000000000000000000000000000000000", // Placeholder - use mapping for price lookup
ticker: "Pareto Pool (f)",
decimals: 18,
name: "PHUX Farm",
type: "farm"
},
{
chain: 369,
a: "0xFARMPHUX0000000000000000000000000000009", // Placeholder - not a real token contract
dexs: "0xFARM000000000000000000000000000000000000", // Placeholder - use mapping for price lookup
ticker: "Piteas Maxi Pool (f)",
decimals: 18,
name: "PHUX Farm",
type: "farm"
},
{
chain: 369,
a: "0xFARMPHUX000000000000000000000000000000A", // Placeholder - not a real token contract
dexs: "0xFARM000000000000000000000000000000000000", // Placeholder - use mapping for price lookup
ticker: "PLSX Single Sided Staking (Almost) (f)",
decimals: 18,
name: "PHUX Farm",
type: "farm"
},
{
chain: 369,
a: "0xFARMPHUX000000000000000000000000000000B", // Placeholder - not a real token contract
dexs: "0xFARM000000000000000000000000000000000000", // Placeholder - use mapping for price lookup
ticker: "33puP-33WBTC-33uPX (f)",
decimals: 18,
name: "PHUX Farm",
type: "farm"
},
{
chain: 369,
a: "0xFARMPHUX000000000000000000000000000000C", // Placeholder - not a real token contract
dexs: "0xFARM000000000000000000000000000000000000", // Placeholder - use mapping for price lookup
ticker: "RH PHLPV2 (f)",
decimals: 18,
name: "PHUX Farm",
type: "farm"
},
{
chain: 369,
a: "0xFARMPHUX000000000000000000000000000000D", // Placeholder - not a real token contract
dexs: "0xFARM000000000000000000000000000000000000", // Placeholder - use mapping for price lookup
ticker: "PHORGY Pool (f)",
decimals: 18,
name: "PHUX Farm",
type: "farm"
},
{
chain: 369,
a: "0xFARMPHUX000000000000000000000000000000E", // Placeholder - not a real token contract
dexs: "0xFARM000000000000000000000000000000000000", // Placeholder - use mapping for price lookup
ticker: "SOLaPLSooZa (f)",
decimals: 18,
name: "PHUX Farm",
type: "farm"
},
{
chain: 369,
a: "0xFARMPHUX000000000000000000000000000000F", // Placeholder - not a real token contract
dexs: "0xFARM000000000000000000000000000000000000", // Placeholder - use mapping for price lookup
ticker: "Native PHLPV2 (f)",
decimals: 18,
name: "PHUX Farm",
type: "farm"
},
{
chain: 369,
a: "0xFARMPHUX0000000000000000000000000000010", // Placeholder - not a real token contract
dexs: "0xFARM000000000000000000000000000000000000", // Placeholder - use mapping for price lookup
ticker: "BriBerry Farm🍓 (f)",
decimals: 18,
name: "PHUX Farm",
type: "farm"
},
{
chain: 369,
a: "0xFARMPHUX0000000000000000000000000000011", // Placeholder - not a real token contract
dexs: "0xFARM000000000000000000000000000000000000", // Placeholder - use mapping for price lookup
ticker: "Staked Pulse Multivault🏛 (f)",
decimals: 18,
name: "PHUX Farm",
type: "farm"
},
{
chain: 369,
a: "0xFARMPHUX0000000000000000000000000000012", // Placeholder - not a real token contract
dexs: "0xFARM000000000000000000000000000000000000", // Placeholder - use mapping for price lookup
ticker: "NOPEpls (f)",
decimals: 18,
name: "PHUX Farm",
type: "farm"
},
{
chain: 369,
a: "0xFARMPHUX0000000000000000000000000000013", // Placeholder - not a real token contract
dexs: "0xFARM000000000000000000000000000000000000", // Placeholder - use mapping for price lookup
ticker: "Quad Pool (f)",
decimals: 18,
name: "PHUX Farm",
type: "farm"
},
{
chain: 369,
a: "0xFARMPHUX0000000000000000000000000000014", // Placeholder - not a real token contract
dexs: "0xFARM000000000000000000000000000000000000", // Placeholder - use mapping for price lookup
ticker: "50uPX-50DAI (f)",
decimals: 18,
name: "PHUX Farm",
type: "farm"
},
{
chain: 369,
a: "0xFARMPHUX0000000000000000000000000000015", // Placeholder - not a real token contract
dexs: "0xFARM000000000000000000000000000000000000", // Placeholder - use mapping for price lookup
ticker: "33puP-33uPX-33DAI (f)",
decimals: 18,
name: "PHUX Farm",
type: "farm"
},
{
chain: 369,
a: "0xFARMPHUX0000000000000000000000000000016", // Placeholder - not a real token contract
dexs: "0xFARM000000000000000000000000000000000000", // Placeholder - use mapping for price lookup
ticker: "CST Stable Pool (f)",
decimals: 18,
name: "PHUX Farm",
type: "farm"
},
{
chain: 369,
a: "0xFARMPHUX0000000000000000000000000000017", // Placeholder - not a real token contract
dexs: "0xFARM000000000000000000000000000000000000", // Placeholder - use mapping for price lookup
ticker: "MAXIMUS TEAM Pool (f)",
decimals: 18,
name: "PHUX Farm",
type: "farm"
},
{
chain: 369,
a: "0xFARMPHUX0000000000000000000000000000018", // Placeholder - not a real token contract
dexs: "0xFARM000000000000000000000000000000000000", // Placeholder - use mapping for price lookup
ticker: "Fire Whale🔥🐋 (f)",
decimals: 18,
name: "PHUX Farm",
type: "farm"
},
{
chain: 369,
a: "0xFARMPHUX0000000000000000000000000000019", // Placeholder - not a real token contract
dexs: "0xFARM000000000000000000000000000000000000", // Placeholder - use mapping for price lookup
ticker: "Quattro Rico's Heart (f)",
decimals: 18,
name: "PHUX Farm",
type: "farm"
},
{
chain: 369,
a: "0xFARMPHUX000000000000000000000000000001A", // Placeholder - not a real token contract
dexs: "0xFARM000000000000000000000000000000000000", // Placeholder - use mapping for price lookup
ticker: "2Solid Pool (f)",
decimals: 18,
name: "PHUX Farm",
type: "farm"
},
{
chain: 369,
a: "0xFARMPHUX000000000000000000000000000001B", // Placeholder - not a real token contract
dexs: "0xFARM000000000000000000000000000000000000", // Placeholder - use mapping for price lookup
ticker: "PULSING for PHIAT (f)",
decimals: 18,
name: "PHUX Farm",
type: "farm"
},
{
chain: 369,
a: "0xFARMPHUX000000000000000000000000000001C", // Placeholder - not a real token contract
dexs: "0xFARM000000000000000000000000000000000000", // Placeholder - use mapping for price lookup
ticker: "FUSION (f)",
decimals: 18,
name: "PHUX Farm",
type: "farm"
},
{
chain: 369,
a: "0xFARMPHUX000000000000000000000000000001D", // Placeholder - not a real token contract
dexs: "0xFARM000000000000000000000000000000000000", // Placeholder - use mapping for price lookup
ticker: "REFINERY (f)",
decimals: 18,
name: "PHUX Farm",
type: "farm"
},
{
chain: 369,
a: "0xFARMPHUX000000000000000000000000000001E", // Placeholder - not a real token contract
dexs: "0xFARM000000000000000000000000000000000000", // Placeholder - use mapping for price lookup
ticker: "TETRA Gas Station (f)",
decimals: 18,
name: "PHUX Farm",
type: "farm"
},
{
chain: 369,
a: "0xFARMPHUX000000000000000000000000000001F", // Placeholder - not a real token contract
dexs: "0xFARM000000000000000000000000000000000000", // Placeholder - use mapping for price lookup
ticker: "Quattro Rico's Pool (f)",
decimals: 18,
name: "PHUX Farm",
type: "farm"
},
{
chain: 369,
a: "0xFARMPHUX0000000000000000000000000000020", // Placeholder - not a real token contract
dexs: "0xFARM000000000000000000000000000000000000", // Placeholder - use mapping for price lookup
ticker: "Jeet Pool (f)",
decimals: 18,
name: "PHUX Farm",
type: "farm"
},
{
chain: 369,
a: "0xFARMPHUX0000000000000000000000000000021", // Placeholder - not a real token contract
dexs: "0xFARM000000000000000000000000000000000000", // Placeholder - use mapping for price lookup
ticker: "Pulsechain Dark Web Pool 🧿 (f)",
decimals: 18,
name: "PHUX Farm",
type: "farm"
},
{
chain: 369,
a: "0xFARMPHUX0000000000000000000000000000022", // Placeholder - not a real token contract
dexs: "0xFARM000000000000000000000000000000000000", // Placeholder - use mapping for price lookup
ticker: "Vouch Liquid Staked PLS Pool (f)",
decimals: 18,
name: "PHUX Farm",
type: "farm"
},
{
chain: 369,
a: "0xFARMPHUX0000000000000000000000000000023", // Placeholder - not a real token contract
dexs: "0xFARM000000000000000000000000000000000000", // Placeholder - use mapping for price lookup
ticker: "HEXFIRE 🔥 (f)",
decimals: 18,
name: "PHUX Farm",
type: "farm"
},
{
chain: 369,
a: "0xFARMPHUX0000000000000000000000000000024", // Placeholder - not a real token contract
dexs: "0xFARM000000000000000000000000000000000000", // Placeholder - use mapping for price lookup
ticker: "She'll be apples (f)",
decimals: 18,
name: "PHUX Farm",
type: "farm"
},
{
chain: 369,
a: "0xFARMPHUX0000000000000000000000000000025", // Placeholder - not a real token contract
dexs: "0xFARM000000000000000000000000000000000000", // Placeholder - use mapping for price lookup
ticker: "USDL Stable Pool (f)",
decimals: 18,
name: "PHUX Farm",
type: "farm"
},
{
chain: 369,
a: "0xFARMPHUX0000000000000000000000000000026", // Placeholder - not a real token contract
dexs: "0xFARM000000000000000000000000000000000000", // Placeholder - use mapping for price lookup
ticker: "CODEAK Communis Maxi (f)",
decimals: 18,
name: "PHUX Farm",
type: "farm"
},
{
chain: 369,
a: "0xFARMPHUX0000000000000000000000000000027", // Placeholder - not a real token contract
dexs: "0xFARM000000000000000000000000000000000000", // Placeholder - use mapping for price lookup
ticker: "RH Stable Stack 🏛 (f)",
decimals: 18,
name: "PHUX Farm",
type: "farm"
},
{
chain: 369,
a: "0xFARMPHUX0000000000000000000000000000028", // Placeholder - not a real token contract
dexs: "0xFARM000000000000000000000000000000000000", // Placeholder - use mapping for price lookup
ticker: "HEX Time Complex (f)",
decimals: 18,
name: "PHUX Farm",
type: "farm"
},
{
chain: 369,
a: "0xFARMPHUX0000000000000000000000000000029", // Placeholder - not a real token contract
dexs: "0xFARM000000000000000000000000000000000000", // Placeholder - use mapping for price lookup
ticker: "eMaximus Perps Maxi (f)",
decimals: 18,
name: "PHUX Farm",
type: "farm"
},
{
chain: 369,
a: "0x8c357be2cf2c1de1c4dca8aea0af1529f789976b", // 9MM LP token address
dexs: null,
ticker: "HEX \/ WPLS 0.25%",
decimals: 18,
name: "9MM LP V3",
type: "lp",
platform: "9MM"
},
{
chain: 369,
a: "0x98bB7FE00F82C495229eb302D1Ae708fF931728E", // 9MM LP token address
dexs: null,
ticker: "PLSX \/ WPLS 0.25%",
decimals: 18,
name: "9MM LP V3",
type: "lp",
platform: "9MM"
},
{
chain: 369,
a: "0x6ace474a9fde57e663e47a4c7965964440b35f71",
dexs: null,
ticker: "HEX \/ weDAI 0.25%",
decimals: 18,
name: "9MM LP V3",
type: "lp",
platform: "9MM"
},
{
chain: 369,
a: "0x96737676cb25396a9f857272cddc8e3a346d63da", 
dexs: null,
ticker: "PLSX \/ WPLS 1%",
decimals: 18,
name: "9MM LP V3",
type: "lp",
platform: "9MM"
},
{
chain: 369,
a: "0xc9ec71281200d564d119918cb927f6c1ea2939f8",
dexs: null,
ticker: "WBTC \/ weDAI 2%",
decimals: 18,
name: "9MM LP V3",
type: "lp",
platform: "9MM"
},
{
chain: 369,
a: "0x5828b419f4d98bdbc45438f8fba0fe89772615c9",
dexs: null,
ticker: "HEX \/ CST 1%",
decimals: 18,
name: "9MM LP V3",
type: "lp",
platform: "9MM"
},
{
chain: 369,
a: "0xf91d0cbfba8e11ccd203e97aefda4352accffeeb",
dexs: null,
ticker: "weWETH \/ WPLS 0.25%",
decimals: 18,
name: "9MM LP V3",
type: "lp",
platform: "9MM"
},
{
chain: 369,
a: "0x55b432ad0518a4285ded6bb4d15e9a7182ef7a4d",
dexs: null,
ticker: "pDAI \/ WPLS 1%",
decimals: 18,
name: "9MM LP V3",
type: "lp",
platform: "9MM"
},
{
chain: 369,
a: "0x1dd2ce7320a0a7cb6581bf3fcccb042366e5c089",
dexs: null,
ticker: "HEX \/ weDAI 2%",
decimals: 18,
name: "9MM LP V3",
type: "lp",
platform: "9MM"
},
{
chain: 369,
a: "0xe37a2c1755151ff910ff895a14fad5570730f6e9",
dexs: null,
ticker: "WPLS \/ weDAI 0.25%",
decimals: 18,
name: "9MM LP V3",
type: "lp",
platform: "9MM"
},
// 9INCH LP tokens (add these first so farms can reference them)
{
chain: 369,
a: "0x1164dab36cd7036668ddcbb430f7e0b15416ef0b", // Real 9INCH-PLS LP token address
dexs: null,
ticker: "9INCH \/ WPLS",
decimals: 18,
name: "9INCH LP V2",
type: "lp",
platform: "9INCH"
},
{
chain: 369,
a: "0x31acf819060ae711f63bd6b682640598e250c689", // Real 9INCH-DAI LP token address
dexs: null,
ticker: "9INCH \/ weDAI",
decimals: 18,
name: "9INCH LP V2",
type: "lp",
platform: "9INCH"
},
{
chain: 369,
a: "0x6c5a0f22b459973a0305e2a565fc208a35a13850", // Real 9INCH-USDC LP token address
dexs: null,
ticker: "9INCH \/ weUSDC",
decimals: 18,
name: "9INCH LP V2",
type: "lp",
platform: "9INCH"
},
{
chain: 369,
a: "0x5449a776797b55a4aac0b4a76b2ac878bff3d3e3", // Real 9INCH-USDT LP token address
dexs: null,
ticker: "9INCH \/ weUSDT",
decimals: 18,
name: "9INCH LP V2",
type: "lp",
platform: "9INCH"
},
{
chain: 369,
a: "0xb543812ddebc017976f867da710ddb30cca22929", // Real 9INCH-BBC LP token address
dexs: null,
ticker: "9INCH \/ BBC",
decimals: 18,
name: "9INCH LP V2",
type: "lp",
platform: "9INCH"
},
{
chain: 369,
a: "0x097d19b2061c5f31b68852349187c664920b4ba4", // Real 9INCH-we9INCH LP token address
dexs: null,
ticker: "9INCH \/ we9INCH",
decimals: 18,
name: "9INCH LP V2",
type: "lp",
platform: "9INCH"
},
{
chain: 369,
a: "0x898bb93f4629c73f0c519415a85d6bd2977cb0b5", // Real 9INCH-PLSX LP token address
dexs: null,
ticker: "9INCH \/ PLSX",
decimals: 18,
name: "9INCH LP V2",
type: "lp",
platform: "9INCH"
},
// 9INCH Farm entries
{
chain: 369,
a: "0xFARM9INCH000000000000000000000000000001", // Placeholder - not a real token contract
dexs: "0xFARM000000000000000000000000000000000000", // Placeholder - use mapping for price lookup
ticker: "9INCH \/ WPLS (f)",
decimals: 18,
name: "9INCH Farm V2",
type: "farm"
},
{
chain: 369,
a: "0xFARM9INCH000000000000000000000000000002", // Placeholder - not a real token contract
dexs: "0xFARM000000000000000000000000000000000000", // Placeholder - use mapping for price lookup
ticker: "9INCH \/ weDAI (f)",
decimals: 18,
name: "9INCH Farm V2",
type: "farm"
},
{
chain: 369,
a: "0xFARM9INCH000000000000000000000000000003", // Placeholder - not a real token contract
dexs: "0xFARM000000000000000000000000000000000000", // Placeholder - use mapping for price lookup
ticker: "9INCH \/ weUSDC (f)",
decimals: 18,
name: "9INCH Farm V2",
type: "farm"
},
{
chain: 369,
a: "0xFARM9INCH000000000000000000000000000004", // Placeholder - not a real token contract
dexs: "0xFARM000000000000000000000000000000000000", // Placeholder - use mapping for price lookup
ticker: "9INCH \/ weUSDT (f)",
decimals: 18,
name: "9INCH Farm V2",
type: "farm"
},
{
chain: 369,
a: "0xFARM9INCH000000000000000000000000000005", // Placeholder - not a real token contract
dexs: "0xFARM000000000000000000000000000000000000", // Placeholder - use mapping for price lookup
ticker: "9INCH \/ BBC (f)",
decimals: 18,
name: "9INCH Farm V2",
type: "farm"
},
{
chain: 369,
a: "0xFARM9INCH000000000000000000000000000006", // Placeholder - not a real token contract
dexs: "0xFARM000000000000000000000000000000000000", // Placeholder - use mapping for price lookup
ticker: "9INCH \/ we9INCH (f)",
decimals: 18,
name: "9INCH Farm V2",
type: "farm"
},
{
chain: 369,
a: "0xFARM9INCH000000000000000000000000000007", // Placeholder - not a real token contract
dexs: "0xFARM000000000000000000000000000000000000", // Placeholder - use mapping for price lookup
ticker: "9INCH \/ PLSX (f)",
decimals: 18,
name: "9INCH Farm V2",
type: "farm"
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

// This function is deprecated - use cleanTickerForLogo from utils/ticker-display.ts instead
const getLogoPath = (ticker: string): string | null => {
  // Use centralized cleaning logic for consistency
  const { cleanTickerForLogo } = require('@/utils/ticker-display')
  const cleanedTicker = cleanTickerForLogo(ticker)
  return `/coin-logos/${cleanedTicker}.svg`
}

