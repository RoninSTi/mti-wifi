import { useQuery } from '@tanstack/react-query';
import { getSensorById } from '@/lib/api/sensors';
import type { SensorResponse } from '@/app/api/sensors/schemas';
import type { ApiResponse } from '@/lib/api/api-client';

interface UseSensorResult {
  sensor: SensorResponse | null;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  refetch: () => Promise<unknown>;
}

/**
 * Hook for fetching a single sensor by ID
 * @param id Sensor ID
 * @returns Sensor data with loading and error states
 */
export function useSensor(id: string): UseSensorResult {
  const shouldFetch = id && id.length > 0;

  const { data, isLoading, isError, error, refetch } = useQuery<ApiResponse<SensorResponse>, Error>(
    {
      queryKey: ['sensor', id],
      queryFn: () => getSensorById(id),
      enabled: !!shouldFetch,
      staleTime: 60 * 1000, // 1 minute
      refetchOnWindowFocus: true, // Refetch when window gains focus
    }
  );

  // Get the sensor from data
  const sensor = data?.data || null;

  return {
    sensor,
    isLoading: !!shouldFetch && isLoading,
    isError,
    error,
    refetch,
  };
}
