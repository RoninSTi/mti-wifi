'use client';

import React from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { X, MapPin, Calendar, Trash, Edit, Loader2, Building, Map } from 'lucide-react';
import { useLocation, useDeleteLocation } from '@/hooks';
import { EditLocationDialog } from './EditLocationDialog';

interface LocationDetailsProps {
  locationId: string;
  onClose: () => void;
  onDelete: (id: string) => void;
}

export function LocationDetails({ locationId, onClose, onDelete }: LocationDetailsProps) {
  // Use the custom hook to fetch location data
  const { location, isLoading, isError, error } = useLocation(locationId);

  // Use deletion hook directly in the component
  const { deleteLocation, isLoading: isDeleting } = useDeleteLocation();

  // Handler for delete using React Query's mutation
  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this location?')) {
      try {
        await deleteLocation(locationId);
        // Call the parent's onDelete handler to handle success UI updates
        onDelete(locationId);
        toast.success('Location deleted successfully');
      } catch (error) {
        // Only show error toast here in the details component
        toast.error(error instanceof Error ? error.message : 'Failed to delete location');
      }
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4 rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-[200px]" />
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </Button>
        </div>
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-[80%]" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-[50%]" />
          <Skeleton className="h-4 w-[70%]" />
        </div>
      </div>
    );
  }

  if (isError || !location) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to load location details';

    return (
      <div className="rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">Error</h3>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </Button>
        </div>
        <p className="mt-2 text-sm text-destructive">{errorMessage}</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">{location.name}</h3>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </Button>
      </div>

      {location.description && (
        <p className="mt-2 text-sm text-muted-foreground">{location.description}</p>
      )}

      <div className="mt-4 space-y-3">
        {location.organization && (
          <div className="flex items-start gap-2">
            <Building className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Organization</p>
              <p className="text-sm">{location.organization}</p>
            </div>
          </div>
        )}

        {(location.address || location.city || location.state || location.zipCode) && (
          <div className="flex items-start gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Address</p>
              <p className="text-sm">
                {[location.address, location.city, location.state, location.zipCode]
                  .filter(Boolean)
                  .join(', ')}
                {location.country && location.country !== 'USA' && `, ${location.country}`}
              </p>
            </div>
          </div>
        )}

        <div className="flex items-start gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
          <div>
            <p className="text-xs text-muted-foreground">Created</p>
            <p className="text-sm">{format(new Date(location.createdAt), 'MMMM d, yyyy')}</p>
          </div>
        </div>

        {/* Map placeholder for future enhancements */}
        <div className="mt-4 rounded border p-2 text-center text-sm text-muted-foreground">
          <Map className="mx-auto h-4 w-4 mb-1" />
          Map view coming soon
        </div>
      </div>

      <div className="mt-6 flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={handleDelete}
          disabled={isDeleting}
        >
          {isDeleting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Trash className="mr-2 h-4 w-4" />
          )}
          {isDeleting ? 'Deleting...' : 'Delete'}
        </Button>

        <EditLocationDialog
          location={location}
          trigger={
            <Button size="sm" className="flex-1">
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Button>
          }
        />
      </div>
    </div>
  );
}
