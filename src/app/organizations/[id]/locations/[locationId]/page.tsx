'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, MapPin, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLocation } from '@/hooks';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import Link from 'next/link';

export default function LocationDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const organizationId = params?.id as string;
  const locationId = params?.locationId as string;

  // Use the custom hook to fetch location data
  const { location, isLoading, isError, error } = useLocation(locationId);

  // Handle back navigation
  const handleBack = () => {
    router.push(`/organizations/${organizationId}?tab=locations`);
  };

  // Handle delete success
  const handleDeleteSuccess = () => {
    toast.success('Location deleted successfully');
    router.push(`/organizations/${organizationId}?tab=locations`);
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

  if (isError || !location) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to load location details';

    return (
      <div className="container py-10 mx-auto">
        <div className="flex items-center gap-2 mb-6">
          <Button variant="outline" size="icon" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">Location not found</h1>
        </div>

        <div className="bg-destructive/10 text-destructive rounded-lg p-4 mt-6">
          <p>{errorMessage}</p>
          <Button className="mt-4" onClick={handleBack}>
            Return to Locations
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
            <Link href={`/organizations/${organizationId}`}>{location.organization.name}</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbLink className="font-semibold">{location.name}</BreadcrumbLink>
        </BreadcrumbItem>
      </Breadcrumb>

      <div className="flex items-center gap-2 mb-6">
        <Button variant="outline" size="icon" onClick={handleBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2">
          <MapPin className="h-6 w-6" />
          <h1 className="text-2xl font-bold">{location.name}</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        <Tabs defaultValue="details" className="w-full">
          <TabsList className="w-full mb-8">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="areas">Areas</TabsTrigger>
          </TabsList>

          <TabsContent value="details">
            {/* We'll move the location details component here */}
            <div className="max-w-3xl">
              {location.description && (
                <div className="mb-6">
                  <h3 className="text-lg font-medium mb-2">Description</h3>
                  <p className="text-muted-foreground">{location.description}</p>
                </div>
              )}

              {(location.address || location.city || location.state || location.zipCode) && (
                <div className="mb-6">
                  <h3 className="text-lg font-medium mb-2">Address</h3>
                  <p className="text-muted-foreground">
                    {[location.address, location.city, location.state, location.zipCode]
                      .filter(Boolean)
                      .join(', ')}
                    {location.country && location.country !== 'USA' && `, ${location.country}`}
                  </p>
                </div>
              )}

              <div className="flex gap-2 mt-8">
                <Button
                  variant="outline"
                  onClick={() =>
                    router.push(`/organizations/${organizationId}/locations/${locationId}/edit`)
                  }
                >
                  Edit Location
                </Button>

                <Button
                  variant="destructive"
                  onClick={() => {
                    if (window.confirm('Are you sure you want to delete this location?')) {
                      // We'll add the delete functionality here
                      handleDeleteSuccess();
                    }
                  }}
                >
                  Delete Location
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="areas">
            <div className="rounded-lg border border-dashed p-8 text-center">
              <h3 className="text-lg font-medium">Areas Coming Soon</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                This feature is under development.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
