import React, { useEffect, useState } from 'react';
import axios from '../../config/axiosConfig';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'; // Caso utilize algum componente de card

const SpreadsheetList = () => {
  const [spreadsheets, setSpreadsheets] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Carrega as planilhas do backend
  useEffect(() => {
    const fetchSpreadsheets = async () => {
      try {
        const response = await axios.get('/api/spreadsheet/'); // Requisição para a lista de planilhas
        setSpreadsheets(response.data);
      } catch (error) {
        console.error('Erro ao buscar planilhas:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchSpreadsheets();
  }, []);

  // Função de navegação para exibir o detalhe da planilha
  const handleClick = (name: string) => {
    navigate(`/spreadsheet/${name}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-slate-500">Carregando planilhas...</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {spreadsheets.length === 0 ? (
        <p className="text-slate-400">Nenhuma planilha disponível.</p>
      ) : (
        spreadsheets.map((spreadsheet) => (
          <Card key={spreadsheet} className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-xl text-teal-400">Planilha: {spreadsheet}</CardTitle>
            </CardHeader>
            <CardContent>
              <button
                onClick={() => handleClick(spreadsheet)}
                className="px-4 py-2 mt-2 text-sm bg-teal-500 rounded-md text-slate-100 hover:bg-teal-400"
              >
                Ver Detalhes
              </button>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
};

export default SpreadsheetList;
