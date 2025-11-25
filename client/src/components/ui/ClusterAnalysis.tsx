import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    ScatterChart,
    Scatter,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend
} from 'recharts';
import { Loader2, AlertCircle, Info } from 'lucide-react';

type ClusterData = {
    id: number;
    size: number;
    winRate: number;
    avgValue: number;
    topNiche: string;
    topNichePercentage: number;
    topOrigin: string;
    topOriginPercentage: number;
};

type PointData = {
    id: string;
    x: number;
    y: number;
    cluster: number;
    status: string;
    niche: string;
    origin: string;
};

type ClusteringResponse = {
    clusters: ClusterData[];
    points: PointData[];
};

const COLORS = ['#0ea5e9', '#14b8a6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export function ClusterAnalysis() {
    const [data, setData] = useState<ClusteringResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch('/api/analytics/clustering?k=4');
                if (!response.ok) throw new Error('Failed to fetch clustering data');
                const result = await response.json();
                setData(result);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Unknown error');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="w-12 h-12 animate-spin text-teal-500" />
                <p className="mt-4 text-slate-400">Analisando padrões nos dados...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <AlertCircle className="w-12 h-12 text-rose-500" />
                <p className="mt-4 text-slate-200">Erro na análise</p>
                <p className="mt-2 text-sm text-slate-400">{error}</p>
            </div>
        );
    }

    if (!data) return null;

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Chart Section */}
                <Card className="lg:col-span-2 bg-slate-800 border-slate-700">
                    <CardHeader>
                        <CardTitle className="text-slate-200 flex items-center gap-2">
                            <Info className="w-5 h-5 text-teal-400" />
                            Distribuição dos Clusters (Valor vs Fase)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[400px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                    <XAxis
                                        type="number"
                                        dataKey="x"
                                        name="Valor"
                                        unit="R$"
                                        stroke="#94a3b8"
                                        tickFormatter={(val) => `R$${val / 1000}k`}
                                    />
                                    <YAxis
                                        type="number"
                                        dataKey="y"
                                        name="Fase"
                                        stroke="#94a3b8"
                                        label={{ value: 'Fase do Funil', angle: -90, position: 'insideLeft', fill: '#94a3b8' }}
                                    />
                                    <Tooltip
                                        cursor={{ strokeDasharray: '3 3' }}
                                        content={({ active, payload }) => {
                                            if (active && payload && payload.length) {
                                                const d = payload[0].payload;
                                                return (
                                                    <div className="bg-slate-900 border border-slate-700 p-3 rounded shadow-lg text-slate-200">
                                                        <p className="font-bold mb-1">Cluster {d.cluster + 1}</p>
                                                        <p className="text-sm">Valor: R$ {d.x.toLocaleString()}</p>
                                                        <p className="text-sm">Fase: {d.y}</p>
                                                        <p className="text-sm">Status: <span className={d.status === 'Ganho' ? 'text-green-400' : d.status === 'Perdido' ? 'text-red-400' : 'text-blue-400'}>{d.status}</span></p>
                                                        <p className="text-xs text-slate-400 mt-1">{d.niche} | {d.origin}</p>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        }}
                                    />
                                    <Legend />
                                    {data.clusters.map((cluster, idx) => (
                                        <Scatter
                                            key={cluster.id}
                                            name={`Cluster ${cluster.id + 1}`}
                                            data={data.points.filter(p => p.cluster === cluster.id)}
                                            fill={COLORS[idx % COLORS.length]}
                                        />
                                    ))}
                                </ScatterChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Cluster Details */}
                <div className="space-y-4">
                    {data.clusters.map((cluster, idx) => (
                        <Card key={cluster.id} className="bg-slate-800 border-slate-700 overflow-hidden">
                            <div className="h-1 w-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                            <CardContent className="p-4">
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-bold text-slate-200">Cluster {cluster.id + 1}</h3>
                                    <span className="text-xs font-mono bg-slate-700 px-2 py-1 rounded text-slate-300">
                                        {cluster.size} leads
                                    </span>
                                </div>

                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">Taxa de Sucesso:</span>
                                        <span className={`font-bold ${cluster.winRate > 50 ? 'text-green-400' : 'text-slate-200'}`}>
                                            {cluster.winRate}%
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">Valor Médio:</span>
                                        <span className="text-slate-200">
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cluster.avgValue)}
                                        </span>
                                    </div>

                                    <div className="pt-2 border-t border-slate-700 mt-2">
                                        <p className="text-xs text-slate-500 mb-1">Padrões Dominantes:</p>
                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                            <div className="bg-slate-700/50 p-2 rounded">
                                                <p className="text-slate-400">Nicho</p>
                                                <p className="text-teal-400 truncate" title={cluster.topNiche}>{cluster.topNiche}</p>
                                                <p className="text-[10px] text-slate-500">{cluster.topNichePercentage}% do grupo</p>
                                            </div>
                                            <div className="bg-slate-700/50 p-2 rounded">
                                                <p className="text-slate-400">Origem</p>
                                                <p className="text-teal-400 truncate" title={cluster.topOrigin}>{cluster.topOrigin}</p>
                                                <p className="text-[10px] text-slate-500">{cluster.topOriginPercentage}% do grupo</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    );
}
