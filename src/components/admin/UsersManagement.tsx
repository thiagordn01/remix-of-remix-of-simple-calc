import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface UserProfile {
  id: string;
  name: string | null;
  email: string;
  is_approved: boolean;
  created_at: string;
  access_expires_at: string | null;
  days_remaining: number | null;
}

interface UsersManagementProps {
  profiles: UserProfile[];
  onRefresh: () => void;
}

export function UsersManagement({ profiles, onRefresh }: UsersManagementProps) {
  const { toast } = useToast();
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [showTimeDialog, setShowTimeDialog] = useState(false);
  const [days, setDays] = useState<string>("");
  const [hours, setHours] = useState<string>("");
  const [specificDateTime, setSpecificDateTime] = useState<string>("");

  const revokeAccess = async (userId: string) => {
    const { error } = await supabase
      .from("profiles")
      .update({ is_approved: false })
      .eq("id", userId);

    if (error) {
      toast({
        title: "Erro ao revogar acesso",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "✓ Acesso revogado com sucesso" });
      onRefresh();
    }
  };

  const approveUser = async (userId: string) => {
    const { error } = await supabase
      .from("profiles")
      .update({ is_approved: true })
      .eq("id", userId);

    if (error) {
      toast({
        title: "Erro ao aprovar usuário",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "✓ Usuário aprovado com sucesso" });
      onRefresh();
    }
  };

  const openTimeDialog = (user: UserProfile) => {
    setSelectedUser(user);
    setShowTimeDialog(true);
    setDays("");
    setHours("");
    setSpecificDateTime("");
  };

  const handleAddTime = async () => {
    if (!selectedUser) return;

    const daysNum = parseInt(days, 10) || 0;
    const hoursNum = parseInt(hours, 10) || 0;

    if (daysNum === 0 && hoursNum === 0) {
      toast({
        title: "Valor inválido",
        description: "Por favor, insira dias ou horas",
        variant: "destructive",
      });
      return;
    }

    let newExpirationDate: Date;

    if (selectedUser.access_expires_at) {
      const currentExpiration = new Date(selectedUser.access_expires_at);
      if (currentExpiration < new Date()) {
        newExpirationDate = new Date();
      } else {
        newExpirationDate = currentExpiration;
      }
    } else {
      newExpirationDate = new Date();
    }

    newExpirationDate.setDate(newExpirationDate.getDate() + daysNum);
    newExpirationDate.setHours(newExpirationDate.getHours() + hoursNum);

    const { error } = await supabase
      .from("profiles")
      .update({
        access_expires_at: newExpirationDate.toISOString(),
        is_approved: true,
      })
      .eq("id", selectedUser.id);

    if (error) {
      toast({
        title: "Erro ao adicionar tempo",
        description: error.message,
        variant: "destructive",
      });
    } else {
      const timeStr = [];
      if (daysNum > 0) timeStr.push(`${daysNum} dia${daysNum > 1 ? 's' : ''}`);
      if (hoursNum > 0) timeStr.push(`${hoursNum} hora${hoursNum > 1 ? 's' : ''}`);

      toast({
        title: "✓ Tempo adicionado",
        description: `${timeStr.join(' e ')} adicionado${timeStr.length > 1 ? 's' : ''} ao acesso`,
      });
      setShowTimeDialog(false);
      setSelectedUser(null);
      onRefresh();
    }
  };

  const handleSetSpecificDate = async () => {
    if (!selectedUser || !specificDateTime) return;

    const newDate = new Date(specificDateTime);
    const now = new Date();

    if (newDate <= now) {
      toast({
        title: "Data inválida",
        description: "A data deve ser no futuro",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        access_expires_at: newDate.toISOString(),
        is_approved: true,
      })
      .eq("id", selectedUser.id);

    if (error) {
      toast({
        title: "Erro ao definir data",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "✓ Data definida",
        description: `Acesso expira em ${formatDateTime(newDate.toISOString())}`,
      });
      setShowTimeDialog(false);
      setSelectedUser(null);
      onRefresh();
    }
  };

  const handleSetPermanentAccess = async () => {
    if (!selectedUser) return;

    const { error } = await supabase
      .from("profiles")
      .update({
        access_expires_at: null,
        is_approved: true,
      })
      .eq("id", selectedUser.id);

    if (error) {
      toast({
        title: "Erro ao definir acesso permanente",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "✓ Acesso permanente definido",
      });
      setShowTimeDialog(false);
      setSelectedUser(null);
      onRefresh();
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (user: UserProfile) => {
    if (!user.is_approved) {
      return <Badge variant="secondary">Não aprovado</Badge>;
    }

    if (user.access_expires_at) {
      const daysRemaining = user.days_remaining ?? 0;
      if (daysRemaining <= 0) {
        return <Badge variant="destructive">Expirado</Badge>;
      } else if (daysRemaining <= 7) {
        return <Badge className="bg-yellow-500 hover:bg-yellow-600">Expira em breve</Badge>;
      } else {
        return <Badge className="bg-green-600 hover:bg-green-700">Ativo</Badge>;
      }
    }

    return <Badge className="bg-blue-600 hover:bg-blue-700">Permanente</Badge>;
  };

  const getTimeRemainingText = (user: UserProfile) => {
    if (!user.access_expires_at) {
      return "∞";
    }

    const expirationDate = new Date(user.access_expires_at);
    const now = new Date();
    const diffMs = expirationDate.getTime() - now.getTime();

    if (diffMs <= 0) {
      return "Expirado";
    }

    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) {
      return `${days}d ${hours}h`;
    } else {
      return `${hours}h`;
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Gerenciamento de Usuários</CardTitle>
              <CardDescription>
                Gerencie usuários, períodos de acesso e permissões
              </CardDescription>
            </div>
            <Button onClick={onRefresh} variant="outline">
              ↻ Atualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[150px]">Nome</TableHead>
                    <TableHead className="min-w-[200px]">Email</TableHead>
                    <TableHead className="min-w-[100px]">Cadastro</TableHead>
                    <TableHead className="min-w-[120px]">Status</TableHead>
                    <TableHead className="min-w-[120px]">Tempo Restante</TableHead>
                    <TableHead className="text-right min-w-[200px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                {profiles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Nenhum usuário encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  profiles.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        {user.name || <span className="text-muted-foreground">Sem nome</span>}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {user.email}
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDate(user.created_at)}
                      </TableCell>
                      <TableCell>{getStatusBadge(user)}</TableCell>
                      <TableCell className="font-mono text-sm">
                        {getTimeRemainingText(user)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openTimeDialog(user)}
                          >
                            ⏱ Tempo
                          </Button>
                          {user.is_approved ? (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => revokeAccess(user.id)}
                            >
                              ✕ Revogar
                            </Button>
                          ) : (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => approveUser(user.id)}
                            >
                              ✓ Aprovar
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showTimeDialog} onOpenChange={setShowTimeDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Gerenciar Tempo de Acesso</DialogTitle>
            <DialogDescription>
              Usuário: <strong>{selectedUser?.name || selectedUser?.email}</strong>
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="add" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="add">Adicionar Tempo</TabsTrigger>
              <TabsTrigger value="set">Definir Data Específica</TabsTrigger>
            </TabsList>

            <TabsContent value="add" className="space-y-4">
              <div className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="days">Dias</Label>
                    <Input
                      id="days"
                      type="number"
                      min="0"
                      placeholder="Ex: 30"
                      value={days}
                      onChange={(e) => setDays(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hours">Horas</Label>
                    <Input
                      id="hours"
                      type="number"
                      min="0"
                      placeholder="Ex: 12"
                      value={hours}
                      onChange={(e) => setHours(e.target.value)}
                    />
                  </div>
                </div>
                {selectedUser?.access_expires_at && (
                  <p className="text-sm text-muted-foreground">
                    📅 Expira atualmente em: {formatDateTime(selectedUser.access_expires_at)}
                  </p>
                )}
                {!selectedUser?.access_expires_at && (
                  <p className="text-sm text-muted-foreground">
                    ∞ Usuário tem acesso permanente atualmente
                  </p>
                )}
              </div>
              <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button variant="outline" onClick={() => setShowTimeDialog(false)}>
                  Cancelar
                </Button>
                <Button variant="secondary" onClick={handleSetPermanentAccess}>
                  ∞ Acesso Permanente
                </Button>
                <Button onClick={handleAddTime} disabled={!days && !hours}>
                  + Adicionar Tempo
                </Button>
              </DialogFooter>
            </TabsContent>

            <TabsContent value="set" className="space-y-4">
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="datetime">Data e Hora de Expiração</Label>
                  <Input
                    id="datetime"
                    type="datetime-local"
                    value={specificDateTime}
                    onChange={(e) => setSpecificDateTime(e.target.value)}
                  />
                  <p className="text-sm text-muted-foreground">
                    💡 Defina uma data e hora específica para o acesso expirar.
                    Isso permite reduzir ou estender o tempo conforme necessário.
                  </p>
                </div>
                {selectedUser?.access_expires_at && (
                  <div className="p-3 bg-muted rounded-md">
                    <p className="text-sm font-medium">Expiração atual:</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDateTime(selectedUser.access_expires_at)}
                    </p>
                  </div>
                )}
              </div>
              <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button variant="outline" onClick={() => setShowTimeDialog(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSetSpecificDate} disabled={!specificDateTime}>
                  ✓ Definir Data
                </Button>
              </DialogFooter>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  );
}
