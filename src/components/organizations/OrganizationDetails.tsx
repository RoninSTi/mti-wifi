'use client';

import React from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  X,
  Building,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Trash,
  Edit,
  Loader2,
} from 'lucide-react';
import { useOrganization, useDeleteOrganization } from '@/hooks';

interface OrganizationDetailsProps {
  organizationId: string;
  onClose: () => void;
  onDelete: (id: string) => void;
}

export function OrganizationDetails({
  organizationId,
  onClose,
  onDelete,
}: OrganizationDetailsProps) {
  // Use the custom hook to fetch organization data
  const { organization, isLoading, isError, error } = useOrganization(organizationId);

  // Use deletion hook directly in the component
  const { deleteOrg, isLoading: isDeleting } = useDeleteOrganization();

  // Handler for delete using React Query's mutation
  const handleDelete = async () => {
    try {
      await deleteOrg(organizationId);
      onDelete(organizationId); // Call parent's onDelete for UI updates (closing panel, etc.)
    } catch (error) {
      // Error handling is managed by the hook itself
      console.error('Error handling in component:', error);
    }
  };

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
          <div className="space-y-2">
            <Skeleton className="h-4 w-[50%]" />
            <Skeleton className="h-4 w-[70%]" />
            <Skeleton className="h-4 w-[60%]" />
          </div>
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
          <CardTitle>Error</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-destructive">{errorMessage}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="relative">
        <Button variant="ghost" size="icon" className="absolute right-2 top-2" onClick={onClose}>
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </Button>
        <div className="flex items-center gap-2">
          <Building className="h-6 w-6" />
          <CardTitle>{organization.name}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {organization.description && (
          <p className="text-muted-foreground">{organization.description}</p>
        )}

        <div className="space-y-2">
          {organization.contactName && (
            <div className="flex items-start gap-2">
              <User className="h-4 w-4 text-muted-foreground mt-1 shrink-0" />
              <span>{organization.contactName}</span>
            </div>
          )}

          {organization.contactEmail && (
            <div className="flex items-start gap-2">
              <Mail className="h-4 w-4 text-muted-foreground mt-1 shrink-0" />
              <span>{organization.contactEmail}</span>
            </div>
          )}

          {organization.contactPhone && (
            <div className="flex items-start gap-2">
              <Phone className="h-4 w-4 text-muted-foreground mt-1 shrink-0" />
              <span>{organization.contactPhone}</span>
            </div>
          )}

          {organization.address && (
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground mt-1 shrink-0" />
              <span>{organization.address}</span>
            </div>
          )}
        </div>

        <div className="pt-2 border-t">
          <div className="flex items-start gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground mt-1 shrink-0" />
            <div>
              <p className="text-sm text-muted-foreground">Created</p>
              <p className="text-sm">{format(new Date(organization.createdAt), 'MMMM d, yyyy')}</p>
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex gap-2">
        <Button variant="outline" className="flex-1" onClick={handleDelete} disabled={isDeleting}>
          {isDeleting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Trash className="mr-2 h-4 w-4" />
          )}
          {isDeleting ? 'Deleting...' : 'Delete'}
        </Button>
        <Button className="flex-1">
          <Edit className="mr-2 h-4 w-4" />
          Edit
        </Button>
      </CardFooter>
    </Card>
  );
}
