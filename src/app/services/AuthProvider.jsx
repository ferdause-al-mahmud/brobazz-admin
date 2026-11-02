"use client";

import { createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext(null);

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadSession = async () => {
      try {
        const response = await fetch("/api/auth/session", {
          cache: "no-store",
        });

        if (response.status === 401) {
          setUser(null);
          setError(null);
          return;
        }
        if (!response.ok) {
          throw new Error("Failed to check the current session.");
        }

        const data = await response.json();
        setUser(data.user);
      } catch (error) {
        console.error("Failed to initialize authentication:", error);
        setUser(null);
        setError("Unable to verify your session. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    loadSession();
  }, []);

  const updateUser = (nextUser) => {
    setError(null);
    setUser(nextUser);
  };

  return (
    <AuthContext.Provider value={{ user, setUser: updateUser, loading, error }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider.");
  }
  return context;
};

export default AuthProvider;
