import { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export type DatePreset = 'all' | 'this-week' | 'this-month' | 'last-month' | 'last-3-months' | '6-months' | 'this-year' | 'custom';

interface Props {
  onChange: (start: Date | null, end: Date | null) => void;
  presets?: DatePreset[];
  label?: string;
}

const ALL_PRESETS: { value: DatePreset; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'this-week', label: 'This Week' },
  { value: 'this-month', label: 'This Month' },
  { value: 'last-month', label: 'Last Month' },
  { value: 'last-3-months', label: 'Last 3 Months' },
  { value: '6-months', label: '6 Months' },
  { value: 'this-year', label: 'This Year' },
  { value: 'custom', label: 'Custom Range' },
];

export default function DateRangeFilter({ onChange, presets, label = "Date Range" }: Props) {
  const [selected, setSelected] = useState<DatePreset>('all');
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();

  const visiblePresets = presets
    ? ALL_PRESETS.filter(p => presets.includes(p.value))
    : ALL_PRESETS;

  const handlePreset = (preset: DatePreset) => {
    setSelected(preset);
    const now = new Date();
    switch (preset) {
      case 'all': onChange(null, null); break;
      case 'this-week': { const s = new Date(now); s.setDate(now.getDate() - now.getDay()); onChange(s, now); break; }
      case 'this-month': onChange(new Date(now.getFullYear(), now.getMonth(), 1), now); break;
      case 'last-month': onChange(new Date(now.getFullYear(), now.getMonth() - 1, 1), new Date(now.getFullYear(), now.getMonth(), 0)); break;
      case 'last-3-months': { const s = new Date(now); s.setMonth(s.getMonth() - 3); onChange(s, now); break; }
      case '6-months': { const s = new Date(now); s.setMonth(s.getMonth() - 6); onChange(s, now); break; }
      case 'this-year': onChange(new Date(now.getFullYear(), 0, 1), now); break;
      case 'custom': break;
    }
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs text-muted-foreground font-medium">{label}:</span>
      <div className="flex gap-1 flex-wrap">
        {visiblePresets.map(p => (
          <button
            key={p.value}
            onClick={() => handlePreset(p.value)}
            className={cn(
              "px-2 py-1 text-xs rounded border transition-colors",
              selected === p.value
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-foreground border-border hover:bg-muted"
            )}
          >
            {p.label}
          </button>
        ))}
      </div>
      {selected === 'custom' && (
        <div className="flex items-center gap-1">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="text-xs h-7">
                <CalendarIcon className="h-3 w-3 mr-1" />
                {startDate ? format(startDate, 'MMM dd, yyyy') : 'Start'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={startDate}
                onSelect={(d) => { setStartDate(d || undefined); if (d && endDate) onChange(d, endDate); }}
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
          <span className="text-xs text-muted-foreground">to</span>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="text-xs h-7">
                <CalendarIcon className="h-3 w-3 mr-1" />
                {endDate ? format(endDate, 'MMM dd, yyyy') : 'End'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={endDate}
                onSelect={(d) => { setEndDate(d || undefined); if (startDate && d) onChange(startDate, d); }}
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>
      )}
    </div>
  );
}
