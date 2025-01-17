const { createClient } = require('@supabase/supabase-js');

// You'll need to fill these in with your actual values
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function findLows() {
  const { data, error } = await supabase
    .from('historic_prices')
    .select('*')
    .order('date', { ascending: true });

  if (error) {
    console.error('Error:', error);
    return;
  }

  const coins = [
    'btc_price', 'eth_price', 'sol_price', 'xrp_price', 'bnb_price',
    'dogecoin_price', 'cardano_price', 'tron_price', 'avalanche_price',
    'chainlink_price', 'shibainu_price', 'toncoin_price', 'stellar_price',
    'sui_price', 'polkadot_price', 'hedera_price', 'bitcoincash_price',
    'pepe_price', 'uniswap_price'
  ];

  const lows = {};
  
  coins.forEach(coin => {
    const lowest = data.reduce((min, row) => {
      if (row[coin] && row[coin] > 0 && (!min.price || row[coin] < min.price)) {
        return { price: row[coin], date: row.date };
      }
      return min;
    }, { price: null, date: null });
    
    lows[coin] = lowest;
  });

  console.log('Low dates for each coin:');
  console.log('------------------------');
  Object.entries(lows).forEach(([coin, data]) => {
    const coinName = coin.replace('_price', '').toUpperCase();
    console.log(`${coinName}: ${data.date} (Price: ${data.price})`);
  });
}

findLows(); 