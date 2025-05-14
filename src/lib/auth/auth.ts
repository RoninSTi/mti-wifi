'use client';

import { signIn, signOut, useSession } from 'next-auth/react';

// Custom hook to check if user is authenticated
export function useAuth() {
  const { data: session, status } = useSession();
  const isAuthenticated = status === 'authenticated';
  const isLoading = status === 'loading';
  
  return {
    session,
    isAuthenticated,
    isLoading,
    user: session?.user,
    signIn,
    signOut,
  };
}

// Auth actions
export async function login(username: string, password: string) {
  try {
    const result = await signIn('credentials', {
      username,
      password,
      redirect: false,
    });
    
    return result;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
}

export async function logout() {
  await signOut({ redirect: false });
}

export async function register(username: string, email: string, password: string) {
  try {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, email, password }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Registration failed');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Registration error:', error);
    throw error;
  }
}