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
  const [customFrom, setCustomFrom] = useState<string>("");
  const [customTo, setCustomTo] = useState<string>("");

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
      const today = new Date();
      const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      const toInput = toDateInputValue(today);
      const fromInput = toDateInputValue(currentMonthStart);

      setCustomFrom(fromInput);
      setCustomTo(toInput);

      onChange?.(range, { from: currentMonthStart, to: today });
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

  const toDateInputValue = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const parseDateInput = (value: string): Date | null => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return null;
    }

    const [year, month, day] = value.split("-").map(Number);
    const parsed = new Date(year, month - 1, day);
    if (Number.isNaN(parsed.getTime())) {
      return null;
    }
    return parsed;
  };

  const applyCustomRange = () => {
    const from = parseDateInput(customFrom);
    const to = parseDateInput(customTo);

    if (!from || !to) {
      return;
    }

    if (from.getTime() > to.getTime()) {
      return;
    }

    onChange?.("custom", { from, to });
  };

  return (
    <div className={cn("min-w-[220px] rounded-2xl border border-blue-500/15 bg-slate-800/30 px-4 py-3 backdrop-blur-md hover:border-blue-400/30 transition-all duration-300", className)}>
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
        {selectedRange === "custom" && <span className="text-xs text-gray-400">(personalizar)</span>}
      </div>

      {selectedRange === "custom" ? (
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
          <input
            type="date"
            value={customFrom}
            onChange={(e) => setCustomFrom(e.target.value)}
            className="h-10 rounded-xl border border-blue-500/20 bg-slate-900/70 px-3 text-sm text-slate-100 outline-none focus:border-cyan-400/50"
            aria-label="Data inicial"
          />
          <input
            type="date"
            value={customTo}
            onChange={(e) => setCustomTo(e.target.value)}
            className="h-10 rounded-xl border border-blue-500/20 bg-slate-900/70 px-3 text-sm text-slate-100 outline-none focus:border-cyan-400/50"
            aria-label="Data final"
          />
          <button
            type="button"
            onClick={applyCustomRange}
            className="h-10 rounded-xl bg-cyan-600 px-3 text-sm font-semibold text-white transition-colors hover:bg-cyan-500"
          >
            Aplicar
          </button>
        </div>
      ) : null}
    </div>
  );
}