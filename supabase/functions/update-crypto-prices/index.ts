import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function fetchCryptoPrices() {
  const prices = {}
  
  // Define all pairs to fetch
  const pairs = {
    hex: '0xf1F4ee610b2bAbB05C635F726eF8B0C568c8dc65', // PulseChain
    ehex: '0x9e0905249ceefffb9605e034b534544684a58be6', // Ethereum
    pls: '0x6753560538eca67617a9ce605178f788be7e524e', // PulseChain
    plsx: '0x1b45b9148791d3a104184cd5dfe5ce57193a3ee9', // PulseChain
    inc: '0xf808Bb6265e9Ca27002c0A04562Bf50d4FE37EAA', // PulseChain
    btc: '0xCBCdF9626bC03E24f779434178A73a0B4bad62eD', // Ethereum
    eth: '0x11b815efB8f581194ae79006d24E0d814B7697F6', // Ethereum
    sol: '0x127452F3f9cDc0389b0Bf59ce6131aA3Bd763598',  // Ethereum
    maxi: '0xd63204ffcefd8f8cbf7390bbcd78536468c085a2', // PulseChain
    deci: '0x969af590981bb9d19ff38638fa3bd88aed13603a', // PulseChain
    lucky: '0x52d4b3f479537a15d0b37b6cdbdb2634cc78525e', // PulseChain
    trio: '0x0b0f8f6c86c506b70e2a488a451e5ea7995d05c9', // PulseChain
    base: '0xb39490b46d02146f59e80c6061bb3e56b824d672', // PulseChain
    emaxi: '0x2ae4517B2806b84A576C10F698d6567CE80A6490', // Ethereum
    edeci: '0x39e87e2baa67f3c7f1dd58f58014f23f97e3265e', // PulseChain
    elucky: '0x7327325e5F41d4c1922a9DFc87d8a3b3F1ae5C1F', // Ethereum
    etrio: '0xda72b9e219d87ea31b4a1929640d9e960362470d', // PulseChain
    ebase: '0x7b33fe2C4f48da97dc2BAa1f32f869c50Dc1dF85',  // PulseChain
    // New pairs
    avalanche: '0xa53dafae314075c6a22f44eeb7df792d672f89d5', // Beam
    xrp: '0xd15b00e81f98a7db25f1dc1ba6e983a4316c4cac', // BSC
    bnb: 'CMYUZJENEOTNSD5MJLMTZLAPOCPNSZZCWWKIEBBUD3EZ', // Solana
    dogecoin: '0xce6160bb594fc055c943f59de92cee30b8c6b32c', // BSC
    cardano: '0x673516e510d702ab5f2bbf0c6b545111a85f7ea7', // BSC
    tron: '0x99950bae3d0b79b8bee86a8a208ae1b087b9dcb0', // Ethereum
    chainlink: '0xa6cc3c2531fdaa6ae1a3ca84c2855806728693e8', // Ethereum
    shibainu: '0xe8df1539b380274f1f8205a8f45a7cc266793518', // BSC
    toncoin: '0x4b62fa30fea125e43780dc425c2be5acb4ba743b', // Ethereum
    stellar: 'xlm.rkicet8sdvwxpxnagyarfuxmh1zcpz432y_xrp', // XRPL
    polkadot: '0x62f0546cbcd684f7c394d8549119e072527c41bc', // BSC
    hedera: '0x7cf5854c73e0ae210143d65c8a5b52f47668c092', // Hedera
    bitcoincash: '0x69d3a652a65dfc18cd1ef6b6307fbae1f2ab1fac', // Cronos
    pepe: '0xa43fe16908251ee70ef74718545e4fe6c5ccec9f', // Ethereum
    uniswap: '0x1d42064fc4beb5f8aaf85f4617ae8b3b5b8bd801', // Ethereum
    sui: '0x140c7545d2e46ff2dc3ba7b1d3c4ba41698816fb' // Cronos
  }
  
  // Fetch all prices in parallel
  const fetchPromises = Object.entries(pairs).map(async ([token, address]) => {
    let chain = ['hex', 'pls', 'plsx', 'inc', 'maxi', 'deci', 'lucky', 'trio', 'base', 'edeci', 'etrio', 'ebase'].includes(token) 
      ? 'pulsechain' 
      : ['xrp', 'dogecoin', 'cardano', 'shibainu', 'polkadot'].includes(token)
      ? 'bsc'
      : ['tron', 'chainlink', 'toncoin', 'pepe', 'uniswap'].includes(token)
      ? 'ethereum'
      : ['bitcoincash', 'sui'].includes(token)
      ? 'cronos'
      : token === 'avalanche'
      ? 'beam'
      : token === 'bnb'
      ? 'solana'
      : token === 'stellar'
      ? 'xrpl'
      : token === 'hedera'
      ? 'hedera'
      : 'ethereum'
    try {
      const response = await fetch(
        `https://api.dexscreener.com/latest/dex/pairs/${chain}/${address}`
      )
      
      if (!response.ok) {
        throw new Error(`Failed to fetch ${token} price from DexScreener`)
      }
      
      const data = await response.json()
      prices[token] = parseFloat(data?.pair?.priceUsd) || null
    } catch (error) {
      console.error(`Error fetching ${token} price:`, error)
      prices[token] = null
    }
  })
  
  await Promise.all(fetchPromises)
  
  return {
    date: new Date().toISOString(),
    btc_price: prices.btc,
    eth_price: prices.eth,
    sol_price: prices.sol,
    hex_price: prices.hex,
    ehex_price: prices.ehex,
    pls_price: prices.pls,
    plsx_price: prices.plsx,
    inc_price: prices.inc,
    maxi_price: prices.maxi,
    emaxi_price: prices.emaxi,
    deci_price: prices.deci,
    edeci_price: prices.edeci,
    lucky_price: prices.lucky,
    elucky_price: prices.elucky,
    trio_price: prices.trio,
    etrio_price: prices.etrio,
    base_price: prices.base,
    ebase_price: prices.ebase,
    // New price fields
    avalanche_price: prices.avalanche,
    xrp_price: prices.xrp,
    bnb_price: prices.bnb,
    dogecoin_price: prices.dogecoin,
    cardano_price: prices.cardano,
    tron_price: prices.tron,
    chainlink_price: prices.chainlink,
    shibainu_price: prices.shibainu,
    toncoin_price: prices.toncoin,
    stellar_price: prices.stellar,
    polkadot_price: prices.polkadot,
    hedera_price: prices.hedera,
    bitcoincash_price: prices.bitcoincash,
    pepe_price: prices.pepe,
    uniswap_price: prices.uniswap,
    sui_price: prices.sui
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    if (req.method === 'GET') {
      const { data, error } = await supabaseClient
        .from('historic_prices')
        .select('*')
        .order('date', { ascending: false })
        .limit(4)

      if (error) throw error

      return new Response(JSON.stringify({ data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    if (req.method === 'POST') {
      const data = await fetchCryptoPrices()
      
      const [testTableResult] = await Promise.all([
        supabaseClient
          .from('historic_prices')
          .insert([data])
          .select()
      ])

      // Check for errors
      if (testTableResult.error) throw testTableResult.error

      return new Response(
        JSON.stringify({ 
          success: true, 
          data: {
            historic_prices: testTableResult.data
          }
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    return new Response('Method not allowed', { 
      headers: corsHeaders,
      status: 405 
    })
  } catch (error) {
    console.error('Function error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
}) 