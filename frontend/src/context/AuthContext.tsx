import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User } from '../types';
import { authApi, verificationApi } from '../api/client';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (identifier: string, pass: string) => Promise<void>;
  register: (
    name: string,
    email: string,
    phone: string,
    pass: string,
    extra?: { collegeId?: string; idType?: string; enrollmentId?: string },
  ) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  isVerified: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  const [loading, setLoading] = useState<boolean>(true);

  const refreshUser = useCallback(async () => {
    try {
      const me = await authApi.getMe();
      if (!me.verification || !me.isVerified) {
        try {
          const vStatus = await verificationApi.getMyStatus();
          if (vStatus && vStatus.status) {
            me.verification = {
              ...(me.verification || {}),
              ...vStatus,
            } as any;
            if (vStatus.status === 'VERIFIED') {
              me.isVerified = true;
              me.verificationStatus = 'VERIFIED';
            }
          }
        } catch {
          // Verification record might not exist yet
        }
      }
      setUser(me);
    } catch {
      localStorage.removeItem('token');
      setToken(null);
      setUser(null);
    }
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('token');
      if (storedToken) {
        setToken(storedToken);
        await refreshUser();
      }
      setLoading(false);
    };
    initAuth();
  }, [refreshUser]);

  const login = async (emailOrIdentifier: string, pass: string) => {
    const res = await authApi.login({ email: emailOrIdentifier.trim(), password: pass });
    localStorage.setItem('token', res.accessToken);
    setToken(res.accessToken);
    setUser(res.user);
    try {
      await refreshUser();
    } catch {
      // res.user is already stored
    }
  };

  const register = async (
    name: string,
    email: string,
    phone: string,
    pass: string,
    extra?: { collegeId?: string; idType?: string; enrollmentId?: string },
  ) => {
    const res = await authApi.register({
      name,
      email,
      phone,
      password: pass,
      collegeId: extra?.collegeId,
      idType: extra?.idType,
      enrollmentId: extra?.enrollmentId,
    });
    localStorage.setItem('token', res.accessToken);
    setToken(res.accessToken);
    setUser(res.user);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  const isVerified =
    user?.isVerified === true ||
    user?.verificationStatus === 'VERIFIED' ||
    user?.verification?.status === 'VERIFIED';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        logout,
        refreshUser,
        isVerified,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
