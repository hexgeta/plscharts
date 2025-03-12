'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useCryptoPrice } from "@/hooks/crypto/useCryptoPrice";
import { Skeleton } from "@/components/ui/skeleton2";
import Link from 'next/link';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePickerWithRange } from "./ui/date-range-picker";
import { DateRange } from "react-day-picker";
import { addDays } from "date-fns";
import { cn } from "@/lib/utils";

interface StakeData {
  id: string;
  address: string;
  stakedHearts: string;
  stakeTShares: string;
  stakedDays: string;
  startDay: string;
  endDay: string;
  isActive: boolean;
  chain: 'ETH' | 'PLS';
}

const OA_ADDRESSES = [
  // ETH 555 stakes 13 march 2025ish
  "0x0153ea02bedcc77f2f927f6e136e58e29a08011b",
  "0x0547ed8e18b34985eaeee94bd8dd79c4b94c7282",
  "0x0612c1e6d59d45cc7a07475640eaee0ba46f414a",
  "0x0966e294c217ea07de9c3c24d95ea23d38fbeca5",
  "0x0db21d5d0ab1192aab5d426cd557018e9e6c37be",
  "0x0eb3705f4f5dd3cfe8f6669fa2b9124094b89647",
  "0x10bd342fc53b55e2160676866d8fa510edc663a1",
  "0x11669d8d07169cb2a960bba9b6168704ef626785",
  "0x11c1e812ea0fa5c98407d219e4fa90f3aed2f524",
  "0x127989f269ea2554baf97ba17919376ba9de7bd9",
  "0x12927e415f1f34b06ac2036feada80cf7fa17017",
  "0x154e1a2c55ed3f4906b930dc9e90280a077f0f80",
  "0x1999ad6123596415e8237b5ba0747f21b2129273",
  "0x1ea0b871b6b3cc3614eb3206db16f5e6121964ee",
  "0x23b8a7f66a0d5623de2584884fa8cc14ac4ee0ed",
  "0x257cf14ba17ebbc1f756b7b0a7a63e5abd5f12e4",
  "0x25d297dfc6b6deaa0d855716df1f846d3ec3c807",
  "0x2bb370bb2f661fee8e70be66b0d7eda1ccb131b7",
  "0x2d0289f376a0a093dc344f4d38141e8e96a2dc22",
  "0x2d38153edbd5387f69c4770551004e5be202ac52",
  "0x3185357d3ca8fc8b978801f6944a733be8838ae4",
  "0x322ef3dfd6a9ec75ce95b46eb75e183eb8ee6e85",
  "0x331ee720572eb0070105247aa0f7343018a25437",
  "0x387a22b66b0f78d2f0a074076f684d3e753e1163",
  "0x3bfa4a0f2bb29d45fa42ed3246aaae63b76f5c98",
  "0x3da527493412a1bcab863b15d836fbf6df5f45b3",
  "0x44e1c08d707df4c4a2e48428aae7f22b09cfb4ad",
  "0x49162bcaacd8808ad9e8ccf3c12b00fe34f6a3d0",
  "0x4a0ee1f69d6cfbe7d0230ebdcdf1384460d1a97e",
  "0x4a1203bd53e236c5cf307f2442afa83bcdbd8042",
  "0x4cba2b624bf2706b48a22f4e7d9bbe3c6637b460",
  "0x4d831599c9ed17690ab2d0eda657c66656be45ec",
  "0x4f1d6e9b32e47582f3ebcd3fe564cacf008f560b",
  "0x4fe09fffef0c7e5fde0d6b0d422019694ec180ed",
  "0x541199030c6b826e1d4d7d3845086b3d227440d7",
  "0x5992bfdccd1e22ebda6549b1656d4d05b8cd2ce6",
  "0x5b0e714cfc25a00d96adbe3474d7314e91153b56",
  "0x5bbefb044c341e346dfacf67eed0376c062002e1",
  "0x5c268e14a8361c9b888b7a25bd3b8d71f981c245",
  "0x5f0bde7b98b1107dad3a10a56db30e736dc8da0a",
  "0x5f359cf50a4fcad88e1f6af84679597c1d7e8d21",
  "0x644c1c82e9ddae4565b74d9ff6fd66950e334581",
  "0x69775aad5759ce20636e95c21699239a1e1510d9",
  "0x6a06c92f63a8ac33f90fcc894ef7ee7845849ad7",
  "0x6dc6b317b85caf0d627383194afaef1160d1befa",
  "0x6ef01379c782c1a62f01f1a0280deafdc4d332bc",
  "0x6f34dfcdbd40fed9dee777bef26d723d0aa8eeab",
  "0x7438ff6f3b1968415a12205127ae9ba978c13c1b",
  "0x767b7d8bb9d8b40f9edb79a358be3bc8158ea78b",
  "0x76b162049494cc2afcfe7241277eb5e41695efb9",
  "0x7b13352d8223ce6acf461acda8dbe5adbcf0b895",
  "0x7c3a821473004abffebaaf4615b90da0b03be085",
  "0x7d3836d50bb3a1ba6dc28c2b0ebb9d1da8efcce4",
  "0x82cbdba8cb5ef321656d3ffeffbc968585467d74",
  "0x8455d7adc8584703fdcab70438cb43e0ed44e6d3",
  "0x8557fb17355af1e1639d984e25abd8c5eadec31a",
  "0x8da48f23ff9900e5b1d9a6bb47b595612a41fa26",
  "0x8ec2e75e36612df48a2170029f5445c5580317de",
  "0x908c4a433b12bbd25e5bf335eeed7175d2bd6ecc",
  "0x9044626fef9dca5882b58b74e0abb653e24acb21",
  "0x95c3e1a1123a8ecb3d89f796ceacd24cd14be8fb",
  "0x95fba0577cd9d6e6f0841570845ef313daef6f80",
  "0x9bd82ac22d9fcfc38a6f7aafc91d816c1f15d621",
  "0xa1cb270dc3285d0709c12d30fa69489f47f27008",
  "0xa3c972bedb86c9fadab44fca6a2e96e6b1b9ea44",
  "0xab81359366ff3783f7f6a7fb42833fb63267a250",
  "0xae530199047d03de7ef99b57c93423b3749ab3ee",
  "0xb08cd75370687667989adab78c185762d2c63b3a",
  "0xb0103b57a0ea15093a7036e78d53b19d2a3340c7",
  "0xb1e42fe4f9214d89e88a169eb09e82c51a9b672f",
  "0xb1e7d42ea8c490ab68b7f606f191761740f47f97",
  "0xb27a8a1127f78b440bca4bea60e43374918cf806",
  "0xb317dc3f7696453e45696821107b5027b611fe5f",
  "0xb31cd1b8eb38e71cff01e0422e472e93f5de4acb",
  "0xb89d31d225e01ca5a865638fc3774f325c5694e6",
  "0xb8cd7cda1e40883a755fa4e2bedeb43d5c48c3d4",
  "0xb9f6fc829103c2b7c2783132a465c5e5443a2d6c",
  "0xbbeb8b1fe7f71615008a35630d3af1a6a17bf56e",
  "0xc0fb55d481ca70463afbf894eecd06bd19d6624f",
  "0xc115dc9a538ac438e597c93faffaece2e345c875",
  "0xc39c0acf67be8296ad4c5fa691d8340260123d9c",
  "0xc8cd3d4fdef11230da6c5dd6936c5abfe05ae968",
  "0xc8ea1acc8fb1b52b1664a57cb137a065ee8584db",
  "0xc97a215fd2f4e493cf069a68c79699a194300a61",
  "0xce0a2e6ec58c01eee456188bdd5c882b7c8c1405",
  "0xd01c9f181deb8e7b9180d6c87e024afc6efb51f2",
  "0xd1bc807f6931f6a6df1350a83d93498d78f7a42f",
  "0xd20756f34b06c68a26c34a8756503b53a3b451c9",
  "0xd2381942862f7bfdfd5a566b5706e8bd2098fc9e",
  "0xd9eecbdb9ab46bbfed0b3cdc4f06bec3dc6b1a25",
  "0xdb5feb9621be9450308b12fd0185bdd7fb95e31b",
  "0xdc303a6ff7389a67a04e3afa44ba9d740ef4bd30",
  "0xdcda82f890d26e1de8ef1ff6c529b49c8555f827",
  "0xde6034664a32b7a3eeb9f20fd1bd8dc8e1381554",
  "0xe39ba15892d571c2d4516c9105b76a601e0dd431",
  "0xe5aa93694699ca562df08b4017b943ca8a0f80aa",
  "0xe74aee94bc82504506934dd5c82ca7ac4c3e186d",
  "0xe7d49c7f5d65f9515f1129d4ee3682aab38e892c",
  "0xe7dd7736704baf71529775e0710a99d173e19a48",
  "0xe879884c9b4fded9d214e782136894baacc5012a",
  "0xe8ecd5e7e0154264051512059d586eb56727074d",
  "0xe9bc731b8bfca34cdd76db23686e31a77f01de49",
  "0xed7be4b33092a1d7d6e0bab3594343da9e748e1c",
  "0xef5472e71414b7237c665bda2db7033792b88662",
  "0xf367445e5e93e9d89878c671fcdb534db3d79f0a",
  "0xf633fde3174e8eae67428a6345fd0f8c1734b2c4",
  "0xf8d3cbdbd200982ee8589a346330e3606932a303",
  "0xf8d7d1fe481738031dec8855a3a366cb9f3d4b6a",
  "0xf9bc3b681a6dff6e720c9f782ac8684fdd6539e5",
  "0xf9fbccb81f7bba1571134c6667c061193ba90aa7",
  "0xfa32d87aaa5d056d492f9630b2a466f5a64864dd",
  "0xfce21736b3e6eb2aecd6007a1eb9e1ed753cc89b",
  "0xfc5ee0fe1c82053c28aaeeee8648c0c758807ecb",

  // PLS 555 stakes 13 march 2025ish
  "0x00216f030dd4b8c061c9e4b714ab6e3bc2ee356c",
  "0x004bd31cc1dd375bd36647466bbdb84372632bb9",
  "0x006735adaecbf6dd3d63fc179e36b11f0c56355d",
  "0x00d098175652460a6b0ac34a58c72ef5dc3af3e1",
  "0x0129c23029cfc869de2a117eacc9945bca049f4f",
  "0x016587c3a35d6c6abe2008fbe5889beb78553fe3",
  "0x018772e4db3cfb3df9c472f4b3c0c34bc624bfa0",
  "0x0194d23f5af79ccae2321336c41f92dc2bdeaa50",
  "0x024b48ec7751775e2082c17a4f523986712b05ca",
  "0x024c4faf5ef875a316ff19851d806540fbfedbf0",
  "0x02cde7ff8ef9fbdb4f2db1899b4944296361dddc",
  "0x03280b215e1c1b2a2ffea1b6972f793e75056a37",
  "0x039bf36fa0a8966d52eb673f65223d09524b6194",
  "0x04a80090316345813fa24bec324d06717071e1b7",
  "0x04b0c62028014fc721d939b0f607ae230e57602f",
  "0x053a67566cb618c400ea04714315917c8984d343",
  "0x059e3ab3956da0a8a47369b4c2bfb75a58600968",
  "0x05b0d8a9e8fbe3722a6ba9c8bee7754e58845f58",
  "0x05cb336fc612b08f3ec64ccb3f62b57b2b3a00dd",
  "0x0612c1e6d59d45cc7a07475640eaee0ba46f414a",
  "0x06305631ab5195dc4f4b58baa9a7a0473f86e5a5",
  "0x063a6961b1ce339334096cfd661ffe240b1ccc3a",
  "0x063f49304b587dba4609940e308b3683b5b0aad7",
  "0x065bbadd1626d507e5042fb750c09ee29923e4c9",
  "0x06e5c2014a101cc58542e7780cdf024346a30ffa",
  "0x06e5c6a26e8f01518f4839e21842c46e4a33658f",
  "0x07215f3e92e9caad82b3b2536ff167112dbcd4a6",
  "0x07a24413473462667ba8ad4560978183be675dfd",
  "0x07a520c2fcff824d6eebc0df641dcabaed78cdfa",
  "0x086d158c3f87a443f8813cff04b7f8a18b2b8cb3",
  "0x08d0157dc5cf0502a8a7038adb72136f2b150238",
  "0x095b2b2c93a2268634e68072f87b19cd658636f7",
  "0x099ef2e1912bb1d36e038927d8ae03434825874a",
  "0x09b125ccaaee0cf1866e2ec27d1c2ac72404f8f5",

  // ACTIVE ON PLS & ETH
  "0x5280aa3cf5d6246b8a17dfa3d75db26617b73937",
  "0xa2e1734682c6a237c070d93019a7e0bf7047406c",
  "0xfa22be2da9013c4641077bf58690040671f90c81",
  "0x1dc195d9291a10ac28ae4de8aa2c5ebe328b3324",
  "0x14be885185dbc61e98e5b63a929493b231d42969",
  "0x1d6de2f43d00ec3daa8ee37ed43cd4f855ca4b58",
  "0x31d89631ee529b9b892d8e3b78464ee36d308056",
  "0x4a107629cefcf0027bfafb3da47e7e9096c2ed85",

  // ACTIVE ON ETH ONLY
  "0x2d2c2ff3345de305ea06c35c958b0a4fd774abda",

  // INACTIVE CURRENTLY
  "0x2b591e99afe9f32eaa6214f7b7629768c40eeb39",
  "0x075e72a5edf65f0a5f44699c7654c1a76941ddc8",
  "0xb17c443c89b0c18e53b6f25af55297e122b30f5c",
  "0xbfc9c5878245fb9fe49c688a9c554c8a1fae71fa",
  "0x20fcb7b4e103ec482645e15715c8a2e7a437fbd6",
  "0xb628441794cd41484be092b3b5f4b2ff7271eb60",
  "0x7be74346dc745ea11035881092409088bc76db59",
  "0x1a73652bfa6c26c632af21f52aacbcbdb396d659"
];

const SUBGRAPH_URLS = {
  ETH: 'https://graph.ethereum.pulsechain.com/subgraphs/name/Codeakk/Hex',
  PLS: 'https://graph.pulsechain.com/subgraphs/name/Codeakk/Hex'
};

const calculateCurrentHexDay = () => {
  const HEX_LAUNCH_DATE = new Date('2019-12-03T00:00:00Z').getTime();
  const SECONDS_PER_DAY = 86400;
  const currentTimestamp = Date.now();
  return Math.floor((currentTimestamp - HEX_LAUNCH_DATE) / (SECONDS_PER_DAY * 1000)) - 2;
};

const formatDate = (hexDay: string) => {
  // HEX launch date in UTC
  const HEX_LAUNCH_DATE = new Date('2019-12-03T00:00:00.000Z');
  const date = new Date(HEX_LAUNCH_DATE.getTime() + ((parseInt(hexDay) - 2) * 24 * 60 * 60 * 1000));
  
  // Format in UTC to avoid timezone shifts
  return date.toLocaleDateString('en-GB', { 
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC'
  }).replace(/\//g, '.');
};

const formatNumber = (value: number | string, decimals = 1) => {
  const num = typeof value === 'string' ? Number(value) : value;
  console.log('Formatting number:', { input: value, parsed: num });
  if (num >= 1000000000) {
    return `${(num / 1000000000).toFixed(0)} B`;
  } else if (num >= 1000000) {
    return `${(num / 1000000).toFixed(0)} M`;
  } else if (num >= 1000) {
    return `${(num / 1000).toFixed(decimals)} K`;
  }
  return num.toFixed(decimals);
};

const formatAddress = (address: string) => {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

const ROWS_PER_PAGE = 10;
const DEFAULT_START_DATE = new Date('2025-02-05');

export default function OAStakesTable() {
  const [stakes, setStakes] = useState<StakeData[]>([]);
  const [displayedStakes, setDisplayedStakes] = useState<StakeData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'ended'>('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: DEFAULT_START_DATE,
    to: addDays(DEFAULT_START_DATE, 30)
  });
  const { priceData } = useCryptoPrice('pHEX');

  // Function to filter stakes based on status and date range
  const filterStakes = useCallback((allStakes: StakeData[]) => {
    return allStakes.filter(stake => {
      // Status filter
      if (statusFilter !== 'all') {
        if (statusFilter === 'active' && !stake.isActive) return false;
        if (statusFilter === 'ended' && stake.isActive) return false;
      }

      // Date filter
      if (dateRange?.from || dateRange?.to) {
        const stakeStartDate = new Date(Number(stake.startDay) * 86400000 + new Date('2019-12-03').getTime());
        if (dateRange?.from && stakeStartDate < dateRange.from) return false;
        if (dateRange?.to && stakeStartDate > dateRange.to) return false;
      }

      return true;
    });
  }, [statusFilter, dateRange]);

  // Function to load more stakes
  const loadMore = useCallback(() => {
    const filteredStakes = filterStakes(stakes);
    const start = (page - 1) * ROWS_PER_PAGE;
    const end = start + ROWS_PER_PAGE;
    const newStakes = filteredStakes.slice(start, end);
    
    // Sort all stakes by date and then by principle
    const sortedStakes = [...displayedStakes, ...newStakes].sort((a, b) => {
      // First sort by startDay (descending)
      const startDayDiff = Number(b.startDay) - Number(a.startDay);
      if (startDayDiff !== 0) return startDayDiff;
      
      // Then sort by stakedHearts (descending) as secondary criteria
      return Number(b.stakedHearts) - Number(a.stakedHearts);
    });
    
    setDisplayedStakes(sortedStakes);
    setHasMore(end < filteredStakes.length);
  }, [page, stakes, filterStakes, displayedStakes]);

  // Reset displayed stakes when filters change
  useEffect(() => {
    setDisplayedStakes([]);
    setPage(1);
    setHasMore(true);
  }, [statusFilter, dateRange]);

  // Load more stakes when page changes
  useEffect(() => {
    loadMore();
  }, [page, loadMore]);

  useEffect(() => {
    const fetchStakes = async () => {
      try {
        setIsLoading(true);
        const currentDay = calculateCurrentHexDay();
        const addresses = OA_ADDRESSES.map(addr => addr.toLowerCase()).join('","');
        
        const fetchAllStakesFromChain = async (url: string, chain: 'ETH' | 'PLS') => {
          let allStakes: any[] = [];
          let hasMore = true;
          let skip = 0;
          const first = 1000; // Fetch 1000 stakes at a time
          
          while (hasMore) {
            const query = `{
              stakeStarts(
                first: ${first},
                skip: ${skip},
                where: { stakerAddr_in: ["${addresses}"] }
                orderBy: startDay
                orderDirection: desc
              ) {
                id
                stakerAddr
                stakedHearts
                stakedDays
                stakeTShares
                startDay
                endDay
              }
            }`;

            try {
              console.log(`Fetching stakes from ${chain}, skip: ${skip}`);
              const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query }),
              });

              const result = await response.json();
              console.log(`${chain} response:`, result);
              
              if (result.errors) {
                console.error(`${chain} query errors:`, result.errors);
                hasMore = false;
                return allStakes;
              }

              const fetchedStakes = result.data?.stakeStarts || [];
              console.log(`${chain} fetched ${fetchedStakes.length} stakes`);
              
              if (fetchedStakes.length > 0) {
                allStakes = [...allStakes, ...fetchedStakes];
                skip += first;
              } else {
                hasMore = false;
              }
            } catch (error) {
              console.error(`Error fetching ${chain} stakes:`, error);
              hasMore = false;
            }
          }
          
          console.log(`Total ${chain} stakes found: ${allStakes.length}`);
          return allStakes.map((stake: any) => {
            const stakeEndDay = Number(stake.startDay) + Number(stake.stakedDays);
            return {
              id: `${chain}-${stake.id}`,
              address: stake.stakerAddr,
              stakedHearts: stake.stakedHearts,
              stakeTShares: stake.stakeTShares,
              stakedDays: stake.stakedDays,
              startDay: stake.startDay,
              endDay: stakeEndDay.toString(),
              isActive: currentDay < stakeEndDay,
              chain
            };
          });
        };

        // Fetch stakes from both chains
        const [ethStakes, plsStakes] = await Promise.all([
          fetchAllStakesFromChain(SUBGRAPH_URLS.ETH, 'ETH'),
          fetchAllStakesFromChain(SUBGRAPH_URLS.PLS, 'PLS')
        ]);

        console.log('Stakes summary:', {
          ethStakesCount: ethStakes.length,
          plsStakesCount: plsStakes.length
        });

        const combinedStakes = [...ethStakes, ...plsStakes]
          .sort((a, b) => {
            // First sort by startDay (descending)
            const startDayDiff = Number(b.startDay) - Number(a.startDay);
            if (startDayDiff !== 0) return startDayDiff;
            
            // Then sort by stakedHearts (descending) as secondary criteria
            return Number(b.stakedHearts) - Number(a.stakedHearts);
          });

        console.log('Combined stakes count:', combinedStakes.length);

        setStakes(combinedStakes);
        setIsLoading(false);
      } catch (err) {
        console.error('Error fetching stakes:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
        setIsLoading(false);
      }
    };

    fetchStakes();
  }, []);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, clientHeight, scrollHeight } = e.currentTarget;
    if (scrollHeight - scrollTop <= clientHeight * 1.5 && hasMore && !isLoading) {
      setPage(prev => prev + 1);
    }
  }, [hasMore, isLoading]);

  if (error) return <div className="text-red-500">Error: {error}</div>;

  return (
    <div className="w-full py-4 px-1 xs:px-8">
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 mb-4 w-full">
        <Select
          value={statusFilter}
          onValueChange={(value: 'all' | 'active' | 'ended') => setStatusFilter(value)}
        >
          <SelectTrigger className="w-full sm:w-[180px] bg-black text-white border border-white/20 hover:bg-[#1a1a1a] focus:ring-0 focus:ring-offset-0">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent className="bg-black border border-white/20">
            <SelectItem value="all" className="text-white hover:bg-[#1a1a1a] focus:bg-[#1a1a1a] focus:text-white">All Stakes</SelectItem>
            <SelectItem value="active" className="text-white hover:bg-[#1a1a1a] focus:bg-[#1a1a1a] focus:text-white">Active Stakes</SelectItem>
            <SelectItem value="ended" className="text-white hover:bg-[#1a1a1a] focus:bg-[#1a1a1a] focus:text-white">Ended Stakes</SelectItem>
          </SelectContent>
        </Select>

        <div className="w-full sm:w-auto">
          <DatePickerWithRange
            date={dateRange}
            setDate={setDateRange}
          />
        </div>
      </div>

      {isLoading && page === 1 ? (
        <div className="rounded-lg border border-[#333] overflow-hidden">
          <div className="space-y-4 p-4">
            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 mb-4 w-full">
              <Skeleton className="h-10 w-full sm:w-[180px]" />
              <Skeleton className="h-10 w-full sm:w-[300px]" />
            </div>
            <div className="space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          </div>
        </div>
      ) : (
        <div 
          className="rounded-lg border border-[#333] overflow-x-auto"
          onScroll={handleScroll}
        >
          <Table>
            <TableHeader>
              <TableRow className="border-b border-[#333] hover:bg-transparent">
                <TableHead className="text-gray-400 font-800 text-center">#</TableHead>
                <TableHead className="text-gray-400 font-800 text-center">Chain</TableHead>
                <TableHead className="text-gray-400 font-800 text-center">Status</TableHead>
                <TableHead className="text-gray-400 font-800 text-center">Start Date</TableHead>
                <TableHead className="text-gray-400 font-800 text-center">End Date</TableHead>
                <TableHead className="text-gray-400 font-800 text-center">Length</TableHead>
                <TableHead className="text-gray-400 font-800 text-center">Address</TableHead>
                <TableHead className="text-gray-400 font-800 text-center">Principle</TableHead>
                <TableHead className="text-gray-400 font-800 text-center">T-Shares</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayedStakes.map((stake, index) => (
                <TableRow 
                  key={stake.id} 
                  className={cn(
                    "border-b border-[#333] hover:bg-[#1a1a1a] transition-all duration-300",
                    stake.isActive ? "" : "opacity-50"
                  )}
                  style={{
                    animation: 'fadeIn 0.5s ease-in-out',
                    animationFillMode: 'both'
                  }}
                >
                  <TableCell className="text-white text-center transition-all duration-300">{index + 1}</TableCell>
                  <TableCell className="text-white text-center transition-all duration-300">
                    <span className={cn(
                      "inline-block px-2 py-1 rounded-md text-xs font-medium transition-all duration-300",
                      stake.chain === 'ETH' 
                        ? 'border border-[#00FFFF]/50 bg-[#00FFFF]/10 text-[#00FFFF]' 
                        : 'border border-[#9945FF]/50 bg-[#9945FF]/10 text-[#9945FF]'
                    )}>
                      {stake.chain}
                    </span>
                  </TableCell>
                  <TableCell className="text-white text-center transition-all duration-300">
                    {stake.isActive ? 
                      <span className="inline-block px-2 py-1 rounded-md text-xs font-medium border border-green-500/50 bg-green-500/10 text-green-400 transition-all duration-300">
                        Active
                      </span> : 
                      <span className="inline-block px-2 py-1 rounded-md text-xs font-medium border border-gray-500/50 bg-gray-500/10 text-gray-400 transition-all duration-300">
                        Ended
                      </span>
                    }
                  </TableCell>
                  <TableCell className="text-white text-center transition-all duration-300">{formatDate(stake.startDay)}</TableCell>
                  <TableCell className="text-white text-center transition-all duration-300">{formatDate(stake.endDay)}</TableCell>
                  <TableCell className="text-white text-center transition-all duration-300">{stake.stakedDays} D</TableCell>
                  <TableCell className="text-white text-center transition-all duration-300">
                    <Link 
                      href={`https://hexscout.com/${stake.address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline hover:text-white/80 text-white transition-all duration-300"
                    >
                      {formatAddress(stake.address)}
                    </Link>
                  </TableCell>
                  <TableCell className="text-white text-center transition-all duration-300">
                    {formatNumber(Number(stake.stakedHearts) / 1e8)} HEX
                  </TableCell>
                  <TableCell className="text-white text-center transition-all duration-300">
                    {formatNumber(Number(stake.stakeTShares))}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {hasMore && (
            <div className="p-4 text-center border-t border-[#333]">
              {isLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-4 w-[200px] mx-auto" />
                </div>
              ) : (
                <p className="text-gray-400 text-sm">Scroll to load more stakes...</p>
              )}
            </div>
          )}
        </div>
      )}

      <style jsx global>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}