import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useCryptoPrice } from "@/hooks/crypto/useCryptoPrice";
import { Skeleton } from "@/components/ui/skeleton2";

interface AddressData {
  address: string;
  totalHex: string;
  totalTShares: string;
  stakeCount: number;
  activeStakes: number;
  endedStakes: number;
  avgStakeLength: number;
  avgStakeSize: string;
  isAutoStake: boolean; // true if majority of stakes are auto-stake
  note?: string;
  rank: number;
}

// Add these constants at the top level
const CACHE_KEY = 'hexLeaderboardCache';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
const MAX_STAKES_TO_FETCH = 50000;
const TOTAL_TSHARE_SUPPLY = 8712193;

// League definitions with more descriptive names
const LEAGUE_DEFINITIONS = [
  { emoji: "🔱", name: "Titan", percentage: 10, description: "10%+ T-Share Supply" },
  { emoji: "🐋", name: "Whale", percentage: 1, description: "1%+ T-Share Supply" },
  { emoji: "🦈", name: "Shark", percentage: 0.1, description: "0.1%+ T-Share Supply" },
  { emoji: "🐬", name: "Dolphin", percentage: 0.01, description: "0.01%+ T-Share Supply" },
  { emoji: "🦑", name: "Octopus", percentage: 0.001, description: "0.001%+ T-Share Supply" },
  { emoji: "🐢", name: "Turtle", percentage: 0.0001, description: "0.0001%+ T-Share Supply" },
  { emoji: "🦀", name: "Crab", percentage: 0.00001, description: "0.00001%+ T-Share Supply" },
  { emoji: "🦐", name: "Shrimp", percentage: 0.000001, description: "0.000001%+ T-Share Supply" },
  { emoji: "🐚", name: "Plankton", percentage: 0.0000001, description: "< 0.000001% T-Share Supply" }
];

// Manual mapping of addresses to notes
const ADDRESS_NOTES: { [key: string]: string } = {
  "0xaf10cc6c50deff901b535691550d7af208939c5": "God Whale",
  "0x2bde3b9c0129be4689e245ba689b9b0ae4ac666d": "God Whale",
  "0xf1bd8e36a0e48650bdb28056277b05e851ebbae8": "God Whale",
  "0x828fd91d3e3a9ffa6305e78b9ae2cfbc5b5d9f6b": "God Whale",
  "0x1706d193862da7f8c746aae63d514df93dfa5dbf": "God Whale",
  "0xddf744374b46aa980ddce4a5aa216478bf925cd1": "God Whale",
  "0x2fd56159f4c8664a1de5c75e430338cfa58cd5b9": "God Whale",
  "0x807dc01d44407d3efa0171f6de39076a27f20338": "God Whale",
  "0x3930f94249a66535bc0f177bc567152320dd7e6c": "God Whale",
  "0x41b20fb9e38abeaef31fa45a9b760d251180a5b": "God Whale",
  "0xf5d7b1b20288b9052e9cbdbf877a19077edb34d8": "God Whale",
  "0x77d9c03eb2a82c2bdd6a1a0800f1521e2dee0ebb": "The Dream Acc",
  "0x9c128ffa923b251fa40f58906034b2deae6c3146": "The Fire Whale",
  // Adding new OA addresses
  "0x2b591e99afe9f32eaa6214f7b7629768c40eeb39": "OA",
  "0x5280aa3cf5d6246b8a17dfa3d75db26617b73937": "OA",
  "0x075e72a5edf65f0a5f44699c7654c1a76941ddc8": "OA",
  "0xa2e1734682c6a237c070d93019a7e0bf7047406c": "OA",
  "0xb17c443c89b0c18e53b6f25af55297e122b30f5c": "OA",
  "0xbfc9c5878245fb9fe49c688a9c554c8a1fae71fa": "OA",
  "0x20fcb7b4e103ec482645e15715c8a2e7a437fbd6": "OA",
  "0xb628441794cd41484be092b3b5f4b2ff7271eb60": "OA",
  "0x7be74346dc745ea11035881092409088bc76db59": "OA",
  "0x1a73652bfa6c26c632af21f52aacbcbdb396d659": "OA",
  "0xc065816653156518e60556eaa97697047fcf559": "OA",
  "0xb727d70c04520fa68ae580285948731749b4f99": "OA",
  "0x0465266014bbfa25f660a1a78a3401821f5b541e": "OA",
  "0xa99682f32337c9f2f0104cf0a135ff1e22bd7": "OA",
  "0x7c90b72da9344980bf31b20c4b4ab31f026bc54e": "OA",
  "0xe6f9aa98e85c703b37e8d9affaef2f464750e063": "OA",
  "0x63f97ad9fa0d4e8ca5bb2f213343668068025447": "OA",
  "0xc83bfeaed5482132cd1a0f4d02e2df1288a75f9b": "OA",
  "0xb928a97e5ecd27c668cc370939c8f62f93de54fa": "OA",
  "0x33cf90c54b7770188cb5d7ff76f30e73235a61c78": "OA",
  "0xf8086ee44784bb88640eafb107af78c9ac64c35ec": "OA",
  "0x4bb202078aa868890aff0c5147f19b61ddc16fd0": "OA",
  "0xc2301960feea687f169e8082f4578c02663f39c": "OA",
  "0xb8691f71f4d0ab9a6abbdece20fabc8c7521cd43": "OA",
  "0xab203f755460f2905d71351f0436efefa4a0dac": "OA",
  "0x1b7baa734c0029b9429b5f18d621753bb0f6eff2": "OA",
  "0xc3b7f26d6c64024d52699db60efcc3807ef31c1f": "OA",
  "0x13c808af0281c18a89e8438317c66d9645f8662": "OA",
  "0x9320249fd87cd011acf1e3b269180b74cdd3519e": "OA",
  "0x0083d744c0949ad9091f236f33e7fb17e69c03ee": "OA",
  "0x0e8fb2232fc3fb0c10756c065d705297d631f4": "OA",
  "0xfe19b054f780cb7f4c051372ab2bd79947258cc": "OA",
  "0x293bf003350f068698036d63efec322b7f437eef": "OA"
};

// Add currentDay calculation function at the top level
const calculateCurrentHexDay = () => {
  const HEX_LAUNCH_DATE = new Date('2019-12-03T00:00:00Z').getTime();
  const SECONDS_PER_DAY = 86400;
  const currentTimestamp = Date.now();
  return Math.floor((currentTimestamp - HEX_LAUNCH_DATE) / (SECONDS_PER_DAY * 1000));
};

// Update these constants
const INITIAL_DISPLAY_COUNT = 10;
const STAKES_TO_FETCH = 50000; // Increase to match MAX_STAKES_TO_FETCH
const SCROLL_LOAD_INCREMENT = 10;

const HexAddressLeaderboard = () => {
  const [allAddressData, setAllAddressData] = useState<AddressData[]>([]); // Store all addresses
  const [displayCount, setDisplayCount] = useState(100); // Number of addresses to display
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentDay, setCurrentDay] = useState<number>(0);
  const [addressFilter, setAddressFilter] = useState('');
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);
  const [totalProcessed, setTotalProcessed] = useState(0);
  const [lastBatchSize, setLastBatchSize] = useState(1000); // Track the last batch size for progress calculation
  const [totalStakeCount, setTotalStakeCount] = useState(0);
  const [currentLeague, setCurrentLeague] = useState<string>("all");
  const [noteFilter, setNoteFilter] = useState<string>("all");
  const { priceData } = useCryptoPrice('pHEX');
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasLoadedMore, setHasLoadedMore] = useState(false);

  // Check cache on component mount
  useEffect(() => {
    const cachedData = localStorage.getItem(CACHE_KEY);
    if (cachedData) {
      const { data, timestamp, savedDisplayCount, totalProcessedStakes, uniqueAddressCount } = JSON.parse(cachedData);
      const now = Date.now();
      if (now - timestamp < CACHE_DURATION) {
        console.log(`Using cached data from ${new Date(timestamp).toLocaleString()}`);
        console.log(`Found ${uniqueAddressCount} unique addresses in first ${totalProcessedStakes} stakes`);
        setAllAddressData(data);
        setDisplayCount(savedDisplayCount || 200);
        setTotalProcessed(totalProcessedStakes || 0);
        setIsLoading(false);
        setIsLoadingInitial(false);
        return;
      } else {
        console.log('Cache expired, fetching fresh data');
      }
    }
    setCurrentDay(calculateCurrentHexDay());
  }, []);

  // Add new function to get total stake count
  const fetchTotalStakeCount = async () => {
    try {
      const query = `{
        _meta {
          block {
            number
          }
        }
        stakeStartsConnection {
          totalCount
        }
      }`;

      const response = await fetch('https://graph.pulsechain.com/subgraphs/name/Codeakk/Hex', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) {
        throw new Error(`Network response was not ok: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.errors) {
        throw new Error(data.errors[0].message);
      }

      return data.data.stakeStartsConnection.totalCount;
    } catch (error) {
      console.error('Error fetching total stake count:', error);
      return 0;
    }
  };

  // Add duplicate detection logic
  const duplicateAddresses = useMemo(() => {
    const addressCounts = allAddressData.reduce((acc, curr) => {
      acc[curr.address] = (acc[curr.address] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(addressCounts)
      .filter(([_, count]) => count > 1)
      .map(([address]) => address);
  }, [allAddressData]);

  // Modify fetchAllStakes function to use pagination
  const fetchAllStakes = async () => {
    try {
      if (currentDay === 0) {
        console.error('Attempted to fetch addresses with currentDay = 0');
        return;
      }

      setIsLoading(true);
      setTotalProcessed(0);
      const addressMap = new Map<string, any[]>();
      let hasMore = true;
      let skip = 0;
      const batchSize = 1000;
      let uniqueAddressCount = 0;

      // Fetch stakes in batches
      while (hasMore && skip < STAKES_TO_FETCH) {
        console.log(`Fetching stakes batch ${skip} to ${skip + batchSize}...`);
        const query = `{
          stakeStarts(
            first: ${batchSize},
            skip: ${skip},
            orderBy: stakeTShares,
            orderDirection: desc
          ) {
            id
            stakerAddr
            stakedHearts
            stakedDays
            isAutoStake
            stakeTShares
            startDay
            endDay
          }
        }`;

        const response = await fetch('https://graph.pulsechain.com/subgraphs/name/Codeakk/Hex', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query }),
        });

        if (!response.ok) throw new Error(`Network response was not ok: ${response.status}`);
        const data = await response.json();
        if (data.errors) throw new Error(data.errors[0].message);

        const stakes = data.data.stakeStarts;
        
        if (stakes.length === 0) {
          hasMore = false;
          console.log('No more stakes found');
        }

        // Group stakes by address and track unique addresses
        stakes.forEach((stake: any) => {
          const address = stake.stakerAddr.toLowerCase();
          if (!addressMap.has(address)) {
            addressMap.set(address, []);
            uniqueAddressCount++;
          }
          addressMap.get(address)?.push(stake);
        });

        skip += stakes.length;
        setTotalProcessed(skip);
      }

      console.log(`Found ${uniqueAddressCount} unique addresses in ${skip} stakes`);

      // Process addresses into stats
      const addressStats: AddressData[] = Array.from(addressMap.entries()).map(([address, stakes]) => {
        const activeStakesList = stakes.filter(stake => {
          const stakeStartDay = parseInt(stake.startDay);
          const stakeEndDay = parseInt(stake.endDay);
          return currentDay >= stakeStartDay && currentDay < stakeEndDay;
        });

        const totalActiveHex = activeStakesList.reduce((sum, stake) => 
          sum + BigInt(stake.stakedHearts), BigInt(0));
        
        const totalActiveTShares = activeStakesList.reduce((sum, stake) => 
          sum + parseFloat(stake.stakeTShares), 0);
        
        const avgActiveLength = activeStakesList.length > 0
          ? activeStakesList.reduce((sum, stake) => 
              sum + parseInt(stake.stakedDays), 0) / activeStakesList.length
          : 0;
        
        const avgActiveStakeSize = activeStakesList.length > 0
          ? (totalActiveHex / BigInt(activeStakesList.length)).toString()
          : "0";

        return {
          address,
          totalHex: totalActiveHex.toString(),
          totalTShares: totalActiveTShares.toString(),
          stakeCount: stakes.length,
          activeStakes: activeStakesList.length,
          endedStakes: stakes.length - activeStakesList.length,
          avgStakeLength: Math.round(avgActiveLength),
          avgStakeSize: avgActiveStakeSize,
          isAutoStake: activeStakesList.some(stake => stake.isAutoStake),
          note: ADDRESS_NOTES[address.toLowerCase()],
          rank: 0
        };
      });

      // Sort addresses by total T-shares
      const sortedAddresses = addressStats
        .filter(addr => parseFloat(addr.totalTShares) > 0 && addr.activeStakes > 0)
        .sort((a, b) => parseFloat(b.totalTShares) - parseFloat(a.totalTShares))
        .map((addr, index) => ({ ...addr, rank: index + 1 }));

      // Cache results with unique address count
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        data: sortedAddresses,
        timestamp: Date.now(),
        savedDisplayCount: INITIAL_DISPLAY_COUNT,
        totalProcessedStakes: MAX_STAKES_TO_FETCH,
        uniqueAddressCount
      }));

      setAllAddressData(sortedAddresses);
      setDisplayCount(INITIAL_DISPLAY_COUNT);
      setTotalProcessed(MAX_STAKES_TO_FETCH); // Reset to initial fetch amount
      setIsLoading(false);
      setIsLoadingInitial(false);

    } catch (error) {
      console.error('Error fetching stakes:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch data');
      setIsLoading(false);
      setIsLoadingInitial(false);
    }
  };

  // Initial data load
  useEffect(() => {
    if (currentDay === 0) return;
    fetchAllStakes();

    // Refresh every hour
    const interval = setInterval(() => {
      fetchAllStakes();
      console.log('Refreshing all stakes data...');
    }, CACHE_DURATION);

    return () => clearInterval(interval);
  }, [currentDay]);

  // Modify the scroll handler
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.innerHeight + window.scrollY;
      const scrollThreshold = document.documentElement.scrollHeight - 500;

      if (
        scrollPosition >= scrollThreshold &&
        !addressFilter &&
        !isLoading &&
        displayCount < allAddressData.length
      ) {
        // Load 10 more addresses from cache
        const newDisplayCount = Math.min(displayCount + SCROLL_LOAD_INCREMENT, allAddressData.length);
        setDisplayCount(newDisplayCount);
        
        // Update cached display count
        const cachedData = localStorage.getItem(CACHE_KEY);
        if (cachedData) {
          const cached = JSON.parse(cachedData);
          localStorage.setItem(CACHE_KEY, JSON.stringify({
            ...cached,
            savedDisplayCount: newDisplayCount
          }));
        }

        // If we're getting close to the end of our data and haven't loaded more yet
        if (
          !hasLoadedMore && 
          !isLoadingMore && 
          allAddressData.length - newDisplayCount < 1000 &&
          ['🐢', '🦀', '🦐', '🐚'].includes(currentLeague)
        ) {
          console.log('Preemptively fetching more addresses...');
          fetchMoreStakes(MAX_STAKES_TO_FETCH); // Start from the initial fetch amount
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [displayCount, addressFilter, isLoading, allAddressData.length, hasLoadedMore, isLoadingMore, currentLeague]);

  // Get unique notes for the dropdown
  const uniqueNotes = useMemo(() => {
    const notes = Array.from(new Set(Object.values(ADDRESS_NOTES)));
    return ["all", ...notes];
  }, []);

  // Update displayData to include note filtering
  const displayData = useMemo(() => {
    let filtered = [...allAddressData];

    // Apply address filter
    if (addressFilter) {
      filtered = filtered.filter(entry => 
        entry.address.toLowerCase().includes(addressFilter.toLowerCase())
      );
    }

    // Apply note filter
    if (noteFilter !== "all") {
      filtered = filtered.filter(entry => entry.note === noteFilter);
    }

    // Apply league filter
    if (currentLeague !== "all") {
      const selectedLeagueIndex = LEAGUE_DEFINITIONS.findIndex(l => l.emoji === currentLeague);
      if (selectedLeagueIndex !== -1) {
        filtered = filtered.filter(entry => {
          const percentage = (parseFloat(entry.totalTShares) / TOTAL_TSHARE_SUPPLY) * 100;
          const currentLeagueThreshold = LEAGUE_DEFINITIONS[selectedLeagueIndex].percentage;
          const nextLeagueThreshold = selectedLeagueIndex < LEAGUE_DEFINITIONS.length - 1 
            ? LEAGUE_DEFINITIONS[selectedLeagueIndex + 1].percentage 
            : 0;

          return percentage >= currentLeagueThreshold && percentage < (selectedLeagueIndex === 0 ? Infinity : LEAGUE_DEFINITIONS[selectedLeagueIndex - 1].percentage);
        });
      }
    }

    return filtered.slice(0, displayCount);
  }, [allAddressData, addressFilter, displayCount, currentLeague, noteFilter]);

  // Add function to fetch more stakes
  const fetchMoreStakes = async (currentSkip: number) => {
    try {
      setIsLoadingMore(true);
      let hasMore = true;
      let skip = currentSkip;
      const batchSize = 1000;
      let addressMap = new Map<string, any[]>();
      let processedBatch = 0;
      let additionalStakesProcessed = 0;

      // Create a map of existing addresses with their current data
      const existingAddressMap = new Map(
        allAddressData.map(addr => [
          addr.address.toLowerCase(),
          {
            totalHex: BigInt(addr.totalHex),
            totalTShares: parseFloat(addr.totalTShares),
            stakeCount: addr.stakeCount,
            activeStakes: addr.activeStakes,
            endedStakes: addr.endedStakes,
            stakes: [] // Will be filled with new stakes
          }
        ])
      );

      const initialAddressCount = existingAddressMap.size;
      console.log(`Starting to fetch more stakes from skip=${skip}, existing addresses: ${initialAddressCount}`);

      while (hasMore) {
        console.log(`Fetching additional stakes batch ${skip} to ${skip + batchSize}...`);
        const query = `{
          stakeStarts(
            first: ${batchSize},
            skip: ${skip},
            orderBy: stakeTShares,
            orderDirection: desc
          ) {
            id
            stakerAddr
            stakedHearts
            stakedDays
            isAutoStake
            stakeTShares
            startDay
            endDay
          }
        }`;

        const response = await fetch('https://graph.pulsechain.com/subgraphs/name/Codeakk/Hex', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query }),
        });

        if (!response.ok) throw new Error(`Network response was not ok: ${response.status}`);
        const data = await response.json();
        if (data.errors) throw new Error(data.errors[0].message);

        const stakes = data.data.stakeStarts;
        
        if (stakes.length === 0) {
          hasMore = false;
          console.log('No more additional stakes found');
          break;
        }

        let newAddressesInBatch = 0;
        stakes.forEach((stake: any) => {
          const address = stake.stakerAddr.toLowerCase();
          
          // If this is a new address
          if (!existingAddressMap.has(address)) {
            existingAddressMap.set(address, {
              totalHex: BigInt(0),
              totalTShares: 0,
              stakeCount: 0,
              activeStakes: 0,
              endedStakes: 0,
              stakes: []
            });
            newAddressesInBatch++;
          }
          
          // Add stake to the address's stakes array
          existingAddressMap.get(address)?.stakes.push(stake);
        });

        console.log(`Found ${newAddressesInBatch} new addresses in this batch`);

        skip += stakes.length;
        processedBatch += stakes.length;
        additionalStakesProcessed += stakes.length;
        setTotalProcessed(MAX_STAKES_TO_FETCH + additionalStakesProcessed);

        // Process and update addresses every 50k stakes or when no more stakes
        if (processedBatch >= 50000 || !hasMore) {
          console.log(`Processing batch of ${processedBatch} stakes for ${existingAddressMap.size} addresses...`);
          
          // Process addresses and their stakes
          const addressStats: AddressData[] = Array.from(existingAddressMap.entries())
            .map(([address, data]) => {
              // Process only new stakes for this address
              const activeStakesList = data.stakes.filter(stake => {
                const stakeStartDay = parseInt(stake.startDay);
                const stakeEndDay = parseInt(stake.endDay);
                return currentDay >= stakeStartDay && currentDay < stakeEndDay;
              });

              // Calculate totals from new stakes
              const totalActiveHex = activeStakesList.reduce((sum, stake) => 
                sum + BigInt(stake.stakedHearts), BigInt(0));
              
              const totalActiveTShares = activeStakesList.reduce((sum, stake) => 
                sum + parseFloat(stake.stakeTShares), 0);

              const avgActiveLength = activeStakesList.length > 0
                ? activeStakesList.reduce((sum, stake) => 
                    sum + parseInt(stake.stakedDays), 0) / activeStakesList.length
                : 0;

              // Combine with existing totals if this is an existing address
              const existingData = allAddressData.find(a => a.address.toLowerCase() === address);
              const finalTotalHex = existingData 
                ? (BigInt(existingData.totalHex) + totalActiveHex).toString()
                : totalActiveHex.toString();
              
              const finalTotalTShares = existingData
                ? (parseFloat(existingData.totalTShares) + totalActiveTShares).toString()
                : totalActiveTShares.toString();

              const finalStakeCount = (existingData?.stakeCount || 0) + data.stakes.length;
              const finalActiveStakes = (existingData?.activeStakes || 0) + activeStakesList.length;

              const avgStakeSize = finalActiveStakes > 0
                ? (BigInt(finalTotalHex) / BigInt(finalActiveStakes)).toString()
                : "0";

              return {
                address,
                totalHex: finalTotalHex,
                totalTShares: finalTotalTShares,
                stakeCount: finalStakeCount,
                activeStakes: finalActiveStakes,
                endedStakes: finalStakeCount - finalActiveStakes,
                avgStakeLength: Math.round(avgActiveLength),
                avgStakeSize,
                isAutoStake: activeStakesList.some(stake => stake.isAutoStake),
                note: ADDRESS_NOTES[address.toLowerCase()],
                rank: 0
              };
            });

          // Filter and sort all addresses
          const mergedAddresses = addressStats
            .filter(addr => {
              const hasActiveStakes = addr.activeStakes > 0;
              const hasTShares = parseFloat(addr.totalTShares) > 0;
              return hasActiveStakes && hasTShares;
            })
            .sort((a, b) => parseFloat(b.totalTShares) - parseFloat(a.totalTShares))
            .map((addr, index) => ({ ...addr, rank: index + 1 }));

          console.log(`Final merged address count: ${mergedAddresses.length} (${mergedAddresses.length - initialAddressCount} new)`);

          setAllAddressData(mergedAddresses);
          
          // Update cache with new data
          localStorage.setItem(CACHE_KEY, JSON.stringify({
            data: mergedAddresses,
            timestamp: Date.now(),
            savedDisplayCount: displayCount,
            totalProcessedStakes: MAX_STAKES_TO_FETCH + additionalStakesProcessed
          }));

          // Reset for next batch
          existingAddressMap.forEach(data => {
            data.stakes = [];
          });
          processedBatch = 0;
          
          // Set hasLoadedMore after first batch
          if (!hasLoadedMore) {
            setHasLoadedMore(true);
            setDisplayCount(100);
          }

          // Log progress
          console.log(`Processed ${additionalStakesProcessed} additional stakes, found ${mergedAddresses.length - initialAddressCount} new addresses`);
        }
      }

    } catch (error) {
      console.error('Error fetching additional stakes:', error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Modify the league click handler
  const handleLeagueClick = (emoji: string) => {
    setCurrentLeague(emoji);
    
    // Only fetch more stakes when clicking turtle or lower leagues for the first time
    if (!hasLoadedMore && ['🐢', '🦀', '🦐', '🐚'].includes(emoji)) {
      console.log('Fetching additional stakes for smaller league...');
      fetchMoreStakes(MAX_STAKES_TO_FETCH); // Start from the initial fetch amount
    }
  };

  if (error) {
    return (
      <div className="w-full h-full p-5 bg-black border border-white/20 rounded-xl text-white mt-8">
        <div className="py-8">
          <h2 className="text-2xl font-semibold leading-tight mb-4">HEX League Leaderboard</h2>
          <div className="text-red-500">Error: {error}</div>
        </div>
      </div>
    );
  }

  if (isLoadingInitial && displayData.length === 0) {
    return (
      <div className="w-full h-full p-5 bg-black border border-white/20 rounded-xl text-white mt-8">
        <div className="py-8">
          <h2 className="text-2xl font-semibold leading-tight mb-4">HEX Stake League Leaderboard</h2>
          <div className="flex flex-col items-center justify-center gap-4">
            <div className="text-white">Loading address data...</div>
            <div className="w-full max-w-md h-2 bg-gray-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-green-500 transition-all duration-700 ease-in-out"
                style={{ width: `${(totalProcessed / MAX_STAKES_TO_FETCH) * 100}%` }}
              />
            </div>
            <div className="text-sm text-white">
              {`Processed ${totalProcessed.toLocaleString()} of ${MAX_STAKES_TO_FETCH.toLocaleString()} stakes (${Math.round((totalProcessed / MAX_STAKES_TO_FETCH) * 100)}%)`}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const formatHex = (amount: string) => {
    const num = Math.floor(parseFloat(amount) / 100000000);
    if (num === 0) return "0";
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  const formatAddress = (address: string) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  const formatNumber = (value: string) => {
    if (!value) return '0.00';
    const num = parseFloat(value);
    if (num >= 1000000000000) return (num / 1000000000000).toFixed(2) + 'T';
    if (num >= 1000000000) return (num / 1000000000).toFixed(2) + 'B';
    if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(2) + 'K';
    return num.toFixed(2);
  };

  // Update the LeaguePagination component
  const LeaguePagination = () => (
    <div className="w-full overflow-x-auto">
      <div className="inline-block min-w-full">
        <Pagination>
          <PaginationContent className="flex justify-center gap-1">
            <PaginationItem>
              <PaginationLink
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setCurrentLeague("all");
                }}
                isActive={currentLeague === "all"}
                className={`px-3 py-2 text-sm ${currentLeague === "all" ? "bg-gray-800 text-white" : "hover:bg-gray-800"}`}
              >
                All
              </PaginationLink>
            </PaginationItem>

            {LEAGUE_DEFINITIONS.map((league) => (
              <PaginationItem key={league.emoji}>
                <PaginationLink
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    handleLeagueClick(league.emoji);
                  }}
                  isActive={currentLeague === league.emoji}
                  className="text-xl px-3 py-2 relative group hover:bg-gray-800"
                >
                  <span className="flex items-center">
                    {league.emoji}
                  </span>
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 whitespace-nowrap transition-opacity">
                    {league.description}
                  </div>
                </PaginationLink>
              </PaginationItem>
            ))}
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  );

  const formatPercentage = (tshares: string) => {
    const percentage = (parseFloat(tshares) / TOTAL_TSHARE_SUPPLY) * 100;
    // Use more decimal places for small percentages
    if (percentage < 0.0001) {
      return percentage.toFixed(6) + '%';
    } else if (percentage < 0.01) {
      return percentage.toFixed(4) + '%';
    } else {
      return percentage.toFixed(2) + '%';
    }
  };

  return (
    <div className="w-full h-full p-5 bg-black border border-white/20 rounded-xl text-white mt-8">
      <div className="py-8">
        <div className="flex justify-between items-center mb-4 px-12">
          <h2 className="text-2xl font-semibold leading-tight">HEX League Ranking Table</h2>
          <div className="flex flex-col items-end text-sm text-white/60">
            <div className="flex items-center gap-2">
              {isLoading ? (
                <svg className="animate-spin h-4 w-4 text-white/60" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : !isLoadingMore && !isLoading ? (
                <span className="text-green-500">✅</span>
              ) : null}
              Scanned {totalProcessed.toLocaleString()} stakes
            </div>
            <div className="flex items-center gap-2">
              {isLoadingMore ? (
                <svg className="animate-spin h-4 w-4 text-white/60" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : hasLoadedMore && !isLoadingMore ? (
                <span className="text-green-500">✅</span>
              ) : null}
            {addressFilter 
              ? `Found ${displayData.length} matching addresses`
              : `Showing ${displayData.length} of ${allAddressData.length} addresses`
            }
            </div>
          </div>
        </div>

        {/* Filters Section */}
        <div className="flex flex-col gap-4 mb-8 px-12">
          <div className="flex flex-col lg:flex-row items-center gap-4 mb-4">
            <Select value={noteFilter} onValueChange={setNoteFilter}>
              <SelectTrigger className="w-full max-w-md text-white">
                <SelectValue placeholder="Filter by Type (OA, God Whale, etc)" />
              </SelectTrigger>
              <SelectContent className="bg-black border text-white">
                <SelectGroup>
                  {uniqueNotes.map((note) => (
                    <SelectItem 
                      key={note} 
                      value={note}
                      className="hover:bg-gray-800 focus:bg-gray-800 cursor-pointer text-white"
                    >
                      {note === "all" ? "Filter by Type (OA, God Whale, etc)" : note}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>

            <Input
              type="text"
              placeholder="Filter by address..."
              value={addressFilter}
              onChange={(e) => setAddressFilter(e.target.value)}
              className="w-full max-w-md text-white placeholder:text-white/60"
            />
          </div>

          {/* Add League Pagination */}
          <LeaguePagination />
        </div>

        <div className="overflow-x-auto">
          <div className="inline-block min-w-full rounded-lg overflow-hidden px-10">
            <table className="min-w-full leading-normal">
              <thead>
                <tr>
                  <th className="px-5 py-3 border-b border-white/20 text-center text-xs font-semibold uppercase tracking-wider">
                    RANK
                  </th>
                  <th className="px-5 py-3 border-b border-white/20 text-center text-xs font-semibold uppercase tracking-wider">
                    LEAGUE
                  </th>
                  <th className="px-5 py-3 border-b border-white/20 text-center text-xs font-semibold uppercase tracking-wider">
                    SUPPLY
                  </th>
                  <th className="px-5 py-3 border-b border-white/20 text-center text-xs font-semibold uppercase tracking-wider">
                    ADDRESS
                  </th>
                  <th className="px-5 py-3 border-b border-white/20 text-center text-xs font-semibold uppercase tracking-wider">
                    PRINCIPLE
                  </th>
                  <th className="px-5 py-3 border-b border-white/20 text-center text-xs font-semibold uppercase tracking-wider">
                    T-SHARES
                  </th>
                  <th className="px-5 py-3 border-b border-white/20 text-center text-xs font-semibold uppercase tracking-wider">
                    ACTIVE STAKES
                  </th>
                  <th className="px-5 py-3 border-b border-white/20 text-center text-xs font-semibold uppercase tracking-wider">
                    AVG LENGTH
                  </th>
                  <th className="px-5 py-3 border-b border-white/20 text-center text-xs font-semibold uppercase tracking-wider">
                    AVG STAKE SIZE
                  </th>
                  <th className="px-5 py-3 border-b border-white/20 text-center text-xs font-semibold uppercase tracking-wider">
                    OWNER
                  </th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {displayData.map((address) => (
                    <motion.tr
                      key={address.address}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="border-b border-white/20"
                    >
                      <td className="px-5 py-5 text-sm text-center">
                        #{address.rank}
                      </td>
                      <td className="px-5 py-5 text-center">
                        <span className="text-2xl">
                        {(() => {
                          const percentage = (parseFloat(address.totalTShares) / TOTAL_TSHARE_SUPPLY) * 100;
                          for (let i = 0; i < LEAGUE_DEFINITIONS.length; i++) {
                            if (percentage >= LEAGUE_DEFINITIONS[i].percentage) {
                              return LEAGUE_DEFINITIONS[i].emoji;
                            }
                          }
                            return "🐚";
                        })()}
                        </span>
                      </td>
                      <td className="px-5 py-5 text-sm text-center">
                        {formatPercentage(address.totalTShares)}
                      </td>
                      <td className="px-5 py-5 text-sm text-center">
                        <div className="flex items-center justify-center">
                          <a 
                            href={`https://hexscout.com/${address.address}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline"
                          >
                            {formatAddress(address.address)}
                          </a>
                        </div>
                      </td>
                      <td className="px-5 pt-4 text-sm text-center">
                        <div className="text-white">
                          {formatHex(address.totalHex)}
                        </div>
                        <div className="text-gray-500 text-xs">
                          ${(parseInt(formatHex(address.totalHex).replace(/,/g, '')) * (priceData?.price || 0)).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </div>
                      </td>
                      <td className="px-5 py-5 text-sm text-center">
                        <p className="whitespace-no-wrap">
                          {formatNumber(address.totalTShares)}
                        </p>
                      </td>
                      <td className="px-5 py-5 text-sm text-center">
                        <p className="whitespace-no-wrap">
                          {address.activeStakes}/{address.stakeCount}
                        </p>
                      </td>
                      <td className="px-5 py-5 text-sm text-center">
                        <p className="whitespace-no-wrap">
                          {address.avgStakeLength} D
                        </p>
                      </td>
                      <td className="px-5 pt-5 text-sm text-center">
                        <div className="text-white">
                          {formatHex(address.avgStakeSize)}
                        </div>
                        <div className="text-gray-500 text-xs">
                          ${(parseInt(formatHex(address.avgStakeSize).replace(/,/g, '')) * (priceData?.price || 0)).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </div>
                      </td>
                      <td className="px-5 py-5 text-sm text-center">
                        <p className={`
                          inline-block px-2 py-1 rounded-md font-medium text-xs
                          ${!address.note ? '' : 
                            address.note === 'OA' ? 'border border-blue-500/50 bg-blue-500/10 text-blue-400' :
                            address.note === 'God Whale' ? 'border border-purple-500/50 bg-purple-500/10 text-purple-400' :
                            address.note === 'The Dream Acc' ? 'border border-green-500/50 bg-green-500/10 text-green-400' :
                            'border border-red-500/50 bg-red-500/10 text-red-400'
                          }
                        `}>
                          {address.note || ''}
                        </p>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>

            {/* Show loading indicator below the table while fetching more stakes */}
            {isLoadingMore && ['🐢', '🦀', '🦐', '🐚'].includes(currentLeague) && (
              <div className="mt-4 text-center py-4">
                <div className="text-white/60">Loading more addresses for {
                  LEAGUE_DEFINITIONS.find(l => l.emoji === currentLeague)?.name
                } league...</div>
                <div className="w-full max-w-md h-2 bg-gray-700 rounded-full overflow-hidden mx-auto mt-2">
                  <div 
                    className="h-full bg-green-500 transition-all duration-500"
                    style={{ width: `${((totalProcessed % 50000) / 50000) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Loading indicator for infinite scroll */}
        {!isLoadingInitial && 
         !addressFilter && 
         displayCount < allAddressData.length && 
         !isLoadingMore && 
         (!['🐢', '🦀', '🦐', '🐚'].includes(currentLeague) || 
          (hasLoadedMore && allAddressData.length > displayCount)) && (
          <div className="text-center py-4">
            <div className="text-white/60">Scroll to load more addresses...</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HexAddressLeaderboard; 