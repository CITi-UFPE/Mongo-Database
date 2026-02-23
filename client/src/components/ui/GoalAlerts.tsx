import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle, CheckCircle, Clock, TrendingUp } from 'lucide-react';

interface GoalAlertProps {
  kpis: {
    totalLeads: number;
    leadsAbertos: number;
    leadsGanhos: number;
    leadsPerdidos: number;
    taxaConversao: number;
    taxaPerda: number;
    valorPipeline: number;
    valorGanho: number;
    ticketMedio: number;
  };
  monthlyGoals?: {
    leadTarget: number;
    conversionTarget: number;
    revenueTarget: number;
    retentionTarget: number;
  };
}

interface Alert {
  type: 'critical' | 'warning' | 'success' | 'info';
  title: string;
  description: string;
  icon: React.ReactNode;
  metric: string;
  current: number;
  target: number;
  percentage: number;
  actionable: boolean;
}

const GOAL_DEFAULTS = {
  leadTarget: 150,
  conversionTarget: 35,
  revenueTarget: 200000,
  retentionTarget: 80
};

export const GoalAlerts: React.FC<GoalAlertProps> = ({ kpis, monthlyGoals = GOAL_DEFAULTS }) => {
  const alerts = React.useMemo(() => {
    const alertsList: Alert[] = [];

    // Alerta de Meta de Leads
    const leadProgress = (kpis.leadsGanhos / monthlyGoals.leadTarget) * 100;
    if (leadProgress < 50) {
      alertsList.push({
        type: 'critical',
        title: 'Meta de Leads Crítica',
        description: 'Apenas metade da meta de leads foi alcançada',
        icon: <AlertCircle className="w-5 h-5" />,
        metric: 'Leads Ganhos',
        current: kpis.leadsGanhos,
        target: monthlyGoals.leadTarget,
        percentage: leadProgress,
        actionable: true
      });
    } else if (leadProgress < 75) {
      alertsList.push({
        type: 'warning',
        title: 'Meta de Leads em Risco',
        description: 'Acceleração necessária para atingir a meta',
        icon: <Clock className="w-5 h-5" />,
        metric: 'Leads Ganhos',
        current: kpis.leadsGanhos,
        target: monthlyGoals.leadTarget,
        percentage: leadProgress,
        actionable: true
      });
    }

    // Alerta de Taxa de Conversão
    if (kpis.taxaConversao < monthlyGoals.conversionTarget - 15) {
      alertsList.push({
        type: 'warning',
        title: 'Taxa de Conversão Baixa',
        description: `Está ${(monthlyGoals.conversionTarget - kpis.taxaConversao).toFixed(1)}% abaixo da meta`,
        icon: <TrendingUp className="w-5 h-5" />,
        metric: 'Taxa Conversão',
        current: kpis.taxaConversao,
        target: monthlyGoals.conversionTarget,
        percentage: (kpis.taxaConversao / monthlyGoals.conversionTarget) * 100,
        actionable: true
      });
    }

    // Alerta de Receita
    const revenueProgress = (kpis.valorGanho / monthlyGoals.revenueTarget) * 100;
    if (revenueProgress < 50) {
      alertsList.push({
        type: 'critical',
        title: 'Meta de Receita Crítica',
        description: 'Apenas a metade do faturamento esperado foi alcançado',
        icon: <AlertCircle className="w-5 h-5" />,
        metric: 'Faturamento',
        current: kpis.valorGanho,
        target: monthlyGoals.revenueTarget,
        percentage: revenueProgress,
        actionable: true
      });
    } else if (revenueProgress < 75) {
      alertsList.push({
        type: 'warning',
        title: 'Meta de Receita em Risco',
        description: 'Precisa de um push final para alcançar o objetivo',
        icon: <Clock className="w-5 h-5" />,
        metric: 'Faturamento',
        current: kpis.valorGanho,
        target: monthlyGoals.revenueTarget,
        percentage: revenueProgress,
        actionable: true
      });
    }

    // Alertas Positivos
    if (kpis.leadsAbertos > 0) {
      alertsList.push({
        type: 'info',
        title: 'Pipeline Aquecido',
        description: `${kpis.leadsAbertos} leads ativos prontos para converter`,
        icon: <CheckCircle className="w-5 h-5" />,
        metric: 'Leads Abertos',
        current: kpis.leadsAbertos,
        target: monthlyGoals.leadTarget,
        percentage: (kpis.leadsAbertos / monthlyGoals.leadTarget) * 100,
        actionable: false
      });
    }

    return alertsList;
  }, [kpis, monthlyGoals]);

  const getAlertColor = (type: string) => {
    switch (type) {
      case 'critical':
        return 'from-red-950/40 to-red-950/20 border-red-500/40 bg-red-500/5';
      case 'warning':
        return 'from-amber-950/40 to-amber-950/20 border-amber-500/40 bg-amber-500/5';
      case 'success':
        return 'from-green-950/40 to-green-950/20 border-green-500/40 bg-green-500/5';
      case 'info':
        return 'from-blue-950/40 to-blue-950/20 border-blue-500/40 bg-blue-500/5';
      default:
        return 'from-slate-800 to-slate-900 border-slate-700';
    }
  };

  const getIconColor = (type: string) => {
    switch (type) {
      case 'critical':
        return 'text-red-500';
      case 'warning':
        return 'text-amber-500';
      case 'success':
        return 'text-green-500';
      case 'info':
        return 'text-blue-500';
      default:
        return 'text-slate-400';
    }
  };

  const getProgressBarColor = (type: string) => {
    switch (type) {
      case 'critical':
        return 'bg-gradient-to-r from-red-500 to-red-600';
      case 'warning':
        return 'bg-gradient-to-r from-amber-500 to-amber-600';
      case 'success':
        return 'bg-gradient-to-r from-green-500 to-green-600';
      case 'info':
        return 'bg-gradient-to-r from-blue-500 to-blue-600';
      default:
        return 'bg-gradient-to-r from-slate-500 to-slate-600';
    }
  };

  if (alerts.length === 0) {
    return (
      <Card className="bg-gradient-to-br from-green-950/30 via-slate-800 to-slate-900 border border-green-500/40 shadow-2xl">
        <CardContent className="p-8">
          <div className="flex items-center justify-center gap-4">
            <div className="p-4 rounded-full bg-green-500/20">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-slate-100">Metas no Caminho Certo!</h3>
              <p className="text-slate-400 mt-1">Todos os objetivos estão sendo alcançados normalmente</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {alerts.map((alert, idx) => (
        <Card
          key={idx}
          className={`bg-gradient-to-br ${getAlertColor(alert.type)} border shadow-lg transition-all duration-300 hover:shadow-xl`}
        >
          <CardContent className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4 flex-1">
                <div className={`p-3 rounded-lg bg-opacity-20 flex-shrink-0`}>
                  <div className={getIconColor(alert.type)}>
                    {alert.icon}
                  </div>
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-slate-100 mb-1">{alert.title}</h4>
                  <p className="text-sm text-slate-400 mb-3">{alert.description}</p>

                  {/* Progress Bar */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">{alert.metric}</span>
                      <span className="font-semibold text-slate-200">
                        {typeof alert.current === 'number' && alert.current >= 1000
                          ? `R$ ${(alert.current / 1000).toFixed(0)}K`
                          : Math.round(alert.current)}
                        {' / '}
                        {typeof alert.target === 'number' && alert.target >= 1000
                          ? `R$ ${(alert.target / 1000).toFixed(0)}K`
                          : Math.round(alert.target)}
                      </span>
                    </div>
                    <div className="w-full bg-slate-700/50 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full ${getProgressBarColor(alert.type)} rounded-full transition-all duration-500`}
                        style={{ width: `${Math.min(alert.percentage, 100)}%` }}
                      ></div>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Progresso</span>
                      <span className={alert.percentage >= 100 ? 'text-green-400' : 'text-slate-400'}>
                        {alert.percentage.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* CTA */}
              {alert.actionable && (
                <button
                  className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 text-xs font-semibold transition-colors flex-shrink-0"
                >
                  Ação
                </button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
