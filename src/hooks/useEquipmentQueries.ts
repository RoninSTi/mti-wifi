import { useEquipment } from './useEquipment';
import { useEquipmentList, type UseEquipmentListParams } from './useEquipmentList';
import { useCreateEquipment } from './useCreateEquipment';
import { useUpdateEquipment } from './useUpdateEquipment';
import { useDeleteEquipment } from './useDeleteEquipment';

/**
 * Aggregate hook that provides access to all equipment-related queries and mutations
 */
export function useEquipmentQueries(equipmentId?: string, listParams: UseEquipmentListParams = {}) {
  // Single equipment query - use empty string as fallback to avoid conditional hook call
  const equipmentQuery = useEquipment(equipmentId || '');

  // Equipment list query
  const equipmentListQuery = useEquipmentList(listParams);

  // Mutations
  const createEquipmentMutation = useCreateEquipment();
  const updateEquipmentMutation = useUpdateEquipment();
  const deleteEquipmentMutation = useDeleteEquipment();

  return {
    // Single equipment
    equipment: equipmentId ? equipmentQuery.equipment : null,
    isLoadingEquipment: equipmentId ? equipmentQuery.isLoading : false,
    isErrorEquipment: equipmentId ? equipmentQuery.isError : false,
    equipmentError: equipmentId ? equipmentQuery.error : null,

    // Equipment list
    equipmentList: equipmentListQuery.equipment,
    isLoadingEquipmentList: equipmentListQuery.isLoading,
    isErrorEquipmentList: equipmentListQuery.isError,
    equipmentListError: equipmentListQuery.error,
    pagination: equipmentListQuery.pagination,
    refetchEquipmentList: equipmentListQuery.refetch,

    // Mutations
    createEquipment: createEquipmentMutation.createEquipment,
    isCreatingEquipment: createEquipmentMutation.isLoading,
    createEquipmentError: createEquipmentMutation.error,

    updateEquipment: updateEquipmentMutation.updateEquipment,
    isUpdatingEquipment: updateEquipmentMutation.isLoading,
    updateEquipmentError: updateEquipmentMutation.error,

    deleteEquipment: deleteEquipmentMutation.deleteEquipment,
    isDeletingEquipment: deleteEquipmentMutation.isLoading,
    deleteEquipmentError: deleteEquipmentMutation.error,
  };
}
