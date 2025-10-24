// src/components/DataVizDashboard.tsx

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart } from "lucide-react";
import VisualToggle from "@/components/dashboard/VisualToggle";
import UserProfileDropdown from "@/components/ui/userProfileDropdown";

export default function DataVizDashboard() {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 border-b border-slate-700 backdrop-blur-md bg-slate-900/60">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-md bg-gradient-to-r from-blue-500 to-teal-500">
            <BarChart className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-teal-400">
              DataViz Analytics
            </h1>
            <p className="text-xs text-slate-400">Visualização Inteligente de Dados</p>
          </div>
          <VisualToggle />
        </div>
        <UserProfileDropdown />
      </header>

      <div className="h-20" />

      <main className="container p-6 mx-auto mt-4 space-y-6">
        {/* Bem-vindo */}
        <motion.div
          whileHover={{ scale: 1.02, boxShadow: "0px 4px 20px rgba(56,189,248,0.2)" }}
          transition={{ type: "spring", stiffness: 200 }}
        >
          <Card className="transition-all bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-2xl text-teal-400">Bem-vindo ao DataViz</CardTitle>
              <p className="text-sm text-slate-300">
                Selecione uma planilha ou Visualização de Dashboard.
              </p>
            </CardHeader>
          </Card>
        </motion.div>

        {/* Filtros */}
        <motion.div
          whileHover={{ scale: 1.02, boxShadow: "0px 4px 25px rgba(20,184,166,0.25)" }}
          transition={{ type: "spring", stiffness: 220 }}
        >
          <Card className="transition-all bg-slate-800 border-slate-700">
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <AnimatedSelect label="Selecionar Planilha">
                  <SelectItem
                    value="planilha1"
                    className="text-slate-300 transition-all rounded-md
                      data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-green-500/40 data-[state=checked]:via-cyan-500/40 data-[state=checked]:to-purple-500/40
                      data-[state=checked]:border data-[state=checked]:border-cyan-400/40
                      hover:bg-gradient-to-r hover:from-green-500/20 hover:via-cyan-500/20 hover:to-purple-500/20
                      hover:border hover:border-cyan-400/30"
                  >
                    Planilha Financeira
                  </SelectItem>

                  <SelectItem
                    value="planilha2"
                    className="text-slate-300 transition-all rounded-md
                      data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-green-500/40 data-[state=checked]:via-cyan-500/40 data-[state=checked]:to-purple-500/40
                      data-[state=checked]:border data-[state=checked]:border-cyan-400/40
                      hover:bg-gradient-to-r hover:from-green-500/20 hover:via-cyan-500/20 hover:to-purple-500/20
                      hover:border hover:border-cyan-400/30"
                  >
                    Planilha de Vendas
                  </SelectItem>

                  <SelectItem
                    value="planilha3"
                    className="text-slate-300 transition-all rounded-md
                      data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-green-500/40 data-[state=checked]:via-cyan-500/40 data-[state=checked]:to-purple-500/40
                      data-[state=checked]:border data-[state=checked]:border-cyan-400/40
                      hover:bg-gradient-to-r hover:from-green-500/20 hover:via-cyan-500/20 hover:to-purple-500/20
                      hover:border hover:border-cyan-400/30"
                  >
                    Planilha de RH
                  </SelectItem>
                </AnimatedSelect>
                <AnimatedSelect label="Filtrar por Área">
                  <SelectItem
                      value="todos" 
                      className="text-slate-300 transition-all rounded-md
                      data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-green-500/40 data-[state=checked]:via-cyan-500/40 data-[state=checked]:to-purple-500/40
                      data-[state=checked]:border data-[state=checked]:border-cyan-400/40
                      hover:bg-gradient-to-r hover:from-green-500/20 hover:via-cyan-500/20 hover:to-purple-500/20
                      hover:border hover:border-cyan-400/30"
                  >
                    Todas as áreas
                  </SelectItem>
                  <SelectItem
                    value="financeiro"
                    className="text-slate-300 transition-all rounded-md
                      data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-green-500/40 data-[state=checked]:via-cyan-500/40 data-[state=checked]:to-purple-500/40
                      data-[state=checked]:border data-[state=checked]:border-cyan-400/40
                      hover:bg-gradient-to-r hover:from-green-500/20 hover:via-cyan-500/20 hover:to-purple-500/20
                      hover:border hover:border-cyan-400/30"
                  >
                    Financeiro
                  </SelectItem>
                  <SelectItem
                    value="vendas"
                    className="text-slate-300 transition-all rounded-md
                      data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-green-500/40 data-[state=checked]:via-cyan-500/40 data-[state=checked]:to-purple-500/40
                      data-[state=checked]:border data-[state=checked]:border-cyan-400/40
                      hover:bg-gradient-to-r hover:from-green-500/20 hover:via-cyan-500/20 hover:to-purple-500/20
                      hover:border hover:border-cyan-400/30"
                  >
                    Vendas
                  </SelectItem>
                  <SelectItem
                    value="rh"
                    className="text-slate-300 transition-all rounded-md
                      data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-green-500/40 data-[state=checked]:via-cyan-500/40 data-[state=checked]:to-purple-500/40
                      data-[state=checked]:border data-[state=checked]:border-cyan-400/40
                      hover:bg-gradient-to-r hover:from-green-500/20 hover:via-cyan-500/20 hover:to-purple-500/20
                      hover:border hover:border-cyan-400/30"
                  >
                    RH
                  </SelectItem>
                </AnimatedSelect>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Placeholder */}
        <motion.div
          whileHover={{ scale: 1.01, boxShadow: "0px 4px 30px rgba(59,130,246,0.15)" }}
          transition={{ type: "spring", stiffness: 180 }}
        >
          <Card className="bg-slate-800 border-slate-700 h-[400px] flex flex-col items-center justify-center space-y-4">
            <BarChart className="w-12 h-12 text-slate-500" />
            <div className="text-center">
              <h3 className="text-lg font-semibold text-slate-200">Selecione uma planilha para começar</h3>
              <p className="max-w-md mt-2 text-sm text-slate-400">
                Escolha uma planilha acima para visualizar os dados e gráficos disponíveis para sua função e área.
              </p>
            </div>
          </Card>
        </motion.div>
      </main>
    </div>
  );
}

/* Subcomponente com animação nos Selects */
function AnimatedSelect({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <motion.div whileHover={{ scale: 1.02 }} transition={{ type: "spring", stiffness: 300 }}>
      <label className="block mb-2 text-sm font-medium text-slate-300">{label}</label>
      <Select>
        <SelectTrigger className="w-full transition-all bg-slate-700 border-slate-600 text-slate-100 hover:bg-slate-600">
          <SelectValue placeholder="Selecione..." />
        </SelectTrigger>
        <SelectContent className="bg-slate-800 border-slate-600">
          {children}
        </SelectContent>
      </Select>
    </motion.div>
  );
}
