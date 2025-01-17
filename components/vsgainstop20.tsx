"use client"

import React from 'react';
import { useState, useEffect } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';
import { supabase } from '../supabaseClient';
import { Calendar } from "@/components/ui/calendar"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton2";

interface TokenData {
  date: string;
  hexX: number;
  btcX: number;
  ethX: number;
  solX: number;
  pulseX: number;
  plsX: number;
  plsxX: number;
  incX: number;
  ehexX: number;
  xrpX: number;
  bnbX: number;
  dogeX: number;
  adaX: number;
  tronX: number;
  avaxX: number;
  linkX: number;
  shibX: number;
  tonX: number;
  xlmX: number;
  suiX: number;
  dotX: number;
  hbarX: number;
  bchX: number;
  pepeX: number;
  uniX: number;
}

interface DexScreenerResponse {
  pair: {
    priceUsd: string;
    // ... other fields we might need
  };
}

// Helper function to format numbers with appropriate decimals and commas
const formatPrice = (price: number, symbol: string) => {
  if (!price) return '0';  // Handle undefined/null cases
  
  // High value coins (use comma formatting, no decimals)
  if (symbol === 'BTC' || symbol === 'BNB' || symbol === 'ETH' || symbol === 'SOL' || symbol === 'BCH') {
    return price.toLocaleString('en-US', { maximumFractionDigits: 0 });
  }

  // Mid value coins (1 decimals)
  if (symbol === 'XRP' || symbol === 'TON' || symbol === 'AVAX'  || symbol === 'SUI' || symbol === 'DOT' || symbol === 'LINK') {
    return price.toFixed(1);
  }

  // Mid value coins (2 decimals)
  if (symbol === 'SOL' || symbol === 'TON' || symbol === 'AVAX' || symbol === 'DOT' || symbol === 'BCH' || symbol === 'SUI' || symbol === 'DOGE' || symbol === 'XLM' || symbol === 'ADA') {
    return price.toFixed(2);
  }

  // Lower-mid value coins (3 decimals)
  if (symbol === 'pHEX' || symbol === 'eHEX' || symbol === 'UNI' || symbol === 'HBAR') {
    return price.toFixed(3);
  }

  // Low value coins (4 decimals)
  if (symbol === 'TRX') {
    return price.toFixed(4);
  }

  // Very low value coins (6 decimals)
  if (symbol === 'PLS' || symbol === 'PLSX'){
    return price.toFixed(6);
  }

  // Ultra low value coins (8 decimals)
  if (symbol === 'SHIB' || symbol === 'PEPE') {
    return price.toFixed(8);
  }

  // Special cases
  if (symbol === 'INC') {
    return price.toFixed(2);  // INC specific formatting
  }

  return price.toFixed(4);  // Default to 4 decimals for any unspecified coins
};

const safeParsePriceUsd = (data: any): number | null => {
  try {
    if (data && data.pair && data.pair.priceUsd) {
      const price = parseFloat(data.pair.priceUsd);
      return isNaN(price) ? null : price;
    }
    return null;
  } catch (error) {
    console.error('Error parsing price:', error);
    return null;
  }
};

interface LowDates {
  id: string;
  name: string;
  date: string;
  color: string;
}

const lowDates: LowDates[] = [
  { id: 'hex', name: 'pHEX low', date: '2024-09-07T00:00:00.000Z', color: '#ff00ff' },
  { id: 'ehex', name: 'eHEX low', date: '2024-08-05T00:00:00.000Z', color: '#627EEA' },
  { id: 'pls', name: 'PLS low', date: '2024-09-04T00:00:00.000Z', color: '#9945FF' },
  { id: 'plsx', name: 'PLSX low', date: '2023-09-11T00:00:00.000Z', color: '#FFD700' },
  { id: 'inc', name: 'INC low', date: '2023-12-12T00:00:00.000Z', color: '#00FF00' },
  { id: 'btc', name: 'BTC low', date: '2022-11-22T00:00:00.000Z', color: '#f7931a' },
  { id: 'eth', name: 'ETH low', date: '2022-06-19T00:00:00.000Z', color: '#00FFFF' },
  { id: 'sol', name: 'SOL low', date: '2022-12-30T00:00:00.000Z', color: '#14F195' },
  { id: 'xrp', name: 'XRP low', date: '2022-06-18T00:00:00.000Z', color: '#fff' },
  { id: 'bnb', name: 'BNB low', date: '2022-06-18T00:00:00.000Z', color: '#F3BA2F' },
  { id: 'doge', name: 'DOGE low', date: '2022-06-18T00:00:00.000Z', color: '#C2A633' },
  { id: 'ada', name: 'ADA low', date: '2023-09-11T00:00:00.000Z', color: '#0033AD' },
  { id: 'tron', name: 'TRX low', date: '2022-11-16T00:00:00.000Z', color: '#FF0013' },
  { id: 'avax', name: 'AVAX low', date: '2023-09-24T00:00:00.000Z', color: '#E84142' },
  { id: 'link', name: 'LINK low', date: '2023-06-19T00:00:00.000Z', color: '#2A5ADA' },
  { id: 'shib', name: 'SHIB low', date: '2023-06-14T00:00:00.000Z', color: '#FFA409' },
  { id: 'ton', name: 'TON low', date: '2023-08-03T00:00:00.000Z', color: '#0098EA' },
  { id: 'xlm', name: 'XLM low', date: '2022-12-31T00:00:00.000Z', color: '#14B6E7' },
  { id: 'sui', name: 'SUI low', date: '2023-10-19T00:00:00.000Z', color: '#6FBCF0' },
  { id: 'dot', name: 'DOT low', date: '2023-10-19T00:00:00.000Z', color: '#E6007A' },
  { id: 'hbar', name: 'HBAR low', date: '2022-12-31T00:00:00.000Z', color: '#00ADED' },
  { id: 'bch', name: 'BCH low', date: '2022-11-09T00:00:00.000Z', color: '#8DC351' },
  { id: 'pepe', name: 'PEPE low', date: '2023-09-21T00:00:00.000Z', color: '#00B84C' },
  { id: 'uni', name: 'UNI low', date: '2022-06-18T00:00:00.000Z', color: '#FF007A' }
];

const FALLBACK_PRICES = {
  pls_price: 0.0001,
  plsx_price: 0.0001
};

const VsGainsTop20: React.FC = () => {
  const [data, setData] = useState<TokenData[]>([]);
  const [historicPrices, setHistoricPrices] = useState<any[]>([]);
  const [livePrices, setLivePrices] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [visibleLines, setVisibleLines] = useState({
    hexX: true,
    btcX: true,
    ethX: true,
    solX: true,
    plsX: true,
    plsxX: true,
    incX: true,
    ehexX: true,
    xrpX: true,
    bnbX: true,
    dogeX: true,
    adaX: true,
    tronX: true,
    avaxX: true,
    linkX: true,
    shibX: true,
    tonX: true,
    xlmX: true,
    suiX: true,
    dotX: true,
    hbarX: true,
    bchX: true,
    pepeX: true,
    uniX: true
  });
  const [baselineDate, setBaselineDate] = useState('2024-09-07T00:00:00.000Z');
  const [activeButton, setActiveButton] = useState<string>('HEX');
  const [date, setDate] = useState<Date | undefined>(new Date('2024-09-07'));
  const [isChartReady, setIsChartReady] = useState(false);

  // Add this new function to find lows
  const findLows = async () => {
    // Get data from 2022 onwards
    const { data, error } = await supabase
      .from('historic_prices')
      .select('*')
      .gte('date', '2022-01-01')  // Start from 2022
      .order('date', { ascending: true });

    if (error) {
      console.error('Error:', error);
      return;
    }

    if (!data || data.length === 0) {
      console.error('No data found');
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
      // Filter out zero and null values
      const validPrices = data.filter(row => row[coin] && row[coin] > 0);
      
      if (validPrices.length === 0) {
        lows[coin] = { price: null, date: null };
        return;
      }

      const lowest = validPrices.reduce((min, row) => {
        if (!min.price || row[coin] < min.price) {
          return { price: row[coin], date: row.date };
        }
        return min;
      }, { price: null, date: null });
      
      lows[coin] = lowest;
    });

    console.log('Low dates for each coin:');
    console.log('------------------------');
    Object.entries(lows).forEach(([coin, data]: [string, any]) => {
      const coinName = coin.replace('_price', '').toUpperCase();
      if (data.date && data.price) {
        console.log(`${coinName}: ${new Date(data.date).toISOString()} (Price: ${data.price})`);
      } else {
        console.log(`${coinName}: No valid data found`);
      }
    });
  };

  useEffect(() => {
    handleDateChange('2024-09-07T00:00:00.000Z', 'HEX');
    // Add this line to run the findLows function when component mounts
    findLows();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      const { data: fetchedHistoricPrices, error } = await supabase
        .from('historic_prices')
        .select('*')
        .gte('date', baselineDate)
        .order('date', { ascending: true });

      if (error) {
        console.error('Error fetching data:', error);
        setError(error.message);
        return;
      }

      // Check if we need to fetch current prices
      const lastDataPoint = fetchedHistoricPrices[fetchedHistoricPrices.length - 1];
      const lastDataDate = new Date(lastDataPoint.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Set to start of day for comparison
      const lastDataDateStart = new Date(lastDataDate);
      lastDataDateStart.setHours(0, 0, 0, 0); // Set to start of day for comparison

      // Get the most recent prices as base values
      const lastKnownPrices = fetchedHistoricPrices[fetchedHistoricPrices.length - 1];
      
      // Initialize todayData with ALL last known prices
      let todayData = {
        date: new Date().toISOString(),
        hex_price: lastKnownPrices.hex_price,
        ehex_price: lastKnownPrices.ehex_price,
        pls_price: lastKnownPrices.pls_price,
        plsx_price: lastKnownPrices.plsx_price,
        inc_price: lastKnownPrices.inc_price,
        btc_price: lastKnownPrices.btc_price,
        eth_price: lastKnownPrices.eth_price,
        sol_price: lastKnownPrices.sol_price,
        xrp_price: lastKnownPrices.xrp_price,
        bnb_price: lastKnownPrices.bnb_price,
        dogecoin_price: lastKnownPrices.dogecoin_price,
        cardano_price: lastKnownPrices.cardano_price,
        tron_price: lastKnownPrices.tron_price,
        avalanche_price: lastKnownPrices.avalanche_price,
        chainlink_price: lastKnownPrices.chainlink_price,
        shibainu_price: lastKnownPrices.shibainu_price,
        toncoin_price: lastKnownPrices.toncoin_price,
        stellar_price: lastKnownPrices.stellar_price,
        sui_price: lastKnownPrices.sui_price,
        polkadot_price: lastKnownPrices.polkadot_price,
        hedera_price: lastKnownPrices.hedera_price,
        bitcoincash_price: lastKnownPrices.bitcoincash_price,
        pepe_price: lastKnownPrices.pepe_price,
        uniswap_price: lastKnownPrices.uniswap_price
      };

      let livePricesData = { ...todayData };

      // Always fetch current prices from DEXScreener
      try {
        const hexResponse = await fetch('https://api.dexscreener.com/latest/dex/pairs/pulsechain/0xf1F4ee610b2bAbB05C635F726eF8B0C568c8dc65');
        const hexData = await hexResponse.json();
        const hexPrice = parseFloat(hexData?.pair?.priceUsd);
        if (hexPrice) {
          todayData.hex_price = hexPrice;
          livePricesData.hex_price = hexPrice;
        }
      } catch (error) {
        console.error('Error fetching HEX price:', error);
      }

      try {
        const ehexResponse = await fetch('https://api.dexscreener.com/latest/dex/pairs/ethereum/0x9e0905249ceefffb9605e034b534544684a58be6');
        const ehexData = await ehexResponse.json();
        const ehexPrice = parseFloat(ehexData?.pair?.priceUsd);
        if (ehexPrice) {
          todayData.ehex_price = ehexPrice;
          livePricesData.ehex_price = ehexPrice;
        }
      } catch (error) {
        console.error('Error fetching eHEX price:', error);
      }

      // Add API calls for other tokens
      try {
        const plsResponse = await fetch('https://api.dexscreener.com/latest/dex/pairs/pulsechain/0x6753560538eca67617a9ce605178f788be7e524e');
        const plsData = await plsResponse.json();
        todayData.pls_price = parseFloat(plsData?.pair?.priceUsd) || lastKnownPrices.pls_price;
      } catch (error) {
        console.error('Error fetching PLS price:', error);
      }

      try {
        const plsxResponse = await fetch('https://api.dexscreener.com/latest/dex/pairs/pulsechain/0x1b45b9148791d3a104184cd5dfe5ce57193a3ee9');
        const plsxData = await plsxResponse.json();
        todayData.plsx_price = parseFloat(plsxData?.pair?.priceUsd) || lastKnownPrices.plsx_price;
      } catch (error) {
        console.error('Error fetching PLSX price:', error);
      }

      try {
        const incResponse = await fetch('https://api.dexscreener.com/latest/dex/pairs/pulsechain/0xf808Bb6265e9Ca27002c0A04562Bf50d4FE37EAA');
        const incData = await incResponse.json();
        todayData.inc_price = parseFloat(incData?.pair?.priceUsd) || lastKnownPrices.inc_price;
      } catch (error) {
        console.error('Error fetching INC price:', error);
      }

      try {
        const btcResponse = await fetch('https://api.dexscreener.com/latest/dex/pairs/ethereum/0xCBCdF9626bC03E24f779434178A73a0B4bad62eD');
        const btcData = await btcResponse.json();
        todayData.btc_price = parseFloat(btcData?.pair?.priceUsd) || lastKnownPrices.btc_price;
      } catch (error) {
        console.error('Error fetching BTC price:', error);
      }

      try {
        const ethResponse = await fetch('https://api.dexscreener.com/latest/dex/pairs/ethereum/0x11b815efB8f581194ae79006d24E0d814B7697F6');
        const ethData = await ethResponse.json();
        todayData.eth_price = parseFloat(ethData?.pair?.priceUsd) || lastKnownPrices.eth_price;
      } catch (error) {
        console.error('Error fetching ETH price:', error);
      }

      try {
        const solResponse = await fetch('https://api.dexscreener.com/latest/dex/pairs/ethereum/0x127452F3f9cDc0389b0Bf59ce6131aA3Bd763598');
        const solData = await solResponse.json();
        todayData.sol_price = parseFloat(solData?.pair?.priceUsd) || lastKnownPrices.sol_price;
      } catch (error) {
        console.error('Error fetching SOL price:', error);
      }

      try {
        const avaxResponse = await fetch('https://api.dexscreener.com/latest/dex/pairs/beam/0xa53dafae314075c6a22f44eeb7df792d672f89d5');
        const avaxData = await avaxResponse.json();
        todayData.avalanche_price = parseFloat(avaxData?.pair?.priceUsd) || lastKnownPrices.avalanche_price;
      } catch (error) {
        console.error('Error fetching AVAX price:', error);
      }

      try {
        const xrpResponse = await fetch('https://api.dexscreener.com/latest/dex/pairs/bsc/0xd15b00e81f98a7db25f1dc1ba6e983a4316c4cac');
        const xrpData = await xrpResponse.json();
        todayData.xrp_price = parseFloat(xrpData?.pair?.priceUsd) || lastKnownPrices.xrp_price;
      } catch (error) {
        console.error('Error fetching XRP price:', error);
      }

      try {
        const bnbResponse = await fetch('https://api.dexscreener.com/latest/dex/pairs/solana/cmyuzjeneotnsd5mjlmtzlapocpnszzcwwkiebbud3ez');
        const bnbData = await bnbResponse.json();
        todayData.bnb_price = parseFloat(bnbData?.pair?.priceUsd) || lastKnownPrices.bnb_price;
      } catch (error) {
        console.error('Error fetching BNB price:', error);
      }

      try {
        const dogeResponse = await fetch('https://api.dexscreener.com/latest/dex/pairs/bsc/0xce6160bb594fc055c943f59de92cee30b8c6b32c');
        const dogeData = await dogeResponse.json();
        todayData.dogecoin_price = parseFloat(dogeData?.pair?.priceUsd) || lastKnownPrices.dogecoin_price;
      } catch (error) {
        console.error('Error fetching DOGE price:', error);
      }

      try {
        const adaResponse = await fetch('https://api.dexscreener.com/latest/dex/pairs/bsc/0x673516e510d702ab5f2bbf0c6b545111a85f7ea7');
        const adaData = await adaResponse.json();
        todayData.cardano_price = parseFloat(adaData?.pair?.priceUsd) || lastKnownPrices.cardano_price;
      } catch (error) {
        console.error('Error fetching ADA price:', error);
      }

      try {
        const trxResponse = await fetch('https://api.dexscreener.com/latest/dex/pairs/ethereum/0x99950bae3d0b79b8bee86a8a208ae1b087b9dcb0');
        const trxData = await trxResponse.json();
        todayData.tron_price = parseFloat(trxData?.pair?.priceUsd) || lastKnownPrices.tron_price;
      } catch (error) {
        console.error('Error fetching TRX price:', error);
      }

      try {
        const linkResponse = await fetch('https://api.dexscreener.com/latest/dex/pairs/ethereum/0xa6cc3c2531fdaa6ae1a3ca84c2855806728693e8');
        const linkData = await linkResponse.json();
        todayData.chainlink_price = parseFloat(linkData?.pair?.priceUsd) || lastKnownPrices.chainlink_price;
      } catch (error) {
        console.error('Error fetching LINK price:', error);
      }

      try {
        const shibResponse = await fetch('https://api.dexscreener.com/latest/dex/pairs/bsc/0xe8df1539b380274f1f8205a8f45a7cc266793518');
        const shibData = await shibResponse.json();
        todayData.shibainu_price = parseFloat(shibData?.pair?.priceUsd) || lastKnownPrices.shibainu_price;
      } catch (error) {
        console.error('Error fetching SHIB price:', error);
      }

      try {
        const tonResponse = await fetch('https://api.dexscreener.com/latest/dex/pairs/ethereum/0x4b62fa30fea125e43780dc425c2be5acb4ba743b');
        const tonData = await tonResponse.json();
        todayData.toncoin_price = parseFloat(tonData?.pair?.priceUsd) || lastKnownPrices.toncoin_price;
      } catch (error) {
        console.error('Error fetching TON price:', error);
      }

      try {
        const xlmResponse = await fetch('https://api.dexscreener.com/latest/dex/pairs/xrpl/xlm.rkicet8sdvwxpxnagyarfuxmh1zcpz432y_xrp');
        const xlmData = await xlmResponse.json();
        todayData.stellar_price = parseFloat(xlmData?.pair?.priceUsd) || lastKnownPrices.stellar_price;
      } catch (error) {
        console.error('Error fetching XLM price:', error);
      }

      try {
        const dotResponse = await fetch('https://api.dexscreener.com/latest/dex/pairs/bsc/0x62f0546cbcd684f7c394d8549119e072527c41bc');
        const dotData = await dotResponse.json();
        todayData.polkadot_price = parseFloat(dotData?.pair?.priceUsd) || lastKnownPrices.polkadot_price;
      } catch (error) {
        console.error('Error fetching DOT price:', error);
      }

      try {
        const hbarResponse = await fetch('https://api.dexscreener.com/latest/dex/pairs/hedera/0x7cf5854c73e0ae210143d65c8a5b52f47668c092');
        const hbarData = await hbarResponse.json();
        todayData.hedera_price = parseFloat(hbarData?.pair?.priceUsd) || lastKnownPrices.hedera_price;
      } catch (error) {
        console.error('Error fetching HBAR price:', error);
      }

      try {
        const bchResponse = await fetch('https://api.dexscreener.com/latest/dex/pairs/cronos/0x69d3a652a65dfc18cd1ef6b6307fbae1f2ab1fac');
        const bchData = await bchResponse.json();
        todayData.bitcoincash_price = parseFloat(bchData?.pair?.priceUsd) || lastKnownPrices.bitcoincash_price;
      } catch (error) {
        console.error('Error fetching BCH price:', error);
      }

      try {
        const pepeResponse = await fetch('https://api.dexscreener.com/latest/dex/pairs/ethereum/0xa43fe16908251ee70ef74718545e4fe6c5ccec9f');
        const pepeData = await pepeResponse.json();
        todayData.pepe_price = parseFloat(pepeData?.pair?.priceUsd) || lastKnownPrices.pepe_price;
      } catch (error) {
        console.error('Error fetching PEPE price:', error);
      }

      try {
        const uniResponse = await fetch('https://api.dexscreener.com/latest/dex/pairs/ethereum/0x1d42064fc4beb5f8aaf85f4617ae8b3b5b8bd801');
        const uniData = await uniResponse.json();
        todayData.uniswap_price = parseFloat(uniData?.pair?.priceUsd) || lastKnownPrices.uniswap_price;
      } catch (error) {
        console.error('Error fetching UNI price:', error);
      }

      try {
        const suiResponse = await fetch('https://api.dexscreener.com/latest/dex/pairs/cronos/0x140c7545d2e46ff2dc3ba7b1d3c4ba41698816fb');
        const suiData = await suiResponse.json();
        todayData.sui_price = parseFloat(suiData?.pair?.priceUsd) || lastKnownPrices.sui_price;
      } catch (error) {
        console.error('Error fetching SUI price:', error);
      }

      // If last data point is from today, replace it with new prices
      // Otherwise, add the new prices as a new data point
      if (lastDataDateStart.getTime() === today.getTime()) {
        fetchedHistoricPrices[fetchedHistoricPrices.length - 1] = todayData;
      } else {
        fetchedHistoricPrices.push(todayData);
      }

      console.log('Today\'s prices:', todayData);

      // Simplified data processing
      if (fetchedHistoricPrices && fetchedHistoricPrices.length > 0) {
        const baselinePrices = fetchedHistoricPrices[0];
        setHistoricPrices(fetchedHistoricPrices);

        // Helper function to find first non-zero price and its index
        const findFirstNonZeroPrice = (prices: any[], priceKey: string) => {
          const index = prices.findIndex(price => price[priceKey] > 0);
          return index >= 0 ? { index, price: prices[index][priceKey] } : null;
        };

        const formattedData = fetchedHistoricPrices.map((item, index) => {
          // Get first non-zero prices for each token
          const firstHexPrice = findFirstNonZeroPrice(fetchedHistoricPrices, 'hex_price');
          const firstEhexPrice = findFirstNonZeroPrice(fetchedHistoricPrices, 'ehex_price');
          const firstPlsPrice = findFirstNonZeroPrice(fetchedHistoricPrices, 'pls_price');
          const firstPlsxPrice = findFirstNonZeroPrice(fetchedHistoricPrices, 'plsx_price');
          const firstIncPrice = findFirstNonZeroPrice(fetchedHistoricPrices, 'inc_price');
          const firstBtcPrice = findFirstNonZeroPrice(fetchedHistoricPrices, 'btc_price');
          const firstEthPrice = findFirstNonZeroPrice(fetchedHistoricPrices, 'eth_price');
          const firstSolPrice = findFirstNonZeroPrice(fetchedHistoricPrices, 'sol_price');
          const firstXrpPrice = findFirstNonZeroPrice(fetchedHistoricPrices, 'xrp_price');
          const firstBnbPrice = findFirstNonZeroPrice(fetchedHistoricPrices, 'bnb_price');
          const firstDogePrice = findFirstNonZeroPrice(fetchedHistoricPrices, 'dogecoin_price');
          const firstAdaPrice = findFirstNonZeroPrice(fetchedHistoricPrices, 'cardano_price');
          const firstTronPrice = findFirstNonZeroPrice(fetchedHistoricPrices, 'tron_price');
          const firstAvaxPrice = findFirstNonZeroPrice(fetchedHistoricPrices, 'avalanche_price');
          const firstLinkPrice = findFirstNonZeroPrice(fetchedHistoricPrices, 'chainlink_price');
          const firstShibPrice = findFirstNonZeroPrice(fetchedHistoricPrices, 'shibainu_price');
          const firstTonPrice = findFirstNonZeroPrice(fetchedHistoricPrices, 'toncoin_price');
          const firstXlmPrice = findFirstNonZeroPrice(fetchedHistoricPrices, 'stellar_price');
          const firstSuiPrice = findFirstNonZeroPrice(fetchedHistoricPrices, 'sui_price');
          const firstDotPrice = findFirstNonZeroPrice(fetchedHistoricPrices, 'polkadot_price');
          const firstHbarPrice = findFirstNonZeroPrice(fetchedHistoricPrices, 'hedera_price');
          const firstBchPrice = findFirstNonZeroPrice(fetchedHistoricPrices, 'bitcoincash_price');
          const firstPepePrice = findFirstNonZeroPrice(fetchedHistoricPrices, 'pepe_price');
          const firstUniPrice = findFirstNonZeroPrice(fetchedHistoricPrices, 'uniswap_price');

          const calculateX = (currentPrice: number, firstPriceData: { index: number, price: number } | null) => {
            if (!firstPriceData || currentPrice === 0) return null;
            if (index < firstPriceData.index) return null;
            return currentPrice / firstPriceData.price;
          };

          return {
            date: item.date,
            hexX: calculateX(item.hex_price, firstHexPrice),
            btcX: calculateX(item.btc_price, firstBtcPrice),
            ethX: calculateX(item.eth_price, firstEthPrice),
            solX: calculateX(item.sol_price, firstSolPrice),
            plsX: calculateX(item.pls_price, firstPlsPrice),
            plsxX: calculateX(item.plsx_price, firstPlsxPrice),
            incX: calculateX(item.inc_price, firstIncPrice),
            ehexX: calculateX(item.ehex_price, firstEhexPrice),
            xrpX: calculateX(item.xrp_price, firstXrpPrice),
            bnbX: calculateX(item.bnb_price, firstBnbPrice),
            dogeX: calculateX(item.dogecoin_price, firstDogePrice),
            adaX: calculateX(item.cardano_price, firstAdaPrice),
            tronX: calculateX(item.tron_price, firstTronPrice),
            avaxX: calculateX(item.avalanche_price, firstAvaxPrice),
            linkX: calculateX(item.chainlink_price, firstLinkPrice),
            shibX: calculateX(item.shibainu_price, firstShibPrice),
            tonX: calculateX(item.toncoin_price, firstTonPrice),
            xlmX: calculateX(item.stellar_price, firstXlmPrice),
            suiX: calculateX(item.sui_price, firstSuiPrice),
            dotX: calculateX(item.polkadot_price, firstDotPrice),
            hbarX: calculateX(item.hedera_price, firstHbarPrice),
            bchX: calculateX(item.bitcoincash_price, firstBchPrice),
            pepeX: calculateX(item.pepe_price, firstPepePrice),
            uniX: calculateX(item.uniswap_price, firstUniPrice)
          };
        });

        // Filter out null values from the data
        const cleanedData = formattedData.map(item => {
          const cleaned = { ...item };
          Object.keys(cleaned).forEach(key => {
            if (cleaned[key] === null) {
              delete cleaned[key];
            }
          });
          return cleaned;
        });
        
        setData(cleanedData);
      } else {
        setError('No data available for the selected date range');
      }
      setIsLoading(false);
    };

    fetchData();
  }, [baselineDate]);

  useEffect(() => {
    if (!isLoading && data.length > 0) {
      const timer = setTimeout(() => {
        setIsChartReady(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isLoading, data]);

  const handleLegendClick = (dataKey: string) => {
    setVisibleLines(prev => ({
      ...prev,
      [dataKey]: !prev[dataKey]
    }));
  };

  const customLegend = (props: LegendProps) => {
    const { payload } = props;
    
    if (payload && data.length > 0) {
      const latestData = data[data.length - 1];
      const lastPrices = historicPrices[historicPrices.length - 1];

      // Sort payload by X value in descending order
      const sortedPayload = [...payload].sort((a, b) => {
        const aValue = latestData[a.dataKey];
        const bValue = latestData[b.dataKey];
        return bValue - aValue;
      });

      return (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          width: '100%', 
          marginTop: '0px' 
        }}>
          <ul style={{ 
            listStyle: 'none', 
            padding: '10px 0 40px 0', 
            display: 'flex', 
            flexWrap: 'wrap', 
            justifyContent: 'center' 
          }}
          className="hidden sm:flex"
          >
            {sortedPayload.map((entry, index) => {
              const symbol = entry.value;
              const xValue = latestData[entry.dataKey];
              const priceField = 
                symbol === 'pHEX' ? 'hex_price' :
                symbol === 'eHEX' ? 'ehex_price' :
                symbol === 'PLS' ? 'pls_price' :
                symbol === 'PLSX' ? 'plsx_price' :
                symbol === 'INC' ? 'inc_price' :
                symbol === 'BTC' ? 'btc_price' :
                symbol === 'ETH' ? 'eth_price' :
                symbol === 'SOL' ? 'sol_price' :
                symbol === 'XRP' ? 'xrp_price' :
                symbol === 'BNB' ? 'bnb_price' :
                symbol === 'DOGE' ? 'dogecoin_price' :
                symbol === 'ADA' ? 'cardano_price' :
                symbol === 'TRX' ? 'tron_price' :
                symbol === 'AVAX' ? 'avalanche_price' :
                symbol === 'LINK' ? 'chainlink_price' :
                symbol === 'SHIB' ? 'shibainu_price' :
                symbol === 'TON' ? 'toncoin_price' :
                symbol === 'XLM' ? 'stellar_price' :
                symbol === 'SUI' ? 'sui_price' :
                symbol === 'DOT' ? 'polkadot_price' :
                symbol === 'HBAR' ? 'hedera_price' :
                symbol === 'BCH' ? 'bitcoincash_price' :
                symbol === 'PEPE' ? 'pepe_price' :
                symbol === 'UNI' ? 'uniswap_price' :
                `${symbol.toLowerCase()}_price`;

              // Use live price if available, otherwise use last known price
              const currentPrice = (livePrices && livePrices[priceField]) || lastPrices[priceField];
              const formattedPrice = formatPrice(currentPrice, symbol);
              const formattedLabel = `${symbol} ($${formattedPrice} | ${xValue.toFixed(1)}X)`;
              
              return (
                <li 
                  key={`item-${index}`}
                  style={{ 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    marginRight: 20, 
                    marginBottom: 5,
                    cursor: 'pointer' 
                  }}
                  onClick={() => handleLegendClick(entry.dataKey)}
                >
                  <span style={{ 
                    color: entry.color, 
                    marginRight: 5,
                    fontSize: '28px',
                    lineHeight: '18px',
                    display: 'flex',
                    alignItems: 'center'
                  }}>●</span>
                  <span style={{ 
                    color: visibleLines[entry.dataKey] ? '#fff' : '#888',
                    fontSize: '12px',
                    lineHeight: '12px'
                  }}>
                    {formattedLabel}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      );
    }
    return null;
  };

  const renderCustomizedLabel = (props: any) => {
    const { points } = props;
    if (!points || points.length === 0) return null;

    const lastPoint = points[points.length - 1];
    if (!lastPoint) return null;

    const icons = {
      hexX: (
        <g transform={`translate(${lastPoint.x + 10},${lastPoint.y - 8})`}>
          <circle r="8" fill="#ff00ff" />
          <text 
            x="0" 
            y="0" 
            textAnchor="middle" 
            dominantBaseline="middle" 
            fill="white" 
            fontSize="10"
          >
            H
          </text>
        </g>
      ),
      btcX: (
        <g transform={`translate(${lastPoint.x + 10},${lastPoint.y - 8})`}>
          <circle r="8" fill="#f7931a" />
          <text 
            x="0" 
            y="0" 
            textAnchor="middle" 
            dominantBaseline="middle" 
            fill="white" 
            fontSize="10"
          >
            
          </text>
        </g>
      ),
      ethX: (
        <g transform={`translate(${lastPoint.x + 10},${lastPoint.y - 8})`}>
          <circle r="8" fill="#00FFFF" />
          <text 
            x="0" 
            y="0" 
            textAnchor="middle" 
            dominantBaseline="middle" 
            fill="white" 
            fontSize="10"
          >
            Ξ
          </text>
        </g>
      ),
      solX: (
        <g transform={`translate(${lastPoint.x + 10},${lastPoint.y - 8})`}>
          <circle r="8" fill="#14F195" />
          <text 
            x="0" 
            y="0" 
            textAnchor="middle" 
            dominantBaseline="middle" 
            fill="white" 
            fontSize="10"
          >
            S
          </text>
        </g>
      ),
      plsX: (
        <g transform={`translate(${lastPoint.x + 10},${lastPoint.y - 8})`}>
          <circle r="8" fill="#9945FF" />
          <text x="0" y="0" textAnchor="middle" dominantBaseline="middle" fill="white" fontSize="10">P</text>
        </g>
      ),
      plsxX: (
        <g transform={`translate(${lastPoint.x + 10},${lastPoint.y - 8})`}>
          <circle r="8" fill="#FFD700" />
          <text x="0" y="0" textAnchor="middle" dominantBaseline="middle" fill="white" fontSize="10">X</text>
        </g>
      ),
      incX: (
        <g transform={`translate(${lastPoint.x + 10},${lastPoint.y - 8})`}>
          <circle r="8" fill="#00FF00" />
          <text x="0" y="0" textAnchor="middle" dominantBaseline="middle" fill="white" fontSize="10">I</text>
        </g>
      )
    };

    return icons[props.dataKey];
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const getTokenColor = (dataKey: string) => {
        const colorMap = {
          hexX: '#ff00ff',      // pHEX
          ehexX: '#627EEA',     // eHEX
          plsX: '#9945FF',      // PLS
          plsxX: '#FFD700',     // PLSX
          incX: '#00FF00',      // INC
          btcX: '#f7931a',      // BTC
          ethX: '#00FFFF',      // ETH
          solX: '#14F195',      // SOL
          xrpX: '#fff',         // XRP (changed to white)
          bnbX: '#F3BA2F',      // BNB
          dogeX: '#C2A633',     // DOGE
          adaX: '#0033AD',      // ADA
          tronX: '#FF0013',     // TRX
          avaxX: '#E84142',     // AVAX
          linkX: '#2A5ADA',     // LINK
          shibX: '#FFA409',     // SHIB
          tonX: '#0098EA',      // TON
          xlmX: '#14B6E7',      // XLM
          suiX: '#6FBCF0',      // SUI
          dotX: '#E6007A',      // DOT
          hbarX: '#00ADED',     // HBAR
          bchX: '#8DC351',      // BCH
          pepeX: '#00B84C',     // PEPE
          uniX: '#FF007A'       // UNI
        };
        return colorMap[dataKey] || '#fff';
      };

      // Sort payload by X value in descending order
      const sortedPayload = [...payload].sort((a, b) => b.value - a.value);

      // Calculate items per column (round up to ensure all items are shown)
      const itemsPerColumn = Math.ceil(sortedPayload.length / 3);
      
      // Split into columns
      const columns = [
        sortedPayload.slice(0, itemsPerColumn),
        sortedPayload.slice(itemsPerColumn, itemsPerColumn * 2),
        sortedPayload.slice(itemsPerColumn * 2)
      ];
      
      return (
        <div style={{ 
          backgroundColor: 'rgba(0, 0, 0, 0.85)', 
          border: '1px solid rgba(255, 255, 255, 0.2)', 
          borderRadius: '10px',
          padding: '10px',
          minWidth: '400px'
        }}>
          <p style={{ color: 'white', margin: '0 0 5px' }}>
            {format(new Date(label), 'MMM d, yyyy')}
          </p>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            gap: '20px'
          }}>
            {columns.map((column, colIndex) => (
              <div key={colIndex} style={{ flex: 1 }}>
                {column.map((entry, index) => {
                  const color = entry.stroke;
                  return (
                    <p key={index} style={{ 
                      color, 
                      margin: '3px 0',
                      whiteSpace: 'nowrap'
                    }}>
                      {`${entry.name}: ${entry.value.toFixed(1)}X`}
                    </p>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  const handleDateChange = (newDate: string, buttonName: string) => {
    const dateObj = new Date(newDate);
    setBaselineDate(newDate);
    setActiveButton(buttonName);
    setDate(dateObj);
  };

  if (error) {
    return <div className="text-center text-red-500">Error: {error}</div>;
  }

  return (
    <div className="w-full h-[650px] sm:h-[550px] md:h-[400px] lg:h-[550px] my-10 relative">
      {!isChartReady ? (
        <Skeleton variant="chart" />
      ) : (
        <div className="w-full h-full p-5 bg-black border border-white/20 rounded-xl text-white">
          <div className="flex justify-between items-start mb-2.5 px-6">
            <div className="flex flex-col gap-1">
              <h2 className="text-white text-sm lg:text-2xl m-0 pr-2.5 font-bold">
                <u>Everything</u> vs everything
              </h2>
              <p className="text-xs sm:text-sm text-gray-400">
                From any token's market bottom
              </p>
            </div>

            <div className="flex gap-2.5 items-center flex-col">
              {/* Controls Container */}
              <div className="w-full flex flex-col lg:flex-row gap-2 lg:gap-4 items-center justify-end">
                {/* Date Picker */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-[140px] sm:w-[180px] justify-start text-left font-normal bg-black border-white/20 text-white",
                        "hover:bg-black hover:border-white/20 hover:text-white",
                        !date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date ? format(date, "yyyy/MM/dd") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-black border border-white/20">
                    <Calendar
                      mode="single"
                      selected={date}
                      defaultMonth={date}
                      onSelect={(newDate) => {
                        if (newDate) {
                          const isoString = newDate.toISOString();
                          setDate(newDate);
                          setBaselineDate(isoString);
                          setActiveButton('');
                          // Reset the select value to empty string
                          const selectElement = document.querySelector('[data-value]') as HTMLElement;
                          if (selectElement) {
                            selectElement.setAttribute('data-value', '');
                          }
                        }
                      }}
                      initialFocus
                      className="bg-black text-white"
                      classNames={{
                        months: "text-white",
                        month: "text-white",
                        caption: "flex justify-center pt-1 relative items-center text-white",
                        caption_label: "text-sm font-medium text-white",
                        nav: "space-x-1 flex items-center",
                        nav_button: "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 text-white",
                        nav_button_previous: "absolute left-1",
                        nav_button_next: "absolute right-1",
                        table: "w-full border-collapse space-y-1",
                        head_row: "flex",
                        head_cell: "text-gray-500 rounded-md w-9 font-normal text-[0.8rem]",
                        row: "flex w-full mt-2",
                        cell: "text-center text-sm p-0 relative [&:has([aria-selected])]:bg-transparent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                        day: "h-9 w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-gray-800 rounded-md text-white",
                        day_selected: "bg-gray-800 text-white hover:bg-gray-700 hover:text-white focus:bg-gray-800 focus:text-white",
                        day_today: "bg-gray-800/80 text-white",
                        day_outside: "text-gray-700 opacity-50",
                        day_disabled: "text-gray-700 opacity-50",
                        day_range_middle: "aria-selected:bg-transparent",
                        day_hidden: "hidden",
                        ...(date && {
                          day_selected: "bg-gray-800 text-white hover:bg-gray-700 hover:text-white focus:bg-gray-800 focus:text-white",
                          day_today: "bg-gray-800/80 text-white",
                          day_outside: "text-gray-700 opacity-50",
                          day_disabled: "text-gray-700 opacity-50",
                          day_range_middle: "aria-selected:bg-transparent",
                          day_hidden: "hidden",
                        }),
                      }}
                    />
                  </PopoverContent>
                </Popover>

                {/* Lows Dropdown */}
                <Select 
                  value={activeButton ? (activeButton === 'pHEX' ? 'hex' : activeButton.toLowerCase()) : ""}
                  onValueChange={(value) => {
                    const selectedDate = lowDates.find(date => date.id === value);
                    if (selectedDate) {
                      handleDateChange(selectedDate.date, selectedDate.name.split(' ')[0]);
                    }
                  }}
                >
                  <SelectTrigger className="w-[140px] sm:w-[180px] bg-black border-white/20 text-white hover:bg-gray-900 hover:border-white/20">
                    <SelectValue placeholder="Select a low" />
                  </SelectTrigger>
                  <SelectContent 
                    className="bg-black border border-white/20 fixed overflow-hidden max-h-[var(--radix-select-content-available-height)] z-50"
                  >
                    {lowDates.map((date) => (
                      <SelectItem 
                        key={date.id} 
                        value={date.id}
                        className="text-white hover:bg-gray-900 focus:bg-gray-900 focus:text-white whitespace-nowrap truncate w-full"
                      >
                        <div className="flex items-center gap-2 truncate w-full">
                          <div 
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: date.color }}
                          />
                          <span className="truncate">{date.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          
          <div className="w-full h-[calc(100%-60px)]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={data}
                margin={{ top: 15, right: 0, left: 0, bottom: 20 }}
              >
                <XAxis 
                  dataKey="date" 
                  stroke="#888"
                  axisLine={{ stroke: '#888', strokeWidth: 0 }}
                  tickLine={false}
                  tick={{ fill: '#888', fontSize: 14, dy: 10 }}
                  tickFormatter={(date) => new Date(date).toLocaleDateString('en-UK', { 
                    day: 'numeric', 
                    month: 'short',
                    year: '2-digit'
                  })}
                  domain={['dataMin', 'dataMax']}
                  ticks={data.reduce((acc, item, index) => {
                    if (index === 0 || index === data.length - 1) {
                      acc.push(item.date);
                    }
                    return acc;
                  }, [] as string[])}
                />
                <YAxis 
                  tickFormatter={(value) => `${Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1)}X`}
                  stroke="#888"
                  axisLine={{ stroke: '#888', strokeWidth: 0 }}
                  tickLine={false}
                  tick={(props) => {
                    return (
                      <text
                        x={props.x}
                        y={props.y}
                        dy={4}
                        textAnchor="end"
                        fill="#888"
                        fontSize={14}
                      >
                        {`${Number.isInteger(props.payload.value) ? 
                          props.payload.value.toFixed(0) : 
                          props.payload.value.toFixed(1)}X`}
                      </text>
                    );
                  }}
                  domain={[0, 'auto']}
                  allowDataOverflow={false}
                  interval="preserveStartEnd"
                />
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  stroke="rgba(136, 136, 136, 0.2)" 
                  vertical={false} 
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(0, 0, 0, 0.85)', 
                    border: '1px solid rgba(255, 255, 255, 0.2)', 
                    borderRadius: '10px', 
                    padding: '10px',
                    color: '#fff',
                    boxShadow: '0 0 10px rgba(0,0,0,0.5)'
                  }}
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      // Sort payload by value in descending order
                      const sortedPayload = [...payload].sort((a, b) => b.value - a.value);
                      
                      // Calculate items per column (round up to ensure all items are shown)
                      const itemsPerColumn = Math.ceil(sortedPayload.length / 3);
                      
                      // Split into columns
                      const columns = [
                        sortedPayload.slice(0, itemsPerColumn),
                        sortedPayload.slice(itemsPerColumn, itemsPerColumn * 2),
                        sortedPayload.slice(itemsPerColumn * 2)
                      ];
                      
                      return (
                        <div style={{ 
                          backgroundColor: 'rgba(0, 0, 0, 0.85)', 
                          border: '1px solid rgba(255, 255, 255, 0.2)', 
                          borderRadius: '10px',
                          padding: '10px',
                          minWidth: '400px'
                        }}>
                          <p style={{ color: 'white', margin: '0 0 5px' }}>
                            {format(new Date(label), 'MMM d, yyyy')}
                          </p>
                          <div style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between',
                            gap: '20px'
                          }}>
                            {columns.map((column, colIndex) => (
                              <div key={colIndex} style={{ flex: 1 }}>
                                {column.map((entry, index) => {
                                  const color = entry.stroke;
                                  return (
                                    <p key={index} style={{ 
                                      color, 
                                      margin: '3px 0',
                                      whiteSpace: 'nowrap'
                                    }}>
                                      {`${entry.name}: ${entry.value.toFixed(1)}X`}
                                    </p>
                                  );
                                })}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend content={customLegend} />
                
                <Line 
                  type="monotone" 
                  dataKey="hexX" 
                  stroke="#ff00ff" 
                  strokeWidth={1.5}
                  dot={false}
                  name="pHEX"
                  label={renderCustomizedLabel}
                  hide={!visibleLines.hexX}
                />
                <Line 
                  type="monotone" 
                  dataKey="ehexX" 
                  stroke="#627EEA" 
                  strokeWidth={1.5}
                  dot={false}
                  name="eHEX"
                  hide={!visibleLines.ehexX}
                  label={renderCustomizedLabel}
                />
                <Line 
                  type="monotone" 
                  dataKey="plsX" 
                  stroke="#9945FF" 
                  strokeWidth={1.5}
                  dot={false}
                  name="PLS"
                  label={renderCustomizedLabel}
                  hide={!visibleLines.plsX}
                />
                <Line 
                  type="monotone" 
                  dataKey="plsxX" 
                  stroke="#FFD700" 
                  strokeWidth={1.5}
                  dot={false}
                  name="PLSX"
                  label={renderCustomizedLabel}
                  hide={!visibleLines.plsxX}
                />
                <Line 
                  type="monotone" 
                  dataKey="incX" 
                  stroke="#00FF00" 
                  strokeWidth={1.5}
                  dot={false}
                  name="INC"
                  hide={!visibleLines.incX}
                  label={renderCustomizedLabel}
                />
                <Line 
                  type="monotone" 
                  dataKey="btcX" 
                  stroke="#f7931a" 
                  strokeWidth={1.5}
                  dot={false}
                  name="BTC"
                  label={renderCustomizedLabel}
                  hide={!visibleLines.btcX}
                />
                <Line 
                  type="monotone" 
                  dataKey="ethX" 
                  stroke="#00FFFF" 
                  strokeWidth={1.5}
                  dot={false}
                  name="ETH"
                  label={renderCustomizedLabel}
                  hide={!visibleLines.ethX}
                />
                <Line 
                  type="monotone" 
                  dataKey="solX" 
                  stroke="#14F195" 
                  strokeWidth={1.5}
                  dot={false}
                  name="SOL"
                  label={renderCustomizedLabel}
                  hide={!visibleLines.solX}
                />

                <Line 
                  type="monotone" 
                  dataKey="xrpX" 
                  stroke="#fff" 
                  strokeWidth={1.5}
                  dot={false}
                  name="XRP"
                  label={renderCustomizedLabel}
                  hide={!visibleLines.xrpX}
                />
                <Line 
                  type="monotone" 
                  dataKey="bnbX" 
                  stroke="#F3BA2F" 
                  strokeWidth={1.5}
                  dot={false}
                  name="BNB"
                  label={renderCustomizedLabel}
                  hide={!visibleLines.bnbX}
                />
                <Line 
                  type="monotone" 
                  dataKey="dogeX" 
                  stroke="#C2A633" 
                  strokeWidth={1.5}
                  dot={false}
                  name="DOGE"
                  label={renderCustomizedLabel}
                  hide={!visibleLines.dogeX}
                />
                <Line 
                  type="monotone" 
                  dataKey="adaX" 
                  stroke="#0033AD" 
                  strokeWidth={1.5}
                  dot={false}
                  name="ADA"
                  label={renderCustomizedLabel}
                  hide={!visibleLines.adaX}
                />
                <Line 
                  type="monotone" 
                  dataKey="tronX" 
                  stroke="#FF0013" 
                  strokeWidth={1.5}
                  dot={false}
                  name="TRX"
                  label={renderCustomizedLabel}
                  hide={!visibleLines.tronX}
                />
                <Line 
                  type="monotone" 
                  dataKey="avaxX" 
                  stroke="#E84142" 
                  strokeWidth={1.5}
                  dot={false}
                  name="AVAX"
                  label={renderCustomizedLabel}
                  hide={!visibleLines.avaxX}
                />
                <Line 
                  type="monotone" 
                  dataKey="linkX" 
                  stroke="#2A5ADA" 
                  strokeWidth={1.5}
                  dot={false}
                  name="LINK"
                  label={renderCustomizedLabel}
                  hide={!visibleLines.linkX}
                />
                <Line 
                  type="monotone" 
                  dataKey="shibX" 
                  stroke="#FFA409" 
                  strokeWidth={1.5}
                  dot={false}
                  name="SHIB"
                  label={renderCustomizedLabel}
                  hide={!visibleLines.shibX}
                />
                <Line 
                  type="monotone" 
                  dataKey="tonX" 
                  stroke="#0098EA" 
                  strokeWidth={1.5}
                  dot={false}
                  name="TON"
                  label={renderCustomizedLabel}
                  hide={!visibleLines.tonX}
                />
                <Line 
                  type="monotone" 
                  dataKey="xlmX" 
                  stroke="#14B6E7" 
                  strokeWidth={1.5}
                  dot={false}
                  name="XLM"
                  label={renderCustomizedLabel}
                  hide={!visibleLines.xlmX}
                />
                <Line 
                  type="monotone" 
                  dataKey="suiX" 
                  stroke="#6FBCF0" 
                  strokeWidth={1.5}
                  dot={false}
                  name="SUI"
                  label={renderCustomizedLabel}
                  hide={!visibleLines.suiX}
                />
                <Line 
                  type="monotone" 
                  dataKey="dotX" 
                  stroke="#E6007A" 
                  strokeWidth={1.5}
                  dot={false}
                  name="DOT"
                  label={renderCustomizedLabel}
                  hide={!visibleLines.dotX}
                />
                <Line 
                  type="monotone" 
                  dataKey="hbarX" 
                  stroke="#00ADED" 
                  strokeWidth={1.5}
                  dot={false}
                  name="HBAR"
                  label={renderCustomizedLabel}
                  hide={!visibleLines.hbarX}
                />
                <Line 
                  type="monotone" 
                  dataKey="bchX" 
                  stroke="#8DC351" 
                  strokeWidth={1.5}
                  dot={false}
                  name="BCH"
                  label={renderCustomizedLabel}
                  hide={!visibleLines.bchX}
                />
                <Line 
                  type="monotone" 
                  dataKey="pepeX" 
                  stroke="#00B84C" 
                  strokeWidth={1.5}
                  dot={false}
                  name="PEPE"
                  label={renderCustomizedLabel}
                  hide={!visibleLines.pepeX}
                />
                <Line 
                  type="monotone" 
                  dataKey="uniX" 
                  stroke="#FF007A" 
                  strokeWidth={1.5}
                  dot={false}
                  name="UNI"
                  label={renderCustomizedLabel}
                  hide={!visibleLines.uniX}
                />

              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};

export default VsGainsTop20;

