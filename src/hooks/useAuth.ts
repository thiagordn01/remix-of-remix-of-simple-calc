import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type Profile = {
  id: string;
  name: string | null;
  is_approved: boolean;
  access_expires_at: string | null;
  created_at: string;
  updated_at: string;
};

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isMaster, setIsMaster] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((_, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      if (newSession?.user) {
        // Defer calls to avoid deadlocks
        setTimeout(() => {
          refreshProfile(newSession.user.id);
          checkIsMaster();
        }, 0);
      } else {
        setProfile(null);
        setIsMaster(false);
        setLoading(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        refreshProfile(session.user.id).finally(() => setLoading(false));
        checkIsMaster();
      } else {
        setLoading(false);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const refreshProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, name, is_approved, access_expires_at, created_at, updated_at")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.error("fetch profile error", error);
      return null;
    }

    if (!data) {
      const { data: inserted, error: insertErr } = await supabase
        .from("profiles")
        .insert({ id: userId })
        .select("id, name, is_approved, access_expires_at, created_at, updated_at")
        .maybeSingle();
      if (insertErr) {
        console.warn("could not create profile (likely awaiting email confirmation or RLS)", insertErr);
        setProfile(null);
        return null;
      }
      setProfile(inserted as Profile);
      return inserted as Profile;
    }

    setProfile(data as Profile);
    return data as Profile;
  };

  const checkIsMaster = async () => {
    const { data, error } = await supabase.rpc("is_master");
    if (!error) setIsMaster(Boolean(data));
  };

  return { session, user, profile, isMaster, loading, refreshProfile } as const;
}
