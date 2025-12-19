import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Copy, Bot } from 'lucide-react';
import { Agent, CreateAgentRequest } from '@/types/agents';
import { useAgents } from '@/hooks/useAgents';
import { useToast } from '@/hooks/use-toast';
import { AgentModal } from './AgentModal';

interface AgentManagerProps {
  onSelectAgent?: (agent: Agent) => void;
  selectedAgentId?: string;
}

export const AgentManager = ({ onSelectAgent, selectedAgentId }: AgentManagerProps) => {
  const { agents, createAgent, updateAgent, deleteAgent, duplicateAgent } = useAgents();
  const { toast } = useToast();
  
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);

  const handleCreateAgent = (agentData: CreateAgentRequest) => {
    try {
      const newAgent = createAgent(agentData);
      
      setIsCreateDialogOpen(false);
      
      toast({
        title: "Agente criado!",
        description: `O agente "${newAgent.name}" foi criado com sucesso.`
      });
    } catch (error) {
      toast({
        title: "Erro ao criar agente",
        description: "Ocorreu um erro ao criar o agente. Tente novamente.",
        variant: "destructive"
      });
    }
  };

  const handleEditAgent = (agentData: CreateAgentRequest) => {
    if (!editingAgent) return;

    try {
      updateAgent({
        id: editingAgent.id,
        ...agentData
      });
      
      toast({
        title: "Agente atualizado!",
        description: `O agente "${agentData.name}" foi atualizado com sucesso.`
      });
      
      setIsEditDialogOpen(false);
      setEditingAgent(null);
    } catch (error) {
      toast({
        title: "Erro ao atualizar agente",
        description: "Ocorreu um erro ao atualizar o agente. Tente novamente.",
        variant: "destructive"
      });
    }
  };

  const handleDeleteAgent = (agent: Agent) => {
    if (window.confirm(`Tem certeza que deseja excluir o agente "${agent.name}"?`)) {
      try {
        deleteAgent(agent.id);
        toast({
          title: "Agente excluído",
          description: `O agente "${agent.name}" foi excluído com sucesso.`
        });
      } catch (error) {
        toast({
          title: "Erro ao excluir agente",
          description: "Ocorreu um erro ao excluir o agente. Tente novamente.",
          variant: "destructive"
        });
      }
    }
  };

  const handleDuplicateAgent = (agent: Agent) => {
    try {
      const duplicated = duplicateAgent(agent.id);
      if (duplicated) {
        toast({
          title: "Agente duplicado!",
          description: `O agente "${duplicated.name}" foi criado com sucesso.`
        });
      }
    } catch (error) {
      toast({
        title: "Erro ao duplicar agente",
        description: "Ocorreu um erro ao duplicar o agente. Tente novamente.",
        variant: "destructive"
      });
    }
  };

  const openEditDialog = (agent: Agent) => {
    setEditingAgent(agent);
    setIsEditDialogOpen(true);
  };

  const openCreateDialog = () => {
    setIsCreateDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-golden-500 via-amber-500 to-yellow-500 bg-clip-text text-transparent">Gerenciar Agentes</h2>
          <p className="text-muted-foreground text-base mt-1">
            Crie e gerencie agentes com prompts personalizados para diferentes canais
          </p>
        </div>

        <Button onClick={openCreateDialog} className="flex items-center gap-2 bg-gradient-to-r from-golden-500 to-amber-500 hover:from-golden-600 hover:to-amber-600 text-white shadow-golden">
          <Plus className="w-4 h-4" />
          Novo Agente
        </Button>
      </div>

      {/* Lista de Agentes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {agents.map((agent) => (
          <Card
            key={agent.id}
            className={`cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-golden-lg border-golden-200 dark:border-golden-800 ${
              selectedAgentId === agent.id ? 'ring-2 ring-golden-500 shadow-golden' : ''
            }`}
            onClick={() => onSelectAgent?.(agent)}
          >
            <CardHeader className="pb-3 bg-gradient-to-br from-golden-50 via-amber-50/50 to-transparent dark:from-golden-950/30 dark:via-amber-950/20 dark:to-transparent border-b border-golden-200 dark:border-golden-800">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-golden-400 to-amber-500 shadow-golden">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                  <CardTitle className="text-lg bg-gradient-to-r from-golden-700 to-amber-700 dark:from-golden-300 dark:to-amber-300 bg-clip-text text-transparent">{agent.name}</CardTitle>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditDialog(agent);
                    }}
                    className="text-golden-600 dark:text-golden-400 hover:text-golden-700 dark:hover:text-golden-300 hover:bg-golden-100 dark:hover:bg-golden-900/30"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDuplicateAgent(agent);
                    }}
                    className="text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/30"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteAgent(agent);
                    }}
                    className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/30"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              {agent.description && (
                <p className="text-sm text-muted-foreground">{agent.description}</p>
              )}
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Canal:</span>
                  <span className="font-medium">{agent.channelName}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Duração:</span>
                  <span>{agent.duration} min</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Idioma:</span>
                  <Badge variant="outline">{agent.language}</Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Localização:</span>
                  <span>{agent.location}</span>
                </div>
                <div className="text-xs text-muted-foreground pt-2 border-t">
                  Criado em {agent.createdAt.toLocaleDateString('pt-BR')}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {agents.length === 0 && (
        <Card className="shadow-golden-lg border-golden-200 dark:border-golden-800">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="h-24 w-24 rounded-full bg-gradient-to-br from-golden-400/30 via-amber-400/30 to-yellow-400/30 dark:from-golden-600/20 dark:via-amber-600/20 dark:to-yellow-600/20 flex items-center justify-center mb-6 shadow-golden animate-pulse">
              <Bot className="w-12 h-12 text-golden-600 dark:text-golden-400" />
            </div>
            <h3 className="text-xl font-semibold mb-2 bg-gradient-to-r from-golden-700 to-amber-700 dark:from-golden-300 dark:to-amber-300 bg-clip-text text-transparent">
              Nenhum agente criado
            </h3>
            <p className="text-muted-foreground text-center mb-6 max-w-md">
              Crie seu primeiro agente para começar a gerar roteiros personalizados
            </p>
            <Button onClick={openCreateDialog} className="bg-gradient-to-r from-golden-500 to-amber-500 hover:from-golden-600 hover:to-amber-600 text-white shadow-golden">
              <Plus className="w-4 h-4 mr-2" />
              Criar Primeiro Agente
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Modals */}
      <AgentModal
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        onSave={handleCreateAgent}
        title="Criar Novo Agente"
      />

      <AgentModal
        isOpen={isEditDialogOpen}
        onClose={() => setIsEditDialogOpen(false)}
        onSave={handleEditAgent}
        agent={editingAgent || undefined}
        title="Editar Agente"
      />
    </div>
  );
};
