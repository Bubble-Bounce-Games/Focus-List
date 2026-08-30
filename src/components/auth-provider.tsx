"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type AuthContextValue = {
  configured: boolean;
  loading: boolean;
  user: User | null;
  session: Session | null;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue>({
  configured: false,
  loading: false,
  user: null,
  session: null,
  signOut: async () => undefined,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const supabase = getSupabaseBrowserClient();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(Boolean(supabase));

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    void (async () => {
      let nextSession: Session | null = null;
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        nextSession = sessionData.session;

        if (nextSession) {
          const { data: userData, error } = await supabase.auth.getUser();
          if (error || !userData.user) {
            await supabase.auth.signOut({ scope: "local" });
            nextSession = null;
          } else {
            nextSession = { ...nextSession, user: userData.user };
          }
        }
      } catch {
        nextSession = null;
      }

      if (active) {
        setSession(nextSession);
        setLoading(false);
      }
    })();
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [supabase]);

  return (
    <AuthContext.Provider
      value={{
        configured: Boolean(supabase),
        loading,
        user: session?.user ?? null,
        session,
        signOut: async () => {
          await supabase?.auth.signOut();
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
