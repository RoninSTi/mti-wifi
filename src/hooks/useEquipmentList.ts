import { useQuery } from '@tanstack/react-query';
import { getEquipment } from '@/lib/api/equipment';
import { EquipmentResponse } from '@/app/api/equipment/schemas';
import { PaginationMeta } from '@/lib/pagination/types';
import { PaginatedApiResponse } from '@/lib/api/api-client';

export interface UseEquipmentListParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  q?: string;
  areaId?: string;
  name?: string;
  equipmentType?: string;
  status?: 'active' | 'inactive' | 'maintenance' | 'failed';
  maintenanceDue?: boolean;
}

export interface UseEquipmentListResult {
  equipment: EquipmentResponse[];
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  pagination: PaginationMeta | null;
  refetch: () => Promise<void>;
}

/**
 * Hook for fetching equipment list with pagination and filtering
 */
export function useEquipmentList({
  page = 1,
  limit = 10,
  sortBy,
  sortOrder = 'desc',
  q,
  areaId,
  name,
  equipmentType,
  status,
  maintenanceDue,
}: UseEquipmentListParams = {}): UseEquipmentListResult {
  const queryKey = [
    'equipment',
    { page, limit, sortBy, sortOrder, q, areaId, name, equipmentType, status, maintenanceDue },
  ];

  const { data, isLoading, isError, error, refetch } = useQuery<
    PaginatedApiResponse<EquipmentResponse>,
    Error
  >({
    queryKey,
    queryFn: () =>
      getEquipment({
        page,
        limit,
        sortBy,
        sortOrder,
        q,
        areaId,
        name,
        equipmentType,
        status,
        maintenanceDue,
      }),
    staleTime: 60 * 1000, // 1 minute
    // Only fetch if we have an areaId or other filter
    enabled:
      !!areaId || !!q || !!name || !!equipmentType || !!status || maintenanceDue !== undefined,
  });

  // Extract equipment and pagination from the response
  const equipment = data?.data?.data || [];
  const pagination = data?.data?.meta || null;

  // Create refetch function
  const refetchData = async () => {
    await refetch();
  };

  return {
    equipment,
    isLoading,
    isError,
    error,
    pagination,
    refetch: refetchData,
  };
}
