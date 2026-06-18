import React, { createContext, useContext, useEffect, useState } from "react";
import { setAuthTokenGetter, useGetMe, useLogout } from "@workspace/api-client-react";
import type { UserProfile } from "@workspace/api-client-react";
import { useLocation } from "wouter";

let accessToken: string | null = null;

export const getAccessToken = () => accessToken;
export const setAccessToken = (token: string | null) => {
  accessToken = token;
};

// Hook up the API client interceptor
setAuthTokenGetter(() => getAccessToken());

interface AuthContextType {
  user: UserProfile | null;
  isLoading: boolean;
  login: (token: string, user: UserProfile) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [, setLocation] = useLocation();

  const { data, isLoading } = useGetMe({
    query: {
      retry: false,
      queryKey: ["getMe"],
    }
  });

  useEffect(() => {
    if (data) {
      setUser(data);
    }
  }, [data]);

  const logoutMutation = useLogout();

  const login = (token: string, userData: UserProfile) => {
    setAccessToken(token);
    setUser(userData);
  };

  const logout = () => {
    logoutMutation.mutate(undefined, {
      onSettled: () => {
        setAccessToken(null);
        setUser(null);
        setLocation("/login");
      }
    });
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
