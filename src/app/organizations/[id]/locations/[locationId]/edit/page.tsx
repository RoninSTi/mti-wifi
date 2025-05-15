'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { EditLocationDialog } from '@/components/locations/EditLocationDialog';

export default function EditLocationPage() {
  const params = useParams();
  const router = useRouter();
  const organizationId = params?.id as string;
  const locationId = params?.locationId as string;

  // Use the custom hook to fetch location data
  const { location, isLoading, isError, error } = useLocation(locationId);

  // Handle back navigation
  const handleBack = () => {
    router.push(`/organizations/${organizationId}/locations/${locationId}`);
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
            Return to Location
          </Button>
        </div>
      </div>
    );
  }

  // Redirect back to location details page when dialog is closed
  const handleEditClose = () => {
    router.push(`/organizations/${organizationId}/locations/${locationId}`);
  };

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
          <BreadcrumbLink asChild>
            <Link href={`/organizations/${organizationId}/locations/${locationId}`}>
              {location.name}
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbLink className="font-semibold">Edit</BreadcrumbLink>
        </BreadcrumbItem>
      </Breadcrumb>

      <div className="flex items-center gap-2 mb-6">
        <Button variant="outline" size="icon" onClick={handleBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">Edit Location</h1>
      </div>

      <div className="grid grid-cols-1 gap-8 max-w-3xl">
        {/* Auto-open edit dialog and redirect back when done */}
        <EditLocationDialog
          location={location}
          open={true}
          onOpenChange={open => {
            if (!open) handleEditClose();
          }}
        />
      </div>
    </div>
  );
}
