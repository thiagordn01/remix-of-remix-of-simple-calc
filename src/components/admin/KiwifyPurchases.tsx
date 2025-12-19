import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Loader2, RefreshCw, Users, UserCheck, UserX, AlertCircle,
  Search, Filter, Calendar, CreditCard, Clock, CheckCircle2,
  Mail, Key, MoreVertical
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Database } from "@/integrations/supabase/types";

type KiwifyPurchase = Database["public"]["Tables"]["kiwify_purchases"]["Row"];

interface UserWithPurchases {
  user_id: string;
  customer_name: string;
  customer_email: string;
  latest_purchase_date: string;
  total_purchases: number;
  total_spent: number;
  has_subscription: boolean;
  subscription_id: string | null;
  access_expires_at: string | null;
  is_approved: boolean;
  access_status: "active" | "expiring_soon" | "expired" | "no_access";
  days_remaining: number | null;
  payment_method: string | null;
  purchases: KiwifyPurchase[];
  order_status: string;
}

export default function KiwifyPurchases() {
  const [users, setUsers] = useState<UserWithPurchases[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [resendingEmail, setResendingEmail] = useState<string | null>(null);
  const [resettingPassword, setResettingPassword] = useState<string | null>(null);
  const [revokingAccess, setRevokingAccess] = useState<string | null>(null);
  const [restoringAccess, setRestoringAccess] = useState<string | null>(null);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [showRevokeDialog, setShowRevokeDialog] = useState(false);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithPurchases | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Buscar todas as compras
      const { data: purchases, error: purchasesError } = await supabase
        .from("kiwify_purchases")
        .select("*")
        .order("purchased_at", { ascending: false });

      if (purchasesError) throw purchasesError;

      // Buscar todos os profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, name, is_approved, access_expires_at")
        .not("id", "is", null);

      if (profilesError) throw profilesError;

      // Agrupar por usuário
      const usersMap = new Map<string, UserWithPurchases>();

      purchases?.forEach((purchase) => {
        const userId = purchase.user_id;
        const profile = profiles?.find((p) => p.id === userId);

        if (!usersMap.has(userId)) {
          const accessStatus = calculateAccessStatus(profile?.access_expires_at, profile?.is_approved);
          const daysRemaining = calculateDaysRemaining(profile?.access_expires_at);

          usersMap.set(userId, {
            user_id: userId,
            customer_name: purchase.customer_name || profile?.name || "N/A",
            customer_email: purchase.customer_email,
            latest_purchase_date: purchase.purchased_at,
            total_purchases: 1,
            total_spent: Number(purchase.amount) || 0,
            has_subscription: !!purchase.subscription_id,
            subscription_id: purchase.subscription_id,
            access_expires_at: profile?.access_expires_at || null,
            is_approved: profile?.is_approved || false,
            access_status: accessStatus,
            days_remaining: daysRemaining,
            payment_method: purchase.payment_method,
            purchases: [purchase],
            order_status: purchase.order_status || "paid",
          });
        } else {
          const user = usersMap.get(userId)!;
          user.total_purchases++;
          user.total_spent += Number(purchase.amount) || 0;
          user.purchases.push(purchase);

          // Atualizar data mais recente
          if (new Date(purchase.purchased_at) > new Date(user.latest_purchase_date)) {
            user.latest_purchase_date = purchase.purchased_at;
          }

          // Atualizar order_status baseado no status da compra
          if (purchase.order_status && purchase.order_status !== "paid") {
            user.order_status = purchase.order_status;
          }
        }
      });

      setUsers(Array.from(usersMap.values()));
    } catch (error: any) {
      console.error("Erro ao buscar dados:", error);
      toast.error("Erro ao carregar dados da Kiwify");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleResendEmail = async (user: UserWithPurchases) => {
    try {
      setResendingEmail(user.user_id);

      const { data, error } = await supabase.functions.invoke("resend-credentials", {
        body: {
          userId: user.user_id,
          email: user.customer_email,
          name: user.customer_name,
        },
      });

      if (error) throw error;

      toast.success(`Email de credenciais reenviado para ${user.customer_email}`);
    } catch (error: any) {
      console.error("Erro ao reenviar email:", error);
      toast.error(error.message || "Erro ao reenviar email. Tente novamente.");
    } finally {
      setResendingEmail(null);
    }
  };

  const handleResetPassword = async () => {
    if (!selectedUser) return;

    try {
      setResettingPassword(selectedUser.user_id);

      const { data, error } = await supabase.functions.invoke("reset-user-password", {
        body: {
          userId: selectedUser.user_id,
          email: selectedUser.customer_email,
          name: selectedUser.customer_name,
        },
      });

      if (error) throw error;

      toast.success(
        `Nova senha gerada e enviada para ${selectedUser.customer_email}`,
        { duration: 5000 }
      );
      setShowResetDialog(false);
      setSelectedUser(null);
    } catch (error: any) {
      console.error("Erro ao resetar senha:", error);
      toast.error(error.message || "Erro ao resetar senha. Tente novamente.");
    } finally {
      setResettingPassword(null);
    }
  };

  const handleRevokeAccess = async () => {
    if (!selectedUser) return;

    try {
      setRevokingAccess(selectedUser.user_id);

      // Revogar acesso diretamente no profile
      const { error } = await supabase
        .from("profiles")
        .update({ is_approved: false })
        .eq("id", selectedUser.user_id);

      if (error) throw error;

      toast.success(
        `Acesso revogado para ${selectedUser.customer_name}`,
        { description: "O usuário não poderá mais acessar o sistema.", duration: 5000 }
      );

      setShowRevokeDialog(false);
      setSelectedUser(null);

      // Atualizar lista
      await fetchData();
    } catch (error: any) {
      console.error("Erro ao revogar acesso:", error);
      toast.error(error.message || "Erro ao revogar acesso. Tente novamente.");
    } finally {
      setRevokingAccess(null);
    }
  };

  const handleRestoreAccess = async () => {
    if (!selectedUser) return;

    try {
      setRestoringAccess(selectedUser.user_id);

      // Restaurar acesso diretamente no profile
      const { error } = await supabase
        .from("profiles")
        .update({ is_approved: true })
        .eq("id", selectedUser.user_id);

      if (error) throw error;

      toast.success(
        `Acesso restaurado para ${selectedUser.customer_name}`,
        { description: "O usuário poderá acessar o sistema novamente.", duration: 5000 }
      );

      setShowRestoreDialog(false);
      setSelectedUser(null);

      // Atualizar lista
      await fetchData();
    } catch (error: any) {
      console.error("Erro ao restaurar acesso:", error);
      toast.error(error.message || "Erro ao restaurar acesso. Tente novamente.");
    } finally {
      setRestoringAccess(null);
    }
  };

  const calculateAccessStatus = (
    expiresAt: string | null,
    isApproved: boolean
  ): "active" | "expiring_soon" | "expired" | "no_access" => {
    if (!isApproved) return "no_access";
    if (!expiresAt) return "active"; // Acesso permanente

    const now = new Date();
    const expirationDate = new Date(expiresAt);
    const daysUntilExpiration = Math.ceil((expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilExpiration < 0) return "expired";
    if (daysUntilExpiration <= 7) return "expiring_soon";
    return "active";
  };

  const calculateDaysRemaining = (expiresAt: string | null): number | null => {
    if (!expiresAt) return null; // Acesso permanente

    const now = new Date();
    const expirationDate = new Date(expiresAt);
    const daysRemaining = Math.ceil((expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    return daysRemaining;
  };

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      // Filtro de busca
      const matchesSearch =
        user.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.customer_email.toLowerCase().includes(searchTerm.toLowerCase());

      // Filtro de status
      const matchesStatus =
        statusFilter === "all" || user.access_status === statusFilter;

      // Filtro de tipo
      const matchesType =
        typeFilter === "all" ||
        (typeFilter === "subscription" && user.has_subscription) ||
        (typeFilter === "one_time" && !user.has_subscription);

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [users, searchTerm, statusFilter, typeFilter]);

  const stats = useMemo(() => {
    const activeUsers = users.filter((u) => u.access_status === "active").length;
    const expiringSoonUsers = users.filter((u) => u.access_status === "expiring_soon").length;
    const expiredUsers = users.filter((u) => u.access_status === "expired").length;
    const subscriptionUsers = users.filter((u) => u.has_subscription).length;

    return {
      total: users.length,
      active: activeUsers,
      expiring_soon: expiringSoonUsers,
      expired: expiredUsers,
      subscriptions: subscriptionUsers,
    };
  }, [users]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const getAccessStatusBadge = (status: string) => {
    const statusConfig = {
      active: {
        label: "Ativo",
        icon: CheckCircle2,
        className: "bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800"
      },
      expiring_soon: {
        label: "Expirando",
        icon: AlertCircle,
        className: "bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800"
      },
      expired: {
        label: "Expirado",
        icon: UserX,
        className: "bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800"
      },
      no_access: {
        label: "Sem Acesso",
        icon: UserX,
        className: "bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-900/30 dark:text-gray-400 dark:border-gray-800"
      },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.no_access;
    const Icon = config.icon;

    return (
      <Badge className={`gap-1 ${config.className}`}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const getOrderStatusBadge = (status: string, user: UserWithPurchases) => {
    const statusMap: Record<string, { label: string; icon: any; className: string }> = {
      chargeback: {
        label: "Contestado",
        icon: AlertCircle,
        className: "gap-1 bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800"
      },
      refunded: {
        label: "Reembolsado",
        icon: AlertCircle,
        className: "gap-1 bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800"
      },
      cancelled: {
        label: "Cancelado",
        icon: UserX,
        className: "gap-1 bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800"
      },
      paid: {
        label: "Pago",
        icon: CheckCircle2,
        className: "gap-1 bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800"
      }
    };

    const config = statusMap[status] || statusMap.paid;
    const Icon = config.icon;

    return (
      <Badge className={config.className}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Usuários</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Cadastrados via Kiwify</p>
          </CardContent>
        </Card>

        <Card className="border-green-200 dark:border-green-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ativos</CardTitle>
            <UserCheck className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
            <p className="text-xs text-muted-foreground">Com acesso ativo</p>
          </CardContent>
        </Card>

        <Card className="border-yellow-200 dark:border-yellow-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expirando</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.expiring_soon}</div>
            <p className="text-xs text-muted-foreground">Próximos 7 dias</p>
          </CardContent>
        </Card>

        <Card className="border-red-200 dark:border-red-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expirados</CardTitle>
            <UserX className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.expired}</div>
            <p className="text-xs text-muted-foreground">Sem acesso</p>
          </CardContent>
        </Card>

        <Card className="border-blue-200 dark:border-blue-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assinaturas</CardTitle>
            <Calendar className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.subscriptions}</div>
            <p className="text-xs text-muted-foreground">Recorrentes</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros e Busca
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status de Acesso" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="active">Ativos</SelectItem>
                <SelectItem value="expiring_soon">Expirando em Breve</SelectItem>
                <SelectItem value="expired">Expirados</SelectItem>
                <SelectItem value="no_access">Sem Acesso</SelectItem>
              </SelectContent>
            </Select>

            {/* Type Filter */}
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Tipo de Compra" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Tipos</SelectItem>
                <SelectItem value="subscription">Assinaturas</SelectItem>
                <SelectItem value="one_time">Compra Única</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Usuários Kiwify ({filteredUsers.length})</CardTitle>
              <CardDescription>
                Monitoramento estratégico de todos os usuários cadastrados via Kiwify
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchData}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum usuário encontrado</p>
              <p className="text-sm mt-2">
                {searchTerm || statusFilter !== "all" || typeFilter !== "all"
                  ? "Tente ajustar os filtros"
                  : "Usuários aparecerão aqui quando fizerem compras via Kiwify"}
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[600px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Status Acesso</TableHead>
                    <TableHead>Status Pedido</TableHead>
                    <TableHead>Expira em</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Compras</TableHead>
                    <TableHead>Total Gasto</TableHead>
                    <TableHead>Última Compra</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.user_id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{user.customer_name}</div>
                          <div className="text-sm text-muted-foreground">{user.customer_email}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getAccessStatusBadge(user.access_status)}
                      </TableCell>
                      <TableCell>
                        {getOrderStatusBadge(user.order_status, user)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {user.access_expires_at ? (
                            <>
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <div className="text-sm font-medium">
                                  {formatDate(user.access_expires_at)}
                                </div>
                                {user.days_remaining !== null && (
                                  <div className={`text-xs ${
                                    user.days_remaining < 0 ? "text-red-500" :
                                    user.days_remaining <= 7 ? "text-yellow-500" :
                                    "text-muted-foreground"
                                  }`}>
                                    {user.days_remaining < 0
                                      ? `Expirado há ${Math.abs(user.days_remaining)} dias`
                                      : `${user.days_remaining} dias restantes`}
                                  </div>
                                )}
                              </div>
                            </>
                          ) : (
                            <Badge variant="secondary">Permanente</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {user.has_subscription ? (
                          <Badge variant="default" className="gap-1">
                            <Calendar className="h-3 w-3" />
                            Assinatura
                          </Badge>
                        ) : (
                          <Badge variant="outline">Única</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-center">
                          <div className="text-lg font-bold">{user.total_purchases}</div>
                          <div className="text-xs text-muted-foreground">compras</div>
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold">
                        {formatCurrency(user.total_spent)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <CreditCard className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{formatDate(user.latest_purchase_date)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Ações do Admin</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleResendEmail(user)}
                              disabled={resendingEmail === user.user_id}
                            >
                              <Mail className="h-4 w-4 mr-2" />
                              {resendingEmail === user.user_id ? "Enviando..." : "Reenviar Email"}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedUser(user);
                                setShowResetDialog(true);
                              }}
                              disabled={resettingPassword === user.user_id}
                            >
                              <Key className="h-4 w-4 mr-2" />
                              Resetar Senha
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {user.is_approved ? (
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedUser(user);
                                  setShowRevokeDialog(true);
                                }}
                                disabled={revokingAccess === user.user_id}
                                className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950"
                              >
                                <UserX className="h-4 w-4 mr-2" />
                                Revogar Acesso
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedUser(user);
                                  setShowRestoreDialog(true);
                                }}
                                disabled={restoringAccess === user.user_id}
                                className="text-green-600 focus:text-green-600 focus:bg-green-50 dark:focus:bg-green-950"
                              >
                                <UserCheck className="h-4 w-4 mr-2" />
                                Aprovar Acesso
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Confirmação para Reset de Senha */}
      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Resetar Senha do Usuário</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja resetar a senha de{" "}
              <strong>{selectedUser?.customer_name}</strong> ({selectedUser?.customer_email})?
              <br />
              <br />
              Uma nova senha será gerada automaticamente e enviada por email para o usuário.
              <br />
              <br />
              <span className="text-amber-600 dark:text-amber-500 font-semibold">
                ⚠️ Esta ação não pode ser desfeita.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!resettingPassword}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleResetPassword}
              disabled={!!resettingPassword}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {resettingPassword ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Resetando...
                </>
              ) : (
                <>
                  <Key className="h-4 w-4 mr-2" />
                  Resetar Senha
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de Confirmação para Revogar Acesso */}
      <AlertDialog open={showRevokeDialog} onOpenChange={setShowRevokeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600">🚫 Revogar Acesso do Usuário</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja <strong className="text-red-600">REVOGAR O ACESSO</strong> de{" "}
              <strong>{selectedUser?.customer_name}</strong> ({selectedUser?.customer_email})?
              <br />
              <br />
              <span className="text-amber-600 dark:text-amber-500 font-semibold">
                ⚠️ ATENÇÃO: Esta ação terá os seguintes efeitos:
              </span>
              <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                <li>O usuário será imediatamente desconectado do sistema</li>
                <li>Não poderá mais fazer login até que o acesso seja restaurado</li>
                <li>Todas as sessões ativas serão encerradas</li>
              </ul>
              <br />
              <span className="text-red-600 dark:text-red-500 font-semibold">
                ⛔ Esta ação pode ser revertida manualmente pelo administrador.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!revokingAccess}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevokeAccess}
              disabled={!!revokingAccess}
              className="bg-red-600 hover:bg-red-700"
            >
              {revokingAccess ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Revogando...
                </>
              ) : (
                <>
                  <UserX className="h-4 w-4 mr-2" />
                  Sim, Revogar Acesso
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de Confirmação para Restaurar Acesso */}
      <AlertDialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-green-600">✅ Aprovar Acesso do Usuário</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja <strong className="text-green-600">APROVAR O ACESSO</strong> de{" "}
              <strong>{selectedUser?.customer_name}</strong> ({selectedUser?.customer_email})?
              <br />
              <br />
              <span className="text-amber-600 dark:text-amber-500 font-semibold">
                ℹ️ Esta ação terá os seguintes efeitos:
              </span>
              <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                <li>O usuário poderá fazer login no sistema novamente</li>
                <li>Terá acesso a todas as funcionalidades permitidas</li>
                <li>O status de acesso será atualizado para "Ativo"</li>
              </ul>
              <br />
              <span className="text-green-600 dark:text-green-500 font-semibold">
                ✅ Use esta ação para restaurar manualmente o acesso de um usuário.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!restoringAccess}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRestoreAccess}
              disabled={!!restoringAccess}
              className="bg-green-600 hover:bg-green-700"
            >
              {restoringAccess ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Aprovando...
                </>
              ) : (
                <>
                  <UserCheck className="h-4 w-4 mr-2" />
                  Sim, Aprovar Acesso
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
