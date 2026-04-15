import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";
import { TrendingDown, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ExpenseCategory, ExpenseSubcategory } from "./ExpensesPieChart";

interface CategoryBreakdownProps {
  categories: ExpenseCategory[];
  title?: string;
  className?: string;
  showComparison?: boolean;
}

const CATEGORY_COLORS = [
  "#10b981", // green - Projetos
  "#3b82f6", // blue - Infraestrutura
  "#f59e0b", // amber - Marketing
  "#8b5cf6", // purple - Eventos
  "#ec4899", // pink - backup
  "#06b6d4", // cyan - backup
  "#f97316", // orange - backup
  "#6366f1", // indigo - backup
];

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);
};

export default function CategoryBreakdown({
  categories,
  title = "Análise Detalhada de Gastos",
  className,
  showComparison = false,
}: CategoryBreakdownProps) {
  const analytics = useMemo(() => {
    const totalExpenses = categories.reduce((sum, cat) => sum + cat.value, 0);

    const categoryStats = categories.map((cat, index) => ({
      name: cat.name,
      value: cat.value,
      percentage: totalExpenses > 0 ? (cat.value / totalExpenses) * 100 : 0,
      color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
      subcategoryCount: cat.subcategories?.length || 0,
    }));

    const sortedByValue = [...categoryStats].sort((a, b) => b.value - a.value);
    const topCategory = sortedByValue[0];
    const lowestCategory = sortedByValue[sortedByValue.length - 1];

    const averageExpense = totalExpenses / Math.max(categories.length, 1);

    // Calculate growth insights (mock - would come from historical data in future)
    const insights = [];
    if (topCategory) {
      insights.push({
        type: "top",
        message: `${topCategory.name} é a maior despesa (${topCategory.percentage.toFixed(1)}%)`,
        value: topCategory.value,
      });
    }

    const highSpendCategories = categoryStats.filter((cat) => cat.percentage > 40);
    if (highSpendCategories.length > 0) {
      insights.push({
        type: "alert",
        message: `${highSpendCategories.length} categoria(s) representam mais de 40% dos gastos`,
        value: highSpendCategories.reduce((sum, cat) => sum + cat.value, 0),
      });
    }

    return {
      total: totalExpenses,
      categories: categoryStats,
      averageExpense,
      topCategory,
      lowestCategory,
      insights,
    };
  }, [categories]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-800/95 border border-slate-700 p-3 rounded-xl shadow-xl backdrop-blur-md">
          <p className="font-semibold text-slate-100">{data.name}</p>
          <div className="mt-2 space-y-1">
            <div className="flex justify-between gap-4">
              <span className="text-sm text-slate-400">Gasto:</span>
              <span className="text-sm font-bold text-slate-100">{formatCurrency(data.value)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-sm text-slate-400">% do Total:</span>
              <span className="text-sm font-bold text-emerald-400">{data.percentage.toFixed(1)}%</span>
            </div>
            {data.subcategoryCount > 0 && (
              <div className="flex justify-between gap-4">
                <span className="text-sm text-slate-400">Subcategorias:</span>
                <span className="text-sm font-bold text-slate-100">{data.subcategoryCount}</span>
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className={cn("w-full space-y-6", className)}>
      {/* Header */}
      <div className="rounded-2xl border border-slate-700/50 bg-slate-900/40 backdrop-blur-sm p-6">
        <h3 className="text-lg font-semibold text-slate-100 mb-2">{title}</h3>
        <p className="text-sm text-slate-400">Análise completa das despesas por categoria</p>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
          <div className="p-4 rounded-lg bg-slate-800/30">
            <p className="text-xs text-slate-400 mb-1">Total de Gastos</p>
            <p className="text-xl font-bold text-slate-100">{formatCurrency(analytics.total)}</p>
          </div>

          <div className="p-4 rounded-lg bg-slate-800/30">
            <p className="text-xs text-slate-400 mb-1">Número de Categorias</p>
            <p className="text-xl font-bold text-slate-100">{categories.length}</p>
          </div>

          <div className="p-4 rounded-lg bg-slate-800/30">
            <p className="text-xs text-slate-400 mb-1">Gasto Médio por Categoria</p>
            <p className="text-xl font-bold text-slate-100">{formatCurrency(analytics.averageExpense)}</p>
          </div>

          <div className="p-4 rounded-lg bg-slate-800/30">
            <p className="text-xs text-slate-400 mb-1">Maior Categoria</p>
            <p className="text-lg font-bold text-emerald-400 truncate">{analytics.topCategory?.name}</p>
            <p className="text-xs text-slate-400 mt-1">{formatCurrency(analytics.topCategory?.value || 0)}</p>
          </div>
        </div>
      </div>

      {/* Insights */}
      {analytics.insights.length > 0 && (
        <div className="rounded-2xl border border-slate-700/50 bg-slate-900/40 backdrop-blur-sm p-6">
          <h4 className="text-sm font-semibold text-slate-100 mb-4 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-amber-400" />
            Insights
          </h4>
          <div className="space-y-3">
            {analytics.insights.map((insight, idx) => (
              <div
                key={idx}
                className={cn(
                  "p-3 rounded-lg flex items-start gap-3",
                  insight.type === "alert"
                    ? "bg-amber-500/10 border border-amber-500/20"
                    : "bg-emerald-500/10 border border-emerald-500/20"
                )}
              >
                <div
                  className={cn(
                    "w-2 h-2 rounded-full flex-shrink-0 mt-1.5",
                    insight.type === "alert" ? "bg-amber-400" : "bg-emerald-400"
                  )}
                />
                <div>
                  <p className="text-sm text-slate-100">{insight.message}</p>
                  <p className="text-xs text-slate-400 mt-1">{formatCurrency(insight.value)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bar Chart Comparison */}
      {categories.length > 0 && (
        <div className="rounded-2xl border border-slate-700/50 bg-slate-900/40 backdrop-blur-sm p-6">
          <h4 className="text-sm font-semibold text-slate-100 mb-6 flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-slate-300" />
            Comparativo de Gastos
          </h4>

          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={analytics.categories}
                margin={{ top: 20, right: 30, left: 0, bottom: 60 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                <XAxis
                  dataKey="name"
                  tick={{ fill: "#94a3b8", fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={100}
                />
                <YAxis
                  tick={{ fill: "#94a3b8", fontSize: 12 }}
                  tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" radius={[8, 8, 0, 0]} animationDuration={800}>
                  {analytics.categories.map((cat) => (
                    <Cell key={cat.name} fill={cat.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Detailed List */}
      <div className="rounded-2xl border border-slate-700/50 bg-slate-900/40 backdrop-blur-sm p-6">
        <h4 className="text-sm font-semibold text-slate-100 mb-4">Detalhamento por Categoria</h4>
        <div className="space-y-3">
          {analytics.categories.map((cat) => (
            <div key={cat.name} className="p-4 rounded-lg bg-slate-800/30 hover:bg-slate-800/50 transition-colors">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                  <div>
                    <p className="font-semibold text-slate-100">{cat.name}</p>
                    {cat.subcategoryCount > 0 && (
                      <p className="text-xs text-slate-400 mt-1">{cat.subcategoryCount} subcategoria(s)</p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-slate-100">{formatCurrency(cat.value)}</p>
                  <p className="text-sm text-emerald-400 font-semibold">{cat.percentage.toFixed(1)}%</p>
                </div>
              </div>
              {/* Progress bar */}
              <div className="h-2 bg-slate-700/30 rounded-full overflow-hidden mt-3">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${cat.percentage}%`,
                    backgroundColor: cat.color,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
