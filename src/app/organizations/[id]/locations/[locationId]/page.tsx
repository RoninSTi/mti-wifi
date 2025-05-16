'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLocation, useDeleteLocation } from '@/hooks';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { AreasTab } from '@/components/areas/AreasTab';
import { DeleteButton } from '@/components/ui/delete-button';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Card } from '@/components/ui/card';
import Link from 'next/link';

export default function LocationDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const organizationId = params?.id as string;
  const locationId = params?.locationId as string;

  // Use the custom hooks to fetch location data and handle deletion
  const { location, isLoading, isError, error } = useLocation(locationId);
  const { deleteLocation, isLoading: isDeleting } = useDeleteLocation();

  // Handle back navigation
  const handleBack = () => {
    router.push(`/organizations/${organizationId}`);
  };

  // Handle location deletion
  const handleDelete = async () => {
    try {
      const result = await deleteLocation(locationId);
      if (result.error) {
        toast.error(result.error.message || 'Failed to delete location');
      } else {
        toast.success('Location deleted successfully');
        router.push(`/organizations/${organizationId}`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete location');
    }
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

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <MapPin className="h-6 w-6" />
            <span className="text-xl font-medium">Location Details</span>
          </div>
        </div>
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              router.push(`/organizations/${organizationId}/locations/${locationId}/edit`)
            }
          >
            Edit Location
          </Button>
          <DeleteButton
            onDelete={handleDelete}
            resourceName="location"
            isDeleting={isDeleting}
            size="sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {/* Location header */}
        <div className="flex flex-col md:flex-row justify-between gap-4 items-start md:items-center">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{location.name}</h1>
            </div>
            {(location.address || location.city || location.state || location.zipCode) && (
              <p className="text-muted-foreground mt-1">
                {[location.address, location.city, location.state, location.zipCode]
                  .filter(Boolean)
                  .join(', ')}
                {location.country && location.country !== 'USA' && `, ${location.country}`}
              </p>
            )}
          </div>
        </div>

        {/* Description */}
        {location.description && (
          <div className="rounded-lg border p-4 bg-card">
            <p className="text-card-foreground text-sm">{location.description}</p>
          </div>
        )}

        {/* Areas Section */}
        <Card className="overflow-hidden">
          <div className="p-6">
            <AreasTab locationId={locationId} organizationId={organizationId} />
          </div>
        </Card>
      </div>
    </div>
  );
}
