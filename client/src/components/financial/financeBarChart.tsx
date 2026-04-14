"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  YAxis,
} from "recharts";

type PeriodType = "mensal" | "quinzenal";

interface FinanceChartItem {
  label: string;
  entradas: number;
  saidas: number;
}

interface FinanceBarChartProps {
  monthlyData?: FinanceChartItem[];
  fortnightlyData?: FinanceChartItem[];
  initialPeriod?: PeriodType;
  title?: string;
  subtitle?: string;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
};

const formatAxisCurrency = (value: number) => {
  if (value >= 1000) {
    return `${value / 1000}k`;
  }

  return String(value);
};

const periodLabels: Record<PeriodType, string> = {
  mensal: "Mensal",
  quinzenal: "Quinzenal",
};

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null;

  const entradas = payload.find((item: any) => item.dataKey === "entradas");
  const saidas = payload.find((item: any) => item.dataKey === "saidas");

  return (
    <div className="min-w-[180px] rounded-xl border border-slate-700 bg-slate-800/95 p-3 shadow-xl backdrop-blur-md">
      <p className="mb-2 text-sm font-semibold text-slate-100">{label}</p>

      <div className="space-y-1.5">
        {entradas && (
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
              <span className="text-xs text-slate-300">Entradas</span>
            </div>
            <span className="text-xs font-semibold text-emerald-400">
              {formatCurrency(entradas.value)}
            </span>
          </div>
        )}

        {saidas && (
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-orange-400" />
              <span className="text-xs text-slate-300">Saídas</span>
            </div>
            <span className="text-xs font-semibold text-orange-400">
              {formatCurrency(saidas.value)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function CustomLegend() {
  return (
    <div className="mt-5 flex items-center justify-center gap-6">
      <div className="flex items-center gap-2">
        <span className="h-3 w-3 rounded-sm bg-emerald-400" />
        <span className="text-sm font-medium text-emerald-400">Entradas</span>
      </div>

      <div className="flex items-center gap-2">
        <span className="h-3 w-3 rounded-sm bg-orange-400" />
        <span className="text-sm font-medium text-orange-400">Saídas</span>
      </div>
    </div>
  );
}

export function FinanceBarChart({
  monthlyData = [],
  fortnightlyData = [],
  initialPeriod = "mensal",
  title = "Fluxo de Caixa",
  subtitle = "Entradas vs Saídas por mês",
}: FinanceBarChartProps) {
  const [period, setPeriod] = useState<PeriodType>(initialPeriod);

  const chartData = useMemo(() => {
    if (period === "quinzenal") return fortnightlyData;
    return monthlyData;
  }, [period, monthlyData, fortnightlyData]);

  const hasData = chartData.length > 0;

  return (
    <div
      className={cn(
        "w-full rounded-[28px] border border-[#1E3A5F] bg-[#071C2F] px-8 py-7 shadow-lg",
      )}
    >
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h3 className="mb-1 text-[20px] font-semibold text-slate-100 md:text-[22px]">
            {title}
          </h3>
          <p className="text-[15px] text-slate-400">{subtitle}</p>
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-slate-700/80 bg-slate-900/40 p-1">
          {(["mensal", "quinzenal"] as PeriodType[]).map((item) => {
            const isActive = period === item;

            return (
              <button
                key={item}
                type="button"
                onClick={() => setPeriod(item)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
                  isActive
                    ? "bg-sky-500 text-white shadow-sm"
                    : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                )}
              >
                {periodLabels[item]}
              </button>
            );
          })}
        </div>
      </div>

      {hasData ? (
        <div className="h-[420px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 14, right: 18, left: 34, bottom: 18 }}
              barCategoryGap={22}
            >
              <CartesianGrid
                strokeDasharray="4 4"
                stroke="#1E3A5F"
                vertical={false}
              />

              <XAxis
                dataKey="label"
                stroke="#94a3b8"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 12 }}
              />

              <YAxis
                stroke="#94a3b8"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 12 }}
                tickFormatter={formatAxisCurrency}
              />

              <Tooltip
                content={<CustomTooltip />}
                cursor={{ fill: "rgba(255,255,255,0.03)" }}
              />

              <Legend content={<CustomLegend />} />

              <Bar
                dataKey="entradas"
                name="Entradas"
                fill="#34d399"
                radius={[8, 8, 0, 0]}
                maxBarSize={44}
              />

              <Bar
                dataKey="saidas"
                name="Saídas"
                fill="#fb923c"
                radius={[8, 8, 0, 0]}
                maxBarSize={44}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="flex h-[420px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-700/70 bg-slate-800/20 text-sm text-slate-400">
          <p>Nenhum dado disponível no período</p>
        </div>
      )}
    </div>
  );
}