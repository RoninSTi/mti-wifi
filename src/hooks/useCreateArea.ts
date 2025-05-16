import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createArea } from '@/lib/api/areas';
import { CreateAreaInput, AreaResponse } from '@/app/api/areas/schemas';
import { ApiResponse } from '@/lib/api/api-client';
import { toast } from 'sonner';

export interface UseCreateAreaResult {
  createArea: (data: CreateAreaInput) => Promise<ApiResponse<AreaResponse>>;
  isLoading: boolean;
  isError: boolean;
  isSuccess: boolean;
  error: unknown;
}

/**
 * Hook for creating a new area
 * @returns Mutation function and state
 */
export function useCreateArea(): UseCreateAreaResult {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (data: CreateAreaInput) => createArea(data),
    onSuccess: (response, variables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['areas'] });

      // If area was created for a specific location, invalidate that location's areas
      if (variables.location) {
        queryClient.invalidateQueries({
          queryKey: ['areas', { locationId: variables.location }],
        });
      }

      // Show success toast
      toast.success('Area created successfully');
    },
    onError: error => {
      toast.error(
        `Failed to create area: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    },
  });

  return {
    createArea: mutation.mutateAsync,
    isLoading: mutation.isPending,
    isError: mutation.isError,
    isSuccess: mutation.isSuccess,
    error: mutation.error,
  };
}
