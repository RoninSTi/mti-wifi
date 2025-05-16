'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useArea, useLocation } from '@/hooks';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import Link from 'next/link';
import { EditAreaDialog } from '@/components/areas/EditAreaDialog';

export default function EditAreaPage() {
  const params = useParams();
  const router = useRouter();
  const organizationId = params?.id as string;
  const areaId = params?.areaId as string;

  // Use the custom hook to fetch area data
  const { area, isLoading, isError, error } = useArea(areaId);

  // Get location data for breadcrumb
  const locationId = area?.location?._id || '';
  const { location } = useLocation(locationId);

  // Handle back navigation
  const handleBack = () => {
    router.push(`/organizations/${organizationId}/areas/${areaId}`);
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
            Return to Area
          </Button>
        </div>
      </div>
    );
  }

  // Redirect back to area details page when dialog is closed
  const handleEditClose = () => {
    router.push(`/organizations/${organizationId}/areas/${areaId}`);
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
          <BreadcrumbLink asChild>
            <Link href={`/organizations/${organizationId}/areas/${areaId}`}>{area.name}</Link>
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
        <h1 className="text-2xl font-bold">Edit Area</h1>
      </div>

      <div className="grid grid-cols-1 gap-8 max-w-3xl">
        {/* Auto-open edit dialog and redirect back when done */}
        <EditAreaDialog
          area={area}
          open={true}
          onOpenChange={open => {
            if (!open) handleEditClose();
          }}
        />
      </div>
    </div>
  );
}
