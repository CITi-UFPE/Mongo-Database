import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Target, Clock, DollarSign, TrendingUp } from 'lucide-react';

type ICPData = {
    topNiches: { name: string; count: number; avgValue: number; totalValue: number; avgCycleTime: number }[];
    topOrigins: { name: string; count: number; avgValue: number; totalValue: number; avgCycleTime: number }[];
    avgDealSize: number;
    avgCycleTime: number;
};

interface ICPAnalysisProps {
    data: ICPData;
}

export function ICPAnalysis({ data }: ICPAnalysisProps) {
    const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Hero Card: The Ideal Profile */}
                <Card className="md:col-span-2 bg-gradient-to-r from-indigo-900 to-slate-900 border-indigo-500/30">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-indigo-100">
                            <Trophy className="w-6 h-6 text-yellow-400" />
                            Perfil de Cliente Ideal (ICP)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <div className="space-y-2">
                                <p className="text-sm text-indigo-300 font-medium uppercase tracking-wider">Melhor Nicho</p>
                                <div className="flex items-center gap-2">
                                    <span className="text-3xl font-bold text-white">{data.topNiches[0]?.name || 'N/A'}</span>
                                </div>
                                <p className="text-xs text-indigo-400">Gera maior receita total</p>
                            </div>

                            <div className="space-y-2">
                                <p className="text-sm text-indigo-300 font-medium uppercase tracking-wider">Melhor Canal</p>
                                <div className="flex items-center gap-2">
                                    <span className="text-3xl font-bold text-white">{data.topOrigins[0]?.name || 'N/A'}</span>
                                </div>
                                <p className="text-xs text-indigo-400">Traz os melhores leads</p>
                            </div>

                            <div className="space-y-2">
                                <p className="text-sm text-indigo-300 font-medium uppercase tracking-wider">Ticket Médio Ideal</p>
                                <div className="flex items-center gap-2">
                                    <span className="text-3xl font-bold text-emerald-400">{formatCurrency(data.avgDealSize)}</span>
                                </div>
                                <p className="text-xs text-indigo-400">Valor médio de fechamento</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Top Niches Detail */}
                <Card className="bg-slate-800 border-slate-700">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-slate-200">
                            <Target className="w-5 h-5 text-teal-400" />
                            Top Nichos (Receita)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {data.topNiches.map((niche, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg border border-slate-700">
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-800 text-slate-300 font-bold text-sm border border-slate-600">
                                        {idx + 1}
                                    </div>
                                    <div>
                                        <p className="font-medium text-slate-200">{niche.name}</p>
                                        <p className="text-xs text-slate-400">{niche.count} vendas realizadas</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-emerald-400">{formatCurrency(niche.totalValue)}</p>
                                    <p className="text-xs text-slate-500">Méd: {formatCurrency(niche.avgValue)}</p>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                {/* Top Origins Detail */}
                <Card className="bg-slate-800 border-slate-700">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-slate-200">
                            <TrendingUp className="w-5 h-5 text-blue-400" />
                            Top Origens (Canais)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {data.topOrigins.map((origin, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg border border-slate-700">
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-800 text-slate-300 font-bold text-sm border border-slate-600">
                                        {idx + 1}
                                    </div>
                                    <div>
                                        <p className="font-medium text-slate-200">{origin.name}</p>
                                        <p className="text-xs text-slate-400">{origin.count} vendas realizadas</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-emerald-400">{formatCurrency(origin.totalValue)}</p>
                                    <p className="text-xs text-slate-500">Ciclo: {Math.round(origin.avgCycleTime)} dias</p>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                {/* Cycle Time Stat */}
                <Card className="md:col-span-2 bg-slate-800 border-slate-700">
                    <CardContent className="flex items-center justify-between p-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-indigo-500/20 rounded-full">
                                <Clock className="w-8 h-8 text-indigo-400" />
                            </div>
                            <div>
                                <p className="text-lg font-medium text-slate-200">Ciclo Médio de Vendas</p>
                                <p className="text-sm text-slate-400">Tempo médio entre criação e fechamento</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <span className="text-4xl font-bold text-slate-100">{Math.round(data.avgCycleTime)}</span>
                            <span className="text-slate-400 ml-2">dias</span>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
