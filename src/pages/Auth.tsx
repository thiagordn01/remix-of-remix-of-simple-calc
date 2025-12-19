import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { z } from "zod";

const authSchema = z.object({
  email: z.string().email("Invalid email format").max(255, "Email must be less than 255 characters"),
  password: z.string().min(8, "Password must be at least 8 characters").max(72, "Password must be less than 72 characters"),
  name: z.string().trim().min(1, "Name is required").max(100, "Name must be less than 100 characters").optional()
});

export default function AuthPage() {
  const { session, user, refreshProfile } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation() as any;
  const invite = new URLSearchParams(location.search).get("invite");
  useEffect(() => {
    document.title = mode === "login" ? "Entrar – Gerador de Áudio" : "Criar conta – Gerador de Áudio";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", mode === "login" ? "Acesse sua conta para usar o gerador." : "Crie sua conta para solicitar aprovação.");
    const canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      const l = document.createElement("link");
      l.rel = "canonical";
      l.href = window.location.href;
      document.head.appendChild(l);
    }
   }, [mode]);
 
   useEffect(() => {
     if (invite) setMode("signup");
   }, [invite]);
 
  useEffect(() => {
    if (session && user) {
      // After login/signup, ensure profile exists and set name if provided
      (async () => {
        const p = await refreshProfile(user.id);
        if (mode === "signup" && name && p && !p.name) {
          await supabase.from("profiles").update({ name }).eq("id", user.id);
        }
        if (invite) {
          const { error } = await supabase.functions.invoke("accept-invite", {
            body: { code: invite },
          });
          if (error) {
            console.error("accept-invite error", error);
            toast({ title: "Convite inválido", description: "Não foi possível validar o convite.", variant: "destructive" });
          } else {
            toast({ title: "Convite aplicado", description: "Sua conta foi aprovada automaticamente." });
          }
        }
      })();
 
      const to = location?.state?.from?.pathname || "/";
      navigate(to, { replace: true });
    }
  }, [session, user]);

  const signIn = async () => {
    // Validate inputs
    const validation = authSchema.safeParse({ email, password });
    if (!validation.success) {
      const firstError = validation.error.errors[0];
      toast({ title: "Validation error", description: firstError.message, variant: "destructive" });
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast({ title: "Erro ao entrar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Bem-vindo", description: "Login realizado com sucesso" });
    }
  };

  const signUp = async () => {
    // Validate inputs
    const validation = authSchema.safeParse({ email, password, name: mode === "signup" ? name : undefined });
    if (!validation.success) {
      const firstError = validation.error.errors[0];
      toast({ title: "Validation error", description: firstError.message, variant: "destructive" });
      return;
    }

    setLoading(true);
    const redirectUrl = `${window.location.origin}/auth`;
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: redirectUrl },
    });
    setLoading(false);
    if (error) {
      toast({ title: "Erro no cadastro", description: error.message, variant: "destructive" });
    } else {
      // Se a confirmação de e-mail estiver desativada no Supabase, a sessão já vem preenchida
      if (data?.session) {
        toast({ title: "Conta criada", description: "Acesso liberado imediatamente." });
      } else {
        toast({ title: "Cadastro iniciado", description: "Verifique seu e-mail para confirmar. Após login, aguarde aprovação." });
      }
    }
  };
  return (
    <div className="min-h-screen grid place-items-center p-6">
      <div className="w-full max-w-md space-y-6 rounded-lg border bg-card p-6 shadow-sm">
        <header className="text-center">
          <h1 className="text-2xl font-semibold">
            {mode === "login" ? "Entrar" : "Criar conta"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {mode === "login"
              ? "Use seu e-mail e senha para acessar."
              : invite
                ? "Convite detectado: crie sua conta e o acesso será liberado automaticamente."
                : "Crie sua conta e aguarde aprovação do administrador."}
          </p>
        </header>

        {mode === "signup" && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Nome</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" />
          </div>
        )}

        <div className="space-y-2">
          <label className="text-sm font-medium">E-mail</label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@exemplo.com" />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Senha</label>
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Sua senha" />
        </div>

        <Button onClick={mode === "login" ? signIn : signUp} disabled={loading}>
          {loading ? "Processando…" : mode === "login" ? "Entrar" : "Criar conta"}
        </Button>

        <div className="text-center text-sm">
          {mode === "login" ? (
            <span>
              Não tem conta? {" "}
              <button className="underline" onClick={() => setMode("signup")}>Cadastre-se</button>
            </span>
          ) : (
            <span>
              Já possui conta? {" "}
              <button className="underline" onClick={() => setMode("login")}>Entrar</button>
            </span>
          )}
        </div>

        <div className="text-center text-xs text-muted-foreground">
          <Link to="/">Voltar à página inicial</Link>
        </div>
      </div>
    </div>
  );
}
