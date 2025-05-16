'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, AlertTriangle } from 'lucide-react';
import { useArea, useDeleteArea } from '@/hooks';
import { toast } from 'sonner';
import { EquipmentTab } from '@/components/areas/EquipmentTab';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { DeleteButton } from '@/components/ui/delete-button';
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

interface AreaDetailsPageProps {
  params: {
    id: string;
    locationId: string;
    areaId: string;
  };
}

export default function AreaDetailsPage({ params }: AreaDetailsPageProps) {
  const { id: organizationId, locationId, areaId } = params;
  const router = useRouter();
  const [isAlertDialogOpen, setIsAlertDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('equipment');

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
      <div className="container py-8 max-w-7xl mx-auto">
        <div className="flex justify-center items-center min-h-[200px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">Loading area details...</span>
        </div>
      </div>
    );
  }

  // If error, show error state
  if (isError || !area) {
    return (
      <div className="container py-8 max-w-7xl mx-auto">
        <div className="rounded-lg border p-8 text-center">
          <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
          <h2 className="text-lg font-medium">Error loading area</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {error instanceof Error ? error.message : 'The requested area could not be found'}
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => router.push(`/organizations/${organizationId}/locations/${locationId}`)}
          >
            Back to Location
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-6 max-w-7xl mx-auto space-y-6">
      {/* Breadcrumb navigation */}
      <Breadcrumb>
        <BreadcrumbItem>
          <BreadcrumbLink href="/organizations">Organizations</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbLink href={`/organizations/${organizationId}`}>
            {area.location?.organization?.name || organizationId}
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbLink href={`/organizations/${organizationId}/locations/${locationId}`}>
            {area.location?.name || locationId}
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>{area.name}</BreadcrumbItem>
      </Breadcrumb>

      {/* Header and action buttons */}
      <div className="flex flex-col md:flex-row justify-between gap-4 items-start md:items-center">
        <div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() =>
                router.push(`/organizations/${organizationId}/locations/${locationId}`)
              }
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl font-bold">{area.name}</h1>
          </div>
          <p className="text-muted-foreground mt-1">
            {area.areaType &&
              `${area.areaType.charAt(0).toUpperCase() + area.areaType.slice(1)} Area`}
            {area.floorLevel !== undefined && ` • Floor ${area.floorLevel}`}
            {area.buildingSection && ` • ${area.buildingSection}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
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
            confirmWithDialog={false}
            onClick={() => setIsAlertDialogOpen(true)}
          />
        </div>
      </div>

      {/* Description */}
      {area.description && (
        <div className="rounded-lg border p-4 bg-card">
          <p className="text-card-foreground text-sm">{area.description}</p>
        </div>
      )}

      {/* Tabs section */}
      <Tabs
        defaultValue="equipment"
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-full"
      >
        <TabsList>
          <TabsTrigger value="equipment">Equipment</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
        </TabsList>

        <TabsContent value="equipment" className="pt-4">
          <EquipmentTab areaId={areaId} />
        </TabsContent>

        <TabsContent value="details" className="pt-4">
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Area Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="rounded-lg border p-4">
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">
                    Basic Information
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    <span className="text-sm font-medium">Name:</span>
                    <span className="text-sm">{area.name}</span>
                    <span className="text-sm font-medium">Area Type:</span>
                    <span className="text-sm">
                      {area.areaType
                        ? area.areaType.charAt(0).toUpperCase() + area.areaType.slice(1)
                        : 'Not specified'}
                    </span>
                    <span className="text-sm font-medium">Building Section:</span>
                    <span className="text-sm">{area.buildingSection || 'Not specified'}</span>
                    <span className="text-sm font-medium">Floor Level:</span>
                    <span className="text-sm">
                      {area.floorLevel !== undefined ? area.floorLevel : 'Not specified'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="rounded-lg border p-4">
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">
                    Location Information
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    <span className="text-sm font-medium">Location:</span>
                    <span className="text-sm">{area.location?.name || 'Not specified'}</span>
                    <span className="text-sm font-medium">Organization:</span>
                    <span className="text-sm">
                      {area.location?.organization?.name || 'Not specified'}
                    </span>
                    <span className="text-sm font-medium">Address:</span>
                    <span className="text-sm">{area.location?.address || 'Not specified'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

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
