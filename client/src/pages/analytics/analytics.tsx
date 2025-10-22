// src/components/DataVizDashboard.tsx

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BarChart } from "lucide-react";
import IndicatorRow  from "@/components/dashboard/IndicatorRow";
import UserProfileDropdown from "@/components/ui/userProfileDropdown";

export default function DataVizDashboard() {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      {/* Header */}
      <IndicatorRow />
      <header className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
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
        </div>

        <UserProfileDropdown />
      </header>

      <main className="container p-6 mx-auto space-y-6">
        {/* Bem-vindo */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-2xl text-teal-400">Bem-vindo ao DataViz</CardTitle>
            <p className="text-sm text-slate-300">
              Selecione uma planilha e área para visualizar os dados da sua empresa
            </p>
          </CardHeader>
        </Card>

        {/* Filtros */}
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="flex items-center block gap-1 mb-2 text-sm font-medium">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-teal-400">
                    <rect x="3" y="3" width="7" height="7"></rect>
                    <rect x="14" y="3" width="7" height="7"></rect>
                    <rect x="3" y="14" width="7" height="7"></rect>
                    <rect x="14" y="14" width="7" height="7"></rect>
                  </svg>
                  Selecionar Planilha
                </label>
                <Select>
                  <SelectTrigger className="w-full bg-slate-700 border-slate-600 text-slate-100">
                    <SelectValue placeholder="Escolha uma planilha" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-600">
                    <SelectItem value="planilha1" className="text-slate-100 hover:bg-slate-700">Planilha Financeira</SelectItem>
                    <SelectItem value="planilha2" className="text-slate-100 hover:bg-slate-700">Planilha de Vendas</SelectItem>
                    <SelectItem value="planilha3" className="text-slate-100 hover:bg-slate-700">Planilha de RH</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="flex items-center block gap-1 mb-2 text-sm font-medium">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-teal-400">
                    <path d="M12 2v10m0 0a8 8 0 100 16 8 8 0 000-16z"></path>
                  </svg>
                  Filtrar por Área
                </label>
                <Select>
                  <SelectTrigger className="w-full bg-slate-700 border-slate-600 text-slate-100">
                    <SelectValue placeholder="Todas as áreas" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-600">
                    <SelectItem value="todos" className="text-slate-100 hover:bg-slate-700">Todas as áreas</SelectItem>
                    <SelectItem value="financeiro" className="text-slate-100 hover:bg-slate-700">Financeiro</SelectItem>
                    <SelectItem value="vendas" className="text-slate-100 hover:bg-slate-700">Vendas</SelectItem>
                    <SelectItem value="rh" className="text-slate-100 hover:bg-slate-700">RH</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Área Central - Placeholder */}
        <Card className="bg-slate-800 border-slate-700 h-[400px] flex flex-col items-center justify-center space-y-4">
          <BarChart className="w-12 h-12 text-slate-500" />
          <div className="text-center">
            <h3 className="text-lg font-semibold text-slate-200">Selecione uma planilha para começar</h3>
            <p className="max-w-md mt-2 text-sm text-slate-400">
              Escolha uma planilha acima para visualizar os dados e gráficos disponíveis para sua função e área.
            </p>
          </div>
        </Card>
      </main>
    </div>
  );
}