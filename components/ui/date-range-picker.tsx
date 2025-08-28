import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Helper function to add ordinal suffix to day
const getOrdinalSuffix = (day: number): string => {
  if (day >= 11 && day <= 13) {
    return 'th';
  }
  switch (day % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
};

// Custom date formatter with ordinal day
const formatDateWithOrdinal = (date: Date): string => {
  const day = date.getDate();
  const month = format(date, "MMMM");
  const year = format(date, "yyyy");
  return `${month} ${day}${getOrdinalSuffix(day)}, ${year}`;
};

interface DatePickerWithRangeProps {
  date: DateRange | undefined;
  setDate: (date: DateRange | undefined) => void;
  className?: string;
}

interface DatePickerProps {
  date: Date | undefined;
  setDate: (date: Date | undefined) => void;
  className?: string;
  placeholder?: string;
  minDate?: Date;
}

export function DatePickerWithRange({
  date,
  setDate,
  className,
}: DatePickerWithRangeProps) {
  return (
    <div className={cn("grid gap-2 w-full", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant="outline"
            className={cn(
              "w-full sm:w-[260px] justify-start text-left font-normal",
              "bg-black border-white/20 text-white",
              "hover:bg-[#1a1a1a] hover:border-white/20 hover:text-white",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {formatDateWithOrdinal(date.from)} - {formatDateWithOrdinal(date.to)}
                </>
              ) : (
                formatDateWithOrdinal(date.from)
              )
            ) : (
              <span>Pick a date</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 bg-black border-lg border-white/20" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={setDate}
            numberOfMonths={2}
            className="bg-black text-white"
            classNames={{
              months: "flex space-x-4",
              month: "space-y-4",
              caption: "flex justify-center pt-1 relative items-center text-white",
              caption_label: "text-sm font-medium text-white",
              nav: "space-x-1 flex items-center",
              nav_button: "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 text-white",
              nav_button_previous: "absolute left-1",
              nav_button_next: "absolute right-1",
              table: "w-full border-collapse space-y-1",
              head_row: "flex",
              head_cell: "text-gray-500 rounded-md w-9 font-normal text-[0.8rem]",
              row: "flex w-full mt-2",
              cell: cn(
                "text-center text-sm p-0 relative",
                "first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md",
                "focus-within:relative focus-within:z-20"
              ),
              day: cn(
                "h-9 w-9 p-0 font-normal",
                "hover:bg-gray-800 rounded-md",
                "aria-selected:opacity-100",
                "text-white"
              ),
              day_selected: "bg-gray-800 text-white hover:bg-gray-700",
              day_today: "bg-gray-800/80 text-white",
              day_outside: "text-gray-700 opacity-50",
              day_disabled: "text-gray-700 opacity-50",
              day_range_middle: "aria-selected:bg-gray-800/50",
              day_range_end: "aria-selected:bg-gray-800",
              day_range_start: "aria-selected:bg-gray-800",
              day_hidden: "hidden",
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

export function DatePicker({
  date,
  setDate,
  className,
  placeholder = "Pick a date",
  minDate,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [currentMonth, setCurrentMonth] = React.useState(date || new Date());

  // Generate years from current year to 10 years in the future
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 11 }, (_, i) => currentYear + i);
  
  // Months array
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const handleMonthChange = (monthIndex: string) => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(parseInt(monthIndex));
    setCurrentMonth(newMonth);
  };

  const handleYearChange = (year: string) => {
    const newMonth = new Date(currentMonth);
    newMonth.setFullYear(parseInt(year));
    setCurrentMonth(newMonth);
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newMonth = new Date(currentMonth);
    if (direction === 'prev') {
      newMonth.setMonth(newMonth.getMonth() - 1);
    } else {
      newMonth.setMonth(newMonth.getMonth() + 1);
    }
    setCurrentMonth(newMonth);
  };

  return (
    <div className={cn("grid gap-2 w-full", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal",
              "bg-black border-white/20 text-white",
              "hover:bg-black hover:border-white/20 hover:text-white",
              !date && "text-gray-400"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date ? formatDateWithOrdinal(date) : <span>{placeholder}</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-80 p-0 bg-black border border-white/20" 
          align="start" 
          side="bottom" 
          sideOffset={4}
          avoidCollisions={false}
        >
          <div onClick={(e) => e.stopPropagation()}>
            {/* Enhanced Header with Month/Year Dropdowns */}
            <div className="flex items-center justify-between p-3 border-b border-white/10">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigateMonth('prev')}
                className="h-8 w-8 p-0 text-white hover:bg-gray-800"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <div className="flex items-center gap-2">
                <Select value={currentMonth.getMonth().toString()} onValueChange={handleMonthChange}>
                  <SelectTrigger className="w-[110px] h-8 bg-black border-white/20 text-white text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-black border-white/20">
                    {months.map((month, index) => (
                      <SelectItem key={index} value={index.toString()} className="text-white hover:bg-gray-800">
                        {month}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Select value={currentMonth.getFullYear().toString()} onValueChange={handleYearChange}>
                  <SelectTrigger className="w-[80px] h-8 bg-black border-white/20 text-white text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-black border-white/20">
                    {years.map((year) => (
                      <SelectItem key={year} value={year.toString()} className="text-white hover:bg-gray-800">
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigateMonth('next')}
                className="h-8 w-8 p-0 text-white hover:bg-gray-800"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Quick Date Selection Presets */}
            <div className="flex flex-wrap gap-1 p-2 border-b border-white/10">
              {[
                { label: "6M", months: 6, days: null },
                { label: "1Y", months: 12, days: null },
                { label: "2Y", months: 24, days: null },
                { label: "3Y", months: 36, days: null },
                { label: "5Y", months: 60, days: null },
                { label: "10Y", months: 120, days: null },
                { label: "15Y", months: null, days: 5555 },
              ].map(({ label, months, days }) => (
                <Button
                  key={label}
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const futureDate = new Date();
                    if (days) {
                      // Use days calculation for specific day counts
                      futureDate.setDate(futureDate.getDate() + days);
                    } else {
                      // Use months calculation for year/month presets
                      futureDate.setMonth(futureDate.getMonth() + months);
                    }
                    // Automatically select this date and close the picker
                    setDate(futureDate);
                    setCurrentMonth(futureDate);
                    setOpen(false);
                  }}
                  className="h-6 px-2 text-xs text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                >
                  {label}
                </Button>
              ))}
            </div>

            <Calendar
              mode="single"
              selected={date}
              onSelect={(selectedDate) => {
                setDate(selectedDate);
                setOpen(false); // Close the popover after selection
              }}
              disabled={(date) => minDate ? date < minDate : false}
              month={currentMonth}
              onMonthChange={setCurrentMonth}
              className="bg-black text-white w-full"
              classNames={{
                months: "flex w-full",
                month: "space-y-4 w-full",
                caption: "hidden", // Hide default caption since we have custom header
                table: "w-full border-collapse",
                head_row: "flex w-full",
                head_cell: "text-gray-500 rounded-md w-9 font-normal text-[0.8rem] flex-1 text-center",
                row: "flex w-full mt-1",
                cell: cn(
                  "text-center text-sm p-0 relative flex-1",
                  "focus-within:relative focus-within:z-20"
                ),
                day: cn(
                  "h-9 w-9 p-0 font-normal mx-auto",
                  "hover:bg-gray-800 rounded-md transition-colors",
                  "aria-selected:opacity-100",
                  "text-white"
                ),
                day_selected: "bg-white !text-black hover:bg-gray-200 hover:!text-black focus:bg-white focus:!text-black",
                day_today: "bg-gray-800/80 text-white",
                day_outside: "text-gray-700 opacity-50",
                day_disabled: "text-gray-700 opacity-30 cursor-not-allowed",
                day_hidden: "invisible",
              }}
            />
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
} 