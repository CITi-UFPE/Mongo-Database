import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

interface DateRange {
  startDate: Date | null;
  endDate: Date | null;
}

interface DateRangePickerProps {
  onDateChange?: (range: DateRange) => void;
  className?: string;
}

export function DateRangePicker({ onDateChange, className }: DateRangePickerProps) {
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    endDate: new Date()
  });

  const handlePreset = (preset: 'today' | 'week' | 'month' | 'quarter' | 'year') => {
    const today = new Date();
    let startDate: Date;

    switch (preset) {
      case 'today':
        startDate = new Date(today);
        break;
      case 'week':
        startDate = new Date(today);
        startDate.setDate(today.getDate() - 7);
        break;
      case 'month':
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        break;
      case 'quarter':
        startDate = new Date(today);
        startDate.setMonth(today.getMonth() - 3);
        break;
      case 'year':
        startDate = new Date(today.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
    }

    const newRange = { startDate, endDate: today };
    setDateRange(newRange);
    onDateChange?.(newRange);
  };

  const getDisplayLabel = () => {
    if (!dateRange.startDate || !dateRange.endDate) {
      return 'Selecione período';
    }

    return `${format(dateRange.startDate, 'dd MMM', { locale: pt })} - ${format(dateRange.endDate, 'dd MMM yyyy', { locale: pt })}`;
  };

  return (
    <div className={`flex items-center gap-2 ${className || ''}`}>
      <div className="flex items-center gap-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2">
        <Calendar className="w-4 h-4 text-slate-400" />
        <span className="text-sm text-slate-300">{getDisplayLabel()}</span>
      </div>

      <div className="flex gap-1">
        <Button
          variant="outline"
          size="sm"
          onClick={() => handlePreset('today')}
          className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-slate-100 text-xs"
        >
          Hoje
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handlePreset('week')}
          className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-slate-100 text-xs"
        >
          7 dias
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handlePreset('month')}
          className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-slate-100 text-xs"
        >
          Mês
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handlePreset('year')}
          className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-slate-100 text-xs"
        >
          Ano
        </Button>
      </div>
    </div>
  );
}
