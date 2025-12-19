import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Trash2 } from "lucide-react";

interface Invite {
  id: string;
  code: string;
  max_uses: number | null;
  used_count: number;
  expires_at: string | null;
  created_at: string;
}

interface InvitesManagementProps {
  invites: Invite[];
  userId: string;
  onRefresh: () => void;
}

export function InvitesManagement({ invites, userId, onRefresh }: InvitesManagementProps) {
  const { toast } = useToast();
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string>("");
  const baseUrl = window.location.origin;

  const createInvite = async () => {
    setCreating(true);
    const code = crypto.randomUUID().slice(0, 8).toUpperCase();
    const payload: any = {
      code,
      created_by: userId,
      max_uses: 1, // Sempre 1 uso por convite
    };
    if (expiresAt) payload.expires_at = new Date(expiresAt).toISOString();

    const { error } = await supabase.from("invites").insert(payload);
    setCreating(false);

    if (error) {
      toast({
        title: "Erro ao criar convite",
        description: error.message,
        variant: "destructive",
      });
    } else {
      const link = `${baseUrl}/auth?invite=${code}`;
      try {
        await navigator.clipboard.writeText(link);
      } catch {}
      toast({
        title: "✓ Convite criado",
        description: "Link copiado para a área de transferência",
      });
      setExpiresAt("");
      onRefresh();
    }
  };

  const copyInviteLink = async (code: string) => {
    const link = `${baseUrl}/auth?invite=${code}`;
    try {
      await navigator.clipboard.writeText(link);
      toast({ title: "✓ Link copiado" });
    } catch {
      toast({
        title: "Erro ao copiar",
        variant: "destructive",
      });
    }
  };

  const deleteInvite = async (inviteId: string) => {
    setDeleting(inviteId);
    const { error } = await supabase
      .from("invites")
      .delete()
      .eq("id", inviteId);

    setDeleting(null);

    if (error) {
      toast({
        title: "Erro ao excluir convite",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "✓ Convite excluído",
        description: "O convite foi removido com sucesso",
      });
      onRefresh();
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getInviteStatus = (invite: Invite) => {
    const isUsed = invite.used_count >= (invite.max_uses || 1);
    const isExpired = invite.expires_at && new Date(invite.expires_at) < new Date();

    if (isUsed) {
      return { status: "Usado", variant: "secondary" as const };
    }
    if (isExpired) {
      return { status: "Expirado", variant: "destructive" as const };
    }
    return { status: "Disponível", variant: "default" as const, className: "bg-green-600 hover:bg-green-700" };
  };

  return (
    <Card className="border-golden-200 dark:border-golden-800">
      <CardHeader className="bg-gradient-to-r from-golden-50 to-amber-50 dark:from-golden-950/30 dark:to-amber-950/30 border-b border-golden-200 dark:border-golden-800">
        <CardTitle className="text-golden-900 dark:text-golden-100">Convites de Uso Único</CardTitle>
        <CardDescription className="text-golden-700 dark:text-golden-300">
          Cada convite pode ser usado apenas uma vez para criar uma nova conta
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Formulário de Criação */}
        <div className="p-4 border border-golden-200 dark:border-golden-800 rounded-lg space-y-4 bg-gradient-to-br from-golden-50/50 to-amber-50/50 dark:from-golden-950/20 dark:to-amber-950/20">
          <h3 className="font-medium text-golden-900 dark:text-golden-100">Criar Novo Convite</h3>
          <div className="flex gap-3">
            <div className="flex-1">
              <Label htmlFor="expires" className="text-golden-800 dark:text-golden-200">Data de Expiração (opcional)</Label>
              <Input
                id="expires"
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="border-golden-300 dark:border-golden-700 focus:ring-golden-500 focus:border-golden-500"
              />
            </div>
            <div className="flex items-end">
              <Button
                onClick={createInvite}
                disabled={creating}
                className="bg-gradient-to-r from-golden-500 to-amber-500 hover:from-golden-600 hover:to-amber-600 text-white shadow-golden"
              >
                {creating ? "Criando..." : "+ Criar Convite"}
              </Button>
            </div>
          </div>
        </div>

        {/* Lista de Convites */}
        <div className="space-y-3">
          <h3 className="font-medium text-golden-900 dark:text-golden-100">Convites Criados ({invites.length})</h3>
          {invites.length === 0 ? (
            <div className="p-8 text-center border border-golden-200 dark:border-golden-800 rounded-lg bg-golden-50/30 dark:bg-golden-950/10">
              <p className="text-golden-700 dark:text-golden-300">
                Nenhum convite criado ainda. Crie o primeiro convite acima.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {invites.map((invite) => {
                const { status, variant, className } = getInviteStatus(invite);
                const isAvailable = status === "Disponível";

                return (
                  <div
                    key={invite.id}
                    className={`p-4 rounded-lg border transition-all duration-300 ${
                      isAvailable
                        ? "bg-gradient-to-r from-golden-100 to-amber-100 dark:from-golden-900/30 dark:to-amber-900/30 border-golden-300 dark:border-golden-700 shadow-golden"
                        : "bg-muted/30 border-gray-300 dark:border-gray-700"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-3">
                          <code className="text-lg font-mono font-bold px-3 py-1 bg-golden-200 dark:bg-golden-800 text-golden-900 dark:text-golden-100 rounded border border-golden-300 dark:border-golden-700">
                            {invite.code}
                          </code>
                          <Badge variant={variant} className={className}>
                            {status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-golden-700 dark:text-golden-300">
                          <span>Criado em: {formatDate(invite.created_at)}</span>
                          {invite.expires_at && (
                            <span>
                              {status === "Expirado" ? "Expirou" : "Expira"} em:{" "}
                              {formatDate(invite.expires_at)}
                            </span>
                          )}
                          {!invite.expires_at && <span>Sem expiração</span>}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {isAvailable && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyInviteLink(invite.code)}
                            className="border-golden-400 dark:border-golden-600 text-golden-700 dark:text-golden-300 hover:bg-golden-200 dark:hover:bg-golden-800 hover:text-golden-900 dark:hover:text-golden-100"
                          >
                            📋 Copiar Link
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteInvite(invite.id)}
                          disabled={deleting === invite.id}
                          className="border-red-400 dark:border-red-600 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-900 dark:hover:text-red-100"
                        >
                          <Trash2 className="h-4 w-4" />
                          {deleting === invite.id ? "Excluindo..." : "Excluir"}
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
