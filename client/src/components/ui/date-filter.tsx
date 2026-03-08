import { useState } from "react";
import { cn } from "@/lib/utils";
import { Calendar } from "lucide-react";

type DateRange = "today" | "week" | "month" | "quarter" | "year" | "custom";
export type DateRangeValue = DateRange;
export interface DateRangeSelection {
  from: Date;
  to: Date;
}

interface DateFilterProps {
  onChange?: (range: DateRangeValue, dates?: DateRangeSelection) => void;
  className?: string;
}

export function DateFilter({ onChange, className }: DateFilterProps) {
  const [selectedRange, setSelectedRange] = useState<DateRange>("month");

  const ranges: { value: DateRange; label: string }[] = [
    { value: "today", label: "Hoje" },
    { value: "week", label: "Esta Semana" },
    { value: "month", label: "Este Mês" },
    { value: "quarter", label: "Este Trimestre" },
    { value: "year", label: "Este Ano" },
    { value: "custom", label: "Personalizado" },
  ];

  const handleRangeSelect = (range: DateRange) => {
    setSelectedRange(range);
    if (range === "custom") {
      onChange?.(range);
      return;
    }

    const today = new Date();
    const to = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    let from = new Date(to);

    if (range === "today") {
      from = new Date(to);
    }

    if (range === "week") {
      from.setDate(to.getDate() - 6);
    }

    if (range === "month") {
      from = new Date(to.getFullYear(), to.getMonth(), 1);
    }

    if (range === "quarter") {
      from = new Date(to.getFullYear(), to.getMonth() - 2, 1);
    }

    if (range === "year") {
      from = new Date(to.getFullYear(), 0, 1);
    }

    onChange?.(range, { from, to });
  };

  return (
    <div className={cn("h-11 min-w-[220px] bg-slate-800/30 backdrop-blur-md rounded-2xl border border-blue-500/15 px-4 flex items-center hover:border-blue-400/30 transition-all duration-300", className)}>
      <div className="flex items-center gap-3 w-full">
        <Calendar className="w-4 h-4 text-cyan-400" />
        <select
          value={selectedRange}
          onChange={(e) => handleRangeSelect(e.target.value as DateRange)}
          className="w-full bg-transparent text-white text-sm focus:outline-none"
        >
          {ranges.map((range) => (
            <option key={range.value} value={range.value} className="bg-slate-900 text-white">
              {range.label}
            </option>
          ))}
        </select>
        {selectedRange === "custom" && <span className="text-xs text-gray-400">(sem calendário)</span>}
        </div>
        </div>
  );
}