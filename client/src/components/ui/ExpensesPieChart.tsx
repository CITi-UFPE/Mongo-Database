import { useState, type ReactNode } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ExpenseCategory {
  id: string;
  name: string;
  value: number;
  subcategories?: ExpenseSubcategory[];
}

export interface ExpenseSubcategory {
  id: string;
  name: string;
  value: number;
}

interface ExpensesPieChartProps {
  categories: ExpenseCategory[];
  title?: string;
  subtitle?: string;
  className?: string;
  onCategorySelect?: (category: ExpenseCategory) => void;
}

const CATEGORY_COLORS = [
  "#2563eb", // azul
  "#10b981", // verde
  "#8b5cf6", // roxo
  "#f59e0b", // amarelo
  "#1d4ed8", // azul escuro
  "#059669", // verde escuro
  "#6d28d9", // roxo escuro
  "#fbbf24", // amarelo claro
  "#60a5fa", // azul claro
  "#34d399", // verde claro
  "#a78bfa", // roxo claro
];

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);
};

export default function ExpensesPieChart({
  categories,
  title = "Categorização de Gastos",
  subtitle = "Distribuição de Saídas por Categoria",
  className,
  onCategorySelect,
}: ExpensesPieChartProps) {
  const [selectedCategory, setSelectedCategory] = useState<ExpenseCategory | null>(null);

  const totalExpenses = categories.reduce((sum, cat) => sum + cat.value, 0);

  // Prepare data for main chart
  const chartData = categories.map((cat, index) => ({
    ...cat,
    color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
  }));

  // Prepare data for subcategory breakdown
  const selectedCategoryData = selectedCategory
    ? {
        ...selectedCategory,
        color: CATEGORY_COLORS[
          categories.findIndex((c) => c.id === selectedCategory.id) % CATEGORY_COLORS.length
        ],
        subcategories: selectedCategory.subcategories || [],
      }
    : null;

  const hasNoSubcategories = !selectedCategoryData?.subcategories || selectedCategoryData.subcategories.length === 0;

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const percentage = totalExpenses > 0 ? ((data.value / totalExpenses) * 100).toFixed(1) : "0";

      return (
        <div className="bg-slate-800/95 border border-slate-700 p-3 rounded-xl shadow-xl backdrop-blur-md min-w-[160px]">
          <p className="font-semibold text-slate-100 mb-2">{data.name}</p>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: data.color }}></span>
              <p className="text-sm text-slate-200">
                <span className="font-bold">{formatCurrency(data.value)}</span>
              </p>
            </div>
            <p className="text-xs text-slate-400 pl-4">{percentage}% do total</p>
          </div>
        </div>
      );
    }
    return null;
  };

  const CustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * Math.PI / 180);
    const y = cy + radius * Math.sin(-midAngle * Math.PI / 180);

    if (percent < 0.05) return null; // Don't show label for small slices

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? "start" : "end"}
        dominantBaseline="central"
        className="text-xs font-bold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  const handleCategoryClick = (data: (typeof chartData)[0]) => {
    setSelectedCategory(data as ExpenseCategory);
    onCategorySelect?.(data as ExpenseCategory);
  };

  if (selectedCategoryData && !hasNoSubcategories) {
    return (
      <div className={cn("w-full", className)}>
        <div className="rounded-2xl border border-slate-700/50 bg-slate-900/40 backdrop-blur-sm p-6">
          {/* Header with back button */}
          <div className="mb-6">
            <button
              onClick={() => setSelectedCategory(null)}
              className="flex items-center gap-2 text-sm text-slate-300 hover:text-slate-100 transition-colors mb-4"
            >
              <ChevronLeft className="h-4 w-4" />
              Voltar
            </button>
            <h3 className="text-xl font-semibold text-slate-100">{selectedCategoryData.name}</h3>
            <p className="text-sm text-slate-400 mt-1">{formatCurrency(selectedCategoryData.value)}</p>
          </div>

          {/* Subcategories breakdown */}
          <div className="space-y-3">
            {selectedCategoryData.subcategories.map((sub, index) => {
              const percentage = selectedCategoryData.value > 0
                ? ((sub.value / selectedCategoryData.value) * 100).toFixed(1)
                : "0";

              return (
                <div key={sub.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-800/30 hover:bg-slate-800/50 transition-colors">
                  <div className="flex items-center gap-3 flex-1">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{
                        backgroundColor: CATEGORY_COLORS[(index) % CATEGORY_COLORS.length],
                      }}
                    />
                    <span className="text-sm text-slate-200">{sub.name}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-100">{formatCurrency(sub.value)}</p>
                    <p className="text-xs text-slate-400">{percentage}%</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Total */}
          <div className="mt-4 pt-4 border-t border-slate-700/30 flex justify-between">
            <span className="text-sm text-slate-300">Total da categoria</span>
            <span className="text-sm font-bold text-slate-100">{formatCurrency(selectedCategoryData.value)}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("w-full", className)}>
      <div className="rounded-2xl border border-slate-700/50 bg-slate-900/40 backdrop-blur-sm p-6">
        {/* Header */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-slate-100">{title}</h3>
          <p className="text-sm text-slate-400 mt-1">{subtitle}</p>
          <p className="text-sm text-slate-300 mt-2">
            Total: <span className="font-bold text-emerald-400">{formatCurrency(totalExpenses)}</span>
          </p>
        </div>

        {categories.length > 0 ? (
          <>
            {/* Pie Chart */}
            <div className="h-80 flex items-center justify-center mb-6">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={120}
                    paddingAngle={2}
                    dataKey="value"
                    onClick={(data) => handleCategoryClick(data as (typeof chartData)[0])}
                    cursor="pointer"
                    label={CustomLabel}
                  >
                    {chartData.map((cat) => (
                      <Cell key={cat.id} fill={cat.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    formatter={(value, entry) => {
                      const data = (entry.payload as any);
                      return `${data.name}`;
                    }}
                    wrapperStyle={{
                      paddingTop: "20px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Categories Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-6 pt-6 border-t border-slate-700/30">
              {chartData.map((cat) => {
                const percentage = totalExpenses > 0 ? ((cat.value / totalExpenses) * 100).toFixed(1) : "0";
                return (
                  <div
                    key={cat.id}
                    onClick={() => handleCategoryClick(cat)}
                    className="p-3 rounded-lg bg-slate-800/30 hover:bg-slate-800/60 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                      <span className="text-sm font-medium text-slate-200 group-hover:text-slate-100">{cat.name}</span>
                    </div>
                    <div className="ml-6">
                      <p className="text-sm font-bold text-slate-100">{formatCurrency(cat.value)}</p>
                      <p className="text-xs text-slate-400">{percentage}% do total</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Hint */}
            <p className="text-xs text-slate-400 mt-6 text-center">Clique em uma categoria ou fatia para ver detalhes</p>
          </>
        ) : (
          <div className="h-80 flex items-center justify-center text-slate-400">
            <p>Nenhum dado de gastos disponível</p>
          </div>
        )}
      </div>
    </div>
  );
}
