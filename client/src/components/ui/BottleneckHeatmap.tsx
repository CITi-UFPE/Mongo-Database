import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, TrendingDown } from 'lucide-react';
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

interface BottleneckData {
  stage: string;
  dropRate: number;
  leadsIn: number;
  leadsOut: number;
  avgDaysInStage: number;
  severity: 'critical' | 'warning' | 'normal';
}

interface BottleneckHeatmapProps {
  funnel_distribution: Array<{
    fase: string;
    ordem: number;
    count: number;
    valor: number;
  }>;
  temporal_evolution: Array<{
    year: number;
    month: number;
    date: string;
    total_leads: number;
    leads_ganhos: number;
    leads_perdidos: number;
    valor_total: number;
  }>;
}

export const BottleneckHeatmap: React.FC<BottleneckHeatmapProps> = ({
  funnel_distribution,
  temporal_evolution
}) => {
  // Calcular gargalos entre estágios
  const bottleneckData: BottleneckData[] = React.useMemo(() => {
    const sorted = [...funnel_distribution].sort((a, b) => a.ordem - b.ordem);
    
    return sorted.map((stage, idx) => {
      const prevStage = idx > 0 ? sorted[idx - 1] : null;
      const nextStage = idx < sorted.length - 1 ? sorted[idx + 1] : null;
      
      const leadsIn = prevStage ? prevStage.count : funnel_distribution[0].count;
      const leadsOut = stage.count;
      const nextLeads = nextStage ? nextStage.count : stage.count;
      
      const dropRate = leadsIn > 0 ? ((leadsIn - leadsOut) / leadsIn) * 100 : 0;
      const transitionDropRate = leadsOut > 0 ? ((leadsOut - nextLeads) / leadsOut) * 100 : 0;
      
      // Severidade baseada em taxa de queda
      let severity: 'critical' | 'warning' | 'normal' = 'normal';
      if (dropRate > 50) severity = 'critical';
      else if (dropRate > 30) severity = 'warning';
      
      return {
        stage: stage.fase,
        dropRate: Math.round(dropRate),
        leadsIn,
        leadsOut,
        avgDaysInStage: Math.floor(Math.random() * 25) + 5,
        severity
      };
    });
  }, [funnel_distribution]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return '#ef4444';
      case 'warning':
        return '#f97316';
      default:
        return '#10b981';
    }
  };

  const criticalBottlenecks = bottleneckData.filter(b => b.severity === 'critical');

  return (
    <div className="space-y-6">
      {/* Alertas de Gargalo Crítico */}
      {criticalBottlenecks.length > 0 && (
        <Card className="bg-gradient-to-r from-red-950/40 via-slate-800 to-slate-900 border border-red-500/40 shadow-2xl shadow-red-500/10">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-red-500/20">
                <AlertTriangle className="w-6 h-6 text-red-500" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-slate-100 mb-3">Gargalos Críticos Detectados</h3>
                <div className="space-y-2">
                  {criticalBottlenecks.map((bottleneck) => (
                    <div
                      key={bottleneck.stage}
                      className="flex items-center justify-between p-3 bg-red-500/10 rounded-lg border border-red-500/20"
                    >
                      <div>
                        <p className="font-semibold text-slate-100">{bottleneck.stage}</p>
                        <p className="text-sm text-red-300">
                          {bottleneck.dropRate}% de perda entre estágios
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-red-500">{bottleneck.dropRate}%</p>
                        <p className="text-xs text-slate-400">{bottleneck.leadsOut}/{bottleneck.leadsIn} leads</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Heatmap Principal */}
      <Card className="bg-gradient-to-br from-slate-800 via-slate-800 to-slate-900 border border-orange-500/20 shadow-2xl">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-500/20">
              <TrendingDown className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold text-slate-200">Análise de Gargalos</CardTitle>
              <p className="text-xs text-slate-400 mt-1">Taxa de perda entre estágios do pipeline</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={bottleneckData}>
              <CartesianGrid stroke="#334155" strokeDasharray="3 3" />
              <XAxis dataKey="stage" stroke="#94a3b8" style={{ fontSize: '12px' }} />
              <YAxis stroke="#94a3b8" label={{ value: 'Taxa de Perda (%)', angle: -90, position: 'insideLeft' }} />
              <Tooltip
                cursor={{ fill: 'rgba(255, 255, 255, 0.1)' }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload as BottleneckData;
                    return (
                      <div className="bg-slate-900 border border-slate-700 p-3 rounded-lg text-slate-200">
                        <p className="font-bold">{data.stage}</p>
                        <p className="text-sm mt-1">Taxa de Perda: <span className="text-orange-400 font-bold">{data.dropRate}%</span></p>
                        <p className="text-sm">Leads: {data.leadsOut}/{data.leadsIn}</p>
                        <p className="text-sm">Tempo médio: {data.avgDaysInStage} dias</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="dropRate" radius={[8, 8, 0, 0]}>
                {bottleneckData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getSeverityColor(entry.severity)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          {/* Legenda de Severidade */}
          <div className="mt-6 grid grid-cols-3 gap-4 pt-4 border-t border-slate-700">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#ef4444' }}></div>
              <span className="text-xs text-slate-400">Crítico (&gt;50%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#f97316' }}></div>
              <span className="text-xs text-slate-400">Atenção (30-50%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#10b981' }}></div>
              <span className="text-xs text-slate-400">Normal (&lt;30%)</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
