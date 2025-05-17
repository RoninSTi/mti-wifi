'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useTypedParams } from '@/lib/utils';
import { ArrowLeft, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLocation, useDeleteLocation } from '@/hooks';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { AreasTab } from '@/components/areas/AreasTab';
import { GatewaysTab } from '@/components/gateways';
import { DeleteButton } from '@/components/ui/delete-button';
import { Card } from '@/components/ui/card';
import { EntityMeta, EntityDescription } from '@/components/ui/entity-meta';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function LocationDetailsPage() {
  const router = useRouter();

  // Type-safe params - automatically throws error if params are missing or invalid
  type LocationDetailParams = {
    id: string; // Organization ID
    locationId: string; // Location ID
  };
  const { id: organizationId, locationId } = useTypedParams<LocationDetailParams>();

  // Use the custom hooks to fetch location and organization data and handle deletion
  const { location, isLoading: isLoadingLocation, isError, error } = useLocation(locationId);
  const { deleteLocation, isLoading: isDeleting } = useDeleteLocation();

  // Combined loading state
  const isLoading = isLoadingLocation;

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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <div className="flex items-center gap-2">
          <MapPin className="h-6 w-6" />
          <span className="text-xl font-medium">Location Details</span>
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

      {/* Location header */}
      <div className="flex flex-col md:flex-row justify-between gap-4 items-start md:items-center mb-6">
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

      {/* Location Metadata */}
      <EntityMeta
        className="mb-6"
        items={[
          {
            label: 'Address',
            value: location.address,
          },
          {
            label: 'City',
            value: location.city,
          },
          {
            label: 'State/Province',
            value: location.state,
          },
          {
            label: 'Postal Code',
            value: location.zipCode,
          },
          {
            label: 'Country',
            value: location.country || 'USA',
          },
          {
            label: 'Organization',
            value: location.organization?.name,
          },
        ]}
      />

      {/* Description */}
      {location.description && <EntityDescription>{location.description}</EntityDescription>}

      <div className="mt-8">
        <Card className="overflow-hidden">
          <Tabs defaultValue="gateways">
            <div className="px-6 pt-6">
              <TabsList className="w-full max-w-[400px]">
                <TabsTrigger value="gateways" className="flex-1">
                  Gateways
                </TabsTrigger>
                <TabsTrigger value="areas" className="flex-1">
                  Areas
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="gateways" className="p-6 pt-4 m-0 border-0">
              <GatewaysTab locationId={locationId} />
            </TabsContent>

            <TabsContent value="areas" className="p-6 pt-4 m-0 border-0">
              <AreasTab locationId={locationId} organizationId={organizationId} />
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}
