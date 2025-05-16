import { useQuery } from '@tanstack/react-query';
import { getSensorById } from '@/lib/api/sensors';
import type { SensorResponse } from '@/app/api/sensors/schemas';
import type { ApiResponse } from '@/lib/api/api-client';

export function useSensor(id: string) {
  return useQuery<ApiResponse<SensorResponse>, Error>({
    queryKey: ['sensor', id],
    queryFn: () => getSensorById(id),
    enabled: !!id,
  });
}
