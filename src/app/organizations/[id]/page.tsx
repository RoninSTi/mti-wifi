'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Building, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useOrganization, useDeleteOrganization } from '@/hooks';
import { LocationsTab } from '@/components/locations/LocationsTab';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { EditOrganizationDialog } from '@/components/organizations/EditOrganizationDialog';
import { DeleteButton } from '@/components/ui/delete-button';

export default function OrganizationDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const organizationId = params?.id as string;

  // Use the custom hook to fetch organization data
  const { organization, isLoading, isError, error } = useOrganization(organizationId);

  // Initialize delete organization hook at the component level
  const { deleteOrg, isLoading: isDeleting } = useDeleteOrganization();

  // Handle back navigation
  const handleBack = () => {
    router.push('/organizations');
  };

  // Handle organization deletion
  const handleDelete = async () => {
    try {
      await deleteOrg(organizationId);
      toast.success('Organization deleted successfully');
      router.push('/organizations');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete organization');
    }
  };

  if (isLoading) {
    return (
      <div className="container py-10 mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Skeleton className="h-8 w-[250px]" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-[80px]" />
            <Skeleton className="h-9 w-[120px]" />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8">
          <Skeleton className="h-[500px] w-full" />
        </div>
      </div>
    );
  }

  if (isError || !organization) {
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to load organization details';

    return (
      <div className="container py-10 mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl font-bold">Organization not found</h1>
          </div>
        </div>

        <div className="bg-destructive/10 text-destructive rounded-lg p-4 mt-6">
          <p>{errorMessage}</p>
          <Button className="mt-4" onClick={handleBack}>
            Return to Organizations
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-10 mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <Building className="h-6 w-6" />
            <h1 className="text-2xl font-bold">{organization.name}</h1>
          </div>
        </div>

        <div className="flex gap-2">
          <EditOrganizationDialog
            organization={organization}
            trigger={
              <Button variant="outline" size="sm">
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            }
          />
          <DeleteButton
            onDelete={handleDelete}
            resourceName="organization"
            isDeleting={isDeleting}
            size="sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {/* Organization Details */}
        <div className="max-w-3xl">
          {organization.description && (
            <div className="mb-6">
              <h3 className="text-lg font-medium mb-2">Description</h3>
              <p className="text-muted-foreground">{organization.description}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-6 mb-6">
            {organization.contactName && (
              <div>
                <h3 className="text-lg font-medium mb-2">Contact Name</h3>
                <p className="text-muted-foreground">{organization.contactName}</p>
              </div>
            )}

            {organization.contactEmail && (
              <div>
                <h3 className="text-lg font-medium mb-2">Contact Email</h3>
                <p className="text-muted-foreground">{organization.contactEmail}</p>
              </div>
            )}
          </div>

          {organization.contactPhone && (
            <div className="mb-6">
              <h3 className="text-lg font-medium mb-2">Contact Phone</h3>
              <p className="text-muted-foreground">{organization.contactPhone}</p>
            </div>
          )}

          {organization.address && (
            <div className="mb-6">
              <h3 className="text-lg font-medium mb-2">Address</h3>
              <p className="text-muted-foreground">{organization.address}</p>
            </div>
          )}
        </div>

        {/* Locations Section */}
        <div className="mt-8">
          <div className="rounded-md border">
            <div className="bg-muted p-4 border-b">
              <h2 className="text-xl font-semibold">Locations</h2>
            </div>
            <div className="p-4">
              <div className="w-full mx-auto">
                {isLoading ? (
                  <div className="flex justify-center p-8">
                    <Skeleton className="h-48 w-full max-w-md" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <LocationsTab organizationId={organizationId} />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
