'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Settings } from 'lucide-react';
import { useEquipment, useDeleteEquipment } from '@/hooks';
import { toast } from 'sonner';
import { SensorsTable } from '@/components/sensors/SensorsTable';
import { DeleteButton } from '@/components/ui/delete-button';
import { EntityMeta, EntityDescription } from '@/components/ui/entity-meta';
import { EditEquipmentDialog } from '@/components/equipment/EditEquipmentDialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useTypedParams } from '@/lib/utils';
import { DetailPageBreadcrumbs } from '@/components/shared';

export default function EquipmentDetailsPage() {
  const router = useRouter();

  // Type-safe params - automatically throws error if params are missing or invalid
  type EquipmentDetailParams = {
    id: string; // Organization ID
    locationId: string; // Location ID
    areaId: string; // Area ID
    equipmentId: string; // Equipment ID
  };
  const {
    id: organizationId,
    locationId,
    areaId,
    equipmentId,
  } = useTypedParams<EquipmentDetailParams>();

  // Fetch equipment details
  const { equipment, isLoading, isError, error } = useEquipment(equipmentId);
  const { deleteEquipment, isLoading: isDeleting } = useDeleteEquipment();

  // Handle back navigation
  const handleBack = () => {
    router.push(`/organizations/${organizationId}/locations/${locationId}/areas/${areaId}`);
  };

  // Handle equipment deletion
  const handleDelete = async () => {
    try {
      const result = await deleteEquipment(equipmentId);
      if (result.error) {
        toast.error(result.error.message || 'Failed to delete equipment');
      } else {
        toast.success('Equipment deleted successfully');
        // Navigate back to area page
        router.push(`/organizations/${organizationId}/locations/${locationId}/areas/${areaId}`);
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'An error occurred while deleting equipment'
      );
    }
  };

  // Format date helper
  const formatDate = (dateString?: string | Date): string => {
    if (!dateString) return 'Not specified';
    return new Date(dateString).toLocaleDateString();
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="container py-10 mx-auto">
        <div className="flex items-center gap-2 mb-6">
          <Skeleton className="h-8 w-[250px]" />
        </div>

        <div className="grid grid-cols-1 gap-8">
          <Skeleton className="h-[500px] w-full" />
        </div>
      </div>
    );
  }

  // Error state
  if (isError || !equipment) {
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to load equipment details';

    return (
      <div className="container py-10 mx-auto">
        <div className="flex items-center gap-2 mb-6">
          <h1 className="text-2xl font-bold">Equipment not found</h1>
        </div>

        <div className="bg-destructive/10 text-destructive rounded-lg p-4 mt-6">
          <p>{errorMessage}</p>
          <Button className="mt-4" onClick={handleBack}>
            Return to Area
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-10 mx-auto">
      {/* Breadcrumb navigation */}
      <DetailPageBreadcrumbs className="mb-6" />

      {/* Header with title and actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <div className="flex items-center gap-2">
          <Settings className="h-6 w-6" />
          <span className="text-xl font-medium">Equipment Details</span>
        </div>
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <EditEquipmentDialog
            equipmentId={equipmentId}
            trigger={
              <Button variant="outline" size="sm">
                Edit Equipment
              </Button>
            }
          />
          <DeleteButton
            onDelete={handleDelete}
            resourceName="equipment"
            isDeleting={isDeleting}
            size="sm"
          />
        </div>
      </div>

      {/* Equipment header */}
      <div className="flex flex-col md:flex-row justify-between gap-4 items-start md:items-center mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{equipment.name}</h1>
          </div>
          <p className="text-muted-foreground mt-1">
            {equipment.equipmentType}
            {equipment.manufacturer && ` • ${equipment.manufacturer}`}
          </p>
        </div>
      </div>

      {/* Equipment Metadata */}
      <EntityMeta
        className="mb-6"
        items={[
          {
            label: 'Status',
            value: equipment.status.charAt(0).toUpperCase() + equipment.status.slice(1),
          },
          {
            label: 'Manufacturer',
            value: equipment.manufacturer || 'Not specified',
          },
          {
            label: 'Model Number',
            value: equipment.modelNumber || 'Not specified',
          },
          {
            label: 'Serial Number',
            value: equipment.serialNumber || 'Not specified',
          },
          {
            label: 'Criticality',
            value: equipment.criticalityLevel
              ? equipment.criticalityLevel.charAt(0).toUpperCase() +
                equipment.criticalityLevel.slice(1)
              : 'Medium',
          },
          {
            label: 'Installation Date',
            value: formatDate(equipment.installationDate),
          },
        ]}
      />

      {/* Description */}
      {equipment.description && <EntityDescription>{equipment.description}</EntityDescription>}

      {/* Notes */}
      {equipment.notes && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">Notes</h3>
          <div className="p-4 rounded-lg border bg-card">
            <p>{equipment.notes}</p>
          </div>
        </div>
      )}

      {/* Maintenance Information */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-2">Maintenance Information</h3>
        <div className="p-4 rounded-lg border bg-card grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <span className="font-medium">Last Maintenance:</span>
            <p className="text-muted-foreground">
              {equipment.lastMaintenanceDate
                ? formatDate(equipment.lastMaintenanceDate)
                : 'Not specified'}
            </p>
          </div>
          <div>
            <span className="font-medium">Next Maintenance:</span>
            <p className="text-muted-foreground">
              {equipment.nextMaintenanceDate
                ? formatDate(equipment.nextMaintenanceDate)
                : 'Not scheduled'}
            </p>
          </div>
          <div>
            <span className="font-medium">Maintenance Interval:</span>
            <p className="text-muted-foreground">
              {equipment.maintenanceInterval
                ? `${equipment.maintenanceInterval} days`
                : 'Not specified'}
            </p>
          </div>
          <div>
            <span className="font-medium">Maintenance Status:</span>
            <p
              className={`${equipment.maintenanceDue ? 'text-orange-500' : 'text-muted-foreground'}`}
            >
              {equipment.maintenanceDue ? 'Maintenance Due' : 'Up to date'}
            </p>
          </div>
        </div>
      </div>

      {/* Sensors Section */}
      <div className="mt-8">
        <SensorsTable
          equipmentId={equipmentId}
          organizationId={organizationId}
          locationId={locationId}
          areaId={areaId}
        />
      </div>
    </div>
  );
}
