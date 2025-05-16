'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, AlertTriangle } from 'lucide-react';
import { useEquipment, useDeleteEquipment } from '@/hooks';
import { toast } from 'sonner';
import { EquipmentDetails } from '@/components/equipment/EquipmentDetails';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
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

interface EquipmentDetailsPageProps {
  params: {
    id: string;
    equipmentId: string;
  };
}

export default function EquipmentDetailsPage({ params }: EquipmentDetailsPageProps) {
  const { id: organizationId, equipmentId } = params;
  const router = useRouter();
  const [isAlertDialogOpen, setIsAlertDialogOpen] = useState(false);

  // Fetch equipment details
  const { equipment, isLoading, isError, error, refetch } = useEquipment(equipmentId);
  const { deleteEquipment, isLoading: isDeleting } = useDeleteEquipment();

  // Handle equipment deletion
  const handleDelete = async () => {
    try {
      const result = await deleteEquipment(equipmentId);
      if (result.error) {
        toast.error(result.error.message || 'Failed to delete equipment');
      } else {
        toast.success('Equipment deleted successfully');
        // Navigate back to area page
        if (equipment?.area?._id) {
          router.push(`/organizations/${organizationId}/locations/${equipment.area._id}`);
        } else {
          router.push(`/organizations/${organizationId}`);
        }
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'An error occurred while deleting equipment'
      );
    } finally {
      setIsAlertDialogOpen(false);
    }
  };

  // If no equipment data yet, show loading state
  if (isLoading) {
    return (
      <div className="container py-8 max-w-7xl mx-auto">
        <div className="flex justify-center items-center min-h-[200px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">Loading equipment details...</span>
        </div>
      </div>
    );
  }

  // If error or no equipment found, show error state
  if (isError || !equipment) {
    return (
      <div className="container py-8 max-w-7xl mx-auto">
        <div className="rounded-lg border p-8 text-center">
          <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
          <h2 className="text-lg font-medium">Error loading equipment</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {error instanceof Error ? error.message : 'The requested equipment could not be found'}
          </p>
          <Button variant="outline" className="mt-4" onClick={() => router.back()}>
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-6 max-w-7xl mx-auto">
      {/* Breadcrumb navigation */}
      <Breadcrumb className="mb-6">
        <BreadcrumbItem>
          <BreadcrumbLink href="/organizations">Organizations</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        {equipment.area && (
          <>
            <BreadcrumbItem>
              <BreadcrumbLink href={`/organizations/${organizationId}`}>
                {equipment.area?.organization?.name || 'Organization'}
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink
                href={`/organizations/${organizationId}/locations/${equipment.area._id}`}
              >
                {equipment.area.name}
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
          </>
        )}
        <BreadcrumbItem>{equipment.name}</BreadcrumbItem>
      </Breadcrumb>

      {/* Back button */}
      <Button variant="outline" size="sm" className="mb-6" onClick={() => router.back()}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back
      </Button>

      {/* Equipment details */}
      <EquipmentDetails
        equipment={equipment}
        isLoading={isLoading}
        isError={isError}
        error={error}
        onDelete={() => setIsAlertDialogOpen(true)}
        onRefresh={refetch}
      />

      {/* Delete confirmation dialog */}
      <AlertDialog open={isAlertDialogOpen} onOpenChange={setIsAlertDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this equipment and any
              associated data.
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
              Delete Equipment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
