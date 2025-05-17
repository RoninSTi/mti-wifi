'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Building } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useOrganization, useDeleteOrganization } from '@/hooks';
import { LocationsTab } from '@/components/locations/LocationsTab';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { EditOrganizationDialog } from '@/components/organizations/EditOrganizationDialog';
import { DeleteButton } from '@/components/ui/delete-button';
import { EntityMeta, EntityDescription } from '@/components/ui/entity-meta';

export default function OrganizationDetailsPage() {
  const params = useParams();
  const router = useRouter();
  // Type-safe parameter extraction with proper type narrowing
  const id = params?.id;

  if (!id || Array.isArray(id)) {
    throw new Error('Missing or invalid route parameters');
  }

  const organizationId = id; // Now TypeScript knows these are strings

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
      {/* Header with title and actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <div className="flex items-center gap-2">
          <Building className="h-6 w-6" />
          <span className="text-xl font-medium">Organization Details</span>
        </div>
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <EditOrganizationDialog
            organization={organization}
            trigger={
              <Button variant="outline" size="sm">
                Edit Organization
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

      {/* Organization header */}
      <div className="flex flex-col md:flex-row justify-between gap-4 items-start md:items-center mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{organization.name}</h1>
          </div>
        </div>
      </div>

      {/* Organization Metadata */}
      <EntityMeta
        className="mb-6"
        items={[
          {
            label: 'Contact Name',
            value: organization.contactName,
          },
          {
            label: 'Contact Email',
            value: organization.contactEmail,
          },
          {
            label: 'Contact Phone',
            value: organization.contactPhone,
          },
          {
            label: 'Address',
            value: organization.address,
          },
        ]}
      />

      {/* Description */}
      {organization.description && (
        <EntityDescription>{organization.description}</EntityDescription>
      )}

      <div className="grid grid-cols-1 gap-8 mt-8">
        {/* Locations Section */}
        <Card className="overflow-hidden">
          <div className="p-6">
            <LocationsTab organizationId={organizationId} />
          </div>
        </Card>
      </div>
    </div>
  );
}
