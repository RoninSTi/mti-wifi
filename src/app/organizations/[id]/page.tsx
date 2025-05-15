'use client';

import React from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Building, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useOrganization } from '@/hooks';
import { OrganizationDetails } from '@/components/organizations/OrganizationDetails';
import { LocationsTab } from '@/components/locations/LocationsTab';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

export default function OrganizationDetailsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const organizationId = params?.id as string;
  const tabParam = searchParams.get('tab');

  // Use the custom hook to fetch organization data
  const { organization, isLoading, isError, error } = useOrganization(organizationId);

  // Handle back navigation
  const handleBack = () => {
    router.push('/organizations');
  };

  // Handle delete success
  const handleDeleteSuccess = () => {
    toast.success('Organization deleted successfully');
    router.push('/organizations');
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

  if (isError || !organization) {
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to load organization details';

    return (
      <div className="container py-10 mx-auto">
        <div className="flex items-center gap-2 mb-6">
          <Button variant="outline" size="icon" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">Organization not found</h1>
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
      <div className="flex items-center gap-2 mb-6">
        <Button variant="outline" size="icon" onClick={handleBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2">
          <Building className="h-6 w-6" />
          <h1 className="text-2xl font-bold">{organization.name}</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        <Tabs defaultValue={tabParam === 'locations' ? 'locations' : 'details'} className="w-full">
          <TabsList className="w-full mb-8">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="locations">Locations</TabsTrigger>
          </TabsList>

          <TabsContent value="details">
            <OrganizationDetails
              organizationId={organizationId}
              onClose={() => {}} // Not used in full page view
              onDelete={handleDeleteSuccess}
            />
          </TabsContent>

          <TabsContent value="locations">
            <LocationsTab organizationId={organizationId} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
