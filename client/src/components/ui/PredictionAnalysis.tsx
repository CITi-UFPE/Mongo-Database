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
    Cell,
    ComposedChart,
    Line,
    Legend
} from 'recharts';
import { Loader2, AlertCircle, TrendingUp, ArrowRight, Calendar, Target, LineChart } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ICPAnalysis } from './ICPAnalysis';

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

type ICPData = {
    topNiches: { name: string; count: number; avgValue: number; totalValue: number; avgCycleTime: number }[];
    topOrigins: { name: string; count: number; avgValue: number; totalValue: number; avgCycleTime: number }[];
    avgDealSize: number;
    avgCycleTime: number;
};

type MonthlyForecast = {
    month: string;
    actual: number;
    predicted: number;
    cumulativeTotal: number;
};

type PredictionResponse = {
    summary: Summary;
    predictions: Prediction[];
    featureWeights: FeatureWeight[];
    availableYears: number[];
    selectedYear: number;
    icpAnalysis: ICPData;
    monthlyForecast: MonthlyForecast[];
};

export function PredictionAnalysis() {
    const [data, setData] = useState<PredictionResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedYear, setSelectedYear] = useState<string>('');
    const [viewMode, setViewMode] = useState<'prediction' | 'icp'>('prediction');

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

    // Filter top 10 positive and negative factors
    const sortedWeights = [...data.featureWeights].sort((a, b) => b.weight - a.weight);
    const topFactors = sortedWeights.slice(0, 10);
    const bottomFactors = sortedWeights.slice(-10).reverse();
    const displayFactors = [...topFactors, ...bottomFactors];

    const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

    return (
        <div className="space-y-8">
            {/* Header with Year Selector and View Toggle */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <h3 className="text-lg font-semibold text-slate-200">Análise de Previsão</h3>
                    <div className="flex bg-slate-800 rounded-lg p-1 border border-slate-700">
                        <Button
                            variant={viewMode === 'prediction' ? 'secondary' : 'ghost'}
                            size="sm"
                            onClick={() => setViewMode('prediction')}
                            className={viewMode === 'prediction' ? 'bg-slate-600 text-white' : 'text-slate-400 hover:text-white'}
                        >
                            <LineChart className="w-4 h-4 mr-2" />
                            Previsão
                        </Button>
                        <Button
                            variant={viewMode === 'icp' ? 'secondary' : 'ghost'}
                            size="sm"
                            onClick={() => setViewMode('icp')}
                            className={viewMode === 'icp' ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'text-slate-400 hover:text-white'}
                        >
                            <Target className="w-4 h-4 mr-2" />
                            Perfil Ideal (ICP)
                        </Button>
                    </div>
                </div>

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

            {viewMode === 'icp' ? (
                <ICPAnalysis data={data.icpAnalysis} />
            ) : (
                <>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        <Card className="bg-slate-800 border-slate-700">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-slate-400">Previsão de Ganhos</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-emerald-400">{formatCurrency(data.summary?.totalWonValue || 0)}</div>
                            </CardContent>
                        </Card >
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
                    </div >

                    {/* Time Series Forecast Chart */}
                    <Card className="bg-slate-800 border-slate-700">
                        <CardHeader>
                            <CardTitle className="text-slate-200 flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-indigo-400" />
                                Previsão de Receita Mensal
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[400px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart data={data.monthlyForecast} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                        <XAxis dataKey="month" stroke="#94a3b8" />
                                        <YAxis yAxisId="left" stroke="#94a3b8" tickFormatter={(val) => `R$${(val / 1000).toFixed(0)}k`} />
                                        <YAxis yAxisId="right" orientation="right" stroke="#6366f1" tickFormatter={(val) => `R$${(val / 1000).toFixed(0)}k`} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#e2e8f0' }}
                                            formatter={(value: number) => formatCurrency(value)}
                                        />
                                        <Legend />
                                        <Bar yAxisId="left" dataKey="actual" name="Receita Realizada" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
                                        <Bar yAxisId="left" dataKey="predicted" name="Previsão (Pipeline)" fill="#a855f7" radius={[4, 4, 0, 0]} barSize={20} />
                                        <Line yAxisId="right" type="monotone" dataKey="cumulativeTotal" name="Acumulado Total" stroke="#6366f1" strokeWidth={3} dot={{ r: 4 }} />
                                    </ComposedChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>

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
                    </Card >
                </>
            )}
        </div >
    );
}
