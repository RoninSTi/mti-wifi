import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateProfile } from '@/lib/api/users';
import { UpdateProfileInput } from '@/app/api/users/profile/route';
import { UserProfile } from '@/lib/api/users';
import { toast } from 'sonner';
import { ApiResponse } from '@/lib/api/api-client';
import { useRouter } from 'next/navigation';

/**
 * Hook for updating the current user's profile
 * @returns Object containing mutation function and states
 */
export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const router = useRouter();

  const mutation = useMutation<ApiResponse<UserProfile>, Error, UpdateProfileInput>({
    mutationFn: async data => {
      return await updateProfile(data);
    },
    onSuccess: response => {
      // Check if there's an error in the response
      if (response.error) {
        throw new Error(response.error.message || 'Failed to update profile');
      }

      // Invalidate profile query to refetch with updated data
      queryClient.invalidateQueries({ queryKey: ['profile'] });

      // Invalidate session if email was updated (forces re-auth)
      if (response.data && 'email' in response.data) {
        // Force update of session context
        router.refresh();
      }

      toast.success('Profile updated successfully');
    },
    onError: error => {
      toast.error(`Failed to update profile: ${error.message}`);
    },
  });

  return {
    updateProfile: mutation.mutateAsync,
    isLoading: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
    isSuccess: mutation.isSuccess,
  };
}
