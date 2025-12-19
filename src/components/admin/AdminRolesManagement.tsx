import { useState, useEffect } from "react";
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
import { Shield, UserX, Mail } from "lucide-react";

interface AdminUser {
  user_id: string;
  email: string;
  role: string;
  created_at: string;
}

export function AdminRolesManagement() {
  const { toast } = useToast();
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState("");

  const loadAdmins = async () => {
    setLoading(true);
    try {
      // Get all users with admin role
      const { data, error } = await supabase
        .from("user_roles")
        .select("user_id, role, created_at")
        .eq("role", "admin");

      if (error) throw error;

      if (data && data.length > 0) {
        // Get emails for each admin user
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;

        if (!token) {
          toast({ title: "Erro de autenticação", variant: "destructive" });
          return;
        }

        const SUPABASE_URL = "https://wzldbdmcozbmivztbmik.supabase.co";
        const response = await fetch(
          `${SUPABASE_URL}/functions/v1/get-users`,
          {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (response.ok) {
          const { users } = await response.json();
          const adminUserIds = new Set(data.map(d => d.user_id));
          const adminUsers: AdminUser[] = users
            .filter((u: any) => adminUserIds.has(u.id))
            .map((u: any) => ({
              user_id: u.id,
              email: u.email,
              role: "admin",
              created_at: data.find(d => d.user_id === u.id)?.created_at || "",
            }));

          setAdmins(adminUsers);
        }
      } else {
        setAdmins([]);
      }
    } catch (error: any) {
      toast({
        title: "Erro ao carregar administradores",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdmins();
  }, []);

  const addAdmin = async () => {
    if (!newAdminEmail.trim()) {
      toast({
        title: "Email inválido",
        description: "Por favor, insira um email válido",
        variant: "destructive",
      });
      return;
    }

    setAdding(true);
    try {
      // First, get the user ID from the email
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      if (!token) {
        toast({ title: "Erro de autenticação", variant: "destructive" });
        return;
      }

      const SUPABASE_URL = "https://wzldbdmcozbmivztbmik.supabase.co";
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/get-users`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Erro ao buscar usuários");
      }

      const { users } = await response.json();
      const targetUser = users.find((u: any) => u.email.toLowerCase() === newAdminEmail.toLowerCase());

      if (!targetUser) {
        toast({
          title: "Usuário não encontrado",
          description: "Não foi encontrado nenhum usuário com este email",
          variant: "destructive",
        });
        setAdding(false);
        return;
      }

      // Check if already an admin
      if (admins.some(a => a.user_id === targetUser.id)) {
        toast({
          title: "Já é administrador",
          description: "Este usuário já possui privilégios de administrador",
          variant: "destructive",
        });
        setAdding(false);
        return;
      }

      // Check if user already has a role entry
      const { data: existingRole, error: checkError } = await supabase
        .from("user_roles")
        .select("id, role")
        .eq("user_id", targetUser.id)
        .maybeSingle();

      if (checkError) throw checkError;

      let error;
      if (existingRole) {
        // Update existing role to admin
        const { error: updateError } = await supabase
          .from("user_roles")
          .update({ role: "admin" })
          .eq("user_id", targetUser.id);
        error = updateError;
      } else {
        // Insert new role entry
        const { error: insertError } = await supabase
          .from("user_roles")
          .insert({
            user_id: targetUser.id,
            role: "admin",
          });
        error = insertError;
      }

      if (error) throw error;

      toast({
        title: "✓ Administrador adicionado",
        description: `${newAdminEmail} agora é um administrador`,
      });

      setNewAdminEmail("");
      await loadAdmins();
    } catch (error: any) {
      toast({
        title: "Erro ao adicionar administrador",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setAdding(false);
    }
  };

  const removeAdmin = async (userId: string, email: string) => {
    if (!window.confirm(`Tem certeza que deseja remover ${email} dos administradores?`)) {
      return;
    }

    try {
      // Update user_roles to change role back to user
      const { error } = await supabase
        .from("user_roles")
        .update({ role: "user" })
        .eq("user_id", userId);

      if (error) throw error;

      toast({
        title: "✓ Administrador removido",
        description: `${email} não é mais um administrador`,
      });

      await loadAdmins();
    } catch (error: any) {
      toast({
        title: "Erro ao remover administrador",
        description: error.message,
        variant: "destructive",
      });
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

  return (
    <Card className="border-golden-200 dark:border-golden-800">
      <CardHeader className="bg-gradient-to-r from-golden-50 to-amber-50 dark:from-golden-950/30 dark:to-amber-950/30 border-b border-golden-200 dark:border-golden-800">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-golden-400 to-amber-500 shadow-golden">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <CardTitle className="text-golden-900 dark:text-golden-100">Gerenciar Administradores</CardTitle>
            <CardDescription className="text-golden-700 dark:text-golden-300">
              Adicione ou remova privilégios de administrador para usuários
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Formulário de Adição */}
        <div className="p-4 border border-golden-200 dark:border-golden-800 rounded-lg space-y-4 bg-gradient-to-br from-golden-50/50 to-amber-50/50 dark:from-golden-950/20 dark:to-amber-950/20">
          <h3 className="font-medium text-golden-900 dark:text-golden-100 flex items-center gap-2">
            <Mail className="w-4 h-4" />
            Adicionar Novo Administrador
          </h3>
          <div className="flex gap-3">
            <div className="flex-1">
              <Label htmlFor="adminEmail" className="text-golden-800 dark:text-golden-200">Email do Usuário</Label>
              <Input
                id="adminEmail"
                type="email"
                placeholder="usuario@exemplo.com"
                value={newAdminEmail}
                onChange={(e) => setNewAdminEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    addAdmin();
                  }
                }}
                className="border-golden-300 dark:border-golden-700 focus:ring-golden-500 focus:border-golden-500"
              />
            </div>
            <div className="flex items-end">
              <Button
                onClick={addAdmin}
                disabled={adding || !newAdminEmail.trim()}
                className="bg-gradient-to-r from-golden-500 to-amber-500 hover:from-golden-600 hover:to-amber-600 text-white shadow-golden"
              >
                {adding ? "Adicionando..." : "+ Adicionar Admin"}
              </Button>
            </div>
          </div>
        </div>

        {/* Lista de Administradores */}
        <div className="space-y-3">
          <h3 className="font-medium text-golden-900 dark:text-golden-100">
            Administradores Atuais ({admins.length})
          </h3>
          {loading ? (
            <div className="p-8 text-center border border-golden-200 dark:border-golden-800 rounded-lg bg-golden-50/30 dark:bg-golden-950/10">
              <p className="text-golden-700 dark:text-golden-300">Carregando...</p>
            </div>
          ) : admins.length === 0 ? (
            <div className="p-8 text-center border border-golden-200 dark:border-golden-800 rounded-lg bg-golden-50/30 dark:bg-golden-950/10">
              <p className="text-golden-700 dark:text-golden-300">
                Nenhum administrador encontrado.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {admins.map((admin) => (
                <div
                  key={admin.user_id}
                  className="p-4 rounded-lg border bg-gradient-to-r from-golden-100 to-amber-100 dark:from-golden-900/30 dark:to-amber-900/30 border-golden-300 dark:border-golden-700 shadow-golden transition-all duration-300"
                >
                  <div className="flex items-center justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-full bg-golden-200 dark:bg-golden-800">
                          <Shield className="w-4 h-4 text-golden-700 dark:text-golden-300" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-golden-900 dark:text-golden-100">
                              {admin.email}
                            </span>
                            <Badge className="bg-gradient-to-r from-golden-500 to-amber-500 text-white">
                              Admin
                            </Badge>
                          </div>
                          <p className="text-sm text-golden-700 dark:text-golden-300">
                            Admin desde: {formatDate(admin.created_at)}
                          </p>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeAdmin(admin.user_id, admin.email)}
                      className="border-red-400 dark:border-red-600 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-900 dark:hover:text-red-100"
                    >
                      <UserX className="w-4 h-4 mr-2" />
                      Remover
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
