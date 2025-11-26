import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell
} from 'recharts';
import { Loader2, AlertCircle, TrendingUp, ArrowRight, Calendar } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Prediction = {
    id: string;
    leadName: string;
    companyName: string;
    value: number;
    probability: number;
    expectedValue?: number;
    factors?: { name: string; effect: number }[];
};

type FeatureWeight = {
    name: string;
    weight: number;
};

type Summary = {
    totalWonValue: number;
    totalPipelineValue: number;
    expectedPipelineValue: number;
    totalForecast: number;
};

type PredictionResponse = {
    summary: Summary;
    predictions: Prediction[];
    featureWeights: FeatureWeight[];
    availableYears: number[];
    selectedYear: number;
};

export function PredictionAnalysis() {
    const [data, setData] = useState<PredictionResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedYear, setSelectedYear] = useState<string>('');

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const query = selectedYear ? `?year=${selectedYear}` : '';
                const response = await fetch(`/api/analytics/prediction${query}`);
                if (!response.ok) throw new Error('Failed to fetch prediction data');
                const result = await response.json();
                setData(result);
                if (!selectedYear && result.selectedYear) {
                    setSelectedYear(result.selectedYear.toString());
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Unknown error');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [selectedYear]);

    if (loading && !data) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="w-12 h-12 animate-spin text-teal-500" />
                <p className="mt-4 text-slate-400">Treinando modelo preditivo...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <AlertCircle className="w-12 h-12 text-rose-500" />
                <p className="mt-4 text-slate-200">Erro na previsão</p>
                <p className="mt-2 text-sm text-slate-400">{error}</p>
            </div>
        );
    }

    if (!data) return null;

    // Filter top 15 positive and negative factors for the big chart
    const sortedWeights = [...data.featureWeights].sort((a, b) => b.weight - a.weight);
    const topFactors = sortedWeights.slice(0, 10);
    const bottomFactors = sortedWeights.slice(-10).reverse();
    const displayFactors = [...topFactors, ...bottomFactors];

    const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

    return (
        <div className="space-y-8">
            {/* Header with Year Selector */}
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-200">Análise de Previsão</h3>
                <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <Select value={selectedYear} onValueChange={setSelectedYear}>
                        <SelectTrigger className="w-[120px] bg-slate-800 border-slate-700 text-slate-200">
                            <SelectValue placeholder="Ano" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-700 text-slate-200">
                            {data.availableYears.map(year => (
                                <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Forecast Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-slate-800 border-slate-700">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-400">Já Realizado (Ganho)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-emerald-400">{formatCurrency(data.summary?.totalWonValue || 0)}</div>
                    </CardContent>
                </Card>
                <Card className="bg-slate-800 border-slate-700">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-400">Previsão do Pipeline</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-purple-400">{formatCurrency(data.summary?.expectedPipelineValue || 0)}</div>
                        <p className="text-xs text-slate-500 mt-1">
                            De um total de {formatCurrency(data.summary?.totalPipelineValue || 0)} em aberto
                        </p>
                    </CardContent>
                </Card>
                <Card className="bg-slate-800 border-slate-700">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-400">Forecast Total (Ano)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-100">{formatCurrency(data.summary?.totalForecast || 0)}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Feature Importance Chart - Full Width */}
            <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                    <CardTitle className="text-slate-200">Fatores de Impacto no Fechamento</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-[400px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={displayFactors} layout="vertical" margin={{ left: 60, right: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                                <XAxis type="number" stroke="#94a3b8" />
                                <YAxis
                                    type="category"
                                    dataKey="name"
                                    stroke="#94a3b8"
                                    width={150}
                                    tick={{ fontSize: 11 }}
                                    tickFormatter={(val) => val.replace('Niche_', '').replace('Origin_', '')}
                                />
                                <Tooltip
                                    cursor={{ fill: '#334155', opacity: 0.2 }}
                                    content={({ active, payload }) => {
                                        if (active && payload && payload.length) {
                                            const d = payload[0].payload;
                                            return (
                                                <div className="bg-slate-900 border border-slate-700 p-2 rounded shadow text-slate-200 z-50">
                                                    <p className="font-bold">{d.name}</p>
                                                    <p className="text-sm">Peso: {d.weight.toFixed(4)}</p>
                                                    <p className="text-xs text-slate-400">
                                                        {d.weight > 0 ? 'Aumenta a chance de ganho' : 'Diminui a chance de ganho'}
                                                    </p>
                                                </div>
                                            );
                                        }
                                        return null;
                                    }}
                                />
                                <Bar dataKey="weight" radius={[0, 4, 4, 0]}>
                                    {displayFactors.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.weight > 0 ? '#10b981' : '#ef4444'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="mt-4 text-xs text-slate-400 text-center">
                        Fatores que mais influenciam positivamente (Verde) e negativamente (Vermelho) a probabilidade de ganho.
                    </div>
                </CardContent>
            </Card>

            {/* Detailed Lead Predictions */}
            <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                    <CardTitle className="text-slate-200 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-teal-400" />
                        Análise Detalhada de Oportunidades
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {data.predictions.slice(0, 10).map((lead, idx) => (
                            <div key={lead.id} className="p-4 rounded-lg bg-slate-700/30 border border-slate-700/50 hover:bg-slate-700/50 transition-colors">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">

                                    {/* Lead Info */}
                                    <div className="flex items-center gap-4 min-w-[200px]">
                                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-600 text-slate-200 font-bold text-sm">
                                            {idx + 1}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-slate-200">{lead.companyName}</p>
                                            <p className="text-sm text-slate-400">{lead.leadName}</p>
                                        </div>
                                    </div>

                                    {/* Key Drivers */}
                                    <div className="flex-1 flex flex-wrap gap-2">
                                        {lead.factors?.map((factor, i) => (
                                            <span
                                                key={i}
                                                className={`text-xs px-2 py-1 rounded border ${factor.effect > 0
                                                    ? 'bg-emerald-900/30 border-emerald-800 text-emerald-400'
                                                    : 'bg-rose-900/30 border-rose-800 text-rose-400'
                                                    }`}
                                            >
                                                {factor.effect > 0 ? '▲' : '▼'} {factor.name.replace('Niche_', '').replace('Origin_', '')}
                                            </span>
                                        ))}
                                    </div>

                                    {/* Metrics */}
                                    <div className="text-right min-w-[150px]">
                                        <div className="flex items-center justify-end gap-2">
                                            <span className="text-2xl font-bold text-teal-400">{lead.probability}%</span>
                                        </div>
                                        <div className="text-sm text-slate-400">
                                            Valor Esp: <span className="text-slate-200">{formatCurrency(lead.expectedValue || 0)}</span>
                                        </div>
                                        <div className="text-xs text-slate-500">
                                            Total: {formatCurrency(lead.value)}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
