import React, { createContext, useContext, useState, useEffect } from 'react';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'staff';
  permissions: string[];
}

interface AuthContextType {
  token: string | null;
  user: User | null;
  loading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
  updateUser: (user: User) => void;
  activeBranch: string;
  setActiveBranch: (branch: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_URL = '/api';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeBranch, setActiveBranchState] = useState<string>(
    localStorage.getItem('activeBranch') || 'New Delhi Branch (HQ)'
  );

  const setActiveBranch = (branch: string) => {
    setActiveBranchState(branch);
    localStorage.setItem('activeBranch', branch);
  };

  useEffect(() => {
    const loadProfile = async () => {
      const savedToken = localStorage.getItem('token');
      if (!savedToken) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`${API_URL}/auth/profile`, {
          headers: {
            'Authorization': `Bearer ${savedToken}`
          }
        });

        if (res.ok) {
          const userData = await res.json();
          setUser(userData);
          setToken(savedToken);
        } else {
          // Token expired or invalid
          logout();
        }
      } catch (err) {
        console.error('Error fetching user profile:', err);
        logout();
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  const login = (jwtToken: string, userData: User) => {
    localStorage.setItem('token', jwtToken);
    setToken(jwtToken);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    return user.permissions.includes(permission);
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        loading,
        login,
        logout,
        hasPermission,
        updateUser,
        activeBranch,
        setActiveBranch
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
