// src/components/crm/LeadsPipeline.tsx

import { useState, useMemo } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Building2, User, DollarSign, Calendar, ChevronRight } from 'lucide-react';

type Lead = {
  _id: string;
  id_empresa: { nome_empresa: string };
  id_contato: { nome: string };
  id_fase_atual: { _id: string; nome_fase: string; ordem: number };
  valor_estimado: number;
  status: 'Aberto' | 'Ganho' | 'Perdido';
  createdAt: string;
};

type Fase = {
  _id: string;
  nome_fase: string;
  ordem: number;
};

type PipelineProps = {
  leads: Lead[];
  fases: Fase[];
  onLeadClick: (lead: Lead) => void;
  onMoveLeadToPhase: (leadId: string, newPhaseId: string) => void;
};

export function LeadsPipeline({ leads, fases, onLeadClick, onMoveLeadToPhase }: PipelineProps) {
  const leadsByPhase = useMemo(() => {
    const grouped: Record<string, Lead[]> = {};
    
    fases.forEach(fase => {
      grouped[fase._id] = leads.filter(
        lead => lead.id_fase_atual?._id === fase._id && lead.status === 'Aberto'
      );
    });

    return grouped;
  }, [leads, fases]);

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;

    const { source, destination, draggableId } = result;

    if (source.droppableId === destination.droppableId) return;

    onMoveLeadToPhase(draggableId, destination.droppableId);
  };

  const sortedFases = [...fases].sort((a, b) => a.ordem - b.ordem);

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex gap-4 pb-4 overflow-x-auto">
        {sortedFases.map((fase) => {
          const leadsNaFase = leadsByPhase[fase._id] || [];
          const valorTotal = leadsNaFase.reduce((sum, l) => sum + (l.valor_estimado || 0), 0);

          return (
            <div key={fase._id} className="flex-shrink-0 w-80">
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg text-slate-200">
                      {fase.nome_fase}
                    </CardTitle>
                    <Badge variant="secondary" className="bg-slate-700 text-slate-200">
                      {leadsNaFase.length}
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-400">
                    R$ {(valorTotal / 1000).toFixed(1)}K
                  </p>
                </CardHeader>

                <Droppable droppableId={fase._id}>
                    {(provided: import('@hello-pangea/dnd').DroppableProvided, snapshot: import('@hello-pangea/dnd').DroppableStateSnapshot) => (
                    <CardContent
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`space-y-3 min-h-[500px] p-4 ${
                      snapshot.isDraggingOver ? 'bg-slate-700/50' : ''
                      }`}
                    >
                      {(leadsNaFase as Lead[]).map((lead: Lead, index: number) => (
                      <Draggable
                        key={lead._id}
                        draggableId={lead._id}
                        index={index}
                      >
                        {(providedDraggable: import('@hello-pangea/dnd').DraggableProvided, snapshotDraggable: import('@hello-pangea/dnd').DraggableStateSnapshot) => (
                        <div
                          ref={providedDraggable.innerRef}
                          {...providedDraggable.draggableProps}
                          {...providedDraggable.dragHandleProps}
                          className={`${
                          snapshotDraggable.isDragging ? 'rotate-2 scale-105' : ''
                          }`}
                        >
                          <LeadCard lead={lead} onClick={() => onLeadClick(lead)} />
                        </div>
                        )}
                      </Draggable>
                      ))}
                      {provided.placeholder}
                    </CardContent>
                    )}
                </Droppable>
              </Card>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
}

function LeadCard({ lead, onClick }: { lead: Lead; onClick: () => void }) {
  return (
    <Card
      className="transition-colors cursor-pointer bg-slate-700/60 border-slate-600 hover:bg-slate-700"
      onClick={onClick}
    >
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold truncate text-slate-100">
              {lead.id_empresa?.nome_empresa || 'Empresa não informada'}
            </h4>
            <p className="text-xs truncate text-slate-400">
              {lead.id_contato?.nome || 'Contato não informado'}
            </p>
          </div>
          <ChevronRight className="flex-shrink-0 w-4 h-4 text-slate-500" />
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400">
          <DollarSign className="w-3 h-3" />
          <span className="font-semibold text-teal-400">
            R$ {(lead.valor_estimado / 1000).toFixed(1)}K
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Calendar className="w-3 h-3" />
          <span>
            {new Date(lead.createdAt).toLocaleDateString('pt-BR')}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
