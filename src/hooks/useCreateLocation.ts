import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createLocation } from '@/lib/api/locations';
import { CreateLocationInput, LocationResponse } from '@/app/api/locations/schemas';
import { toast } from 'sonner';
import { ApiResponse } from '@/lib/api/api-client';

/**
 * Hook for creating a new location
 * @returns Object containing mutation function and states
 */
export function useCreateLocation() {
  const queryClient = useQueryClient();

  const mutation = useMutation<ApiResponse<LocationResponse>, Error, CreateLocationInput>({
    mutationFn: async data => {
      const result = await createLocation(data);
      return result as ApiResponse<LocationResponse>;
    },
    onSuccess: response => {
      // Invalidate relevant queries to trigger refetch
      queryClient.invalidateQueries({ queryKey: ['locations'] });

      // If we have an organization ID, invalidate that specific query too
      if (response.data?.organization) {
        queryClient.invalidateQueries({
          queryKey: ['locations', { organizationId: response.data.organization }],
        });
      }

      toast.success('Location created successfully');
    },
    onError: error => {
      toast.error(`Failed to create location: ${error.message}`);
    },
  });

  return {
    createLocation: mutation.mutateAsync,
    isLoading: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
    isSuccess: mutation.isSuccess,
  };
}
