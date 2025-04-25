
import React, { createContext, useContext, useEffect, useState } from 'react';
import { AuthState, User } from '../types';
import { authAPI } from '../api';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: true,
  });
  const { toast } = useToast();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const token = localStorage.getItem('garden_token');
        const userString = localStorage.getItem('garden_user');
        
        if (token && userString) {
          const user: User = JSON.parse(userString);
          setAuthState({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
          });
        } else {
          setAuthState({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      } catch (error) {
        console.error('Failed to load user from storage', error);
        localStorage.removeItem('garden_token');
        localStorage.removeItem('garden_user');
        setAuthState({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
        });
      }
    };
    
    loadUser();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const { user, token } = await authAPI.login(email, password);
      
      localStorage.setItem('garden_token', token);
      localStorage.setItem('garden_user', JSON.stringify(user));
      
      setAuthState({
        user,
        token,
        isAuthenticated: true,
        isLoading: false,
      });
      
      toast({
        title: "Login successful",
        description: `Welcome back, ${user.name}!`,
      });
    } catch (error) {
      toast({
        title: "Login failed",
        description: "Invalid email or password. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const register = async (name: string, email: string, password: string) => {
    try {
      const { user, token } = await authAPI.register(name, email, password);
      
      localStorage.setItem('garden_token', token);
      localStorage.setItem('garden_user', JSON.stringify(user));
      
      setAuthState({
        user,
        token,
        isAuthenticated: true,
        isLoading: false,
      });
      
      toast({
        title: "Registration successful",
        description: `Welcome to Garden Planner, ${name}!`,
      });
    } catch (error) {
      toast({
        title: "Registration failed",
        description: "Could not create account. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const logout = () => {
    authAPI.logout();
    setAuthState({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
    });
    toast({
      title: "Logged out",
      description: "You have been successfully logged out.",
    });
  };

  return (
    <AuthContext.Provider
      value={{
        ...authState,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
