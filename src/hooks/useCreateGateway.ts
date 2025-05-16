import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createGateway } from '@/lib/api/gateways';
import { CreateGatewayInput, GatewayResponse } from '@/app/api/gateways/schemas';
import { ApiResponse } from '@/lib/api/api-client';
import { toast } from 'sonner';

/**
 * Hook for creating a new gateway
 */
export function useCreateGateway() {
  const queryClient = useQueryClient();

  const mutation = useMutation<ApiResponse<GatewayResponse>, Error, CreateGatewayInput>({
    mutationFn: createGateway,
    onSuccess: (response, variables) => {
      // Invalidate relevant queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['gateways'] });

      // If the new gateway belongs to a specific location, invalidate that location's gateways list
      if (variables.location) {
        queryClient.invalidateQueries({
          queryKey: ['gateways', { locationId: variables.location }],
        });
      }

      // Show success toast
      toast.success('Gateway created successfully');

      return response;
    },
    onError: error => {
      // Show error toast
      toast.error(`Failed to create gateway: ${error.message}`);
      return error;
    },
  });

  return {
    createGateway: mutation.mutateAsync,
    isLoading: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
  };
}
