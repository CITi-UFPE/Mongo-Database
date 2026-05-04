"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from "recharts";

interface ProfitByProjectItem {
    project: string;
    profit: number;
}

interface ProfitProjectChartProps {
    data: ProfitByProjectItem[];
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

    const value = payload[0].value;

    return (
        <div className="min-w-[180px] rounded-xl border border-slate-700 bg-slate-800/95 p-3 shadow-xl backdrop-blur-md">
            <p className="mb-2 text-sm font-semibold text-slate-100">{label}</p>

            <p className="text-xs text-slate-300">
                Lucro:{" "}
                <span className={value >= 0 ? "font-semibold text-emerald-400" : "font-semibold text-red-400"}>
                    {formatCurrency(value)}
                </span>
            </p>
        </div>
    );
}

export function ProfitByProjectChart({
    data,
    title = "Lucro por Projeto",
    subtitle = "Receita menos custos por projeto",
}: ProfitProjectChartProps) {
    const hasData = data.length > 0;

    return (
        <div className="w-full rounded-[28px] border border-[#1E3A5F] bg-[#071C2F] px-6 py-6 shadow-lg">
            <div className="mb-6">
                <h3 className="mb-1 text-[20px] font-semibold text-slate-100 md:text-[22px]">
                    {title}
                </h3>
                <p className="text-[15px] text-slate-400">{subtitle}</p>
            </div>

            {hasData ? (
                <div className="h-[360px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={data}
                            layout="vertical"
                            margin={{ top: 10, right: 12, left: 5, bottom: 0 }}
                            barCategoryGap={22}
                        >
                            <CartesianGrid strokeDasharray="4 4" stroke="#1E3A5F" />

                            <XAxis 
                                type="number"
                                stroke="#94a3b8"
                                tickLine={false}
                                axisLine={false}
                                tick={{ fontSize: 13 }}
                                tickFormatter={formatAxisCurrency}
                            />

                            <YAxis 
                                type="category"
                                dataKey="project"
                                stroke="#94a3b8"
                                tickLine={false}
                                axisLine={false}
                                tick={{ fontSize: 13 }}
                                width={95}
                            />

                            <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />

                            <Bar dataKey="profit" radius={[8, 8, 8, 8]} maxBarSize={36}>
                                {data.map((item) => (
                                    <Cell 
                                        key={item.project}
                                        fill={item.profit >= 0 ? "#34d399" : "#34d399"}
                                    />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            ) : (
                <div className="flex h-[500px] items-center justify-center rounded-xl border border-dashed border-slate-700/70 bg-slate-800/20 text-sm text-slate-400">
                    Nenhum dado disponível
                </div>
            )}
        </div>
    );
}