import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateArea } from '@/lib/api/areas';
import { UpdateAreaInput, AreaResponse } from '@/app/api/areas/schemas';
import { ApiResponse } from '@/lib/api/api-client';
import { toast } from 'sonner';

interface UpdateAreaParams {
  id: string;
  data: UpdateAreaInput;
}

export interface UseUpdateAreaResult {
  updateArea: (params: UpdateAreaParams) => Promise<ApiResponse<AreaResponse>>;
  isLoading: boolean;
  isError: boolean;
  isSuccess: boolean;
  error: unknown;
}

/**
 * Hook for updating an area
 * @returns Mutation function and state
 */
export function useUpdateArea(): UseUpdateAreaResult {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({ id, data }: UpdateAreaParams) => updateArea(id, data),
    onSuccess: response => {
      // Invalidate the specific area query
      if (response.data?._id) {
        queryClient.invalidateQueries({ queryKey: ['area', response.data._id] });
      }

      // Invalidate all areas list queries
      queryClient.invalidateQueries({ queryKey: ['areas'] });

      // If we know the locationId, invalidate that specific area listing
      if (response.data?.location?._id) {
        queryClient.invalidateQueries({
          queryKey: ['areas', { locationId: response.data.location._id }],
        });
      }

      // Show success toast
      toast.success('Area updated successfully');
    },
    onError: error => {
      toast.error(
        `Failed to update area: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    },
  });

  return {
    updateArea: mutation.mutateAsync,
    isLoading: mutation.isPending,
    isError: mutation.isError,
    isSuccess: mutation.isSuccess,
    error: mutation.error,
  };
}
