import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import {
  Users,
  UserCheck,
  UserX,
  Clock,
  TrendingUp,
  AlertTriangle,
  Mail,
  CheckCircle2,
} from "lucide-react";

interface UserStats {
  total: number;
  approved: number;
  pending: number;
  active: number;
  expiringSoon: number;
  expired: number;
  permanent: number;
}

interface InviteStats {
  total: number;
  available: number;
  used: number;
  expired: number;
}

interface RecentUser {
  id: string;
  name: string | null;
  email: string;
  created_at: string;
  is_approved: boolean;
  access_expires_at: string | null;
}

export function AdminAnalyticsDashboard() {
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [inviteStats, setInviteStats] = useState<InviteStats | null>(null);
  const [expiringSoonUsers, setExpiringSoonUsers] = useState<RecentUser[]>([]);
  const [recentSignups, setRecentSignups] = useState<RecentUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    setLoading(true);
    await Promise.all([
      loadUserStats(),
      loadInviteStats(),
      loadExpiringSoonUsers(),
      loadRecentSignups(),
    ]);
    setLoading(false);
  };

  const loadUserStats = async () => {
    try {
      // Buscar todos os perfis
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("is_approved, access_expires_at");

      if (error) throw error;

      const now = new Date();
      const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      let stats: UserStats = {
        total: profiles?.length || 0,
        approved: 0,
        pending: 0,
        active: 0,
        expiringSoon: 0,
        expired: 0,
        permanent: 0,
      };

      profiles?.forEach((profile) => {
        if (profile.is_approved) {
          stats.approved++;

          if (!profile.access_expires_at) {
            stats.permanent++;
            stats.active++;
          } else {
            const expiresAt = new Date(profile.access_expires_at);
            if (expiresAt > now) {
              stats.active++;
              if (expiresAt <= sevenDaysFromNow) {
                stats.expiringSoon++;
              }
            } else {
              stats.expired++;
            }
          }
        } else {
          stats.pending++;
        }
      });

      setUserStats(stats);
    } catch (error) {
      console.error("Error loading user stats:", error);
    }
  };

  const loadInviteStats = async () => {
    try {
      const { data: invites, error } = await supabase
        .from("invites")
        .select("max_uses, used_count, expires_at");

      if (error) throw error;

      const now = new Date();
      let stats: InviteStats = {
        total: invites?.length || 0,
        available: 0,
        used: 0,
        expired: 0,
      };

      invites?.forEach((invite) => {
        const isExpired = invite.expires_at && new Date(invite.expires_at) < now;
        const isUsed = invite.used_count >= (invite.max_uses || 1);

        if (isUsed) {
          stats.used++;
        } else if (isExpired) {
          stats.expired++;
        } else {
          stats.available++;
        }
      });

      setInviteStats(stats);
    } catch (error) {
      console.error("Error loading invite stats:", error);
    }
  };

  const loadExpiringSoonUsers = async () => {
    try {
      const now = new Date();
      const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      // Buscar usuários que expiram nos próximos 7 dias
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, name, is_approved, created_at, access_expires_at")
        .eq("is_approved", true)
        .not("access_expires_at", "is", null)
        .gte("access_expires_at", now.toISOString())
        .lte("access_expires_at", sevenDaysFromNow.toISOString())
        .order("access_expires_at", { ascending: true })
        .limit(5);

      if (profilesError) throw profilesError;

      // Buscar emails
      const SUPABASE_URL = "https://wzldbdmcozbmivztbmik.supabase.co";
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      if (token) {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/get-users`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (response.ok) {
          const { users } = await response.json();
          const usersWithEmails = profiles?.map((profile) => {
            const userWithEmail = users.find((u: any) => u.id === profile.id);
            return {
              ...profile,
              email: userWithEmail?.email || "N/A",
            };
          });
          setExpiringSoonUsers(usersWithEmails || []);
          return;
        }
      }

      setExpiringSoonUsers(
        profiles?.map((p) => ({ ...p, email: "N/A" })) || []
      );
    } catch (error) {
      console.error("Error loading expiring soon users:", error);
    }
  };

  const loadRecentSignups = async () => {
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, name, is_approved, created_at, access_expires_at")
        .order("created_at", { ascending: false })
        .limit(5);

      if (profilesError) throw profilesError;

      // Buscar emails
      const SUPABASE_URL = "https://wzldbdmcozbmivztbmik.supabase.co";
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      if (token) {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/get-users`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (response.ok) {
          const { users } = await response.json();
          const usersWithEmails = profiles?.map((profile) => {
            const userWithEmail = users.find((u: any) => u.id === profile.id);
            return {
              ...profile,
              email: userWithEmail?.email || "N/A",
            };
          });
          setRecentSignups(usersWithEmails || []);
          return;
        }
      }

      setRecentSignups(profiles?.map((p) => ({ ...p, email: "N/A" })) || []);
    } catch (error) {
      console.error("Error loading recent signups:", error);
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

  const getTimeRemaining = (expiresAt: string) => {
    const now = new Date();
    const expiration = new Date(expiresAt);
    const diffMs = expiration.getTime() - now.getTime();

    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) {
      return `${days}d ${hours}h`;
    }
    return `${hours}h`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-muted-foreground">Carregando analytics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cards de Resumo */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userStats?.total || 0}</div>
            <p className="text-xs text-muted-foreground">
              {userStats?.approved || 0} aprovados, {userStats?.pending || 0} pendentes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuários Ativos</CardTitle>
            <UserCheck className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {userStats?.active || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {userStats?.permanent || 0} permanentes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expiram em Breve</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {userStats?.expiringSoon || 0}
            </div>
            <p className="text-xs text-muted-foreground">Próximos 7 dias</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expirados</CardTitle>
            <UserX className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {userStats?.expired || 0}
            </div>
            <p className="text-xs text-muted-foreground">Precisam renovação</p>
          </CardContent>
        </Card>
      </div>

      {/* Cards de Convites */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Convites Totais</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inviteStats?.total || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Convites Disponíveis</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {inviteStats?.available || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Convites Usados</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {inviteStats?.used || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Listas de Usuários */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Usuários Expirando em Breve */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Expiram em Breve</CardTitle>
            <CardDescription>
              Usuários que expiram nos próximos 7 dias
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {expiringSoonUsers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum usuário expirando em breve
                </p>
              ) : (
                expiringSoonUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        {user.name || user.email}
                      </p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                    {user.access_expires_at && (
                      <div className="text-right">
                        <Badge variant="outline" className="bg-yellow-50">
                          {getTimeRemaining(user.access_expires_at)}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDate(user.access_expires_at)}
                        </p>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Cadastros Recentes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Cadastros Recentes</CardTitle>
            <CardDescription>Últimos 5 usuários cadastrados</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentSignups.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum cadastro recente
                </p>
              ) : (
                recentSignups.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        {user.name || user.email}
                      </p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                    <div className="text-right">
                      <Badge
                        variant={user.is_approved ? "default" : "secondary"}
                      >
                        {user.is_approved ? "Aprovado" : "Pendente"}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDate(user.created_at)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
