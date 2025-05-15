'use client';

import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { X, Building, User, Mail, Phone, MapPin, Calendar, Trash, Edit } from 'lucide-react';

interface OrganizationDetailsProps {
  organizationId: string;
  onClose: () => void;
  onDelete: (id: string) => void;
}

// Mock organization data
const mockOrganizations = [
  {
    _id: '1',
    name: 'Acme Corporation',
    description: 'A global manufacturing company',
    contactName: 'John Doe',
    contactEmail: 'john@acme.com',
    contactPhone: '555-1234',
    address: '123 Main St, Anytown, USA',
    createdAt: '2023-01-15T00:00:00.000Z',
    updatedAt: '2023-01-15T00:00:00.000Z',
  },
  {
    _id: '2',
    name: 'Globex Industries',
    description: 'Technology solutions provider',
    contactName: 'Jane Smith',
    contactEmail: 'jane@globex.com',
    contactPhone: '555-5678',
    address: '456 Tech Blvd, Silicon Valley, USA',
    createdAt: '2023-02-20T00:00:00.000Z',
    updatedAt: '2023-02-20T00:00:00.000Z',
  },
  {
    _id: '3',
    name: 'Initech LLC',
    description: 'Software development company',
    contactName: 'Michael Bolton',
    contactEmail: 'michael@initech.com',
    contactPhone: '555-7890',
    address: '789 Office Park, Business District, USA',
    createdAt: '2023-03-10T00:00:00.000Z',
    updatedAt: '2023-03-10T00:00:00.000Z',
  },
];

export function OrganizationDetails({
  organizationId,
  onClose,
  onDelete,
}: OrganizationDetailsProps) {
  // Define Organization type for the component
  type Organization = {
    _id: string;
    name: string;
    description?: string;
    contactName?: string;
    contactEmail?: string;
    contactPhone?: string;
    address?: string;
    createdAt: string;
    updatedAt: string;
  };

  // Local state for loading simulation
  const [isLoading, setIsLoading] = useState(true);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Simulate fetching organization data
  useEffect(() => {
    setIsLoading(true);
    setError(null);

    // Simulate API delay
    const timer = setTimeout(() => {
      const org = mockOrganizations.find(org => org._id === organizationId);

      if (org) {
        setOrganization(org);
      } else {
        setError('Organization not found');
      }

      setIsLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [organizationId]);

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

  if (error || !organization) {
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
          <p className="text-destructive">{error || 'Failed to load organization details'}</p>
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
      <CardFooter className="flex justify-between">
        <Button variant="outline" className="w-full" onClick={() => onDelete(organizationId)}>
          <Trash className="mr-2 h-4 w-4" />
          Delete
        </Button>
        <Button className="w-full">
          <Edit className="mr-2 h-4 w-4" />
          Edit
        </Button>
      </CardFooter>
    </Card>
  );
}
