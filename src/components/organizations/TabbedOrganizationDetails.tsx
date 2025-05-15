'use client';

import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { OrganizationDetails } from './OrganizationDetails';
import { LocationsTab } from '@/components/locations/LocationsTab';
import { Skeleton } from '@/components/ui/skeleton';
import { useOrganization } from '@/hooks';

interface TabbedOrganizationDetailsProps {
  organizationId: string;
  onClose: () => void;
  onDelete: (id: string) => void;
}

export function TabbedOrganizationDetails({
  organizationId,
  onClose,
  onDelete,
}: TabbedOrganizationDetailsProps) {
  // Use the custom hook to fetch organization data just to check if it exists
  const { organization, isLoading, isError, error } = useOrganization(organizationId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="relative">
          <Button variant="ghost" size="icon" className="absolute right-2 top-2" onClick={onClose}>
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </Button>
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-6 w-[200px]" />
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-[80%]" />
        </CardContent>
      </Card>
    );
  }

  if (isError || !organization) {
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to load organization details';

    return (
      <Card>
        <CardHeader className="relative">
          <Button variant="ghost" size="icon" className="absolute right-2 top-2" onClick={onClose}>
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </Button>
          <h3 className="text-lg font-medium">Error</h3>
        </CardHeader>
        <CardContent>
          <p className="text-destructive">{errorMessage}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="relative pb-0">
        <Button variant="ghost" size="icon" className="absolute right-2 top-2" onClick={onClose}>
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </Button>
        <h3 className="text-lg font-medium">{organization.name}</h3>
        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="locations">Locations</TabsTrigger>
          </TabsList>
          <TabsContent value="details" className="mt-4">
            <OrganizationDetails
              organizationId={organizationId}
              onClose={onClose}
              onDelete={onDelete}
            />
          </TabsContent>
          <TabsContent value="locations" className="mt-4">
            <LocationsTab organizationId={organizationId} />
          </TabsContent>
        </Tabs>
      </CardHeader>
    </Card>
  );
}
