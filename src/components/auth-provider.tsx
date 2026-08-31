"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import {
  AUTH_CHANGED_EVENT,
  getCognitoUserPool,
  getCurrentUser,
  signOut as cognitoSignOut,
  type FocusListUser,
} from "@/lib/cognito/client";
import { resetPrivateS3State } from "@/lib/focuslist/private-s3-state";

type AuthContextValue = {
  configured: boolean;
  loading: boolean;
  user: FocusListUser | null;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue>({
  configured: false,
  loading: false,
  user: null,
  refresh: async () => undefined,
  signOut: async () => undefined,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const configured = Boolean(getCognitoUserPool());
  const [user, setUser] = useState<FocusListUser | null>(null);
  const [loading, setLoading] = useState(configured);

  const refresh = useCallback(async () => {
    setLoading(true);
    setUser(await getCurrentUser());
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!configured) return;
    void getCurrentUser().then((nextUser) => {
      setUser(nextUser);
      setLoading(false);
    });
    const handleAuthChange = () => {
      resetPrivateS3State();
      void refresh();
    };
    window.addEventListener(AUTH_CHANGED_EVENT, handleAuthChange);
    return () => {
      window.removeEventListener(AUTH_CHANGED_EVENT, handleAuthChange);
    };
  }, [configured, refresh]);

  return (
    <AuthContext.Provider
      value={{
        configured,
        loading,
        user,
        refresh,
        signOut: async () => {
          cognitoSignOut();
          resetPrivateS3State();
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
