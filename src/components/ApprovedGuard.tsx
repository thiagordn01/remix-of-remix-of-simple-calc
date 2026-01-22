import { ReactNode, useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import MaintenancePage from "@/pages/MaintenancePage";

export default function ApprovedGuard({ children }: { children: ReactNode }) {
  const { session, profile, loading, isMaster } = useAuth();
  const location = useLocation();

  useEffect(() => {
    document.title = "Acesso – Requer login";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "Faça login para acessar o gerador de áudio.");
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center">
        <p className="text-muted-foreground">Carregando…</p>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/auth" replace state={{ from: location }} />;
  }

  // Verificar se o usuário não está aprovado
  if (profile && !profile.is_approved && !isMaster) {
    return (
      <div className="min-h-screen grid place-items-center p-6">
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-2xl font-semibold">Aguardando aprovação</h1>
          <p className="text-muted-foreground">
            Seu cadastro foi criado e está aguardando aprovação do administrador. Você receberá acesso assim que for aprovado.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Button variant="secondary" onClick={() => window.location.reload()}>Atualizar</Button>
            <Button variant="outline" onClick={() => {
              // best-effort sign out
              import("@/integrations/supabase/client").then(({ supabase }) => supabase.auth.signOut().then(() => window.location.href = "/auth"));
            }}>Sair</Button>
          </div>
        </div>
      </div>
    );
  }

  // Verificar se o acesso do usuário expirou
  if (profile && profile.access_expires_at && !isMaster) {
    const expirationDate = new Date(profile.access_expires_at);
    const now = new Date();

    if (expirationDate < now) {
      return (
        <div className="min-h-screen grid place-items-center p-6">
          <div className="max-w-md text-center space-y-4">
            <h1 className="text-2xl font-semibold">Acesso expirado</h1>
            <p className="text-muted-foreground">
              Seu período de acesso expirou em {expirationDate.toLocaleDateString("pt-BR")}. Entre em contato com o administrador para renovar seu acesso.
            </p>
            <div className="flex items-center justify-center gap-3">
              <Button variant="secondary" onClick={() => window.location.reload()}>Atualizar</Button>
              <Button variant="outline" onClick={() => {
                import("@/integrations/supabase/client").then(({ supabase }) => supabase.auth.signOut().then(() => window.location.href = "/auth"));
              }}>Sair</Button>
            </div>
          </div>
        </div>
      );
    }
  }

  // ✅ CHECK MAINTENANCE MODE
  // Must go before any other check to block unapproved users too, 
  // BUT Master should bypass it.
  const { maintenanceMode, loading: settingsLoading } = useSystemSettings();

  if (settingsLoading) {
    return (
      <div className="min-h-screen grid place-items-center">
        <p className="text-muted-foreground">Carregando configurações...</p>
      </div>
    );
  }

  if (maintenanceMode.enabled && !isMaster) {
    return <MaintenancePage message={maintenanceMode.message} />;
  }

  return <>{children}</>;
}
