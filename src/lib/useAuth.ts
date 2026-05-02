import { useEffect, useState, useCallback } from "react";
import { api } from "./api";
import type { User } from "./types";

export function useAuth() {
  const [user, setUser] = useState<User | null>(() => api.me());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setUser(api.me());
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    setLoading(true);
    try {
      const { user } = await api.login({ username, password });
      setUser(user);
      return user;
    } finally {
      setLoading(false);
    }
  }, []);

  const signup = useCallback(
    async (input: { username: string; name: string; email: string; password: string }) => {
      setLoading(true);
      try {
        const { user } = await api.signup(input);
        setUser(user);
        return user;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const logout = useCallback(() => {
    api.logout();
    setUser(null);
  }, []);

  return { user, loading, login, signup, logout };
}
