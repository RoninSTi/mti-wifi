'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LocationResponse } from '@/app/api/locations/schemas';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { MoreHorizontal, Edit, Trash, Eye, Loader2, MapPin } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

// Interface for the props received by the component
interface LocationsTableProps {
  // We're getting an array of location objects with organization already populated
  locations: Array<{
    _id: string;
    name: string;
    description?: string;
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
    organization: {
      _id: string;
      name: string;
    };
    createdAt: string | Date;
    updatedAt: string | Date;
  }>;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onRetry: () => void;
  filterApplied?: boolean;
}

export function LocationsTable({
  locations,
  isLoading,
  isError,
  error,
  onView,
  onEdit,
  onDelete,
  onRetry,
  filterApplied = false,
}: LocationsTableProps) {
  const router = useRouter();
  // If loading, show skeleton UI
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>City</TableHead>
                <TableHead>State</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 3 }).map((_, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <Skeleton className="h-5 w-[180px]" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-[200px]" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-[100px]" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-[60px]" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-8 w-8 rounded-full" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  // If error, show error message with retry button
  if (isError) {
    return (
      <div className="rounded-lg border p-8 text-center">
        <h3 className="text-lg font-medium">Something went wrong</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {error instanceof Error ? error.message : 'Failed to load locations'}
        </p>
        <Button variant="outline" className="mt-4" onClick={onRetry}>
          Try again
        </Button>
      </div>
    );
  }

  // If no results, display appropriate message for search results only
  if (locations.length === 0 && filterApplied) {
    return (
      <div className="rounded-lg border p-8 text-center">
        <h3 className="text-lg font-medium">No results found</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Try adjusting your search or filter criteria.
        </p>
      </div>
    );
  }

  // For no locations without search, the parent component will handle the empty state

  // Display actual data
  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Address</TableHead>
            <TableHead>City</TableHead>
            <TableHead>State</TableHead>
            <TableHead className="w-[80px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {locations.map(location => {
            const detailsUrl = `/organizations/${location.organization._id}/locations/${location._id}`;

            return (
              <TableRow
                key={location._id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={e => {
                  // Only navigate if the click is not on the dropdown menu or its children
                  if (!e.defaultPrevented) {
                    router.push(detailsUrl);
                  }
                }}
              >
                <TableCell className="font-medium">
                  <span className="text-primary">{location.name}</span>
                </TableCell>
                <TableCell>{location.address || '—'}</TableCell>
                <TableCell>{location.city || '—'}</TableCell>
                <TableCell>{location.state || '—'}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={e => {
                          // Prevent row click event from triggering
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">More options</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={e => {
                          e.preventDefault();
                          e.stopPropagation();
                          onView(location._id);
                        }}
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        View details
                      </DropdownMenuItem>
                      <Link href={detailsUrl} passHref legacyBehavior>
                        <DropdownMenuItem
                          onClick={e => {
                            e.preventDefault();
                            e.stopPropagation();
                            router.push(detailsUrl);
                          }}
                        >
                          <MapPin className="mr-2 h-4 w-4" />
                          Full details page
                        </DropdownMenuItem>
                      </Link>
                      <DropdownMenuItem
                        onClick={e => {
                          e.preventDefault();
                          e.stopPropagation();
                          onEdit(location._id);
                        }}
                      >
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={e => {
                          e.preventDefault();
                          e.stopPropagation();
                          onDelete(location._id);
                        }}
                      >
                        <Trash className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
