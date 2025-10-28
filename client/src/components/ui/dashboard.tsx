import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { TrendingUp, Users, ShoppingBag, DollarSign } from "lucide-react";
import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const kpis = [
  {
    iconBg: "from-cyan-500 to-blue-500",
    icon: <DollarSign className="w-5 h-5 text-white" />,
    label: "Receita Total",
    value: "R$ 842K",
    delta: "+ 12.5%",
    deltaColor: "text-emerald-400",
  },
  {
    iconBg: "from-emerald-500 to-teal-500",
    icon: <TrendingUp className="w-5 h-5 text-white" />,
    label: "NPS Médio",
    value: "72",
    delta: "+ 8.2%",
    deltaColor: "text-emerald-400",
  },
  {
    iconBg: "from-purple-500 to-indigo-600",
    icon: <ShoppingBag className="w-5 h-5 text-white" />,
    label: "Total de Vendas",
    value: "1,248",
    delta: "+ 15.3%",
    deltaColor: "text-emerald-400",
  },
  {
    iconBg: "from-violet-500 to-teal-500",
    icon: <Users className="w-5 h-5 text-white" />,
    label: "Clientes Ativos",
    value: "856",
    delta: "+ 4.1%",
    deltaColor: "text-emerald-400",
  },
];

// dados fake pro gráfico
const salesData = [
  { mes: "Jan", valor: 45_000, tendencia: 50_000 },
  { mes: "Fev", valor: 52_000, tendencia: 52_000 },
  { mes: "Mar", valor: 48_000, tendencia: 55_000 },
  { mes: "Abr", valor: 68_000, tendencia: 60_000 },
  { mes: "Mai", valor: 58_000, tendencia: 62_000 },
  { mes: "Jun", valor: 72_000, tendencia: 70_000 },
  { mes: "Jul", valor: 75_000, tendencia: 73_000 },
  { mes: "Ago", valor: 69_000, tendencia: 78_000 },
  { mes: "Set", valor: 82_000, tendencia: 82_000 },
  { mes: "Out", valor: 86_000, tendencia: 85_000 },
  { mes: "Nov", valor: 92_000, tendencia: 90_000 },
  { mes: "Dez", valor: 98_000, tendencia: 97_000 },
];

export function DashboardOverview() {
  return (
    <div className="w-full max-w-[1400px] mx-auto px-6 py-10 text-slate-100">
      {/* título geral */}
      <p className="text-slate-300 mb-6 text-sm">
        Análise de performance e métricas temporais
      </p>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        {kpis.map((kpi, i) => (
          <Card
            key={i}
            className="bg-[#0f1a2a] border border-slate-700/70 text-slate-100 shadow-[0_20px_60px_-10px_rgba(0,0,0,0.8)]"
          >
            <CardContent className="p-4 flex flex-col gap-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center justify-center w-10 h-10 rounded-md bg-gradient-to-br shadow-inner from-10% to-90% bg-clip-padding
                  bg-gradient-to-r
                  from-[rgb(0,190,255)]
                  to-[rgb(0,120,255)]
                ">
                  {kpi.icon}
                </div>
                <span
                  className={`text-xs font-medium ${kpi.deltaColor}`}
                >
                  {kpi.delta}
                </span>
              </div>

              <div className="flex flex-col">
                <span className="text-xs text-slate-400">{kpi.label}</span>
                <span className="text-xl font-semibold text-white leading-tight">
                  {kpi.value}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Performance de vendas */}
      <Card className="bg-[#0f1a2a] border border-slate-700/70 text-slate-100 mb-8 shadow-[0_20px_60px_-10px_rgba(0,0,0,0.8)]">
        <CardHeader className="pb-2">
          <CardTitle className="text-slate-100 text-base font-medium">
            Performance de Vendas
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={salesData} margin={{ left: 16, right: 16, top: 16, bottom: 16 }}>
                <CartesianGrid
                  stroke="rgba(226,232,240,0.08)" // grid bem suave
                  strokeDasharray="4 4"
                  vertical={false}
                />
                <XAxis
                  dataKey="mes"
                  stroke="#94a3b8"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 12 }}
                />
                <YAxis
                  stroke="#94a3b8"
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: number) => `R$${Math.round(v / 1000)}k`}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1e293b",
                    border: "1px solid #334155",
                    borderRadius: "0.5rem",
                    color: "white",
                    fontSize: "0.75rem",
                  }}
                  labelStyle={{ color: "#cbd5e1", fontWeight: 500 }}
                  formatter={(value: number) => [`R$ ${value.toLocaleString("pt-BR")}`, "Vendas"]}
                />
                {/* linha tendência (tracejada cinza) */}
                <Line
                  type="monotone"
                  dataKey="tendencia"
                  stroke="#94a3b8"
                  strokeDasharray="4 4"
                  strokeWidth={2}
                  dot={false}
                />
                {/* linha vendas (ciano brilhando) */}
                <Line
                  type="monotone"
                  dataKey="valor"
                  stroke="#06b6d4"
                  strokeWidth={3}
                  activeDot={{
                    r: 5,
                    fill: "#06b6d4",
                    stroke: "#0f172a",
                    strokeWidth: 2,
                  }}
                  dot={{ r: 4, fill: "#06b6d4", strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* parte de baixo (cards menores tipo distribuição de clientes / evolução NPS)
         você ainda não me mostrou o resto do layout mas já deixo um grid pronto pra encaixar */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="bg-[#0f1a2a] border border-slate-700/70 text-slate-100 min-h-[220px] shadow-[0_20px_60px_-10px_rgba(0,0,0,0.8)]">
          <CardHeader className="pb-2">
            <CardTitle className="text-slate-100 text-base font-medium">
              Distribuição de Clientes
            </CardTitle>
          </CardHeader>
          <CardContent className="text-slate-400 text-sm">
            {/* espaço pra pizza chart / barras horizontais etc */}
            <div className="h-[160px] flex items-center justify-center text-slate-500 text-xs">
              (gráfico de distribuição aqui)
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#0f1a2a] border border-slate-700/70 text-slate-100 min-h-[220px] shadow-[0_20px_60px_-10px_rgba(0,0,0,0.8)]">
          <CardHeader className="pb-2">
            <CardTitle className="text-slate-100 text-base font-medium">
              Evolução do NPS
            </CardTitle>
          </CardHeader>
          <CardContent className="text-slate-400 text-sm">
            <div className="h-[160px] flex items-center justify-center text-slate-500 text-xs">
              (gráfico de NPS aqui)
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default DashboardOverview;
