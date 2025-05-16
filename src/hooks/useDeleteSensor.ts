import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteSensor } from '@/lib/api/sensors';
import { toast } from 'sonner';

export function useDeleteSensor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (sensorId: string) => deleteSensor(sensorId),
    onSuccess: () => {
      toast.success('Sensor deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['sensors'] });
    },
    onError: error => {
      toast.error(`Failed to delete sensor: ${error.message}`);
    },
  });
}
