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

interface LeagueRequirement {
  league: string;
  share: string;
  pMAXI: {
    tokens: string;
    value: string;
    holders: string;
  };
  pDECI: {
    tokens: string;
    value: string;
    holders: string;
  };
  pLUCKY: {
    tokens: string;
    value: string;
    holders: string;
  };
  pTRIO: {
    tokens: string;
    value: string;
    holders: string;
  };
  pBASE: {
    tokens: string;
    value: string;
    holders: string;
  };
}

const calculateTokenAmount = (totalSupply: number | undefined, percentage: number): string => {
  if (!totalSupply) return "0";
  const amount = totalSupply * (percentage / 100);
  if (amount < 1) return "0";
  return amount.toLocaleString('en-US', { maximumFractionDigits: 0 });
};

const calculateValue = (tokens: string, price: number): string => {
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

export function LeaguesTable() {
  const { priceData: maxiPrice } = useCryptoPrice("pMAXI");
  const { priceData: deciPrice } = useCryptoPrice("pDECI");
  const { priceData: luckyPrice } = useCryptoPrice("pLUCKY");
  const { priceData: trioPrice } = useCryptoPrice("pTRIO");
  const { priceData: basePrice } = useCryptoPrice("pBASE");

  const leagueData = LEAGUE_PERCENTAGES.map(({ emoji, percentage }) => ({
    league: emoji,
    share: percentage >= 1 ? `${percentage}%` : `${percentage.toFixed(Math.abs(Math.log10(percentage)))}%`,
    pMAXI: {
      tokens: calculateTokenAmount(TOKEN_CONSTANTS.pMAXI.TOKEN_SUPPLY, percentage),
      value: calculateValue(calculateTokenAmount(TOKEN_CONSTANTS.pMAXI.TOKEN_SUPPLY, percentage), maxiPrice?.price || 0),
      holders: "n/a"
    },
    pDECI: {
      tokens: calculateTokenAmount(TOKEN_CONSTANTS.pDECI.TOKEN_SUPPLY, percentage),
      value: calculateValue(calculateTokenAmount(TOKEN_CONSTANTS.pDECI.TOKEN_SUPPLY, percentage), deciPrice?.price || 0),
      holders: "n/a"
    },
    pLUCKY: {
      tokens: calculateTokenAmount(TOKEN_CONSTANTS.pLUCKY.TOKEN_SUPPLY, percentage),
      value: calculateValue(calculateTokenAmount(TOKEN_CONSTANTS.pLUCKY.TOKEN_SUPPLY, percentage), luckyPrice?.price || 0),
      holders: "n/a"
    },
    pTRIO: {
      tokens: calculateTokenAmount(TOKEN_CONSTANTS.pTRIO.TOKEN_SUPPLY, percentage),
      value: calculateValue(calculateTokenAmount(TOKEN_CONSTANTS.pTRIO.TOKEN_SUPPLY, percentage), trioPrice?.price || 0),
      holders: "n/a"
    },
    pBASE: {
      tokens: calculateTokenAmount(TOKEN_CONSTANTS.pBASE3.TOKEN_SUPPLY, percentage),
      value: calculateValue(calculateTokenAmount(TOKEN_CONSTANTS.pBASE3.TOKEN_SUPPLY, percentage), basePrice?.price || 0),
      holders: "n/a"
    }
  }));

  return (
    <div className="w-full max-w-6xl mx-auto p-6 rounded-3xl bg-[#0a0b1e]/80 backdrop-blur-sm border-2 border-white/5">
      <h2 className="text-4xl font-bold mb-8 text-white text-center">League Requirements</h2>
      
      <div className="relative overflow-x-auto">
        <table className="w-full bg-black">
          <thead>
            <tr className="text-gray-400 text-sm border-b border-white/5">
              <TableHead className="pb-4 font-normal text-center">League</TableHead>
              <TableHead className="pb-4 font-normal text-center">Share</TableHead>
              <TableHead className="pb-4 font-normal text-center">pMAXI Ⓜ️</TableHead>
              <TableHead className="pb-4 font-normal text-center">pDECI 🛡️</TableHead>
              <TableHead className="pb-4 font-normal text-center">pLUCKY 🍀</TableHead>
              <TableHead className="pb-4 font-normal text-center">pTRIO 🎲</TableHead>
              <TableHead className="pb-4 font-normal text-center">pBASE 🟠</TableHead>
            </tr>
          </thead>
          <TableBody>
            {leagueData.map((row, index) => (
              <TableRow 
                key={index} 
                className="border-t border-white/5 hover:bg-white/5 transition-colors"
              >
                <TableCell className="py-4 text-center">
                  <span className="text-white text-2xl">{row.league}</span>
                </TableCell>
                <TableCell className="py-4 text-center">
                  <span className="text-white">{row.share}</span>
                </TableCell>
                <TableCell className="py-4 text-center">
                  <div className="text-white">{row.pMAXI.tokens}</div>
                  <div className="text-gray-500">{row.pMAXI.value}</div>
                </TableCell>
                <TableCell className="py-4 text-center">
                  <div className="text-white">{row.pDECI.tokens}</div>
                  <div className="text-gray-500">{row.pDECI.value}</div>
                </TableCell>
                <TableCell className="py-4 text-center">
                  <div className="text-white">{row.pLUCKY.tokens}</div>
                  <div className="text-gray-500">{row.pLUCKY.value}</div>
                </TableCell>
                <TableCell className="py-4 text-center">
                  <div className="text-white">{row.pTRIO.tokens}</div>
                  <div className="text-gray-500">{row.pTRIO.value}</div>
                </TableCell>
                <TableCell className="py-4 text-center">
                  <div className="text-white">{row.pBASE.tokens}</div>
                  <div className="text-gray-500">{row.pBASE.value}</div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </table>
      </div>
    </div>
  );
}

export default LeaguesTable; 