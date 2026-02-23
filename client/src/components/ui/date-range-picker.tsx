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

  const [selectedPreset, setSelectedPreset] = useState<string>('month');

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
    setSelectedPreset(preset);
    onDateChange?.(newRange);
  };

  const getDisplayLabel = () => {
    if (!dateRange.startDate || !dateRange.endDate) {
      return 'Selecione período';
    }

    return `${format(dateRange.startDate, 'dd MMM', { locale: pt })} - ${format(dateRange.endDate, 'dd MMM yyyy', { locale: pt })}`;
  };

  const presetOptions = [
    { id: 'today', label: 'Hoje', description: 'Apenas hoje' },
    { id: 'week', label: 'Últimos 7 dias', description: 'Semana anterior' },
    { id: 'month', label: 'Este mês', description: 'Do 1º até hoje' },
    { id: 'quarter', label: 'Últimos 90 dias', description: 'Trimestre anterior' },
    { id: 'year', label: 'Este ano', description: 'Do 1º de jan até hoje' }
  ];

  return (
    <div className={`space-y-4 ${className || ''}`}>
      {/* Data Display */}
      <div className="flex items-center gap-3 bg-gradient-to-r from-blue-900/40 to-cyan-900/40 border border-blue-500/40 rounded-lg px-4 py-3">
        <Calendar className="w-5 h-5 text-blue-400 flex-shrink-0" />
        <div>
          <p className="text-xs text-blue-300 font-semibold uppercase tracking-wider">Período analisado</p>
          <p className="text-lg font-bold text-slate-100">{getDisplayLabel()}</p>
        </div>
      </div>

      {/* Preset Buttons - Grid Layout for better clarity */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        {presetOptions.map(preset => (
          <button
            key={preset.id}
            onClick={() => handlePreset(preset.id as any)}
            className={`p-3 rounded-lg border-2 transition-all duration-200 text-center ${
              selectedPreset === preset.id
                ? 'border-blue-500 bg-blue-500/20 text-blue-100'
                : 'border-slate-600 bg-slate-700/50 text-slate-300 hover:border-blue-400 hover:bg-slate-600'
            }`}
          >
            <p className="text-sm font-bold">{preset.label}</p>
            <p className="text-xs text-slate-400 mt-1">{preset.description}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
