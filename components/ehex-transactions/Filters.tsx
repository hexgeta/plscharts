import { DateRange } from 'react-day-picker';

interface FiltersProps {
  dateRange: DateRange | undefined;
  onDateRangeChange: (range: DateRange | undefined) => void;
}

export const Filters: React.FC<FiltersProps> = ({ dateRange, onDateRangeChange }) => {
  return (
    <div className="mb-4">
      {/* Date range picker will be implemented here */}
      <div className="text-sm text-white/60">
        Filter transactions by date range
      </div>
    </div>
  );
}; 