import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateSensor } from '@/lib/api/sensors';
import { toast } from 'sonner';
import type { UpdateSensorInput } from '@/app/api/sensors/schemas';

export function useUpdateSensor(sensorId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateSensorInput) => updateSensor(sensorId, data),
    onSuccess: () => {
      toast.success('Sensor updated successfully');
      queryClient.invalidateQueries({ queryKey: ['sensor', sensorId] });
      queryClient.invalidateQueries({ queryKey: ['sensors'] });
    },
    onError: error => {
      toast.error(`Failed to update sensor: ${error.message}`);
    },
  });
}
