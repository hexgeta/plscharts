'use client';

import { DateRange } from "react-day-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";

interface FiltersProps {
  walletFilter: 'all' | 'main' | 'daughter1' | 'daughter2';
  dateRange: DateRange | undefined;
  onWalletFilterChange: (value: 'all' | 'main' | 'daughter1' | 'daughter2') => void;
  onDateRangeChange: (value: DateRange | undefined) => void;
}

export function Filters({
  walletFilter,
  dateRange,
  onWalletFilterChange,
  onDateRangeChange
}: FiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-4 mb-4">
      <div className="w-full sm:w-[200px]">
        <Select
          value={walletFilter}
          onValueChange={(value: 'all' | 'main' | 'daughter1' | 'daughter2') => onWalletFilterChange(value)}
        >
          <SelectTrigger className="w-full bg-black border border-white/20 text-white hover:bg-[#1a1a1a] hover:border-white/20 hover:text-white rounded-[6px]">
            <SelectValue placeholder="All Wallets" />
          </SelectTrigger>
          <SelectContent className="bg-black border border-white/20 rounded-[6px]">
            <SelectItem value="all" className="text-white hover:bg-[#1a1a1a] focus:bg-[#1a1a1a] focus:text-white">All Wallets</SelectItem>
            <SelectItem value="main" className="text-white hover:bg-[#1a1a1a] focus:bg-[#1a1a1a] focus:text-white">Main Sac</SelectItem>
            <SelectItem value="daughter1" className="text-white hover:bg-[#1a1a1a] focus:bg-[#1a1a1a] focus:text-white">Daughter 1</SelectItem>
            <SelectItem value="daughter2" className="text-white hover:bg-[#1a1a1a] focus:bg-[#1a1a1a] focus:text-white">Daughter 2</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="w-full sm:w-auto">
        <DatePickerWithRange date={dateRange} setDate={onDateRangeChange} className="w-full" />
      </div>
    </div>
  );
} 