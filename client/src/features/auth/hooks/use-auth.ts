'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { loginUser, registerUser } from '../api/auth';
import { useAuthStore } from '@/stores/auth-store';
import type { LoginCredentials, RegisterData } from '@/types';

export function useLogin() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { setAuth } = useAuthStore();

  return useMutation({
    mutationFn: (credentials: LoginCredentials) => loginUser(credentials),
    onSuccess: (data) => {
      setAuth(data.user, data.accessToken);
      queryClient.invalidateQueries({ queryKey: ['user'] });
      toast.success('Logged in successfully');
      router.push('/');
    },
    onError: (error: Error) => {
      toast.error(`Login failed`, {
        description: error.message || 'Please try again later.',
      });
    },
  });
}

export function useRegister() {
  const router = useRouter();

  return useMutation({
    mutationFn: (data: RegisterData) => registerUser(data),
    onSuccess: () => {
      toast.success('Registered successfully');
      router.push('/login');
    },
    onError: (error: Error) => {
      toast.error(`Registration failed`, {
        description: error.message || 'Please try again later.',
      });
    },
  });
}

export function useLogout() {
  const router = useRouter();
  const { clearAuth } = useAuthStore();
  const queryClient = useQueryClient();

  const logout = () => {
    clearAuth();
    queryClient.clear();
    toast.success('Logged out successfully');
    router.push('/login');
  };

  return { logout };
}
