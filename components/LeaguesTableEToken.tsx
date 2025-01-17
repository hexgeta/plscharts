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
  eMAXI: {
    tokens: string;
    value: string;
    holders: string;
  };
  eDECI: {
    tokens: string;
    value: string;
    holders: string;
  };
  eLUCKY: {
    tokens: string;
    value: string;
    holders: string;
  };
  eTRIO: {
    tokens: string;
    value: string;
    holders: string;
  };
  eBASE: {
    tokens: string;
    value: string;
    holders: string;
  };
}

const calculateTokenAmount = (totalSupply: number, percentage: number): string => {
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

export function LeaguesTableEToken() {
  const { priceData: maxiPrice } = useCryptoPrice("eMAXI");
  const { priceData: deciPrice } = useCryptoPrice("eDECI");
  const { priceData: luckyPrice } = useCryptoPrice("eLUCKY");
  const { priceData: trioPrice } = useCryptoPrice("eTRIO");
  const { priceData: basePrice } = useCryptoPrice("eBASE");

  const leagueData = LEAGUE_PERCENTAGES.map(({ emoji, percentage }) => ({
    league: emoji,
    share: percentage >= 1 ? `${percentage}%` : `${percentage.toFixed(Math.abs(Math.log10(percentage)))}%`,
    eMAXI: {
      tokens: calculateTokenAmount(TOKEN_CONSTANTS.eMAXI.TOKEN_SUPPLY, percentage),
      value: calculateValue(calculateTokenAmount(TOKEN_CONSTANTS.eMAXI.TOKEN_SUPPLY, percentage), maxiPrice?.price || 0),
      holders: "n/a"
    },
    eDECI: {
      tokens: calculateTokenAmount(TOKEN_CONSTANTS.eDECI.TOKEN_SUPPLY, percentage),
      value: calculateValue(calculateTokenAmount(TOKEN_CONSTANTS.eDECI.TOKEN_SUPPLY, percentage), deciPrice?.price || 0),
      holders: "n/a"
    },
    eLUCKY: {
      tokens: calculateTokenAmount(TOKEN_CONSTANTS.eLUCKY.TOKEN_SUPPLY, percentage),
      value: calculateValue(calculateTokenAmount(TOKEN_CONSTANTS.eLUCKY.TOKEN_SUPPLY, percentage), luckyPrice?.price || 0),
      holders: "n/a"
    },
    eTRIO: {
      tokens: calculateTokenAmount(TOKEN_CONSTANTS.eTRIO.TOKEN_SUPPLY, percentage),
      value: calculateValue(calculateTokenAmount(TOKEN_CONSTANTS.eTRIO.TOKEN_SUPPLY, percentage), trioPrice?.price || 0),
      holders: "n/a"
    },
    eBASE: {
      tokens: calculateTokenAmount(TOKEN_CONSTANTS.eBASE3.TOKEN_SUPPLY, percentage),
      value: calculateValue(calculateTokenAmount(TOKEN_CONSTANTS.eBASE3.TOKEN_SUPPLY, percentage), basePrice?.price || 0),
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

export default LeaguesTableEToken; 