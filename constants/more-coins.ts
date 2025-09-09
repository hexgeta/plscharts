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
  composition?: Array<{ ticker: string; weight: number }>
}

export const MORE_COINS = [
  {
    chain: 369,
    a: "0x6Afd30110e9fF1b29dB3c4DAf31EF0045a6552cB",
    dexs: "0x814063B35C06897ADDBb71E27f282A193560E99b",
    ticker: "YEET",
    decimals: 18,
    name: "YEET",
  },
{
    chain: 369,
    name: "B9",
    a: "0xE676a1E969Feaef164198496bd787e0269f7b237",
    dexs: "0x05c4CB83895D284525DcAB245631cE504740931B",
    ticker: "B9",
    decimals: 8,
  },
{
    chain: 369,
    a: "0xbd63fa573a120013804e51b46c56f9b3e490f53c",
    dexs: "0x4581e25b434c1ced7a93449b229469f03ca4451e",
    ticker: "SOIL (New)",
    decimals: 18,
    name: "SUN Minimeal (New)"
  },
{
    chain: 369,
    a: "0x697fc467720b2a8e1b2f7f665d0e3f28793e65e8",
    dexs: "0xb2045a428b6661e7e16fa1aecd77ec03912828c7",
    ticker: "A1A",
    decimals: 18,
    name: "TokenA1A"
  },
{
    chain: 369,
    a: "0x0b1307dc5d90a0b60be18d2634843343ebc098af",
    dexs: "0xac73dcc5b4410fad1077d0b0b1459e1e6dbce736",
    ticker: "LEGAL",
    decimals: 18,
    name: "Legal"
  },
{
    chain: 369,
    a: "0xdf6a16689a893095c721542e5d3ce55bbcc23ac6",
    dexs: "0x5383c25d3d86070311946812d022dc0420eed4cb",
    ticker: "TWO",
    decimals: 18,
    name: "2"
  },
{
    chain: 369,
    a: "0xde65090088df0b2d80a5ec6a7b56ece36ee83ce8",
    dexs: "0x8bc1d454542265fc82a23750696f770634e92bf9",
    ticker: "POPPY",
    decimals: 18,
    name: "Poppy"
  },
{
    chain: 369,
    a: "0xc589905ef2c8892af8ecef36b1190cd0141e3199",
    dexs: "0x9030a2cb6e52f523c91d3ae8fbd7ffa23b8737ba",
    ticker: "H2O",
    decimals: 18,
    name: "Pulse Drip H2O"
  },
{
    chain: 369,
    a: "0x444444444444c1a66f394025ac839a535246fcc8",
    dexs: "0xe1ef8b1bfe5a1dbb3fc2f0c3405f54a9e6f32840",
    ticker: "pGENI",
    decimals: 9,
    name: "Genius on PulseChain"
  },
{
    chain: 369,
    a: "0x8c5eb0f7007c374d6fe14627259b99a5e9613c84",
    dexs: "0x1aa434f653232a35b0559d5c4b33ab7fbaad80d6",
    ticker: "CAVIAR",
    decimals: 18,
    name: "Caviar"
  },
{
    chain: 369,
    a: "0x8c4a50c87e348f602ac6a59f4da857ee23307a42",
    dexs: "0xe7726e023ae722ac180e7fcbd4bf028950fefa4e",
    ticker: "ICARUS",
    decimals: 18,
    name: "Icarus"
  },
{
    chain: 369,
    a: "0x401464296a7e0cd14d85ab6baf0dc91b5ad5ad1b",
    dexs: "0x5ce2e1b0d987e17ceec95363bd2097855b1940c1",
    ticker: "BRO",
    decimals: 18,
    name: "BROmance"
  },
{
    chain: 369,
    a: "0xa12e2661ec6603cbbb891072b2ad5b3d5edb48bd",
    dexs: "0x7c670cee36baf10ad0d547ec4c3c6b5aa32c1fd7",
    ticker: "PINU",
    decimals: 12,
    name: "Pulse Inu"
  },
{
    chain: 369,
    a: "0x43eaba2E2d2F32f1207A11a18679287Dc7700015",
    dexs: "0x27290772EA970e3D0A82583Ff5b00d4ee9C812A0",
    ticker: "RBC",
    decimals: 18,
    name: "Real BIG Coin"
  },
{
    chain: 369,
    a: "0xe83034a7a78fc148c69defebd6d4c80f8bb4f710",
    dexs: "0x709fc9d014ae3e6387e2856762f64ae341063065",
    ticker: "PINU2",
    decimals: 18,
    name: "Pulse Inu Puppy"
  },
{
    chain: 369,
    a: "0x347a96a5bd06d2e15199b032f46fb724d6c73047",
    dexs: "0xf6dbd79f24fa1c9c44999b707f0e0c3ff2e6e361",
    ticker: "ASIC",
    decimals: 12,
    name: "ASIC on PulseChain"
  },
{
    chain: 369,
    a: "0xsss",
    dexs: "0xe7726e023ae722ac180e7fcbd4bf028950fefa4e",
    ticker: "stICARUS",
    decimals: 18,
    name: "Staked Icarus"
  }, {
    chain: 369,
    a: null,
    dexs: "0xf5a89a6487d62df5308cdda89c566c5b5ef94c11",
    ticker: "stPTGC",
    decimals: 18,
    name: "Staked Grays Currency"
  }, {
    chain: 369,
    a: "0x5ca97D93D06A0B35a70FEf2F7E8fF88dD1d2DA65",
    dexs: "0x6734ec4debe7756593cdc3DC6A42aB079e084954",
    ticker: "ERECTION",
    decimals: 18,
    name: "Erection"
  }, 
{
    chain: 369,
    a: "0xe101c848620e762ecb942356962dd415342b4feb",
    dexs: "0x6c4f0bd9eb4328490a5bb8e0b682e28db52df2b3",
    ticker: "LAUNCH",
    decimals: 18,
    name: "Pulse Launch"
  },
{
    chain: 369,
    a: "0x99F58b6979756fc129a33797eF796a6178D8A5De",
    dexs: "0x03bb886995f4F699dE817582859686388aCB1D56",
    ticker: "TFC",
    decimals: 18,
    name: "TFC"
  },
{
    chain: 369,
    a: "0x3D7eaf3a2406DFaD68be0dA504eCD690B80AAE48",
    dexs: null,
    ticker: "PLSCX",
    decimals: 18,
    name: "PLSCX"
  },
{
    chain: 369,
    a: "0xF8bba8B1B1A05992B18051E4e79415364Cbf4539", 
    dexs: null,
    ticker: "PHLP",
    decimals: 18,
    type: "lp",
    name: "Phame LP"
  },
{
    chain: 369,
    a: "0x891B9eE2F026f8099bd2D15C201fd3E44d708A08",
    dexs: "0x7cE41b0F4241d6b9eCE969a851033c09f32b65B6",
    ticker: "AHOY", 
    decimals: 18,
    name: "Apes On Yachts"
  },
{
    chain: 369,
    a: "0x6e6B06f61E0539e0ee24a85A9bF82027e76dFEcE",
    dexs: "0x882004C487e766cF71407119fD15CB6af629fEf1",
    ticker: "iambfruits",
    decimals: 18,
    name: "Jamaican Fruit Bat"
  },
{
    chain: 369,
    a: "0x2556F7f8d82EbcdD7b821b0981C38D9dA9439CdD",
    dexs: "0xE1d2bdbA58D34109c547883dC9c2f9E01cebB003",
    ticker: "dOWN", 
    decimals: 18,
    name: "dOWN"
  },
{
    chain: 369,
    a: "0xDe0220b69CE3e855a0124433A8E8D093f53A6bE4",
    dexs: "0x828cc8423fc97817CaD78C8bFBbA26923444dF60",
    ticker: "WHETH",
    decimals: 18,
    name: "Where Did The ETH Go"
  },
{
    chain: 369,
    a: "0xe11a9e0298fBB1248611956db3C8FF556DC1DdbD", 
    dexs: "0xB1F70949675c7E7705FA7cdD15D8476104AadAc5",
    ticker: "TWERK",
    decimals: 18,
    name: "Twerk"
  },
{
    chain: 369,
    a: "0x6de1bb62c13394B7Db57a25477DBedD76B3e9a90",
    dexs: "0x3ef52B65223Af427B4C5CE6E7ba4f0ed2Ba41f40",
    ticker: "CEREAL",
    decimals: 9,
    name: "Pulse Cereal"
  },
{
    chain: 369,
    a: "0x924DD489c99614B47385245Df0b5250538c71406",
    dexs: "0xc16E4718Cc076bE0a9c0720eb1d03AAb95Aac460",
    ticker: "PEGD",
    decimals: 18,
    name: "Peg Me pDAI"
  },
{
    chain: 369,
    a: "0xdB8E20f794Fa48d36Ae4988dC3D5Ba327df625f8",
    dexs: "0x8fB6D4E2284a1F100f802eFEF2507a1A3158e0b1",
    ticker: "YACHT",
    decimals: 18,
    name: "TANGent Golden Yacht"
  },
{
    chain: 369,
    a: "0xc9f523Fce37A28893A83Da68BbA03835D97Ae059",
    dexs: "0x7ce5e2689cdaF9A3d079A320430C273fAAc7e125",
    ticker: "NBC",
    decimals: 18,
    name: "NeckBeard Coin"
  },
{
    chain: 369,
    a: "eee",
    dexs: "0x5137a308dbf822aae9fb34467633baaa516ed099",
    ticker: "stCOM",
    decimals: 12,
    name: "Staked Communis on PulseChain"
  },
{
    chain: 369,
    a: "0xxx",
    dexs: "0x6d69654390c70d9e8814b04c69a542632dc93161",
    ticker: "stLOAN (Liquid Loans)",
    decimals: 18,
    name: "Staked LOAN on Liquid Loans"
  }, {
    chain: 369,
    a: "0x0deed1486bc52aa0d3e6f8849cec5add6598a162",
    dexs: "0x27557d148293d1c8e8f8c5deeab93545b1eb8410",
    ticker: "stUSDL (Liquid Loans)",
    decimals: 18,
    name: "Staked USDL on Liquid Loans"
  },
  {
    chain: 369,
    a: "0x0deed1486bc52aa0d3e6f8849cec5add6598a162",
    dexs: "0x27557d148293d1c8e8f8c5deeab93545b1eb8410",
    ticker: "PLS (Liquid Loans)",
    decimals: 18,
    name: "Deposited PLS on Liquid Loans"
  }, {
    chain: 369,
    a: "0x",
    dexs: "0x1b45b9148791d3a104184cd5dfe5ce57193a3ee9",
    ticker: "stPLSX (EARN)",
    decimals: 18,
    name: "Staked PulseX on PowerCity's EARN"
  }, {
    chain: 369,
    a: "0x",
    dexs: "0xed77cbbb80e5a5c3a1fe664419d6f690766b5913",
    ticker: "stEARN (EARN)",
    decimals: 18,
    name: "Staked EARN on PowerCity's EARN"
  }, {
    chain: 369,
    a: "0x",
    dexs: "0xabb36512813194b12a82a319783dbb455652440a",
    ticker: "stPXDC (EARN)",
    decimals: 18,
    name: "Staked PXDC on PowerCity's EARN"
  }, {
    chain: 369,
    a: "0x",
    dexs: "0x476d63ab94b4e86614df0c3d5a27e9e22631d062",
    ticker: "stHEX (FLEX)",
    decimals: 8,
    name: "Staked HEX on PowerCity's FLEX"
  }, {
    chain: 369,
    a: "0x",
    dexs: "0xed77cbbb80e5a5c3a1fe664419d6f690766b5913",
    ticker: "stFLEX (FLEX)",
    decimals: 18,
    name: "Staked FLEX PowerCity's FLEX"
  }, {
    chain: 369,
    a: "0x",
    dexs: "0x9756f095dfa27d4c2eae0937a7b8a6603d99affb",
    ticker: "stHEXDC (FLEX)",
    decimals: 8,
    name: "Staked HEXDC on PowerCity's FLEX"
  }, {
    chain: 369,
    a: "0x",
    dexs: "0x55b4387ff2cf168801ec64ca8221e035fd07b81d",
    ticker: "stTEAM",
    decimals: 8,
    name: "Staked Team on PulseChain"
  },
{
    chain: 369,
    a: "0x",
    dexs: "0x5f2d8624e6abea8f679a1095182f4bc84fe148e0",
    ticker: "stMINT",
    decimals: 18,
    name: "Staked Mintra"
  }, {
    chain: 369,
    a: "0x",
    dexs: "0x5f4cb14a7858bdb9066f9e4b561cdc1623807da0",
    ticker: "stHDRN",
    decimals: 9,
    name: "Staked Hedron on Pls"
  }, {
    chain: 1,
    a: "0x",
    dexs: "0x035a397725d3c9fc5ddd3e56066b7b64c749014e",
    ticker: "steHDRN",
    decimals: 9,
    name: "Staked Hedron on Eth"
    }, {
      chain: 369,
      a: "0x",
      dexs: "0xe5bb65e7a384d2671c96cfe1ee9663f7b03a573e",
      ticker: "stICSA",
      decimals: 9,
      name: "Staked ICSA on Pls"
    }, {
      chain: 1,
      a: "0x",
      dexs: "0xbaaf3b7a0b9de67de3097420d31800a885db6b41",
      ticker: "steICSA",
      decimals: 9,
      name: "Staked ICSA on Eth"
      },
{
    chain: 1,
    a: "0x",
    dexs: "",
    ticker: "steCOM",
    decimals: 12,
    name: "Staked Communis on Eth"
    },
{
      chain: 369,
      a: "0x5EE84583f67D5EcEa5420dBb42b462896E7f8D06",
      dexs: "0x894167362577Ea6ec0aC01aB56A7B2d3946EAD55",
      ticker: "PLSB",
      decimals: 12,
      name: "PulseBitcoin on PulseChain"
    },
{
      chain: 369,
      a: "0x1c3C50bd18E3f0C7c23666b8e8a843238A359386",
      dexs: "",
      ticker: "SOL",
      decimals: 9,
      name: "Solana from Ethereum"
    },
 {
      chain: 369,
      a: "0x",
      dexs: "0xfe75839c16a6516149D0F7B2208395F54A5e16e8",
      ticker: "stPHIAT",
    decimals: 18,
      name: "StakedPhiat Token"
    },
{
      chain: 369,
      a: "0xfE39FDc0012DCf10C9f674ea7e74889e4d71a226",
      dexs: null,
      ticker: "ePhiat",
    decimals: 18,
      name: "ePhiat from Ethereum"
    },
{
      chain: 369,
      a: "0x9F8182aD65c53Fd78bd07648a1b3DDcB675c6772",
      dexs: "0x10A639e1860410B075b877e0beBE163F26377A40",
      ticker: "TONI",
    decimals: 18,
      name: "Daytona Finance"
    },
{
      chain: 369,
      a: "0x4d3AeA379b7689E0Cb722826C909Fab39E54123d",
      dexs: "0xCFAEf90E5F47d7e6b35656425815E1FB6f0Eb04C",
      ticker: "wePEPE",
    decimals: 18,
      name: "Pepe from Ethereum"
    },
{
      chain: 369,
      a: "0xA0b73E1Ff0B80914AB6fe0444E65848C4C34450b",
      dexs: "0xb3ED95B7c4Bb0F532745873FE4A8fDaf4a4b7dAe",
      ticker: "CRO",
    decimals: 8,
      name: "Cronos Coin"
    },
{
      chain: 369,
      a: "0xeDA0073B4Aa1b1B6f9c718c3036551ab46E5Ec32",
      dexs: null,
      ticker: "BEET",
    decimals: 18,
      name: "BEET"
    },
{
      chain: 369,
      a: "0x9565c2036963697786705120Fc59310F747bCfD0",
      dexs: "0xB6395cA446804C7C18a5d4E462d4e68ec54741a7",
      ticker: "PP",
    decimals: 18,
      name: "PoorPleb on PulseChain"
    },
{
      chain: 369,
      a: "0x75DB6c0115bAE972979bAcCce94E3B8a21A48C4E",
      dexs: null,
      ticker: "wePP",
    decimals: 18,
      name: "PoorPleb from Ethereum"
    },
{
      chain: 369,
      a: "0x52Ada28F70BC8EBe5dd4381120d3CD76863919A8",
      dexs: "0x356Baef44E6B2B96c6312a28515a97C02D881DF9",
      ticker: "PLD",
      decimals: 0,
      name: "Pulsedoge"
    },
{
      chain: 369,
      a: "0xb55EE890426341FE45EE6dc788D2D93d25B59063",
      dexs: "0x0351fAa8e29f7ae610EDaDF9a2590Fe51a3b3457",
      ticker: "LOVE",
    decimals: 18,
      name: "Love.io"
    },
    {
      chain: 1,
      a: "0xb55ee890426341fe45ee6dc788d2d93d25b59063",
      dexs: "0x7bfa17e9d4296bf9697769a55b6654222e36097e",
      ticker: "eLOVE",
      decimals: 18,
      name: "Love.io on Ethereum"
      }, 
{
      chain: 369,
      a: "0xcFCFfE432A48dB53F59c301422d2EdD77B2A88d7",
      dexs: "0x53BF2cC26381Ea7eBB927e220008bbfF3447a2EC",
      ticker: "TEXAN",
    decimals: 18,
      name: "TEXAN Token"
    },
{
      chain: 369,
      a: "0x9663c2d75ffd5F4017310405fCe61720aF45B829",
      dexs: null,
      ticker: "PHUX",
    decimals: 18,
      name: "PHUX Governance Token"
    },
{
      chain: 369,
      a: "0xC581b735A1688071A1746c968e0798D642EDE491",
      dexs: "0x48c0F5E663d682A6450995f210FD1EF8aBAd7A61",
      ticker: "pEURT",
      decimals: 6,
      name: "Euro Tether"
    },
{
      chain: 369,
      a: "0x6cF99BAA0a4d079F960216d08cf9a1Bc7e4dd37C",
      dexs: "0x5d056C0927499f39AB82a31e98AD25D50A895476",
      ticker: "EAZY",
    decimals: 18,
      name: "EazySwap Token"
    },
{
      chain: 369,
      a: "0x3f105121A10247DE9a92e818554DD5Fcd2063AE7",
      dexs: "0xCB395d41373687605a3DC39cD8ed8e435838b14b",
      ticker: "weUNI",
    decimals: 18,
      name: "Uniswap from Ethereum"
    },
{
      chain: 369,
      a: "0xEe2D275Dbb79c7871F8C6eB2A4D0687dD85409D1",
      dexs: "0xa14976F09c83a250A3858BA932796d312548d72D",
      ticker: "LINK",
    decimals: 18,
      name: "ChainLink Token from Ethereum"
    },
{
      chain: 369,
      a: "0x9d93692E826A4bd9e903e2A27D7FbD1e116efdad",
      dexs: "0xdc2d4742c7c5037893bB82F76726958444051c02",
      ticker: "POLY",
    decimals: 9,
      name: "Poly Maximus"
    },
{
      chain: 369,
      a: "0x0567CA0dE35606E9C260CC2358404B11DE21DB44",
      dexs: "0x2772Cb1AC353b4ae486f5baC196f20DcBd8A097F",
      ticker: "HELGO",
    decimals: 18,
      name: "HELGO"
    },
{
      chain: 369,
      a: "0x26179a4d4B58b4456F28d19507546596c9058ee5",
      dexs: "0xF07B9ad9960d0C80068afE048CE6D0e94a4742C9",
      ticker: "WAIT",
    decimals: 8,
      name: "WAIT on PulseChain"
    },
{
      chain: 369,
      a: "0xd22E78C22D7E77229d60cc9fC57b0E294F54488E",
      dexs: "0x7f2de21b3f45CEF665f97EB928e16DfbD8eCEF6F",
      ticker: "HOC",
    decimals: 18,
      name: "Hocus Pocus Finance"
    },
{
      chain: 369,
      a: "0xBb101431d43b0E1fc31f000bf96826794806e0b4",
      dexs: "0x17E9aBc8DA9c86AcA035bD4716e41839DDf2d661",
      ticker: "APC",
    decimals: 18,
      name: "Apin Pulse"
    },
{
      chain: 369,
      a: "0xE362401D1451E8eb38fD66d0c9E23fB080409aB9",
      dexs: "0x634928686124F9211938b6dE33078fFeb69B1bD7",
      ticker: "KEK",
    decimals: 18,
      name: "KEK"
    },
{
      chain: 369,
      a: "0x7eE9946b082E197652Bf5d4Bdc2A034DBfF4121b",
      dexs: "",
      ticker: "PHLPv2",
    decimals: 18,
      name: "Phame LP",
      type: "lp"
    },
{
      chain: 369,
      a: "0xB272AE05C5F5eCE5a3a599928c06469ebc73FC31",
      dexs: "",
      ticker: "OBStable",
    decimals: 18,
      name: "Oracle and Bridge Stable Pool"
    },
{
      chain: 369,
      a: "0xC59Be55D22CB7967ee95e5bE0770e263EE014F78",
      dexs: "0x2ebA3cF4872aa3b6fa88a53dE1EB0Cb6802F8a2d",
      ticker: "OPHIR",
    decimals: 18,
      name: "OPHIR Token"
    },
{
      chain: 369,
      a: "0x4243568Fa2bbad327ee36e06c16824cAd8B37819",
      dexs: "0x0a022e7591749B0ed0D9e3b7B978f26978440DC7",
      ticker: "TSFi",
    decimals: 18,
      name: "TSFi"
    },
{
      chain: 369,
      a: "0x463413c579D29c26D59a65312657DFCe30D545A1",
      dexs: "0x30655F1915ab39E06931aa3be10AD1A430982DD7",
      ticker: "BILL",
    decimals: 18,
      name: "Treasury Bill"
    },
{
      chain: 369,
      a: "0xc91562626B9a697af683555dA9946986278Ac9a5",
      dexs: "",
      ticker: "TYRH",
    decimals: 18,
      name: "TYRH"
    },
{
      chain: 369,
      a: "0x78a2809e8e2ef8e07429559f15703Ee20E885588",
      dexs: "0x94638053e76d1e696c35B35c2C2E07D9302105a7",
      ticker: "M3M3",
    decimals: 18,
      name: "Meme Coin Mafia"
    },
{
      chain: 369,
      a: "0x5f63BC3d5bd234946f18d24e98C324f629D9d60e",
      dexs: "0xcc0C157c49141Da5E541D20abaFdD928A66B4862",
      ticker: "IMPLS",
    decimals: 18,
      name: "IMPLS Token"
    },
{
      chain: 369,
      a: "0x6386704cD6f7A584EA9D23cccA66aF7EBA5a727e",
      dexs: "0x33208439e1B28B1d6fCfbB6334e9950027Ee3B52",
      ticker: "SPARK",
    decimals: 18,
      name: "Sparkswap"
    },
{
      chain: 369,
      a: "0xfCf7F3915A899b9133b0D10f6b84F6a849C212Df",
      dexs: "",
      ticker: "GRANN",
    decimals: 18,
      name: "Granny Token"
    },
{
      chain: 369,
      a: "0xf8AB3393b1f5CD6184Fb6800A1fC802043C4063e",
      dexs: "0x71423f29f8376eF8EFdB9207343a5ff32604C2E3",
      ticker: "Ǝ𒑰",
    decimals: 18,
      name: "monat money Ǝ𒑰"
    },
{
      chain: 369,
      a: "0x0E5E2d2480468561dFF0132317615F7D6C27D397",
      dexs: "0xB26a7c3C02f73369B75C321565138dE9D51A0b3F",
      ticker: "MINU",
    decimals: 18,
      name: "Mega Inu"
    },
{
      chain: 369,
      a: "0x733099917CbA30614e4b2ef1de8A551645665143",
      dexs: "0x269E4923C060EEB14E744ad379821dcfBc541d6a",
      ticker: "PUSSY",
    decimals: 18,
      name: "PussyCat"
    },
{
      chain: 369,
      a: "0xF84b84dAAce6Ac00DbBAed26CA32Ff3570Aaf66C",
      dexs: "0x4C8827D6b204814a19C51Cefd4CabA1aE5FB67DA",
      ticker: "OG",
    decimals: 18,
      name: "OG.Incentive"
    },
{
      chain: 369,
      a: "0x3981920A82d95A117A8747eCF9A11e105Ca38B62",
      dexs: "0xB2A40341C81CBa0811386d821CFfe49929E7ac4F",
      ticker: "GDAY",
    decimals: 18,
      name: "GillespieCoin"
    },
{
      chain: 369,
      a: "0x34F0915a5f15a66Eba86F6a58bE1A471FB7836A7",
      dexs: "0x8534EDb4061c69317425Ab3D93caEa4d3ceA4b15",
      ticker: "PLSD",
    decimals: 12,
      name: "PulseDogecoin"
    },
{
      chain: 369,
      a: "0x303f764a9c9511c12837cd2d1ecf13d4a6f99e17",
      dexs: "0x772D497bcdEB51fdF38BD7D097a4Cb38cf7420a7",
      ticker: "ATROFA",
    decimals: 18,
      name: "Atrofarm"
    },
{
      chain: 369,
      a: "0xca66b54a8a4ad9a231dd70d3605d1ff6ae95d427",
      dexs: "",
      ticker: "CHIRP",
    decimals: 18,
      name: "Chirp Finance"
    },
{
      chain: 369,
      a: "0x5f98805A4E8be255a32880FDeC7F6728C6568bA0",
      dexs: "",
      ticker: "pLUSD",
    decimals: 18,
      name: "LUSD Stablecoin"
    },
{
      chain: 369,
      a: "0x3693693695E7a8Ac0ee0ff2f2C4E7B85eAB6c555",
      dexs: "",
      ticker: "PHL",
    decimals: 8,
      name: "PulseHotList"
    },
{
      chain: 369,
      a: "0x115f3Fa979a936167f9D208a7B7c4d85081e84BD",
      dexs: "0xF283597c0f17F7EEf9eD7323c84755d8Ad1c64CB",
      ticker: "2PHUX",
    decimals: 18,
      name: "2PHUX Governance Token"
    },
{
      chain: 369,
      a: "0x6d358129Df7Ae10ee925D52e16F71A76D424990B",
      dexs: "",
      ticker: "Prime2PHUX",
    decimals: 18,
      name: "Prime2PHUX"
    },
{
      chain: 369,
      a: "0x378b04A0E24DbF08dcA65F3c87aD9dafc1d0dd9d",
      dexs: "0x8a08b3A98b0d54F4bFdf1ed98AC6F0d1df31b0C6",
      ticker: "PKTTN",
    decimals: 18,
      name: "PulseKitten"
    },
{
      chain: 369,
      a: "0xcb2c9c2CF13e193F634c84879F375B524e4A73C3",
      dexs: "",
      ticker: "TBUX",
    decimals: 18,
      name: "TOYBUX"
    },
{
      chain: 369,
      a: "0x9CC7437978255e2c38B0d3D4671fb9AC411a68aC",
      dexs: "0xF30034233D8Da99AA61758B8aCde1eEDee8fb1F1",
      ticker: "DOGE",
    decimals: 18,
      name: "DOGE"
    },
{
      chain: 369,
      a: "0xd687FF2C9C5294f4A2bC0300B46eA921dB312063",
      dexs: "0x520F95183AA54e688ba8a3d2f94eaECd15dFd5BB",
      ticker: "GLASS",
    decimals: 18,
      name: "Glass"
    },
{
      chain: 369,
      a: "0x46565877E756b2ACca78faf2F7FF558DafbdD3E4",
      dexs: "",
      ticker: "Kakadu",
    decimals: 18,
      name: "Kakadu"
    },
{
      chain: 369,
      a: "0x39b9d781dad0810d07e24426c876217218ad353d",
      dexs: "",
      ticker: "FLOW",
    decimals: 18,
      name: "Pulsechain FLOW"
    },
{
      chain: 369,
      a: "0x0b14edb2ffaea3888f62d5fbfb2b88c53a987ddd",
      dexs: "",
      ticker: "WC",
    decimals: 18,
      name: "WhalesCandyPLS com"
    },
{
      chain: 369,
      a: "0xa685C45fd071DF23278069Db9137e124564897D0",
      dexs: "0x31CA89FDe57222a67fD62606A8874AE2cE4d2654",
      ticker: "PLN",
    decimals: 18,
      name: "PulseLN Founder Token"
    },
{
      chain: 369,
      a: "0x4c00e339F5dC4E97639d6C1c0a0ea4a022a66dB0",
      dexs: "",
      ticker: "NWO",
    decimals: 18,
      name: "New World Orange"
    },
{
      chain: 369,
      a: "0x2Ca480415aB96caf6e3EB0A8687E89EdBAB1DF4c",
      dexs: "",
      ticker: "ATH",
    decimals: 18,
      name: "ALL TIME HIGH"
    },
{
      chain: 369,
      a: "0x8eDb13CE75562056DFf2221D193557Fb4A05770D",
      dexs: "0xc71688A1DC88e831FA813477db68B2847b2189eF",
      ticker: "MEGA",
    decimals: 18,
      name: "Make Ethereum Great Again"
    },
{
      chain: 369,
      a: "0x075F7F657AEAD0e698EDb4E0A47d1DEF869536B4",
      dexs: "0xA3D63cd5d87c0396Aa6B0180F5d163a523Dc6b99",
      ticker: "ANON",
    decimals: 18,
      name: "Degen Anonymous"
    },
{
      chain: 369,
      a: "0x637Ecd6b33BD8d5A550939A2e6058Dd7Dc52812e",
      dexs: "0x592C495AAf8649eaB16670CcC4354c3B6b3fD14e",
      ticker: "BAANA",
    decimals: 18,
      name: "Baaana Massik"
    },
{
      chain: 369,
      a: "0x93Ad3C61f5e39c0DA07fCEbAe0261eAA2d3A9314",
      dexs: "0x63A1A0C5f246cf3a25eF3f37d0d7F87935f6308A",
      ticker: "Never Brok Again",
    decimals: 18,
      name: "Never Broke Again"
    },
{
      chain: 369,
      a: "0x4CB4eDdE04772332a42ECb039f3790e17733B4B8",
      dexs: "0x36FA7dD16E600947e20f3a089eb1C6d86377B69c",
      ticker: "PUSSY (HOAX)",
    decimals: 18,
      name: "PUSSY (HOAX)"
    },
{
      chain: 369,
      a: "0x8D36123903f504eB81eEB832727af517c0db26bD",
      dexs: "0xc67c402417bEAAFFA486fFE16a8aB03B7D9A1942",
      ticker: "NOPE",
    decimals: 18,
      name: "Nope"
    },
{
      chain: 369,
      a: "0x203e366A1821570b2f84Ff5ae8B3BdeB48Dc4fa1",
      dexs: "0xbd1AA6DA9A631028669fCbfbCC66017A97B7Bbe5",
      ticker: "CROWS",
    decimals: 18,
      name: "CROWS ㉫"
    }, {
      chain: 369,
      a: "0xcf409c91b49dd3f796d20eec20535fdc79a08798",
      dexs: "0xa6c466e31538439040f4753c3f4562c294ee3d96",
      ticker: "DMND",
      decimals: 18,
      name: "Diamond"
    },
{
      chain: 369,
      a: "0x6f0dDa6b522fcC7807CcacA4D37eF6958e95E1B9",
      dexs: "0xbAC896a71c870abB754bc6384fB1859Cf6B4A9b9",
      ticker: "CDP",
    decimals: 18,
      name: "Carpe Diem Pension"
    },
{
      chain: 369,
      a: "0x0016269802dE1FC2dC4F5Cfd2178f721EF2171EE",
      dexs: "0x214cAb338Fe0318DA2E246b6cB434fac0ED3AD93",
      ticker: "NOEX",
    decimals: 18,
      name: "NO EXPECTATION"
    },
{
      chain: 369,
      a: "0x85F1724A1a21a2e4F27C2ffb54a976D5857b2FA0",
      dexs: "0x395a9F7D60063c726DA704c724811db298f0Ada3",
      ticker: "ENIGMA",
    decimals: 18,
      name: "The Enigma"
    },
{
      chain: 369,
      a: "0x8dcf280e9D3f8B988Bba0000428a02C860E50bFf",
      dexs: "0x96dCf5838107aB6B5ED155cc31D317dDB5200F08",
      ticker: "MANIA",
    decimals: 10,
      name: "Rentomania Token"
    },
{
      chain: 369,
      a: "0x7E461D9b06e8B7a4806beB6B9C5C5CB44da3E555",
      dexs: "0x4943998c5cCC063A9a9Ed2ba6e43e8EaddaEC07C",
      ticker: "COOKIES",
    decimals: 18,
      name: "Cookies"
    },
{
      chain: 369,
      a: "0x1c2766F5949A4aA5d4cf0439067051135ffc1b28",
      dexs: "0x87791dD63EcFb326768630e7Ae3A3497f295b656",
      ticker: "ROB",
    decimals: 18,
      name: "Richards Only Brothr"
    },
{
      chain: 369,
      a: "0xD738328b589c6fbfd1Dcff107C4243c73b2e05a9",
      dexs: "0xbE3Dd5483D4867fc2E4F5e68c91eCD360c6a287A",
      ticker: "BSTRD",
    decimals: 18,
      name: "Bastard Token"
    },
{
      chain: 369,
      a: "0xC52F739f544d20725BA7aD47Bb42299034F06f4F",
      dexs: "0x5da3F2B568073Cc04B136E866a44F920603556B4",
      ticker: "PLSP",
    decimals: 18,
      name: "PulsePot"
    },
{
      chain: 369,
      a: "0x7c7ba94b60270BC2c7d98d3498B5ce85B870a749",
      dexs: "",
      ticker: "HTP",
    decimals: 18,
      name: "HowToPulse"
    },
{
      chain: 369,
      a: "0xA74CE5E7C5AB50e22ef0daAfa555f8Cb2B6b9320",
      dexs: "0x4a0C43984983b254a118573EfD073cF92b1B974f",
      ticker: "CREDS",
    decimals: 18,
      name: "Galactic Credits V2"
    },
{
      chain: 369,
      a: "0x93Cf7d72333Fe9faEb9D455b82A4c85D7F0609aa",
      dexs: "",
      ticker: "PEPPA",
    decimals: 18,
      name: "Peppa"
    },
{
      chain: 369,
      a: "0x9b279454E850f7BcEFf39bd24804AcADDAC50f7E",
      dexs: "",
      ticker: "CLG",
    decimals: 18,
      name: "CAPSLOCKGANG"
    },
{
      chain: 369,
      a: "0x138568b12b027fA604Ad1d2259A6785ff1B8f8CF",
      dexs: "0x25F1e190525f8aFeF9BfBc49F2891F0ECbbD98Dc",
      ticker: "HONK",
    decimals: 18,
      name: "HONK"
    },
{
      chain: 369,
      a: "0x645c33E6ecC5e5FD67Bcc248cAd29B1950E469C6",
      dexs: "0xAE7765B1bBdFE0e7b6294b2331E372B891e3EDA0",
      ticker: "BOBO",
    decimals: 18,
      name: "BOBO"
    },
{
      chain: 369,
      a: "0x88BdfdBbb5f6DeF9fA1B20eeFDB7FbF41Eb789CB",
      dexs: "0x0C29255D172DFd423b426d3921c052BAB7F7Cd8e",
      ticker: "DUCK",
    decimals: 18,
      name: "Louis The Duck"
    },
{
      chain: 369,
      a: "0x6293373bf0dae2050641973d49b7b2f71adc91a1",
      dexs: "0xfc8f935746F1A583FC3A1775e84b349F20442586",
      ticker: "2CC",
    decimals: 18,
      name: "2 Cent Club"
    },
{
      chain: 369,
      a: "0x56c57426795174789dadBb1BA07452270e010448",
      dexs: "",
      ticker: "BFX",
    decimals: 18,
      name: "Bigfoot"
    },
{
      chain: 369,
      a: "0xc42945a98Eaaae8FaFBc76baCE473C90D8100967",
      dexs: "0x5e39D583D9385006285D0d26eb7Adf8671A2A24A",
      ticker: "MAGIC",
    decimals: 18,
      name: "Magic Carpet Ride"
    },
{
      chain: 369,
      a: "0x7dB3b754883307851e2246Ad6B44D60f42Bf936F",
      dexs: "0xC3e817cCa15633aa9b9f8eFE59dE9aB5b383d73f",
      ticker: "INTR",
    decimals: 18,
      name: "INT3RC3PTOR"
    },
{
      chain: 369,
      a: "0xE846884430D527168B4EAaC80Af9268515D2f0CC",
      dexs: "",
      ticker: "PINE",
    decimals: 18,
      name: "Atropine"
    },
{
      chain: 369,
      a: "0x54f667db585b7b10347429c72c36c8b59ab441cb",
      dexs: "0xe34c1a936aa844da23fb6e70aa143e97135691d5",
      ticker: "GOFURS",
      decimals: 18,
      name: "GOFURS on PulseChain"
    },
{
      chain: 369,
      a: "0xe2e1a5d691cCB9E88b84e23A1166B4e6Bd6904Dc",
      dexs: "0x9b9b4168A1c962829F9b6D2530cA8DF6214dd513",
      ticker: "ZIZEK",
    decimals: 18,
      name: "ŽIŽEK"
    },
{
      chain: 369,
      a: "0x749ccf4c4308490F3c395De897F58e091090B461",
      dexs: "0x88fb694A376be1b9b2Be9212A76348D4ee69b4a0",
      ticker: "RH404",
    decimals: 18,
      name: "RH404"
    },
{
      chain: 369,
      a: "0x10d46D6F8f691d3439A781FC5E7BE598Ab67b393",
      dexs: "",
      ticker: "E.BTC",
    decimals: 18,
      name: "EvmBitcoinToken"
    },
{
      chain: 369,
      a: "0x3e7ae951d9925E6e5DE6140a99B90c3259445c9B",
      dexs: "",
      ticker: "PIZZA",
    decimals: 18,
      name: "A Free Slice Of Pizza"
    },
{
      chain: 369,
      a: "0x880Dd541e00B966d829968c3198F11C8ca38A877",
      dexs: "0xb8eFCcb3FA5D4Bc68524989173Dc603E1ACC0362",
      ticker: "PTP",
    decimals: 18,
      name: "PulseTrailerPark"
    },
{
      chain: 369,
      a: "0x90732c0aBC7b44F6e00c4CC90d29293D1DD01d8B",
      dexs: "0xac1dC64CABC9002297dBdbD57472f65e2072d439",
      ticker: "COWTIP",
    decimals: 18,
      name: "pls.farm"
    },
{
      chain: 369,
      a: "0x72a96Ea9DA0C909500eEF1Ef81B433C3A26EB649",
      dexs: "0x55153BE38446b9C44d8962F8f317A394f018dE39",
      ticker: "sciViVe",
    decimals: 18,
      name: "sciViVe"
    },
{
      chain: 369,
      a: "0xd7407BD3E6aD1BAAE0ba9eaFD1Ec41bFE63907B2",
      dexs: "",
      ticker: "BEAN",
    decimals: 18,
      name: "BEAN by Barista"
    },
{
      chain: 369,
      a: "0x97f7259931f98CC64EbCd993fdE03d71716f3E07",
      dexs: "0x8850Ae6B4ABf3F6aa27263f8a7BdFC540fF2Cfd0",
      ticker: "NUTS",
    decimals: 18,
      name: "Secret Squirrel Society"
    },
{
      chain: 369,
      a: "0xE08FC6Ce880D36a1167701028c0ae84dc3e82b8f",
      dexs: "0x4DD3225eCEaA5A7cfdf473bC4ea4838dC6DD2224",
      ticker: "YEP",
    decimals: 18,
      name: "Yep"
    },
{
      chain: 369,
      a: "0x495d9b70480A22a82D0FB81981480764BA55550e",
      dexs: "0x8A41dCd8cfd5F34F9ba9731Fbdbf34b45B1B41aa",
      ticker: "MOG",
    decimals: 18,
      name: "Mog Coin"
    },
{
      chain: 369,
      a: "0x7FF1C0e8C968a8Ddc1F25e3D891562EA549Ee32e",
      dexs: "0xf6Ba4598A405A1bd63Ea022Fad235907B235A37F",
      ticker: "MCR369",
    decimals: 18,
      name: "Magic Carpet Ride"
    },
{
      chain: 369,
      a: "0x8E64f0fCa8f0219cEF329ae593Ad6490BE122Ecb",
      dexs: "0xb5271622952f84197027F9F43947518157e27cCF",
      ticker: "MOON",
    decimals: 18,
      name: "MOON"
    },
{
      chain: 369,
      a: "0x6e86e2b8be6228d1c12aA9d82f5Ec3F27A88Ecce",
      dexs: "0xFA78fA581a52c22A0E68e370d5e0C2CAb419B940",
      ticker: "GIFF",
    decimals: 18,
      name: "GIFFORDwear"
    },
{
      chain: 369,
      a: "0xa8DCD0EB29f6F918289b5C14634C1B5F443Af826",
      dexs: "0x6547F88d725201D3119c5BBb6045A4059F5D2181",
      ticker: "MIKE",
    decimals: 9,
      name: "Monsters INC"
    },
{
      chain: 369,
      a: "0xDFB10795E6fE7D0Db68F9778Ba4C575a28E8Cd4c",
      dexs: "0xc7327a7FF7e21ee8b3C872448CFf428C6389EdA2",
      ticker: "ISLAND",
    decimals: 18,
      name: "Function Island"
    },
{
      chain: 369,
      a: "0xe2892C876c5e52a4413Ba5f373D1a6E5f2e9116D",
      dexs: "",
      ticker: "TRC",
    decimals: 18,
      name: "The Reptilian Currency"
    },
{
      chain: 369,
      a: "0x3bE6A0ED144A5A39d423765b2DC3109d2E7ed8Be",
      dexs: "",
      ticker: "TWV",
    decimals: 18,
      name: "TitsWifVag"
    },
{
      chain: 369,
      a: "0xfd4d3A2fd12C7f3146428a2ebDCb489550Ae9bea",
      dexs: "0x6843AA0b6Cbf34Cbaa73a8Be4a14fb6C9e94E61a",
      ticker: "FARM",
    decimals: 18,
      name: "Function Island Farm"
    },
{
      chain: 369,
      a: "0xA5beB85e5F82419Ab6BD0C13f6C3F66bb95C79DA",
      dexs: "0x5Ac9Ce15e67ac2c76c030B149EEe4cc73e3238Ae",
      ticker: "PEAR",
    decimals: 18,
      name: "Rick Ross Pear"
    },
{
      chain: 369,
      a: "0x4Aeb2D80f7A3d310072F0fCAf13B1E943B49b138",
      dexs: "0x8bb38b1EEE2239f71CF7e7CF0CD200c30a7648CF",
      ticker: "SPKY",
    decimals: 18,
      name: "toospooky"
    },
{
      chain: 369,
      a: "0xe1d32634516926F0A440ef42b8fCD9fefe71ADBE",
      dexs: "0x190277AcC7CBa9fA9C854402B804a5a60CFfBAfe",
      ticker: "HSA",
    decimals: 8,
      name: "Hedron S'mores Address"
    },
{
      chain: 369,
      a: "0x1F5E09CA8164d33d3923ec89c76620B15c51C25B",
      dexs: "0xba2dDdaB72439DA2D052Fa745a24351B8Ef6F5a4",
      ticker: "LUNCH",
    decimals: 18,
      name: "Lunch Money"
    },
{
      chain: 369,
      a: "0x8fC70fd5F10Cd5494EB369b0737CefD22eB33F17",
      dexs: "",
      ticker: "pGIFF",
    decimals: 18,
      name: "PermaGIFF"
    },
{
      chain: 369,
      a: "0xB6Bad00525221EB28Eb911a0B1162a0709b4CE57",
      dexs: "0xD0c2a9233907210994ed82A0e794822114f88DB8",
      ticker: "HARD",
    decimals: 9,
      name: "DaiHard"
    },
{
      chain: 369,
      a: "0x8f1D7d2f81BE5DBd82313BEeDA0877Fb34351756",
      dexs: "",
      ticker: "RHM",
    decimals: 9,
      name: "RHM"
    },
{
      chain: 369,
      a: "0x0ef57e7382be66f41c52307d19dd84a8b55b5ee2",
      dexs: "",
      ticker: "RICHAI",
    decimals: 18,
      name: "RichAI"
    },
{
      chain: 369,
      a: "0x0784e455D0a3adb2c02Aa241F029B9fc3F55FA5A",
      dexs: "",
      ticker: "RHXL",
    decimals: 9,
      name: "RHXL"
    },
{
      chain: 369,
      a: "0x764F1A4e2D5A7D1A32aC0F8B8A109cE831C3dC66",
      dexs: "0xD9AE5446eeb4a11F4EB49e3bd3d88a4Fd781De92",
      ticker: "FURU",
    decimals: 18,
      name: "Furu Token"
    },
{
      chain: 369,
      a: "0x27b67bd4b710C352a5716b77ce1bfc2beb5CA1e2",
      dexs: "0x90c80E871831a0c4bb855460884051a9798e6d13",
      ticker: "BOOMER",
    decimals: 18,
      name: "BOOMER"
    },
{
      chain: 369,
      a: "0xD11f64ced78fd0235433fB737c992781E5Ce0C82",
      dexs: "",
      ticker: "HART",
    decimals: 9,
      name: "RicHoord hArt"
    },
{
      chain: 369,
      a: "0xabeb72F153e050B3F8cCa3DD93fe1eEaD51123DB",
      dexs: "0xC2F5B2D1EDeF6596Eb00405Dc73A77435c571525",
      ticker: "CHIITAN",
    decimals: 18,
      name: "Chiitan"
    },
{
      chain: 369,
      a: "0x80028eDf22a39E7DE07F4b6D9a559420e40b8761",
      dexs: "0xb49c11998F1f489f23B1048f90471F8D4fB06346",
      ticker: "FGZ",
    decimals: 18,
      name: "FUGAZI"
    },
{
      chain: 369,
      a: "0x0767ed257BeEE2F4659e31Ab80AEE3FD2D5Cd81b",
      dexs: "",
      ticker: "DISCOVERY",
    decimals: 18,
      name: "Hammer Time"
    },
{
      chain: 369,
      a: "0x8aB5BAB83E62D647aF74631479885556Ee9f3410",
      dexs: "0x5BC16aC191c1015c204c443327271f8F1017Cb47",
      ticker: "MTT",
    decimals: 18,
      name: "MetaTreasure"
    },
{
      chain: 369,
      a: "0x569D4018E8a5B869b57df1a0A5C7B4E71aF29656",
      dexs: "0x9F482E42916488BfF4e63b10153876822bE7E8aB",
      ticker: "LVL",
    decimals: 18,
      name: "LEVEL"
    },
  {
      chain: 369,
      a: "0x14B02AFF4B105d18c90472EF574AcC58D9994D1D",
      dexs: "0x684a82812633bFaBfD6D2b19da54C28ff3c19500",
      ticker: "FRUIT",
    decimals: 18,
      name: "Florida Fruit Rat"
    },
{
      chain: 369,
      a: "0x74D98E37132dF921dF38c5A2Ae8748aDbab63238",
      dexs: "0x18701429A0cEF83668A19e351507A4888e7Ce8af",
      ticker: "Nanana",
    decimals: 18,
      name: "Banana Republic"
    },
{
      chain: 369,
      a: "0x22b2f187E6EE1f9Bc8f7Fc38bB0D9357462800e4",
      dexs: "",
      ticker: "SOIL (Old)",
    decimals: 2,
      name: "SUN Minimeal (Old)"
    },
{
      chain: 369,
      a: "0xAE1D4cDe040524321C87b923636E5Ad564147225",
      dexs: "",
      ticker: "STBL",
    decimals: 2,
      name: "SUN Minimeal STABLE"
    },
{
      chain: 369,
      a: "0x283a7e68DBB4d26Cb3878CA9084ed3d0e45cF5C5",
      dexs: "",
      ticker: "ACCOUNT",
    decimals: 18,
      name: "ACCOUNT"
    },
{
      chain: 369,
      a: "0x4B8dA1baCdc416A1Cc339F462e2DE97A4D7cE891",
      dexs: "0x1e6Fc01aaBd7479fb4b3470ba2d47dDE0A97054D",
      ticker: "FSS",
    decimals: 18,
      name: "FRESH START SHOWER"
    },
{
      chain: 369,
      a: "0xe991E9A1090E707206e12561eB271712B1A20Ee4",
      dexs: "0xBcA40438c77C7953BA1f8385abb08AD4235fF2ca",
      ticker: "WINGS",
    decimals: 18,
      name: "WINGS"
    },
{
      chain: 369,
      a: "0x5FE90464eD06B809D3f8888aD12e98346E409d4D",
      dexs: "0x0eC1a1aff06E61bB8047b4acF955C3A88E054e86",
      ticker: "TEVE",
    decimals: 18,
      name: "SCUBA STEVE"
    },
{
      chain: 369,
      a: "0xE6A811b5D0590cA747eefeC84EEB8de9FbE4449c",
      dexs: "0x1029F6Ac6aa2254c199c6463c675FA3fAfcd02B5",
      ticker: "PEDRO",
    decimals: 18,
      name: "PEDRO"
    },
{
      chain: 369,
      a: "0x3cC6704b0902475587363DEfbD6dAb2ec0581628",
      dexs: "0x2f4D7e18028718872aac454c624fFDb888f38272",
      ticker: "PEACH",
    decimals: 18,
      name: "Freedom of Peach"
    },
{
      chain: 369,
      a: "0x8b659DDc0289eD8E5E463254B34ffc7CA3DF1DEC",
      dexs: "",
      ticker: "PPAP",
    decimals: 18,
      name: "PenPineappleApplePen"
    },
{
      chain: 369,
      a: "0xBd2826B7823537fcD30D738aBe4250AD6262209c",
      dexs: "0x476eec5c749Fd2F7B95F9C868357C192d28E8046",
      ticker: "iBurn",
    decimals: 9,
      name: "Icosa Burn"
    },
{
      chain: 369,
      a: "0x6810e776880C02933D47DB1b9fc05908e5386b96",
      dexs: "0x7C69B191990891392ea6909e5C8679E16ae9EFD5",
      ticker: "pGNO",
    decimals: 18,
      name: "Gnosis on Pulsechain"
    },
{
      chain: 369,
      a: "0x6526779a6AdA09f2Dd3bbB3AF92a280c2c8a1860",
      dexs: "",
      ticker: "BTC",
    decimals: 18,
      name: "Bitcorn"
    },
{
      chain: 369,
      a: "0x1D5bE0c1e3Cb01d8Cd871970a1bd51a262554a87",
      dexs: "",
      ticker: "EXT",
    decimals: 18,
      name: "EXTREME"
    },
{
      chain: 369,
      a: "0xeB2CEed77147893Ba8B250c796c2d4EF02a72B68",
      dexs: "0x25D240831a9c0CB981506538E810d32487D291Af",
      ticker: "PDRIP",
    decimals: 18,
      name: "Pulse Drip"
    },
{
      chain: 369,
      a: "0xDd199016942596Ad07B0aC5Cb167121F4D709d56",
      dexs: "0x666f4F34855dE8742dc5F59ADf11596C120D9097",
      ticker: "GME",
    decimals: 18,
      name: "GameStop"
    },
{
      chain: 369,
      a: "0xf21aeE14137E9bC4B3D5170300dde849f7fE2D85",
      dexs: "",
      ticker: "OMG",
    decimals: 18,
      name: "Orange Man Good"
    },
{
      chain: 369,
      a: "0x32151909F971534de577d86E5346e45d1D9873d9",
      dexs: "",
      ticker: "bGIFF",
    decimals: 18,
      name: "BABY GIFF"
    },
{
      chain: 369,
      a: "0xc13A1f27ca24523cfe4C817eD7FF752783fBCd19",
      dexs: "0xC90E6cfc34D7A6bC934d6Ed06898dD3858d1291A",
      ticker: "GAME",
    decimals: 18,
      name: "GAME"
    },
{
      chain: 369,
      a: "0x424E38032E9D3BfD0A72f837B4d930A6831D11c6",
      dexs: null,
      ticker: "DWP",
    decimals: 18,
      name: "DickWifPump"
    },
{
      chain: 369,
      a: "0xaC9052cb220951c3CCA0Beb4C084A7D4fd2e3428",
      dexs: "0xF8e9B2259987068494A150E52B4339abe4cF5242",
      ticker: "PIZZA 2",
    decimals: 18,
      name: "New York City Pizza Rat"
    },
{
      chain: 369,
      a: "0x51AD4671492dcf0544506f1Fe13C82c1Fb874FA2",
      dexs: "",
      ticker: "Enigma404",
    decimals: 18,
      name: "Enigma404"
    },
{
      chain: 369,
      a: "0xC697E0bB8ac6D1CFd928bca3E43CC64e2190e828",
      dexs: "",
      ticker: "MATI",
    decimals: 18,
      name: "MatiAllin"
    },
{
      chain: 369,
      a: "0x1d98844528313Ed4fC743Cc106C15aee07C2072F",
      dexs: "0x1236291Ca3067646cAcfb351ac1cC358ce709BfE",
      ticker: "MILK",
    decimals: 18,
      name: "Mega Milk"
    },
{
      chain: 369,
      a: "0x0A0F70B227f782f2CeAD75554781AF45a620A296",
      dexs: "0x60FB68986190995eD0454174aA85Ca3F411Eb95d",
      ticker: "PIKA",
    decimals: 18,
      name: "PIKA to PIKO"
    },
{
      chain: 369,
      a: "0x96c91022A7CB49B41Cb2262E9fB560D863b7389e",
      dexs: "0x8E18EB325D88C650973679A86982a189CCE85d45",
      ticker: "POOL",
    decimals: 18,
      name: "Pool Token"
    },
{
      chain: 369,
      a: "0x5a24D7129B6f3FcAd2220296df28911880AD22B0",
      dexs: "0xDFc23736c6910Dc27E7fB60553cD1F44D65eb556",
      ticker: "PZEN",
    decimals: 9,
      name: "Pulse Zen"
    },
{
      chain: 369,
      a: "0x88dF592F8eb5D7Bd38bFeF7dEb0fBc02cf3778a0",
      dexs: "",
      ticker: "pTRB",
    decimals: 18,
      name: "Tellor Tributes on Pulsechain"
    },
{
      chain: 369,
      a: "0x6DEA81C8171D0bA574754EF6F8b412F2Ed88c54D",
      dexs: "0x7EbEA6AAE0c5a3Fb17D7C34Ca4f0d8444BaA7c13",
      ticker: "pLQTY",
    decimals: 18,
      name: "LQTY on Pulsechain"
    },
{
      chain: 369,
      a: "0x4Fabb145d64652a948d72533023f6E7A623C7C53",
      dexs: "",
      ticker: "pBUSD",
    decimals: 18,
      name: "Binance USD on Pulsechain"
    },
{
      chain: 369,
      a: "0xb528a9DB27A74dB802C74D0CCc40657efE5F0A45",
      dexs: "0x198807E9B3CE303e3c759d7492a73F69Bd1EdA32",
      ticker: "SAVVA",
    decimals: 18,
      name: "Content Reward Token"
    },
{
      chain: 369,
      a: "0x0bC1e003e2A3CE1428Ec1c3B846E99EbC246BAa7",
      dexs: "0x51194744B9b6dC543307Ce701cAa530eaC6e7775",
      ticker: "ENKI",
    decimals: 18,
      name: "ENKI"
    },
{
      chain: 369,
      a: "0xa27aDe5806Ded801b93499C6fA23cc8dC9AC55EA",
      dexs: "0x113BBDFEa64b06aEBe14A50e00c70149A32973AB",
      ticker: "MAFIA",
    decimals: 18,
      name: "MAFIA"
    },
{
      chain: 369,
      a: "0x298978f9B59A4BF9c08C114Fb6848fade7Be7E18",
      dexs: "0xBc60a8685C7886D1722B2343854700E9258B7D12",
      ticker: "HEX1",
    decimals: 18,
      name: "HEX1 Token"
    },
{
      chain: 369,
      a: "0x8d4D6aa8339dB0252dc92957544fe6931e0826Db",
      dexs: "",
      ticker: "HEXIT",
    decimals: 18,
      name: "HEXIT Token"
    },
{
      chain: 369,
      a: "0x4013abBf94A745EfA7cc848989Ee83424A770060",
      dexs: "0x890858A7B4Ec18D695Bfd8E5c642E61FaD41a308",
      ticker: "VETS",
    decimals: 18,
      name: "VETERANS"
    },
{
      chain: 369,
      a: "0x165D605DAEAD3ee97b887CAf30e2dF673646d1F4",
      dexs: "0x023CE27e2Dc35d6F239C7b9c1F572efc74A01190",
      ticker: "Leonidas",
    decimals: 18,
      name: "Leonidas"
    },
{
      chain: 369,
      a: "0x67d8954C2B7386c8Dbf6936Cc2355bA2227F0a8f",
      dexs: "0x7C831bD9310669edFC22c618d7ba453056178844",
      ticker: "Stack",
    decimals: 18,
      name: "StackedItalian"
    },
{
      chain: 369,
      a: "0xF882BC48d989Ca1cA55a268701BfA3619B0a3Fd4",
      dexs: "0x5e953F2cE5c27f753aEEB949B4eE9D9780C83b53",
      ticker: "FIB",
    decimals: 18,
      name: "Fibocoin"
    },
{
      chain: 369,
      a: "0xA5AC6346077aa95095D34AEBFbcd61C367A08B2f",
      dexs: "0xEa2929a19b8E6524c93A38931CB505Ec881412dE",
      ticker: "PTV",
    decimals: 4,
      name: "Pulse TV"
    },
{
      chain: 369,
      a: "0xFeAC4699AcFC80BA888FE20235c3B381d9af7C30",
      dexs: "0x67BB0569ceE5642d64Cf107c78829100c6c0e528",
      ticker: "WIN",
    decimals: 18,
      name: "WIN"
    },
{
      chain: 369,
      a: "0xF876BDf9D6403AA7D5bF7F523E8f440A841CC596",
      dexs: "0x6292F579606108a285FF7b75EFad54Dc12576385",
      ticker: "RFX",
    decimals: 18,
      name: "REFLUX"
    },
{
      chain: 369,
      a: "0xD4e685ecD1C177A5D9661cF675309E5D00c2e08a",
      dexs: "0xB41F5d6Eb3Bf3468e8C52BF3f4671e2568768Ae7",
      ticker: "BCH",
    decimals: 18,
      name: "Bitcoin Cash"
    },
{
      chain: 369,
      a: "0xCB43bc226386f8b9d63879ee3A4C5b32E6516054",
      dexs: "0x1a364116fd70A00A1D2E8C9d57842a98C3243d62",
      ticker: "CHAD",
    decimals: 18,
      name: "GIGA CHAD"
    },
{
      chain: 369,
      a: "0xC1967c5a0cedc577D9017D2465bC0b0c55eAFE49",
      dexs: "",
      ticker: "CAMEL",
    decimals: 18,
      name: "CAMEL CLAN"
    },
{
      chain: 369,
      a: "0x3653FFa4c863585F8303BD649BcF934C621EE30C",
      dexs: "0xA32efBBcDFca0230724EDf75b6d1312459e279cA",
      ticker: "KING2",
    decimals: 18,
      name: "KING POOIE"
    },
{
      chain: 369,
      a: "0xc438437218009EDD656d319689c902aE56b4b96F",
      dexs: "0x8Fc875E78305E85cfC30315c090122607A74d1A2",
      ticker: "DTO",
    decimals: 18,
      name: "Ditto"
    },
{
      chain: 369,
      a: "0x1Cf43d56cF32e754FfC894c2b0587d8BC9035952",
      dexs: "0x53bf4Af2d93d40fC730a10dB5E7180C70a6Cd9d7",
      ticker: "INCENTIVE",
    decimals: 18,
      name: "ChuckNorris"
    },
{
      chain: 369,
      a: "0x54E51Cfa1CF14cB03A7eF172439fEca8804dBE1D",
      dexs: "0xeeec53a7dFc050F145eF6Ed49E5913b46C309398",
      ticker: "PULSECHAIN",
    decimals: 18,
      name: "PeterParker"
    },
{
      chain: 369,
      a: "0x95032Be41FfD6fea41781447332B5F7b1542D03d",
      dexs: "0xDf2c01Cad3Fb3D02B158649ec30BDB50F62550AF",
      ticker: "Mudkip",
    decimals: 18,
      name: "Mudkip"
    },
{
      chain: 369,
      a: "0x24F0154C1dCe548AdF15da2098Fdd8B8A3B8151D",
      dexs: "0xab7D9964B1DACbB6cA32fA9558ED4dFCFcc1a838",
      ticker: "AFFECTION",
    decimals: 18,
      name: "AFFECTION"
    },
{
      chain: 369,
      a: "0xA6C4790cc7Aa22CA27327Cb83276F2aBD687B55b",
      dexs: "0xD1e5CfDC03dD52528e84757148E12CAc8c293514",
      ticker: "X",
    decimals: 18,
      name: "X Protocol Token"
    },
{
      chain: 369,
      a: "0x97F50E6bAAA852701D2fb9d7542C87ac7cD8262D",
      dexs: "0x0C50ff54129552aEBDD3A626832969FE46A22867",
      ticker: "SHKR",
    decimals: 18,
      name: "Shocker"
    },
{
      chain: 369,
      a: "0x9Dc1684Fa60458faf59Af2a7538FF9bd59a62BD6",
      dexs: "0xA20397F5d6e27ca8e48Cc3d58137cD791d483077",
      ticker: "JUPITER",
    decimals: 18,
      name: "JUPITER"
    },
{
      chain: 369,
      a: "0x4FC0C8a7636cfE551bb077BA928b4E9d59b02DC2",
      dexs: "",
      ticker: "GOLD6T",
    decimals: 8,
      name: "6 Tons of Digital Gold"
    },
{
      chain: 369,
      a: "0x8C9c31c740BA466BF2218dA2a78D40B123FC9495",
      dexs: "",
      ticker: "SUSD",
    decimals: 18,
      name: "SOUL USD"
    },
{
      chain: 369,
      a: "0x3B5eBC98eD7a796A60eDA15b54Cb084629134573",
      dexs: "",
      ticker: "SOULS",
    decimals: 18,
      name: "SOULS"
    },
{
      chain: 369,
      a: "0x23f2621d0C392d1dD4E2840416d651536dA64D4A",
      dexs: "",
      ticker: "FREE",
    decimals: 18,
      name: "FREE SOUL"
    },
{
      chain: 369,
      a: "0xde3bab90cA73D22C77050153f0bDab4c516C5552",
      dexs: "0x87763201F57D740AdE16b24d34bFfb81E8e43AA2",
      ticker: "FREE 2",
    decimals: 18,
      name: "FREE PALESTINE"
    },
{
      chain: 369,
      a: "0xD29582F42C6Aa7Bf4133F0CEda65de9c5fBEd338",
      dexs: "",
      ticker: "WRECKED",
    decimals: 18,
      name: "My Portfolio"
    },
{
      chain: 369,
      a: "0xAf5ec50cECCc4acb41204525019F531B2A55675c",
      dexs: "",
      ticker: "HATCHI",
    decimals: 18,
      name: "HACHIKO"
    },
{
      chain: 369,
      a: "0xa0381b8deB04D29FB01de3050B54c226f0BFcfB1",
      dexs: "",
      ticker: "Charm",
    decimals: 18,
      name: "Charmander"
    },
{
      chain: 369,
      a: "0x7cbEd98f3679795fc8Cd8594b98bE77575eDE156",
      dexs: "0xa6Cd210b14dC395E59218A793E412f4b49870b9d",
      ticker: "MEOWTH",
    decimals: 18,
      name: "Meowth"
    },
{
      chain: 369,
      a: "0xc1042c35A077F5c77e0FDec0E5Ea70E80b016d78",
      dexs: "0xc0164394ebeDa9236Ba5F0665EBff31EE467FC57",
      ticker: "Snorlax",
    decimals: 18,
      name: "Snorlax"
    },
{
      chain: 369,
      a: "0x23c9945687c49eB8E65A2Fd690E1D92fD0c3efE7",
      dexs: "0x71FFb4EB8d66f60ecb0458B73f975100d9c4f66c",
      ticker: "DOME",
    decimals: 18,
      name: "DOMESHOT"
    },
{
      chain: 369,
      a: "0x85DF7cE20A4CE0cF859804b45cB540FFE42074Da",
      dexs: "0x549B9714867aB856523d9E3534C255E286371D1e",
      ticker: "ACTR",
    decimals: 18,
      name: "Actuator"
    },
{
      chain: 369,
      a: "0x4eF90d0a9b107DFf6E916102C4DaF3d0A564b577",
      dexs: "0x75567FDC23776108b0e28D5289b1E40e5E2c1E60",
      ticker: "KUMAMON",
    decimals: 18,
      name: "KUMAMON"
    },
{
      chain: 369,
      a: "0x2dA60FA8D9d8481Df1CbEF487DA8Bc70dE81b3Cc",
      dexs: "0x7fdB0539D7bffdd8b02a77609e385c3afD47F6c6",
      ticker: "PUFF",
    decimals: 18,
      name: "Jigglypuff"
    },
{
      chain: 369,
      a: "0x8e60Dc40D25565867da4e0cD9c55411043F14c19",
      dexs: "0xA5924f9D4abc217f6Af0B1335F84d3643C941de3",
      ticker: "GENGAR",
    decimals: 18,
      name: "GENGAR"
    },
{
      chain: 369,
      a: "0x0c6861A673A10C272bEa7947De5E60ab44B6BAc6",
      dexs: "0x57285472d89F54A9707CFC30908bfeB5985CCb04",
      ticker: "RAGE",
    decimals: 18,
      name: "Magikarp"
    },
{
      chain: 369,
      a: "0x69C96Bb512A386a538ab52C87F34aCAf9c76D05a",
      dexs: "0xa3d1e765b7AC70C75716f76426B8428C53550509",
      ticker: "PULSAR",
    decimals: 18,
      name: "Pulsar from Ethereum"
    },
{
      chain: 369,
      a: "0xBE3381E831C035169B92EF0Cc4759C570528577d",
      dexs: "0x60d1d99F98eBE3e636fCc2Ffc1C623cdc5E4D044",
      ticker: "TITANX",
    decimals: 18,
      name: "TITAN X from Ethereum"
    },
{
      chain: 369,
      a: "0x4F0a3F5b40C509402930B139EaF006AFfBF75aDb",
      dexs: "0x2c469cc5c2aEABC520BC1873a5419Ad161E8dA05",
      ticker: "PEPU",
    decimals: 18,
      name: "Pepechu"
    },
{
      chain: 369,
      a: "0xE37747c9f3e09fCbBC9615A4Cd12C97E7BB50E34",
      dexs: "",
      ticker: "Bulba",
    decimals: 18,
      name: "Bulbasaur"
    },
{
      chain: 369,
      a: "0xD010BF67fC59AA9e440125990de23AAb91B2e5b1",
      dexs: "",
      ticker: "SHOOS",
    decimals: 18,
      name: "TRUMP Shooses"
    },
{
      chain: 369,
      a: "0x16757fa456F06AAB7aDa2Be7a5FF47fef96572DC",
      dexs: "0x1370403A76a750851A26aC1AC7959180975C6659",
      ticker: "HOG",
    decimals: 18,
      name: "HeartWifDog"
    },
{
      chain: 369,
      a: "0xdE33300e2Ec7A5b863d39eE7dDC02e58FB021F45",
      dexs: "0x95b20226d950C732C85A0a81A4C2E637DD4721e7",
      ticker: "SPX",
    decimals: 18,
      name: "SPX6900"
    },
{
      chain: 369,
      a: "0x874e3F27140FCB7cd734df9758552f36f1AC5fcF",
      dexs: "0xE335A81De2B2F92fda4c28fC4E9587925CD16F3A",
      ticker: "NUTS 2",
    decimals: 18,
      name: "Squirrel Wif Nut"
    },
{
      chain: 369,
      a: "0x51a05d2df463540c2176bADdFA946fAA0A3B5dC6",
      dexs: "0x6e200c25267F4aBEcEC23beF848b99c40731b169",
      ticker: "Aunty",
    decimals: 18,
      name: "Judge Aunty Carol"
    },
{
      chain: 369,
      a: "0xeAb7c22B8F5111559A2c2B1A3402d3FC713CAc27",
      dexs: "0x431937928F375966416f417DBc4149c64CEAB5Eb",
      ticker: "BLSEYE",
    decimals: 10,
      name: "Bullseye Bot Token"
    },
{
      chain: 369,
      a: "0x6518dD379F02DDDb65C027fE8b4042E91337ba62",
      dexs: "0x59F65729F6D1ed391a5DC124fb83eeB8EdE37433",
      ticker: "XBURN",
    decimals: 18,
      name: "XBURN.win"
    },
{
      chain: 369,
      a: "0x1C81b4358246d3088Ab4361aB755F3D8D4dd62d2",
      dexs: "0x1D23373477ecd2FdD849391Aa4a5001DEAA53156",
      ticker: "Finvesta",
    decimals: 8,
      name: "Finvesta"
    },
{
      chain: 369,
      a: "0x1eA85D477b8A523a813326eC29Ea14784339E28d",
      dexs: "",
      ticker: "GOKU",
    decimals: 18,
      name: "Son Goku"
    },
{
      chain: 369,
      a: "0x09e64c2B61a5f1690Ee6fbeD9baf5D6990F8dFd0",
      dexs: "0x352c69BB115aBbcee27D368Eb661Bf1Cda0A1E07",
      ticker: "GRO",
    decimals: 18,
      name: "Growth"
    },
{
      chain: 369,
      a: "0x04A3f80869eDD465B79bD8868Bde1a843c521b80",
      dexs: "0x5E02d1C1dDD9209c307E068f062adb773e86ADd4",
      ticker: "HEX5555",
    decimals: 18,
      name: "GigaHex"
    },
{
      chain: 369,
      a: "0x572Cd3d0e7532439eeAa8cF4C129D2264B6e515f",
      dexs: "0x722A40Dbc6dad4a6d088658461be7fe8b4F2919D",
      ticker: "D.O.G.E.",
    decimals: 18,
      name: "Department of Government Efficiency"
    },
{
      chain: 369,
      a: "0xfE2895A52271adA8227f5439A20096217A9098b1",
      dexs: "",
      ticker: "PCAP",
    decimals: 18,
      name: "Pulsechain Capital"
    },
{
      chain: 369,
      a: "0x7329F6d1d72fCB7A3623504cadE84915b021ba3c",
      dexs: "",
      ticker: "STOCK",
    decimals: 18,
      name: "Stock Token"
    },
{
      chain: 369,
      a: "0xB2fbC6E798EF33342f6810CEB32AC498B6563082",
      dexs: "0x82C428A897A4Dc559A785a7D4788875d7fe8F98F",
      ticker: "QUAD",
    decimals: 18,
      name: "The QuadFather"
    },
{
      chain: 369,
      a: "0xbbeA78397d4d4590882EFcc4820f03074aB2AB29",
      dexs: "0x423C917b87825FB6E61df7843Ad1C6D50d72a440",
      ticker: "XUSD",
    decimals: 18,
      name: "XUSD Vibratile Asset"
    },
{
      chain: 369,
      a: "0x196dD891e009f9ebE441103420A07326c4a33cba",
      dexs: "",
      ticker: "SPONGE",
    decimals: 18,
      name: "SPONGE on PULSE V2"
    },
{
      chain: 369,
      a: "0x0297a4d78dA1dbd8C1ce1FF4d90F1cb22C3ec12A",
      dexs: "",
      ticker: "Niro",
    decimals: 18,
      name: "Dai Niro"
    },
{
      chain: 369,
      a: "0xB9Cd6E3f7B4539795cB51E9C02cb7ba1A2E277d1",
      dexs: "",
      ticker: "VAULT",
    decimals: 18,
      name: "Vaultiano"
    },
{
      chain: 369,
      a: "0xB0eBAf9378d6E7531ba09403A12636947CC2f84b",
      dexs: "0x3B25Afc43c0AD3abD3D69eFab81eaBBc170d5942",
      ticker: "ALIVE",
    decimals: 18,
      name: "AxisAlive"
    },
{
      chain: 369,
      a: "0x55f49Fe677d104D0141CEF3EcFE4FCcA892D4aa9",
      dexs: "0xC70eB19cF121eE197578E4e5BF4EDed68B8f6591",
      ticker: "STD",
    decimals: 18,
      name: "SoftTastyDonut"
    },
{
      chain: 369,
      a: "0xdA1dAfB686959F1410e8A0863ebCEA02Fa605933",
      dexs: "0xED6999Fd72B101165c405B59FB9876a2c62B9450",
      ticker: "10x",
    decimals: 18,
      name: "10x That Shit"
    },
{
      chain: 369,
      a: "0xef6570621B4E7aD12F60ECE4FC09608769cDecD9",
      dexs: "0x783ad3f59818074a8c576107Cf1AC7e60EF2970F",
      ticker: "QUESO",
    decimals: 18,
      name: "QUESO from Burritos.Cash"
    },
{
      chain: 369,
      a: "0xe8CB0509811dAd76e971bAe0D58a813A4B826210",
      dexs: "0xC9268aCb064304F8bEF27b19960dc4EDF30e5523",
      ticker: "PELON",
    decimals: 18,
      name: "PulseDogElon"
    },
{
      chain: 369,
      a: "0x9DC72e4AD4d11841993F6c0a087F5B9fb458aA7C",
      dexs: "0x7f0BD35E4b1187b9c29C116d62B985dBdEEdbdfC",
      ticker: "GBABY",
    decimals: 18,
      name: "In The Know"
    },
{
      chain: 369,
      a: "0x72e4f9F808C49A2a61dE9C5896298920Dc4EEEa9",
      dexs: "0xc0b89Ee724c024b78D2F7FBc968Df29bc422930b",
      ticker: "HarryPotterObamaSonic10Inu",
    decimals: 8,
      name: "HarryPotterObamaSonic10Inu"
    },
{
      chain: 369,
      a: "0x08C26D39E9cD2175401F9115A23580cB4A4C935a",
      dexs: "",
      ticker: "BRIBE",
    decimals: 0,
      name: "BriBerry Governance Token"
    },
{
      chain: 369,
      a: "0x64f4EE0BDf92BcD7ED332eC6675726E9c0D06F8F",
      dexs: "0x76f6957D9013ac196b03Adc2810DB86aaC44c340",
      ticker: "EEVEE",
    decimals: 18,
      name: "Eevee"
    },
{
      chain: 369,
      a: "0xFC3824E8d68988D66c23baeD7bA094D8B0DBd9a6",
      dexs: "0x04954C440B91c340303Ba9C3CD9306e23576d932",
      ticker: "MAGIX",
    decimals: 18,
      name: "MAGIX"
    },
{
      chain: 369,
      a: "0x698Cb3223D8eB1A3D9908e304775118DF4F81933",
      dexs: "0x5087C61973C47f5B3C721c73892d656353BC1371",
      ticker: "PEEZY",
    decimals: 18,
      name: "Peezy"
    },
{
      chain: 369,
      a: "0xc770EEfAd204B5180dF6a14Ee197D99d808ee52d",
      dexs: "",
      ticker: "pFOX",
    decimals: 18,
      name: "FOX"
    },
{
      chain: 369,
      a: "0x2dd40F954093A9C2D67EBb5687Df9292Dac335F3",
      dexs: "0x52525a064c52a3B66AB96b474A3E56e8f8C4432C",
      ticker: "KISHKA",
    decimals: 18,
      name: "KISHKA"
    },
{
      chain: 369,
      a: "0x616cb6a245Ed4c11216Ec58D10B6A2E87271845d",
      dexs: "0xee5Ee727CF697A458f946A5262cFf051918C5313",
      ticker: "GEL",
    decimals: 18,
      name: "Gelato"
    },
{
      chain: 369,
      a: "0x9fC97f73A610318FEe90a8BdfcC2AD08e2E884DD",
      dexs: "0x71760f4840612a48b53D26F6CC208bdF70f18EBD",
      ticker: "GAGA",
    decimals: 18,
      name: "Lady Gaga"
    },
{
      chain: 369,
      a: "0xADBD09Faf339BD18d00430Be1c2cba6c1119df1E",
      dexs: "0x903e6cd4b9f1eDEbA805B62eDad3BeA885fE4cc4",
      ticker: "IMP",
    decimals: 18,
      name: "SIMP"
    },
{
      chain: 369,
      a: "0xe3B3f5F95d263edc6A5e3D4b7314728A390a4342",
      dexs: "0x6E649BE4ABdA660519baB8AB760001EC1663BD16",
      ticker: "PLSPUP",
    decimals: 18,
      name: "PLSPUPPY"
    },
{
      chain: 369,
      a: "0x74758472AddC95944769E8aDac07E391c31cAc82",
      dexs: "0xe9EF07A6cDbb7CF606c68dF00603d04dCd65Ca90",
      ticker: "pVOLT",
    decimals: 18,
      name: "pVOLT"
    },
{
      chain: 369,
      a: "0xc7eB14e178220E84530748a71b91F07c3545dE50",
      dexs: "0x20c2ca1D569175325F39e610c68b44e26ef27A98",
      ticker: "GENESIS",
    decimals: 18,
      name: "Genesis P-Orridge Coin"
    },
{
      chain: 369,
      a: "0xd5A96B6ACa28302CF1B0F860673851705D25667e",
      dexs: "0x9186C5a483A272043d4f7b307d2b39202f2Cfd9F",
      ticker: "JNS",
    decimals: 18,
      name: "Janus"
    },
{
      chain: 369,
      a: "0x1578F4De7fCb3Ac9e8925ac690228EDcA3BBc7c5",
      dexs: "0xaCe4fA86AF3dAd73e8ccEe92FB2bEEA19b564faC",
      ticker: "DARK",
    decimals: 18,
      name: "Dark"
    },
{
      chain: 369,
      a: "0x68eA849F92998D54555B33F45825c42Ee56866Fb",
      dexs: "0x12067f499584abF0624dbc423c7efA9934653Ad5",
      ticker: "pLTC",
    decimals: 12,
      name: "PulseLitecoin"
    },
{
      chain: 369,
      a: "0xa17ff0061c1E3161fe281C5FBa23B48b23ce9636",
      dexs: "0x63a2DecC610130bd465885e54faaAAd124463564",
      ticker: "CLICK",
    decimals: 18,
      name: "One Click Away"
    },
{
      chain: 369,
      a: "0xB6FDD8A5b6069De409288Bc30C69c5856Dc67aC8",
      dexs: "0xF36f3e785e1128eaBDdD8FD9A90A9a1f6AC3A3ea",
      ticker: "ETHTC",
    decimals: 2,
      name: "ETHTC"
    },
{
      chain: 369,
      a: "0xD100ecF770dC06D407787c3a991086a6E876Cc17",
      dexs: "0xe76735f33D60fC4BAa3960DFAaC89A5a5c4b0FB6",
      ticker: "MILADY",
    decimals: 18,
      name: "Milady"
    },
{
      chain: 369,
      a: "0x79FC0E1d3EC00d81E5423DcC01A617b0e1245c2B",
      dexs: "0xBfE5AE40BBcA74878419ad7d7E115a30CCFC62F1",
      ticker: "RICKY",
      decimals: 18,
      name: "Most Wanted"
    },
{
      chain: 369,
      a: "0x2f4C121cB612d423d9639dc223576A08098c3537",
      dexs: "0xf3d4b31a9FA059c7884159F00c5Cf61c86a8D800",
      ticker: "RDPIL",
    decimals: 18,
      name: "redPILL"
    },
{
      chain: 369,
      a: "0xb33a7a3142532207012F8A88787aB465eAa7FfAc",
      dexs: "0xaB5BaDB0Bb27E7Bc7250679ad08C08B71Afa6A24",
      ticker: "ICE",
    decimals: 18,
      name: "ICE KING"
    },
{
      chain: 369,
      a: "0xA99C95f034Cb10b725724f7679D10DE1748aD8ca",
      dexs: "0x8B7B4F6F76c3e511e623366f947A38Aa6Bc07b0c",
      ticker: "LNKR",
    decimals: 18,
      name: "Linker"
    },
{
      chain: 369,
      a: "0xdeFB2a9455B2d8f432d8cFe4355e0594787C23D5",
      dexs: "0xbF3e25A32dfd3EcB7D07F2FE3A2553dC09ECdb38",
      ticker: "MICHI 2",
    decimals: 18,
      name: "MICHI"
    },
{
      chain: 369,
      a: "0x962A4859B3195D5218f9D5cC85adF17a3DC66593",
      dexs: "0xB600f0edf7028aC987d1e2f1413c9fBfA37351e9",
      ticker: "PⅡP",
    decimals: 18,
      name: "Peel Ⅱ Peel Cash"
    },
{
      chain: 369,
      a: "0xA1cAFc0d6F4F0333c1136e0f759b029a6b07ca0B",
      dexs: "0xB6a639e9EDD2f17234321103F762f5cEBa4DcE58",
      ticker: "KELO",
    decimals: 18,
      name: "KELO"
    },
{
      chain: 369,
      a: "0xd826A77a9473C159b7b486903ACFF1a8357B6251",
      dexs: "",
      ticker: "GP",
    decimals: 18,
      name: "Gold Pieces"
    },
{
      chain: 369,
      a: "0x887326E8E567aE8E8dd49aCDd0aAE967A3B6DE51",
      dexs: "",
      ticker: "RAT",
    decimals: 18,
      name: "Molerat"
    },
{
      chain: 369,
      a: "0x9B3B6b8fF7434e9ec2b6D3B032b98152CCF4D266",
      dexs: "0x6d3b099dD9112dDf047e16069d343f12852bf2d2",
      ticker: "$INCOGNITO",
    decimals: 18,
      name: "$INCOGNITO"
    },
{
      chain: 369,
      a: "0x4C92437b64336480bd1168b4044Df0e5a9e9C422",
      dexs: "",
      ticker: "BF",
    decimals: 18,
      name: "Bulba Fett"
    },
{
      chain: 369,
      a: "0xE093899357Ff40E6C5685Dce845473671C67d6A4",
      dexs: "0xa5D3f9051AfE4CF1A800626fa29E04457e734e23",
      ticker: "PNX",
    decimals: 18,
      name: "Phoenix"
    },
{
      chain: 369,
      a: "0xBFaECB1a05779b4e82B79Fa1D2C80269a4CF049D",
      dexs: "",
      ticker: "TITCH",
    decimals: 18,
      name: "Stitch"
    },
{
      chain: 369,
      a: "0x78Ad9dA5d80a08AeDE9B0876B7A8807320DbDc9A",
      dexs: "",
      ticker: "GOPUMPME",
    decimals: 18,
      name: "GOPUMPME"
    },
{
      chain: 369,
      a: "0x6A46d56F9Dd963cEAc7f60aD148d49219CC3b79f",
      dexs: "0xe72951Df1F42AB9cD5492d08C01157De52b602Bb",
      ticker: "FRIENDSHIP",
    decimals: 18,
      name: "Sommi Fan Token"
    },
{
      chain: 369,
      a: "0xEa65cae72a3B4410aa5e9A964860D46AFc885987",
      dexs: "0x1A05BCb37b3C752394D95789E201CAC092e42944",
      ticker: "CORE",
    decimals: 18,
      name: "Core Coin"
    },
{
      chain: 369,
      a: "0x709e07230860FE0543DCBC359Fdf1D1b5eD13305",
      dexs: "0x237c7e99D508B0026bB233B381b53c9207Ad9DeF",
      ticker: "MARS from pump.tires",
    decimals: 18,
      name: "MARS from pump.tires (@36DC0C)"
    },
{
      chain: 369,
      a: "0x435363A7C8C63057aAD5d9903c154b4d43E00093",
      dexs: "0x2dCEe3EBa5de855ad27e8BDfE39A0869761E7e72",
      ticker: "ELON from pump.tires",
    decimals: 18,
      name: "ELON from pump.tires (@36DC0C)"
    },
{
      chain: 369,
      a: "0xb8A7bC2c6d5C1f28a8a95Dd0E7676611cfF4b075",
      dexs: "0xB9c712745e0C13F3f1BbDe3F905C27B4EeB2Dd09",
      ticker: "ALMIGHTY",
    decimals: 18,
      name: "DEGENS RUN THE CHAIN"
    },
{
      chain: 369,
      a: "0x39BcA0fE6Aed637042Ef19f0FdC2F918933C6b97",
      dexs: "0x254254182f1b6Dcc9Dcd08B6e9979942b5922d19",
      ticker: "HexO",
    decimals: 18,
      name: "HexO"
    },
{
      chain: 369,
      a: "0x253d5EcaE52B6AFEE9aC4C50e6b51FA9e7E6A8Da",
      dexs: "0x531849238EF6A422b28D9f1bbbDEea06Fb073EdC",
      ticker: "BABYHACKER",
    decimals: 18,
      name: "BABY HACKER"
    },
{
      chain: 369,
      a: "0xf598cB1D27Fb2c5C731F535AD6c1D0ec5EfE1320",
      dexs: "0xeC052d46D3115DF7F6058160Cd0b87b272201341",
      ticker: "DAI from pump.tires",
    decimals: 18,
      name: "DAI from pump.tires (@36DC0C)"
    },
{
      chain: 369,
      a: "0x080f7A005834c84240F25B2Df4AED8236bd57812",
      dexs: "0x0B3D01Dfd8B45C43695ba11547b459D55714f2a4",
      ticker: "USDC from pump.tires",
    decimals: 18,
      name: "USDC from pump.tires (@36DC0C)"
    },
{
      chain: 369,
      a: "0x279d6564A78Cc9f126eC630e8a826DD55294f875",
      dexs: "0x562D6ce995f81871a2A81fB63B4B91D630ca38Cc",
      ticker: "USDT from pump.tires",
    decimals: 18,
      name: "USDT from pump.tires"
    },
{
      chain: 369,
      a: "0xBFcfA52225Baa5feec5fbb54E6458957D53ddD94",
      dexs: "0x77E4e36E9aB013E6d48B34836b61441C328B1738",
      ticker: "ETH from pump.tires",
    decimals: 18,
      name: "ETH from pump.tires (@36DC0C)"
    },
{
      chain: 369,
      a: "0xDDe9164E7E0DA7ae48b58F36B42c1c9f80e7245F",
      dexs: "0x56AECe39050608a7944908a1754d0397067aA435",
      ticker: "DOGE from pump.tires",
    decimals: 18,
      name: "DOGE from pump.tires (@36DC0C)"
    },
{
      chain: 369,
      a: "0x1B71505D95Ab3e7234ed2239b8EC7aa65b94ae7B",
      dexs: "0x2A8F6137Ba7749560BB9e84b36CB2Ac9536d9e88",
      ticker: "PEPE from pump.tires",
    decimals: 18,
      name: "PEPE from pump.tires (@36DC0C)"
    },
{
      chain: 369,
      a: "0xF7bf2A938f971D7e4811A1170C43d651d21A0F81",
      dexs: "0x605CAB033E430924eB5c72E130f0981c15f2f256",
      ticker: "BTC from pump.tires",
    decimals: 18,
      name: "Bitcoin from pump.tires (@36DC0C)"
    },
{
      chain: 369,
      a: "0x35Cf97eC047F93660C27c21FdD846dEa72bc66D7",
      dexs: "0xb8cB1b8B4631010e41C81A9039a4B2157e15d369",
      ticker: "XRP from pump.tires",
    decimals: 18,
      name: "XRP from pump.tires (@36DC0C)"
    },
{
      chain: 369,
      a: "0x9Ff4f187D1a41DCD05d6a80c060c6489C132e372",
      dexs: "0x331B71862b8A5D56B02A5e0F21908D2511122212",
      ticker: "XRP from pump.tires (test)",
    decimals: 18,
      name: "XRP new from pump.tires (@36DC0C)"
    },
{
      chain: 369,
      a: "0x873301F2B4B83FeaFF04121B68eC9231B29Ce0df",
      dexs: "0x30fe90B1ad644970C48a6B5886EC39B1e3df97Ee",
      ticker: "SOL from pump.tires",
    decimals: 18,
      name: "Solana from pump.tires (@36DC0C)"
    },
{
      chain: 369,
      a: "0x4774e075c16989be68C26cC146fE707Ef4393661",
      dexs: "0xA324000Fbc83c99d2bD2f5073bb0ED75dEe969eb",
      ticker: "ADA  from pump.tires",
    decimals: 18,
      name: "Cardano from pump.tires (@36DC0C)"
    },
{
      chain: 369,
      a: "0x0392fBD58918E7ECBB2C68f4EBe4e2225C9a6468",
      dexs: "0x4e891A45B008F6423b595cEE5De6C3B12DDa54fb",
      ticker: "TRX from pump.tires",
    decimals: 18,
      name: "Tron from pump.tires (@36DC0C)"
    },
{
      chain: 369,
      a: "0xd73731bDA87C3464e76268c094D959c1B35b9bF1",
      dexs: "0x95BeD91461218D01EEC4005b5101C89f0ea77640",
      ticker: "PLSX from pump.tires",
    decimals: 18,
      name: "PulseX from pump.tires (@36DC0C)"
    },
{
      chain: 369,
      a: "0x260e5dA7eF6E30e0A647d1aDF47628198DCb0709",
      dexs: "0x9b6efc2c2858dec2889ecA2Ce887C57099076bBF",
      ticker: "PLS from pump.tires",
    decimals: 18,
      name: "PulseChain from pump.tires (@36DC0C)"
    },
{
      chain: 369,
      a: "0x55C50875e890c7eE5621480baB02511C380E12C6",
      dexs: "0x9b82FeE4e54011fe7e5352317d6C7fDc5d2c1ACe",
      ticker: "HEX from pump.tires",
    decimals: 18,
      name: "HEX from pump.tires (@36DC0C)"
    },
{
      chain: 369,
      a: "0xc1cb1bDd29BBeD60594b3dB3E8b3B7971b3fd71A",
      dexs: "0xFce4bFBfDF4c0F653aA12D657207c2e6c956801C",
      ticker: "LIBELOOR",
    decimals: 18,
      name: "LIBELOOR from pump.tires"
    },
{
      chain: 369,
      a: "0x84601f4e914E00Dc40296Ac11CdD27926BE319f2",
      dexs: "0x94670dB3BA08cbf045bc843B45e9125a33d777e9",
      ticker: "BEST",
    decimals: 18,
      name: "BestEverything"
    },
{
      chain: 369,
      a: "0xC86E034d7571459C4E7076Ff92b03fD3e3D0CA0C",
      dexs: "0xA7bc1cf52D86713B0E0dDB3CC1CE72381215442f",
      ticker: "DICK",
    decimals: 18,
      name: "Dick Heart"
    },
{
      chain: 369,
      a: "0x1e81026D34F2202E63D8Acf1a295de35D4124c69",
      dexs: "0xEBDA8D31fd2ceD8B38d869b9DC9ecC7A9886212D",
      ticker: "HWIF",
    decimals: 18,
      name: "Heart Wif Niggas"
    },
{
      chain: 369,
      a: "0x624751db2F3151E3509C7c0d6Ec2D42399a28B0F",
      dexs: "",
      ticker: "Bid",
    decimals: 18,
      name: "Bidet from pump.tires"
    },
{
      chain: 369,
      a: "0xFE2ABed0834075EB83D61e98932A8645122B7994",
      dexs: "",
      ticker: "PepsPub",
    decimals: 18,
      name: "PepsPub from pump.tires"
    },
{
      chain: 369,
      a: "0x6f40B31737c2B9010Ca86C8a04683Dd64527E205",
      dexs: "0xb14741BFEcc7A2a319Bcc81B8011d59e485Fe629",
      ticker: "Fartcoin",
    decimals: 18,
      name: "Richard Fartcoin"
    },
{
      chain: 369,
      a: "0x6ba0876e30CcE2A9AfC4B82D8BD8A8349DF4Ca96",
      dexs: "0x762aD850270EFc004326c4E670fa7465E2F44904",
      ticker: "DOUBT",
    decimals: 18,
      name: "DOUBT"
    },
{
      chain: 369,
      a: "0x018eDECc388650C1Af0441907e49fE2c75cdbABD",
      dexs: "0xC63f66B867D03A73883e005c87Fb5ec33daa0121",
      ticker: "CTO",
    decimals: 18,
      name: "ETH TAKEOVER"
    },
{
      chain: 369,
      a: "0x05076bf151AC83680151111027CBfb08cA057a7A",
      dexs: "0xA0dF210f81255fcDe71A952D64aBdE8A47DdD955",
      ticker: "JAMES",
    decimals: 18,
      name: "JAMES"
    },
{
      chain: 369,
      a: "0xA9e71e1AcF993F001f734cE849e8E2fec4B6A4Ea",
      dexs: "",
      ticker: "DRIFT",
    decimals: 18,
      name: "Dark Rock Insiders Fund Trust"
    },
{
      chain: 369,
      a: "0x9a30bDd18c2c95b3F3Dcb098446DC5Aa2b0b0210",
      dexs: "",
      ticker: "Hearts",
    decimals: 18,
      name: "Hearts Law"
    },
{
      chain: 369,
      a: "0x1039ED7f66Ca06346ecc807985b7262EeEad8e4f",
      dexs: "0xF630B96d4ACD76EA226019ca3C667Cca79daFF27",
      ticker: "TIRES",
    decimals: 18,
      name: "TIRES"
    },
{
      chain: 369,
      a: "0x7d1E869ea81aF84B0C0be9D19cdd1B64800537F3",
      dexs: "",
      ticker: "PLANE",
    decimals: 18,
      name: "Louis Vuitton Airplane"
    },
{
      chain: 369,
      a: "0x68638F5cbd3b35615C7858d7b2F839600698036E",
      dexs: "",
      ticker: "UFB",
    decimals: 18,
      name: "Unicorn Fart Balls"
    },
{
      chain: 369,
      a: "0xcbc9C2666193733BF99ECCAD74b4435eb0DF179A",
      dexs: "0x5E880b27C72aA16adE0B0A2FEB9162Df47A5f9D6",
      ticker: "WIF",
    decimals: 18,
      name: "dogwifhat from pump.tires"
    },
{
      chain: 369,
      a: "0x24e130bb9c0436FBB840dbE391861bEA45B96991",
      dexs: "",
      ticker: "TEDI",
    decimals: 18,
      name: "Golden Bear"
    },
{
      chain: 369,
      a: "0x6794E23f0C09e4e54848eDd64502806876d42b0F",
      dexs: "0xb79042Ec437A48A112eAd8720f134C2dE1610A88",
      ticker: "RIDE",
    decimals: 18,
      name: "MAGIC CARPET"
    },
{
      chain: 369,
      a: "0x4c27CC93603bC1d0913C6aA0100Da49A9D982c38",
      dexs: "0xf4EaE960361682395cfCaa06F3Be3871a60BFa2a",
      ticker: "Michi",
    decimals: 18,
      name: "Michi"
    },
{
      chain: 369,
      a: "0x5CB6D3aF04D6171F83EA9B51F2F22fA989f9509e",
      dexs: "",
      ticker: "HEART",
    decimals: 18,
      name: "HEART"
    },
{
      chain: 369,
      a: "0x87b008E57F640D94Ee44Fd893F0323AF933F9195",
      dexs: "0xfb25F7bd9D25aEB9b095e3892C3d32a966a12f6e",
      ticker: "COIN",
    decimals: 18,
      name: "coin_artist"
    },
{
      chain: 369,
      a: "0x471250E27388CA90018a9042DC81310F8AAB8D2D",
      dexs: null,
      ticker: "KOMT",
    decimals: 18,
      name: "Kingdom of Meme Tokens"
    },
{
      chain: 369,
      a: "0x2012aC87AE6222E5B496d1ba873c6fd79E9c0b7A",
      dexs: "0x921d979d55934d4e3724F409F62637136a62DC97",
      ticker: "RING",
    decimals: 18,
      name: "The One Meme"
    },
{
      chain: 369,
      a: "0x6f82e6c4747c616d2e57D306f44EFCc206D49858",
      dexs: "0xa0Ef8367A4f52dB492C1A40F7Bb51B20450b6871",
      ticker: "ELI",
    decimals: 18,
      name: "Eli Porter"
    },
{
      chain: 369,
      a: "0x97df6a05AEaaeF7b461ef6d08aCB058f02868c17",
      dexs: "0x6a4a7360842bA5CF8031D4Efc1963d74da3e0dA9",
      ticker: "LZY",
    decimals: 18,
      name: "Lazy"
    },
{
      chain: 369,
      a: "0x27246B3e508c696Af6C6F3D83286aC6D8242d3bA",
      dexs: "0x41cE8Fca286FBeB4fd515e095D204d33343AB0D4",
      ticker: "PUPPERS",
    decimals: 18,
      name: "PUPPERS"
    },
{
      chain: 369,
      a: "0xa6C897bc61270073f998FbC8d2425f01D3aDEb65",
      dexs: "0x32Db011B11A36bCD8e509916434824cdBE928fc1",
      ticker: "NPC",
    decimals: 18,
      name: "NPC"
    },
{
      chain: 369,
      a: "0xbd59a88754902B80922dFEBc15c7ea94a8C21ce2",
      dexs: "0xca305A9Da486DbC6db90C2316Bea4CF3e778970F",
      ticker: "PUPPERS 2",
    decimals: 18,
      name: "PUPPERS"
    },
{
      chain: 369,
      a: "0x1BC0CE24e87d998b96b42f0F8f70A5aa8d637a04",
      dexs: "",
      ticker: "PLSS",
    decimals: 18,
      name: "Pulsican Store"
    },
{
      chain: 369,
      a: "0x09570203d3b28671b8Ee9084648fD476C3215a31",
      dexs: "0x70EBeB3A334B9AaBb5bdB293c5964900cB84F9FE",
      ticker: "HIGHER",
    decimals: 18,
      name: "RHdeplorablesinu"
    },
{
      chain: 369,
      a: "0xe65112d2f120c8cb23ADC80D8E8122c0c8b7fF8D",
      dexs: "0x8ff3b2E30A8E9AA2903944D39a7383f6ee112D5E",
      ticker: "DUMB",
    decimals: 18,
      name: "DumbMoney"
    },
{
      chain: 369,
      a: "0x8357aA9070dc7d8d154Da74561CEc58cA30c41C3",
      dexs: "0xf93fE23fcD5A822fE40fcfeaa3d848B5beD3bf4C",
      ticker: "DAMP",
    decimals: 18,
      name: "Dumb Amplifier"
    },
{
      chain: 369,
      a: "0x708DACAb783DeCbB4994A9Db612Da8C2100Ab186",
      dexs: "0xbC4355E7F2074E955dD1C6A57D04Fe9c6cF5Eb1F",
      ticker: "SMOKI",
        decimals: 18,
      name: "Smoki"
    },
{
      chain: 369,
      a: "0x3Fa77830bFaF10e27bd1211Ff54E2D0Fd4869cA4",
      dexs: "0xf5b83BADAA6154748c6Fd907d9ecFE610108A8cC",
      ticker: "XTC",
        decimals: 18,
      name: "Audio Ecstasy Inc"
    },
{
      chain: 369,
      a: "0xeF7A713C3F10c12D8b12B7CBB78b79b92303Ccd4",
      dexs: "0xb1E0fDc665ED45E78fC80A785986eD2CFA67b192",
      ticker: "BONNIE",
        decimals: 18,
      name: "Richards first Car"
    },
{
      chain: 369,
      a: "0xC506af3eA272dAFBE1A8E39d9C3446E03637bB12",
      dexs: "0x8f647ED89373A8b6cAcbe9097dB179452F06eFA9",
      ticker: "REMEMBER",
        decimals: 18,
      name: "REMEMBER"
    },
{
      chain: 369,
      a: "0xf2DD4FE4bE7B8C0655d0962A4285150Ff09769EA",
      dexs: "0x0891da635569BeB32528b7Cae63A8a293189BD2A",
      ticker: "Trump Official",
        decimals: 18,
      name: "TrumpOfficial"
    },
{
      chain: 369,
      a: "0xA831a35f48664fE357c584540fb79e172157CBF3",
      dexs: "0x86455411b874913BCe5e719412846eA715B15e4e",
      ticker: "POWER",
        decimals: 18,
      name: "Power to Profit"
    },
{
      chain: 369,
      a: "0xe39B70c9978E4232140d148Ad3C0b08f4A42220D",
      dexs: "0xf3dA9A1FF38c6D774e6aA583302A5aB7646b7025",
      ticker: "FETCH",
        decimals: 18,
      name: "Fetch"
    },
{
      chain: 369,
      a: "0x144Cd22AaA2a80FEd0Bb8B1DeADDc51A53Df1d50",
      dexs: "0x2cb92b1e8B2fC53b5A9165E765488e17B38C26D3",
      ticker: "INCD",
        decimals: 18,
      name: "INC Dollar"
    },
{
      chain: 369,
      a: "0x6C203A555824ec90a215f37916cf8Db58EBe2fA3",
      dexs: "0xF35F8Db9B6760799DB76796340AAcc69deA0C644",
      ticker: "PRINT",
        decimals: 18,
      name: "INC Printer"
    },
{
      chain: 369,
      a: "0x042b48a98B37042D58Bc8defEEB7cA4eC76E6106",
      dexs: "0x8220342E1a61Abd28D65f6B1d9EB653d8DfD1c85",
      ticker: "GAS",
        decimals: 18,
      name: "GAS Money"
    },
{
      chain: 369,
      a: "0x47C7Ae1514Ee90c43e2bD50CAa8DA63285ae146d",
      dexs: "0x93064e8b6bA045f55571065dd7A0D37e174d04FE",
      ticker: "pDONG",
        decimals: 18,
      name: "pDONG"
    },
{
      chain: 369,
      a: "0xa8f501432348c5DD042347e22FBb0F0EB1528Cab",
      dexs: null,
      ticker: "pdied",
        decimals: 18,
      name: "pdied"
    },
{
      chain: 369,
      a: "0x62bd78d40A9FCb4D29F6fF183CFbcaf2f5ca9B52",
      dexs: "0x82Db51c694578A28DA6545975BBdA61e4C12b8E4",
      ticker: "STM",
      decimals: 18,
      name: "Surgicaltrainers.com"
    },
{
      chain: 369,
      a: "0xB6a3Af5d5198E19ABf5EaBa0fa074C881fdC970A",
      dexs: "0x008D1347785Dd05769E9BEC5d95566881ec4cb6C",
      ticker: "Extractor",
      decimals: 18,
      name: "Extractor"
    },
{
      chain: 369,
      a: "0xAe9509d825B50DDCe44DC98374C8B399105F7596",
      dexs: "0xBecD9F0690557D784CE3aF4743CA3C483A0470AA",
      ticker: "KISHKA 2",
        decimals: 18,
      name: "KISHKA"
    },
    {
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
      name: "BFF"
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

