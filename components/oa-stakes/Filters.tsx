'use client';

import { DateRange } from "react-day-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";

interface FiltersProps {
  chainFilter: 'all' | 'ETH' | 'PLS';
  statusFilter: 'all' | 'active' | 'ended';
  dateRange: DateRange | undefined;
  onChainFilterChange: (value: 'all' | 'ETH' | 'PLS') => void;
  onStatusFilterChange: (value: 'all' | 'active' | 'ended') => void;
  onDateRangeChange: (value: DateRange | undefined) => void;
}

export function Filters({
  chainFilter,
  statusFilter,
  dateRange,
  onChainFilterChange,
  onStatusFilterChange,
  onDateRangeChange
}: FiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-4 mb-4">
      <div className="flex flex-row gap-4 w-full sm:w-auto">
        <div className="w-1/2 sm:w-auto">
          <Select
            value={chainFilter}
            onValueChange={(value: 'all' | 'ETH' | 'PLS') => onChainFilterChange(value)}
          >
            <SelectTrigger className="w-full bg-black border border-white/20 text-white hover:bg-[#1a1a1a] hover:border-white/20 hover:text-white rounded-[6px]">
              <SelectValue placeholder="All Chains" />
            </SelectTrigger>
            <SelectContent className="bg-black border border-white/20 rounded-[6px]">
              <SelectItem value="all" className="text-white hover:bg-[#1a1a1a] focus:bg-[#1a1a1a] focus:text-white">All Chains</SelectItem>
              <SelectItem value="ETH" className="text-white hover:bg-[#1a1a1a] focus:bg-[#1a1a1a] focus:text-white">ETH</SelectItem>
              <SelectItem value="PLS" className="text-white hover:bg-[#1a1a1a] focus:bg-[#1a1a1a] focus:text-white">PLS</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="w-1/2 sm:w-auto">
          <Select
            value={statusFilter}
            onValueChange={(value: 'all' | 'active' | 'ended') => onStatusFilterChange(value)}
          >
            <SelectTrigger className="w-full bg-black border border-white/20 text-white hover:bg-[#1a1a1a] hover:border-white/20 hover:text-white rounded-[6px]">
              <SelectValue placeholder="All Stakes" />
            </SelectTrigger>
            <SelectContent className="bg-black border border-white/20 rounded-[6px]">
              <SelectItem value="all" className="text-white hover:bg-[#1a1a1a] focus:bg-[#1a1a1a] focus:text-white">All Stakes</SelectItem>
              <SelectItem value="active" className="text-white hover:bg-[#1a1a1a] focus:bg-[#1a1a1a] focus:text-white">Active Stakes</SelectItem>
              <SelectItem value="ended" className="text-white hover:bg-[#1a1a1a] focus:bg-[#1a1a1a] focus:text-white">Ended Stakes</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="w-full sm:w-auto">
        <DatePickerWithRange date={dateRange} setDate={onDateRangeChange} className="w-full" />
      </div>
    </div>
  );
} 