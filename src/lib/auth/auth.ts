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

    const data = await response.json();

    if (!response.ok) {
      // Handle specific error responses
      if (response.status === 409) {
        throw new Error('User with this email or username already exists');
      }

      if (response.status === 400 && data.details) {
        // For validation errors with details
        throw new Error(Array.isArray(data.details) ? data.details.join(', ') : data.details);
      }

      // For other errors
      throw new Error(data.error || 'Registration failed');
    }

    return data;
  } catch (error) {
    console.error('Registration error:', error);
    throw error;
  }
}
