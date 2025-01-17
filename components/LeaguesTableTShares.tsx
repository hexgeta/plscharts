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
import { usePulseHEXStats } from "@/hooks/useHEXStats";
import { Skeleton } from "@/components/ui/skeleton2";

interface LeagueRequirement {
  league: string;
  share: string;
  targetTShares: string;
  pMAXI: {
    tokens: string;
    value: string;
  };
  pDECI: {
    tokens: string;
    value: string;
  };
  pLUCKY: {
    tokens: string;
    value: string;
  };
  pTRIO: {
    tokens: string;
    value: string;
  };
  pBASE: {
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

export function LeaguesTableTShares() {
  const { stats, isLoading } = usePulseHEXStats();
  const { priceData: maxiPrice } = useCryptoPrice("pMAXI");
  const { priceData: deciPrice } = useCryptoPrice("pDECI");
  const { priceData: luckyPrice } = useCryptoPrice("pLUCKY");
  const { priceData: trioPrice } = useCryptoPrice("pTRIO");
  const { priceData: basePrice } = useCryptoPrice("pBASE");

  if (isLoading) {
    return (
      <div className="w-full py-4 px-1 xs:px-8">
        <Skeleton variant="table" />
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
      pMAXI: {
        tokens: calculateTokensForTShares(targetTShares, TOKEN_CONSTANTS.pMAXI.TSHARES, TOKEN_CONSTANTS.pMAXI.TOKEN_SUPPLY),
        value: calculateValue(
          calculateTokensForTShares(targetTShares, TOKEN_CONSTANTS.pMAXI.TSHARES, TOKEN_CONSTANTS.pMAXI.TOKEN_SUPPLY),
          maxiPrice?.price || 0
        )
      },
      pDECI: {
        tokens: calculateTokensForTShares(targetTShares, TOKEN_CONSTANTS.pDECI.TSHARES, TOKEN_CONSTANTS.pDECI.TOKEN_SUPPLY),
        value: calculateValue(
          calculateTokensForTShares(targetTShares, TOKEN_CONSTANTS.pDECI.TSHARES, TOKEN_CONSTANTS.pDECI.TOKEN_SUPPLY),
          deciPrice?.price || 0
        )
      },
      pLUCKY: {
        tokens: calculateTokensForTShares(targetTShares, TOKEN_CONSTANTS.pLUCKY.TSHARES, TOKEN_CONSTANTS.pLUCKY.TOKEN_SUPPLY),
        value: calculateValue(
          calculateTokensForTShares(targetTShares, TOKEN_CONSTANTS.pLUCKY.TSHARES, TOKEN_CONSTANTS.pLUCKY.TOKEN_SUPPLY),
          luckyPrice?.price || 0
        )
      },
      pTRIO: {
        tokens: calculateTokensForTShares(targetTShares, TOKEN_CONSTANTS.pTRIO.TSHARES, TOKEN_CONSTANTS.pTRIO.TOKEN_SUPPLY),
        value: calculateValue(
          calculateTokensForTShares(targetTShares, TOKEN_CONSTANTS.pTRIO.TSHARES, TOKEN_CONSTANTS.pTRIO.TOKEN_SUPPLY),
          trioPrice?.price || 0
        )
      },
      pBASE: {
        tokens: calculateTokensForTShares(targetTShares, TOKEN_CONSTANTS.pBASE.TSHARES, TOKEN_CONSTANTS.pBASE.TOKEN_SUPPLY),
        value: calculateValue(
          calculateTokensForTShares(targetTShares, TOKEN_CONSTANTS.pBASE.TSHARES, TOKEN_CONSTANTS.pBASE.TOKEN_SUPPLY),
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
                <TableHead className="text-gray-400 font-800 text-center">pMAXI Ⓜ️</TableHead>
                <TableHead className="text-gray-400 font-800 text-center">pDECI 🛡️</TableHead>
                <TableHead className="text-gray-400 font-800 text-center">pLUCKY 🍀</TableHead>
                <TableHead className="text-gray-400 font-800 text-center">pTRIO 🎲</TableHead>
                <TableHead className="text-gray-400 font-800 text-center">pBASE 🟠</TableHead>
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
                    <div className="text-white">{row.pMAXI.tokens}</div>
                    <div className="text-gray-500">{row.pMAXI.value}</div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="text-white">{row.pDECI.tokens}</div>
                    <div className="text-gray-500">{row.pDECI.value}</div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="text-white">{row.pLUCKY.tokens}</div>
                    <div className="text-gray-500">{row.pLUCKY.value}</div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="text-white">{row.pTRIO.tokens}</div>
                    <div className="text-gray-500">{row.pTRIO.value}</div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="text-white">{row.pBASE.tokens}</div>
                    <div className="text-gray-500">{row.pBASE.value}</div>
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

export default LeaguesTableTShares; 