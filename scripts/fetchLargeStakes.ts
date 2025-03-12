import fs from 'fs';

const SUBGRAPH_URLS = {
  ETH: 'https://graph.ethereum.pulsechain.com/subgraphs/name/Codeakk/Hex',
  PLS: 'https://graph.pulsechain.com/subgraphs/name/Codeakk/Hex'
};

const HEX_LAUNCH_DATE = new Date('2019-12-03T00:00:00Z');
const MIN_STAKE_HEARTS = '1000000000000000'; // 10B HEX (10B * 1e8)
const START_DATE = new Date('2025-02-01T00:00:00Z');

// Convert dates to HEX days
const getHexDay = (date: Date) => {
  return Math.floor((date.getTime() - HEX_LAUNCH_DATE.getTime()) / (86400 * 1000));
};

const START_DAY = getHexDay(START_DATE);
const CURRENT_DAY = getHexDay(new Date());

async function fetchLargeStakes() {
  const allStakes: any[] = [];

  for (const [chain, url] of Object.entries(SUBGRAPH_URLS)) {
    let hasMore = true;
    let skip = 0;
    const first = 1000;

    while (hasMore) {
      const query = `{
        stakeStarts(
          first: ${first},
          skip: ${skip},
          where: { 
            stakedHearts_gte: "${MIN_STAKE_HEARTS}",
            startDay_gte: ${START_DAY},
            startDay_lte: ${CURRENT_DAY}
          }
          orderBy: stakedHearts
          orderDirection: desc
        ) {
          id
          stakerAddr
          stakedHearts
          stakeTShares
          stakedDays
          startDay
          endDay
          timestamp
        }
      }`;

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query }),
        });

        const result = await response.json();
        const stakes = result.data?.stakeStarts || [];
        
        if (stakes.length > 0) {
          stakes.forEach((stake: any) => {
            allStakes.push({
              ...stake,
              chain,
              stakedHex: (Number(stake.stakedHearts) / 1e8).toString(),
              startDate: new Date(HEX_LAUNCH_DATE.getTime() + (Number(stake.startDay) * 86400 * 1000)).toISOString(),
              endDate: new Date(HEX_LAUNCH_DATE.getTime() + ((Number(stake.startDay) + Number(stake.stakedDays)) * 86400 * 1000)).toISOString(),
            });
          });
          skip += first;
        } else {
          hasMore = false;
        }
      } catch (error) {
        console.error(`Error fetching from ${chain}:`, error);
        hasMore = false;
      }
    }
  }

  // Sort by staked amount
  allStakes.sort((a, b) => Number(b.stakedHex) - Number(a.stakedHex));

  // Create CSV
  const csvHeader = 'Chain,Address,Staked HEX,T-Shares,Days,Start Date,End Date\n';
  const csvRows = allStakes.map(stake => {
    return `${stake.chain},${stake.stakerAddr},${stake.stakedHex},${stake.stakeTShares},${stake.stakedDays},${stake.startDate},${stake.endDate}`;
  });

  const csvContent = csvHeader + csvRows.join('\n');
  fs.writeFileSync('large_stakes.csv', csvContent);

  console.log(`Found ${allStakes.length} stakes of 10B+ HEX`);
  console.log('Data exported to large_stakes.csv');
}

fetchLargeStakes(); 