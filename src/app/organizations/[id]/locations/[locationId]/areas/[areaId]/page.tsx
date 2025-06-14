'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTypedParams } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, Grid3X3 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useArea, useDeleteArea } from '@/hooks';
import { toast } from 'sonner';
import { EquipmentTab } from '@/components/areas/EquipmentTab';
import { DeleteButton } from '@/components/ui/delete-button';
import { EntityMeta, EntityDescription } from '@/components/ui/entity-meta';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { DetailPageBreadcrumbs } from '@/components/shared';

export default function AreaDetailsPage() {
  // Type-safe params - automatically throws error if params are missing or invalid
  type AreaDetailParams = {
    id: string; // Organization ID
    locationId: string; // Location ID
    areaId: string; // Area ID
  };
  const { id: organizationId, locationId, areaId } = useTypedParams<AreaDetailParams>();
  const router = useRouter();
  const [isAlertDialogOpen, setIsAlertDialogOpen] = useState(false);

  // Fetch area details
  const { area, isLoading, isError, error } = useArea(areaId);
  const { deleteArea, isLoading: isDeleting } = useDeleteArea();

  // Handle area deletion
  const handleDelete = async () => {
    try {
      const result = await deleteArea(areaId);
      if (result.error) {
        toast.error(result.error.message || 'Failed to delete area');
      } else {
        toast.success('Area deleted successfully');
        // Navigate back to location details
        router.push(`/organizations/${organizationId}/locations/${locationId}`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'An error occurred while deleting area');
    } finally {
      setIsAlertDialogOpen(false);
    }
  };

  // If still loading, show loading state
  if (isLoading) {
    return (
      <div className="container py-10 mx-auto">
        <div className="mb-6">
          <Skeleton className="h-8 w-[250px]" />
        </div>

        <div className="grid grid-cols-1 gap-8">
          <Skeleton className="h-[500px] w-full" />
        </div>
      </div>
    );
  }

  // If error, show error state
  if (isError || !area) {
    const errorMessage =
      error instanceof Error ? error.message : 'The requested area could not be found';

    return (
      <div className="container py-10 mx-auto">
        <div className="flex items-center gap-2 mb-6">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.push(`/organizations/${organizationId}/locations/${locationId}`)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">Area not found</h1>
        </div>

        <div className="bg-destructive/10 text-destructive rounded-lg p-4 mt-6">
          <p>{errorMessage}</p>
          <Button
            className="mt-4"
            onClick={() => router.push(`/organizations/${organizationId}/locations/${locationId}`)}
          >
            Return to Location
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
          <Grid3X3 className="h-6 w-6" />
          <span className="text-xl font-medium">Area Details</span>
        </div>
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              router.push(
                `/organizations/${organizationId}/locations/${locationId}/areas/${areaId}/edit`
              )
            }
          >
            Edit Area
          </Button>
          <DeleteButton
            onDelete={handleDelete}
            resourceName="area"
            isDeleting={isDeleting}
            onClick={() => setIsAlertDialogOpen(true)}
            size="sm"
          />
        </div>
      </div>

      {/* Area header */}
      <div className="flex flex-col md:flex-row justify-between gap-4 items-start md:items-center mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{area.name}</h1>
          </div>
          <p className="text-muted-foreground mt-1">
            {area.areaType &&
              `${area.areaType.charAt(0).toUpperCase() + area.areaType.slice(1)} Area`}
            {area.floorLevel !== undefined && ` • Floor ${area.floorLevel}`}
            {area.buildingSection && ` • ${area.buildingSection}`}
          </p>
        </div>
      </div>

      {/* Area Metadata */}
      <EntityMeta
        className="mb-6"
        items={[
          {
            label: 'Area Type',
            value: area.areaType
              ? area.areaType.charAt(0).toUpperCase() + area.areaType.slice(1)
              : null,
          },
          {
            label: 'Building Section',
            value: area.buildingSection,
          },
          {
            label: 'Floor Level',
            value: area.floorLevel !== undefined ? area.floorLevel : null,
          },
          {
            label: 'Location',
            value: area.location?.name,
          },
        ]}
      />

      {/* Description */}
      {area.description && <EntityDescription>{area.description}</EntityDescription>}

      {/* Area Details */}
      <div className="mt-8">
        <EquipmentTab areaId={areaId} showSearch={false} />
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={isAlertDialogOpen} onOpenChange={setIsAlertDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the area &quot;{area.name}
              &quot; and all associated equipment.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete Area
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
