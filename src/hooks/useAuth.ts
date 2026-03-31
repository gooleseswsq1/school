'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'STUDENT' | 'TEACHER' | 'ADMIN';
  isActive?: boolean;
}

interface UseAuthOptions {
  requiredRole?: 'STUDENT' | 'TEACHER' | 'ADMIN';
  redirectOnUnauth?: boolean;
}

export const useAuth = (options: UseAuthOptions = {}) => {
  const router = useRouter();
  const { 
    requiredRole, 
    redirectOnUnauth = true 
  } = options;

  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize user from localStorage on mount only
  useEffect(() => {
    const userStr = localStorage.getItem('user');
    
    if (!userStr) {
      if (redirectOnUnauth) {
        router.push('/auth/login');
      }
      setIsLoading(false);
      return;
    }

    try {
      const parsedUser = JSON.parse(userStr) as User;
      
      // Check student active status
      if (parsedUser.role === 'STUDENT' && !parsedUser.isActive) {
        localStorage.removeItem('user');
        router.push('/auth/login?error=inactive');
        setIsLoading(false);
        return;
      }

      // Check required role
      if (requiredRole && parsedUser.role !== requiredRole) {
        const redirectPath = parsedUser.role === 'TEACHER' || parsedUser.role === 'ADMIN' 
          ? '/teacher' 
          : '/auth/login';
        router.push(redirectPath);
        setIsLoading(false);
        return;
      }

      setUser(parsedUser);
    } catch (error) {
      console.error('Failed to parse user from localStorage:', error);
      localStorage.removeItem('user');
      if (redirectOnUnauth) {
        router.push('/auth/login');
      }
    } finally {
      setIsLoading(false);
    }
  }, []); // Empty dependency - only run on mount

  const logout = () => {
    localStorage.removeItem('user');
    setUser(null);
    router.push('/auth/login');
  };

  return {
    user,
    isLoading,
    logout,
    isAuthenticated: !!user,
  };
};
