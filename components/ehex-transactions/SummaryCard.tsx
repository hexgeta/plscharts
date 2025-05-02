import { Card, CardContent } from "@/components/ui/card";

interface SummaryCardProps {
  title: string;
  value: string;
  usdValue: string;
  isLoading: boolean;
}

export const SummaryCard: React.FC<SummaryCardProps> = ({ title, value, usdValue, isLoading }) => {
  return (
    <Card className="bg-black border border-white/20 flex-1 h-full">
      <CardContent className="p-4">
        <p className="text-gray-400 text-sm">{title}</p>
        <p className="text-2xl font-bold text-white">{isLoading ? '...' : value}</p>
        <p className="text-gray-400 text-sm">{isLoading ? '-' : usdValue}</p>
      </CardContent>
    </Card>
  );
}; 