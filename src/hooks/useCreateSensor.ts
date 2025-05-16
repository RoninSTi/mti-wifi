import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createSensor } from '@/lib/api/sensors';
import { CreateSensorInput, SensorResponse } from '@/app/api/sensors/schemas';
import { toast } from 'sonner';
import { ApiResponse } from '@/lib/api/api-client';

/**
 * Hook for creating a new sensor
 * @returns Object containing mutation function and states
 */
export function useCreateSensor() {
  const queryClient = useQueryClient();

  const mutation = useMutation<ApiResponse<SensorResponse>, Error, CreateSensorInput>({
    mutationFn: async data => {
      const result = await createSensor(data);
      return result as ApiResponse<SensorResponse>;
    },
    onSuccess: response => {
      // Invalidate relevant queries to trigger refetch
      queryClient.invalidateQueries({ queryKey: ['sensors'] });

      // If we have an equipment ID, invalidate that specific query too
      if (response.data?.equipment._id) {
        queryClient.invalidateQueries({
          queryKey: ['sensors', { equipmentId: response.data.equipment._id }],
        });
      }

      toast.success('Sensor created successfully');
    },
    onError: error => {
      toast.error(`Failed to create sensor: ${error.message}`);
    },
  });

  return {
    createSensor: mutation.mutateAsync,
    isLoading: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
    isSuccess: mutation.isSuccess,
  };
}
