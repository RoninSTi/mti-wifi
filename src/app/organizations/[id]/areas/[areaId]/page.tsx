'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Grid3X3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useArea, useLocation, useDeleteArea } from '@/hooks';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import Link from 'next/link';
import { EditAreaDialog } from '@/components/areas/EditAreaDialog';
import { EquipmentTab } from '@/components/areas/EquipmentTab';

export default function AreaDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const organizationId = params?.id as string;
  const areaId = params?.areaId as string;
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);

  // Use the custom hook to fetch area data
  const { area, isLoading, isError, error } = useArea(areaId);

  // Get location data for breadcrumb
  const locationId = area?.location?._id || '';
  const { location } = useLocation(locationId);

  // Delete area hook
  const { deleteArea, isLoading: isDeleting } = useDeleteArea();

  // Handle back navigation
  const handleBack = () => {
    router.push(`/organizations/${organizationId}/locations/${locationId}?tab=areas`);
  };

  // Handle delete
  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this area?')) {
      return;
    }

    try {
      await deleteArea(areaId);
      toast.success('Area deleted successfully');
      router.push(`/organizations/${organizationId}/locations/${locationId}?tab=areas`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete area');
    }
  };

  // Format area type for display
  const formatAreaType = (type?: string) => {
    if (!type) return 'Other';
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  if (isLoading) {
    return (
      <div className="container py-10 mx-auto">
        <div className="flex items-center gap-2 mb-6">
          <Button variant="outline" size="icon" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Skeleton className="h-8 w-[250px]" />
        </div>

        <div className="grid grid-cols-1 gap-8">
          <Skeleton className="h-[500px] w-full" />
        </div>
      </div>
    );
  }

  if (isError || !area) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to load area details';

    return (
      <div className="container py-10 mx-auto">
        <div className="flex items-center gap-2 mb-6">
          <Button variant="outline" size="icon" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">Area not found</h1>
        </div>

        <div className="bg-destructive/10 text-destructive rounded-lg p-4 mt-6">
          <p>{errorMessage}</p>
          <Button className="mt-4" onClick={handleBack}>
            Return to Location
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-10 mx-auto">
      {/* Breadcrumb Navigation */}
      <Breadcrumb className="mb-6">
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href="/organizations">Organizations</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href={`/organizations/${organizationId}`}>
              {location?.name || 'Organization'}
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href={`/organizations/${organizationId}/locations/${locationId}`}>
              {area.location.name}
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbLink className="font-semibold">{area.name}</BreadcrumbLink>
        </BreadcrumbItem>
      </Breadcrumb>

      <div className="flex items-center gap-2 mb-6">
        <Button variant="outline" size="icon" onClick={handleBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2">
          <Grid3X3 className="h-6 w-6" />
          <h1 className="text-2xl font-bold">{area.name}</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        <div className="max-w-3xl">
          {area.description && (
            <div className="mb-6">
              <h3 className="text-lg font-medium mb-2">Description</h3>
              <p className="text-muted-foreground">{area.description}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-6 mb-6">
            <div>
              <h3 className="text-lg font-medium mb-2">Area Type</h3>
              <p className="text-muted-foreground">{formatAreaType(area.areaType)}</p>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-2">Floor Level</h3>
              <p className="text-muted-foreground">{area.floorLevel ?? 'Not specified'}</p>
            </div>
          </div>

          {area.buildingSection && (
            <div className="mb-6">
              <h3 className="text-lg font-medium mb-2">Building Section</h3>
              <p className="text-muted-foreground">{area.buildingSection}</p>
            </div>
          )}

          <div className="flex gap-2 mt-8">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(true)}>
              Edit Area
            </Button>

            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              Delete Area
            </Button>
          </div>
        </div>
      </div>

      {/* Equipment Section */}
      <div className="mt-8">
        <div className="rounded-md border">
          <div className="bg-muted p-4 border-b">
            <h2 className="text-xl font-semibold">Equipment</h2>
          </div>
          <div className="p-4">
            <div className="w-full mx-auto">
              {isLoading ? (
                <div className="flex justify-center p-8">
                  <Skeleton className="h-48 w-full max-w-md" />
                </div>
              ) : (
                <div className="space-y-4">
                  <EquipmentTab areaId={areaId} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Edit area dialog */}
      {area && (
        <EditAreaDialog area={area} open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen} />
      )}
    </div>
  );
}
