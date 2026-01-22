import { ReactNode, useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import MaintenancePage from "@/pages/MaintenancePage";

export default function ApprovedGuard({ children }: { children: ReactNode }) {
  const { session, profile, loading, isMaster } = useAuth();
  const location = useLocation();
  // ✅ CHECK MAINTENANCE MODE
  // Must be called at top level (Rules of Hooks)
  // This hook helps us determine if we need to block access due to maintenance
  const { maintenanceMode, loading: settingsLoading } = useSystemSettings();

  useEffect(() => {
    document.title = "Acesso – Requer login";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "Faça login para acessar o gerador de áudio.");
  }, []);

  if (loading || settingsLoading) {
    return (
      <div className="min-h-screen grid place-items-center">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  // 1. Maintenance Mode Check (Highest Priority for non-masters)
  if (maintenanceMode.enabled && !isMaster) {
    return <MaintenancePage message={maintenanceMode.message} />;
  }

  // 2. Auth Check
  if (!session) {
    return <Navigate to="/auth" replace state={{ from: location }} />;
  }

  // 3. Approval Check
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

  // 4. Expiration Check
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

  return <>{children}</>;
}
