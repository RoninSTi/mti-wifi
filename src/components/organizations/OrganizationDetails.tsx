'use client';

import React from 'react';
import { format } from 'date-fns';
import { useOrganizationQuery } from '@/hooks/useOrganizations';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { X, Building, User, Mail, Phone, MapPin, Calendar, Trash, Edit } from 'lucide-react';

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
  const { data, isLoading, error } = useOrganizationQuery(organizationId);

  const organization = data?.data;
  const hasError = !!error || !!data?.error;

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-start justify-between pb-2">
        <div className="space-y-1">
          <CardTitle className="text-xl">
            {isLoading ? (
              <Skeleton className="h-8 w-[180px]" />
            ) : hasError ? (
              'Error Loading Details'
            ) : (
              'Organization Details'
            )}
          </CardTitle>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-6 w-[250px]" />
            <Skeleton className="h-4 w-[200px]" />
            <div className="space-y-2 mt-6">
              <Skeleton className="h-5 w-[150px]" />
              <Skeleton className="h-5 w-[180px]" />
              <Skeleton className="h-5 w-[160px]" />
              <Skeleton className="h-5 w-[190px]" />
            </div>
          </div>
        ) : hasError ? (
          <div className="py-8 text-center space-y-2">
            <div className="text-destructive font-medium">Failed to load organization details</div>
            <p className="text-sm text-muted-foreground">
              {data?.error?.message || error?.message || 'An unknown error occurred'}
            </p>
            <Button className="mt-4" variant="secondary" onClick={onClose}>
              Go Back
            </Button>
          </div>
        ) : organization ? (
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold flex items-center">
                <Building className="mr-2 h-5 w-5" />
                {organization.name}
              </h3>
              {organization.description && (
                <p className="text-muted-foreground mt-1">{organization.description}</p>
              )}
            </div>

            <div className="space-y-3">
              <h4 className="font-medium">Contact Information</h4>
              <div className="grid gap-2">
                <div className="flex items-center text-sm">
                  <User className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span>{organization.contactName || 'Not provided'}</span>
                </div>
                <div className="flex items-center text-sm">
                  <Mail className="mr-2 h-4 w-4 text-muted-foreground" />
                  {organization.contactEmail ? (
                    <a href={`mailto:${organization.contactEmail}`} className="hover:underline">
                      {organization.contactEmail}
                    </a>
                  ) : (
                    <span className="text-muted-foreground">No email address</span>
                  )}
                </div>
                <div className="flex items-center text-sm">
                  <Phone className="mr-2 h-4 w-4 text-muted-foreground" />
                  {organization.contactPhone ? (
                    <a href={`tel:${organization.contactPhone}`} className="hover:underline">
                      {organization.contactPhone}
                    </a>
                  ) : (
                    <span className="text-muted-foreground">No phone number</span>
                  )}
                </div>
                <div className="flex items-start text-sm">
                  <MapPin className="mr-2 h-4 w-4 text-muted-foreground mt-0.5" />
                  <span>{organization.address || 'No address'}</span>
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center text-muted-foreground">
                  <Calendar className="mr-2 h-4 w-4" />
                  <span>Created:</span>
                </div>
                <span>
                  {organization.createdAt && format(new Date(organization.createdAt), 'PPP')}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm mt-1">
                <div className="flex items-center text-muted-foreground">
                  <Calendar className="mr-2 h-4 w-4" />
                  <span>Last Updated:</span>
                </div>
                <span>
                  {organization.updatedAt && format(new Date(organization.updatedAt), 'PPP')}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center">
            <p>No organization found</p>
          </div>
        )}
      </CardContent>
      {!isLoading && !hasError && organization && (
        <CardFooter className="flex justify-between pt-0">
          <Button variant="outline" onClick={() => onClose()}>
            <X className="mr-2 h-4 w-4" />
            Close
          </Button>
          <div className="space-x-2">
            <Button variant="default">
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Button>
            <Button variant="destructive" onClick={() => onDelete(organization._id)}>
              <Trash className="mr-2 h-4 w-4" />
              Delete
            </Button>
          </div>
        </CardFooter>
      )}
    </Card>
  );
}
