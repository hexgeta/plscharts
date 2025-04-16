'use client';

import { DateRange } from "react-day-picker";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { useEffect } from "react";

interface FiltersProps {
  dateRange: DateRange | undefined;
  onDateRangeChange: (value: DateRange | undefined) => void;
}

export function Filters({
  dateRange,
  onDateRangeChange
}: FiltersProps) {
  // Set default date range to start of current year
  useEffect(() => {
    if (!dateRange) {
      const today = new Date();
      const startOfYear = new Date(today.getFullYear(), 0, 1); // January 1st of current year
      
      onDateRangeChange({
        from: startOfYear,
        to: today
      });
    }
  }, [dateRange, onDateRangeChange]);

  return (
    <div className="flex mb-4">
      <DatePickerWithRange date={dateRange} setDate={onDateRangeChange} className="w-full" />
    </div>
  );
} 