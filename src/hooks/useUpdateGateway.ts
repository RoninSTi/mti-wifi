import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateGateway } from '@/lib/api/gateways';
import { UpdateGatewayInput, GatewayResponse } from '@/app/api/gateways/schemas';
import { ApiResponse } from '@/lib/api/api-client';
import { toast } from 'sonner';

interface UpdateGatewayVars {
  id: string;
  data: UpdateGatewayInput;
}

/**
 * Hook for updating an existing gateway
 */
export function useUpdateGateway() {
  const queryClient = useQueryClient();

  const mutation = useMutation<ApiResponse<GatewayResponse>, Error, UpdateGatewayVars>({
    mutationFn: ({ id, data }: UpdateGatewayVars) => updateGateway(id, data),
    onSuccess: (response, variables) => {
      // Invalidate individual gateway query to refresh data
      queryClient.invalidateQueries({ queryKey: ['gateway', variables.id] });

      // Invalidate gateway lists to refresh with the updated data
      queryClient.invalidateQueries({ queryKey: ['gateways'] });

      // Show toast for all update operations except auth status changes
      // (Auth status toasts are handled in the connection context)
      if (!(variables.data && 'status' in variables.data)) {
        toast.success('Gateway updated successfully');
      }

      return response;
    },
    onError: error => {
      // Show error toast
      toast.error(`Failed to update gateway: ${error.message}`);
      return error;
    },
  });

  return {
    updateGateway: mutation.mutateAsync,
    isLoading: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
  };
}
