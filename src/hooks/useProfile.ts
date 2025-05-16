import { useQuery } from '@tanstack/react-query';
import { getProfile } from '@/lib/api/users';
import type { UserProfile } from '@/lib/api/users';
import type { ApiResponse } from '@/lib/api/api-client';

/**
 * Hook for fetching current user's profile data
 * @returns Object containing profile data and query states
 */
export function useProfile() {
  const { data, isLoading, isError, error, refetch } = useQuery<ApiResponse<UserProfile>, Error>({
    queryKey: ['profile'],
    queryFn: getProfile,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });

  // Extract profile data from response
  const profile = data?.data;

  return {
    profile,
    isLoading,
    isError,
    error,
    refetch,
  };
}
