import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "react-router-dom";
import { AdminAnalyticsDashboard } from "@/components/admin/AdminAnalyticsDashboard";
import { UsersManagement } from "@/components/admin/UsersManagement";
import { InvitesManagement } from "@/components/admin/InvitesManagement";
import { AdminRolesManagement } from "@/components/admin/AdminRolesManagement";
import KiwifyPurchases from "@/components/admin/KiwifyPurchases";
import { SystemSettingsTab } from "@/components/admin/SystemSettingsTab";

interface ProfileRow {
  id: string;
  name: string | null;
  email: string;
  is_approved: boolean;
  created_at: string;
  access_expires_at: string | null;
  days_remaining: number | null;
}

interface InviteRow {
  id: string;
  code: string;
  max_uses: number | null;
  used_count: number;
  expires_at: string | null;
  created_at: string;
}

export default function AdminPage() {
  const { isMaster, user } = useAuth();
  const { toast } = useToast();
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [invites, setInvites] = useState<InviteRow[]>([]);
  const [loading, setLoading] = useState(true);

  const loadProfiles = async () => {
    try {
      // Chamar edge function para buscar usuários com emails
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
        const errorData = await response.json();
        toast({
          title: "Erro ao carregar usuários",
          description: errorData.error || "Erro desconhecido",
          variant: "destructive",
        });
        return;
      }

      const { users } = await response.json();
      setProfiles(users || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar usuários",
        description: error.message || "Erro desconhecido",
        variant: "destructive",
      });
    }
  };

  const loadInvites = async () => {
    const { data, error } = await supabase
      .from("invites")
      .select("id, code, max_uses, used_count, expires_at, created_at")
      .order("created_at", { ascending: false });
    if (error) {
      // Most users won't have access unless master; ignore silently when not master
      if (isMaster) toast({ title: "Erro ao carregar convites", description: error.message, variant: "destructive" });
    } else {
      setInvites(data || []);
    }
  };


  useEffect(() => {
    document.title = "Admin – Aprovações e Convites";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "Aprovar usuários e gerenciar convites.");
    const canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      const l = document.createElement("link");
      l.rel = "canonical";
      l.href = window.location.href;
      document.head.appendChild(l);
    }
  }, []);

  useEffect(() => {
    if (!isMaster) {
      setLoading(false);
      return;
    }
    (async () => {
      await Promise.all([loadProfiles(), loadInvites()]);
      setLoading(false);
    })();
  }, [isMaster]);

  if (!isMaster) {
    return (
      <div className="min-h-screen grid place-items-center p-6">
        <div className="text-center space-y-3">
          <h1 className="text-2xl font-semibold">Sem permissão</h1>
          <p className="text-muted-foreground">Apenas a conta mestra pode acessar esta página.</p>
          <Link to="/" className="underline">Voltar</Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center">
        <p className="text-muted-foreground">Carregando…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-golden-500 via-amber-500 to-yellow-500 bg-clip-text text-transparent">Administração</h1>
            <p className="text-muted-foreground mt-1">
              Gerencie usuários, convites, administradores, compras Kiwify e visualize analytics
            </p>
          </div>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-golden-500 to-amber-500 hover:from-golden-600 hover:to-amber-600 text-white font-medium shadow-golden transition-all duration-300 hover:shadow-golden-lg"
          >
            ← Voltar ao Menu
          </Link>
        </header>

        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="grid w-full max-w-5xl grid-cols-5">
            <TabsTrigger value="users">Usuários</TabsTrigger>
            <TabsTrigger value="invites">Convites</TabsTrigger>
            <TabsTrigger value="admins">Administradores</TabsTrigger>
            <TabsTrigger value="kiwify">Kiwify</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="settings">Configurações</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-4">
            <UsersManagement profiles={profiles} onRefresh={loadProfiles} />
          </TabsContent>

          <TabsContent value="invites" className="space-y-4">
            {user && <InvitesManagement invites={invites} userId={user.id} onRefresh={loadInvites} />}
          </TabsContent>

          <TabsContent value="admins" className="space-y-4">
            <AdminRolesManagement />
          </TabsContent>

          <TabsContent value="kiwify" className="space-y-4">
            <KiwifyPurchases />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <AdminAnalyticsDashboard />
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <SystemSettingsTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
