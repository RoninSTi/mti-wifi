'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Settings } from 'lucide-react';
import { useEquipment, useDeleteEquipment } from '@/hooks';
import { toast } from 'sonner';
import { SensorsTable } from '@/components/sensors/SensorsTable';
import { DeleteButton } from '@/components/ui/delete-button';
import { SiteBreadcrumb, BreadcrumbItem } from '@/components/ui/site-breadcrumb';
import { Card } from '@/components/ui/card';
import { EntityMeta, EntityDescription } from '@/components/ui/entity-meta';
import { EditEquipmentDialog } from '@/components/equipment/EditEquipmentDialog';
import { Skeleton } from '@/components/ui/skeleton';

export default function EquipmentDetailsPage() {
  const params = useParams();
  const router = useRouter();

  // Type-safe parameter extraction with proper type narrowing
  const id = params?.id;
  const areaId = params?.areaId;
  const equipmentId = params?.equipmentId;

  if (
    !id ||
    Array.isArray(id) ||
    !areaId ||
    Array.isArray(areaId) ||
    !equipmentId ||
    Array.isArray(equipmentId)
  ) {
    throw new Error('Missing or invalid route parameters');
  }

  const organizationId = id;

  // Fetch equipment details
  const { equipment, isLoading, isError, error } = useEquipment(equipmentId);
  const { deleteEquipment, isLoading: isDeleting } = useDeleteEquipment();

  // Handle back navigation
  const handleBack = () => {
    router.push(`/organizations/${organizationId}/areas/${areaId}`);
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
        router.push(`/organizations/${organizationId}/areas/${areaId}`);
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

  // Build breadcrumb items based on available data
  const breadcrumbItems: BreadcrumbItem[] = [{ label: 'Organizations', href: '/organizations' }];

  if (equipment.area?.organization) {
    breadcrumbItems.push({
      label: equipment.area.organization.name,
      href: `/organizations/${organizationId}`,
    });
  }

  if (equipment.area) {
    breadcrumbItems.push({
      label: equipment.area.name,
      href: `/organizations/${organizationId}/areas/${areaId}`,
    });
  }

  breadcrumbItems.push({
    label: equipment.name,
    isCurrentPage: true,
  });

  return (
    <div className="container py-10 mx-auto">
      {/* Breadcrumb Navigation */}
      <SiteBreadcrumb className="mb-6" items={breadcrumbItems} />

      {/* Header with title and actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <div className="flex items-center gap-2">
          <Settings className="h-6 w-6" />
          <span className="text-xl font-medium">Equipment Details</span>
        </div>
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Button variant="outline" size="sm" onClick={handleBack}>
            Back to Area
          </Button>
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
      <div className="grid grid-cols-1 gap-8 mt-8">
        <Card className="overflow-hidden">
          <div className="p-6">
            <SensorsTable equipmentId={equipmentId} />
          </div>
        </Card>
      </div>
    </div>
  );
}
