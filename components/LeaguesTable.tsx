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
    <div className="w-full py-4 px-1 xs:px-8">
      <div className="rounded-lg overflow-x-auto border border-[#333]">
        <div className="min-w-[800px]">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-[#333] hover:bg-transparent">
                <TableHead className="text-gray-400 font-800 text-center">League</TableHead>
                <TableHead className="text-gray-400 font-800 text-center">Share</TableHead>
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

export default LeaguesTable; 