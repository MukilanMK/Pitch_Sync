import { createContext, useEffect, useMemo, useState } from "react";
import { authService } from "../services/authService";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem("pitchsync_token") || "");
  const [user, setUser] = useState(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  useEffect(() => {
    let mounted = true;

    const bootstrap = async () => {
      try {
        if (!token) {
          if (mounted) setUser(null);
          return;
        }

        const me = await authService.me(token);
        if (mounted) setUser(me.user);
      } catch {
        if (mounted) {
          setUser(null);
          setToken("");
          localStorage.removeItem("pitchsync_token");
        }
      } finally {
        if (mounted) setIsBootstrapping(false);
      }
    };

    setIsBootstrapping(true);
    bootstrap();

    return () => {
      mounted = false;
    };
  }, [token]);

  const login = async ({ email, password }) => {
    const { token: nextToken, user: nextUser } = await authService.login({ email, password });
    setToken(nextToken);
    localStorage.setItem("pitchsync_token", nextToken);
    setUser(nextUser);
    return { user: nextUser };
  };

  const register = async ({ name, userId, email, password, role }) => {
    const { token: nextToken, user: nextUser } = await authService.register({ name, userId, email, password, role });
    setToken(nextToken);
    localStorage.setItem("pitchsync_token", nextToken);
    setUser(nextUser);
    return { user: nextUser };
  };

  const logout = () => {
    setUser(null);
    setToken("");
    localStorage.removeItem("pitchsync_token");
  };

  const value = useMemo(
    () => ({
      token,
      user,
      isAuthenticated: Boolean(token && user),
      isBootstrapping,
      login,
      register,
      logout,
    }),
    [token, user, isBootstrapping]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export { AuthContext };

