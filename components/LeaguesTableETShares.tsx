import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { TOKEN_CONSTANTS } from "@/constants/crypto";
import { useCryptoPrice } from "@/hooks/crypto/useCryptoPrice";
import { useEthereumHEXStats } from "@/hooks/useHEXStats";
import { Skeleton } from "@/components/ui/skeleton2";

interface LeagueRequirement {
  league: string;
  share: string;
  targetTShares: string;
  eMAXI: {
    tokens: string;
    value: string;
  };
  eDECI: {
    tokens: string;
    value: string;
  };
  eLUCKY: {
    tokens: string;
    value: string;
  };
  eTRIO: {
    tokens: string;
    value: string;
  };
  eBASE: {
    tokens: string;
    value: string;
  };
}

const calculateTokensForTShares = (targetTShares: number, tokenTShares: number, tokenSupply: number): string => {
  const tokensNeeded = (targetTShares / tokenTShares) * tokenSupply;
  if (tokensNeeded > tokenSupply) return "n/a";
  return tokensNeeded.toLocaleString('en-US', { maximumFractionDigits: 0 });
};

const calculateValue = (tokens: string, price: number): string => {
  if (tokens === "n/a") return "n/a";
  const value = parseFloat(tokens.replace(/,/g, '')) * price;
  return `$${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
};

const LEAGUE_PERCENTAGES = [
  { emoji: "💯", percentage: 100 },
  { emoji: "🔱", percentage: 10 },
  { emoji: "🐋", percentage: 1 },
  { emoji: "🦈", percentage: 0.1 },
  { emoji: "🐬", percentage: 0.01 },
  { emoji: "🦑", percentage: 0.001 },
  { emoji: "🐢", percentage: 0.0001 },
  { emoji: "🦀", percentage: 0.00001 },
  { emoji: "🦐", percentage: 0.000001 },
  { emoji: "🐚", percentage: 0.0000001 }
];

export function LeaguesTableETShares() {
  const { stats, isLoading } = useEthereumHEXStats();
  const { priceData: maxiPrice } = useCryptoPrice("eMAXI");
  const { priceData: deciPrice } = useCryptoPrice("eDECI");
  const { priceData: luckyPrice } = useCryptoPrice("eLUCKY");
  const { priceData: trioPrice } = useCryptoPrice("eTRIO");
  const { priceData: basePrice } = useCryptoPrice("eBASE");

  if (isLoading) {
    return (
      <div className="w-full py-4 px-1 xs:px-8">
        <Skeleton variant="chart" />
      </div>
    );
  }

  const totalTShares = stats?.totalTshares || 0;

  const leagueData = LEAGUE_PERCENTAGES.map(({ emoji, percentage }) => {
    const targetTShares = totalTShares * (percentage / 100);
    
    return {
      league: emoji,
      share: percentage >= 1 ? `${percentage}%` : `${percentage.toFixed(Math.abs(Math.log10(percentage)))}%`,
      targetTShares: targetTShares.toLocaleString('en-US', { maximumFractionDigits: 0 }),
      eMAXI: {
        tokens: calculateTokensForTShares(targetTShares, TOKEN_CONSTANTS.eMAXI.TSHARES, TOKEN_CONSTANTS.eMAXI.TOKEN_SUPPLY),
        value: calculateValue(
          calculateTokensForTShares(targetTShares, TOKEN_CONSTANTS.eMAXI.TSHARES, TOKEN_CONSTANTS.eMAXI.TOKEN_SUPPLY),
          maxiPrice?.price || 0
        )
      },
      eDECI: {
        tokens: calculateTokensForTShares(targetTShares, TOKEN_CONSTANTS.eDECI.TSHARES, TOKEN_CONSTANTS.eDECI.TOKEN_SUPPLY),
        value: calculateValue(
          calculateTokensForTShares(targetTShares, TOKEN_CONSTANTS.eDECI.TSHARES, TOKEN_CONSTANTS.eDECI.TOKEN_SUPPLY),
          deciPrice?.price || 0
        )
      },
      eLUCKY: {
        tokens: calculateTokensForTShares(targetTShares, TOKEN_CONSTANTS.eLUCKY.TSHARES, TOKEN_CONSTANTS.eLUCKY.TOKEN_SUPPLY),
        value: calculateValue(
          calculateTokensForTShares(targetTShares, TOKEN_CONSTANTS.eLUCKY.TSHARES, TOKEN_CONSTANTS.eLUCKY.TOKEN_SUPPLY),
          luckyPrice?.price || 0
        )
      },
      eTRIO: {
        tokens: calculateTokensForTShares(targetTShares, TOKEN_CONSTANTS.eTRIO.TSHARES, TOKEN_CONSTANTS.eTRIO.TOKEN_SUPPLY),
        value: calculateValue(
          calculateTokensForTShares(targetTShares, TOKEN_CONSTANTS.eTRIO.TSHARES, TOKEN_CONSTANTS.eTRIO.TOKEN_SUPPLY),
          trioPrice?.price || 0
        )
      },
      eBASE: {
        tokens: calculateTokensForTShares(targetTShares, TOKEN_CONSTANTS.eBASE.TSHARES, TOKEN_CONSTANTS.eBASE.TOKEN_SUPPLY),
        value: calculateValue(
          calculateTokensForTShares(targetTShares, TOKEN_CONSTANTS.eBASE.TSHARES, TOKEN_CONSTANTS.eBASE.TOKEN_SUPPLY),
          basePrice?.price || 0
        )
      }
    };
  });

  return (
    <div className="w-full py-4 px-1 xs:px-8">
      <div className="rounded-lg overflow-x-auto border border-[#333]">
        <div className="min-w-[800px]">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-[#333] hover:bg-transparent">
                <TableHead className="text-gray-400 font-800 text-center">League</TableHead>
                <TableHead className="text-gray-400 font-800 text-center">Share</TableHead>
                <TableHead className="text-gray-400 font-800 text-center">T-Shares</TableHead>
                <TableHead className="text-gray-400 font-800 text-center">eMAXI Ⓜ️</TableHead>
                <TableHead className="text-gray-400 font-800 text-center">eDECI 🛡️</TableHead>
                <TableHead className="text-gray-400 font-800 text-center">eLUCKY 🍀</TableHead>
                <TableHead className="text-gray-400 font-800 text-center">eTRIO 🎲</TableHead>
                <TableHead className="text-gray-400 font-800 text-center">eBASE 🟠</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leagueData.map((row, index) => (
                <TableRow 
                  key={index} 
                  className="border-b border-[#333] hover:bg-[#1a1a1a]"
                >
                  <TableCell className="text-white text-2xl text-center">{row.league}</TableCell>
                  <TableCell className="text-white text-center">{row.share}</TableCell>
                  <TableCell className="text-white text-center">{row.targetTShares}</TableCell>
                  <TableCell className="text-center">
                    <div className="text-white">{row.eMAXI.tokens}</div>
                    <div className="text-gray-500">{row.eMAXI.value}</div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="text-white">{row.eDECI.tokens}</div>
                    <div className="text-gray-500">{row.eDECI.value}</div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="text-white">{row.eLUCKY.tokens}</div>
                    <div className="text-gray-500">{row.eLUCKY.value}</div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="text-white">{row.eTRIO.tokens}</div>
                    <div className="text-gray-500">{row.eTRIO.value}</div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="text-white">{row.eBASE.tokens}</div>
                    <div className="text-gray-500">{row.eBASE.value}</div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

export default LeaguesTableETShares; 