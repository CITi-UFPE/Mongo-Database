"use client";

import { Area, AreaChart, CartesianGrid, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { cn } from "@/lib/utils";

interface ForecastChartItem {
    month: string;
    real?: number;
    previsto?: number;
}

interface FinancialForecastChartsProps {
    data: ForecastChartItem[];
    title?: string;
    subtitle?: string;
}

const formatAxisCurrency = (value: number) => `${value / 1000}k`;

const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
        maximumFractionDigits: 0,
    }).format(value);

function CustomTooltip({ active, payload, label }: any) {
    if (!active || !payload?.length) return null;

    return (
        <div className="min-w-[180px] rounded-xl border border-slate-700 bg-slate-800/95 p-3 shadow-xl backdrop-blur-md">
            <p className="mb-2 text-sm font-semibold text-slate-100">{label}</p>

            <div className="space-y-1.5">
                {payload.map((item: any) => (
                    <div key={item.dataKey} className="flex items-center justify-between gap-4">
                        <span className="text-xs text-slate-300">{item.name}</span>
                        <span
                            className={cn(
                                "text-xs font-semibold",
                                item.dataKey === "real" ? "text-emerald-400" : "text-violet-400"
                            )}
                        >
                            {formatCurrency(item.value)}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

function CustomLegend() {
    return (
        <div className="mt-5 ml-5 flex items-center gap-8">
            <div className="flex items-center gap-2">
                <span className="h-1 w-6 rounded-full bg-emerald-400" />
                <span className="text-sm font-medium text-slate-400">Real</span>
            </div>

            <div className="flex items-center gap-2">
                <span className="h-1 w-6 rounded-full bg-violet-500" />
                <span className="text-sm font-medium text-slate-400">Previsto</span>
            </div>
        </div>
    );
}

export function FinancialForecastChart({
    data,
    title = "Previsão Financeira",
    subtitle = "Receita real vs estimativa baseada em histórico",
}: FinancialForecastChartsProps) {
    const hasData = data.length > 0;

    return (
        <div className="w-full rounded-[28px] border border-[#1E3A5F] bg-[#071C2F] px-6 py-6 shadow-lg">
            <div className="mb-6">
                <h3 className="mb-1 text-[20px] font-semibold text-slate-100 md:text-[22px]">
                    {title}
                </h3>
                <p className="text-[15px] text-slate-400">
                    {subtitle}
                </p>
            </div>

            {hasData ? (
                <div className="h-[360px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data} margin={{ top: 10, right: 12, left: -5, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="4 4" stroke="#1E3A5F" />

                            <XAxis 
                                dataKey="month"
                                stroke="#94a3b8"
                                tickLine={false}
                                axisLine={false}
                                tick={{ fontSize: 13 }}
                            />

                            <YAxis 
                                stroke="#94a3b8"
                                tickLine={false}
                                axisLine={false}
                                tick={{ fontSize: 13 }}
                                tickFormatter={formatAxisCurrency}
                            />

                            <Tooltip content={<CustomTooltip />} />
                            <Legend content={<CustomLegend />} />

                            <Area 
                                type="monotone"
                                dataKey="real"
                                name="Real"
                                stroke="#34d399"
                                fill="#34d399"
                                fillOpacity={0.12}
                                strokeWidth={3}
                                connectNulls={false}
                            />

                            <Area 
                                type="monotone"
                                dataKey="previsto"
                                name="Previsto"
                                stroke="#a855f7"
                                fill="#a855f7"
                                fillOpacity={0.16}
                                strokeWidth={3}
                                strokeDasharray="8 6"
                                connectNulls={false}
                            />

                            <Line 
                                type="monotone"
                                dataKey="real"
                                stroke="#34d399"
                                strokeWidth={3}
                                dot={false}
                                activeDot={{ r: 5}}
                                connectNulls={false}
                            />

                            <Line 
                                type="monotone"
                                dataKey="previsto"
                                stroke="#a855f7"
                                strokeWidth={3}
                                strokeDasharray="8 6"
                                dot={false}
                                activeDot={{ r: 5}}
                                connectNulls={false}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            ) : (
                <div className="flex h-[520px] items-center justify-center rounded-xl border border-dashed border-slate-700/70 bg-slate-800/20 text-sm text-slate-400">
                    Nenhum dado disponível
                </div>
            )}
        </div>
    );
}