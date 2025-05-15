import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateLocation } from '@/lib/api/locations';
import { LocationResponse, UpdateLocationInput } from '@/app/api/locations/schemas';
import { toast } from 'sonner';
import { ApiResponse } from '@/lib/api/api-client';

interface UpdateLocationArgs {
  id: string;
  data: UpdateLocationInput;
}

/**
 * Hook for updating an existing location
 * @returns Object containing mutation function and states
 */
export function useUpdateLocation() {
  const queryClient = useQueryClient();

  const mutation = useMutation<ApiResponse<LocationResponse>, Error, UpdateLocationArgs>({
    mutationFn: async ({ id, data }) => {
      const result = await updateLocation(id, data);
      return result as ApiResponse<LocationResponse>;
    },
    onSuccess: (response, variables) => {
      // Invalidate the specific location query
      queryClient.invalidateQueries({ queryKey: ['location', variables.id] });

      // Invalidate the locations list queries
      queryClient.invalidateQueries({ queryKey: ['locations'] });

      // If we know the organization ID, invalidate that specific query too
      if (response.data?.organization) {
        queryClient.invalidateQueries({
          queryKey: ['locations', { organizationId: response.data.organization }],
        });
      }

      toast.success('Location updated successfully');
    },
    onError: error => {
      toast.error(`Failed to update location: ${error.message}`);
    },
  });

  return {
    updateLocation: mutation.mutateAsync,
    isLoading: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
    isSuccess: mutation.isSuccess,
  };
}
