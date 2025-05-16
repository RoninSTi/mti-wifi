'use client';

import React from 'react';
import { format } from 'date-fns';
import { OrganizationResponse } from '@/app/api/organizations/schemas';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Edit, Trash, Eye } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface OrganizationsTableProps {
  organizations: OrganizationResponse[];
  isLoading: boolean;
  isError?: boolean;
  error?: unknown;
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onRetry?: () => void;
  filterApplied?: boolean;
}

export function OrganizationsTable({
  organizations,
  isLoading,
  isError = false,
  error,
  onView,
  onEdit,
  onDelete,
  onRetry,
  filterApplied = false,
}: OrganizationsTableProps) {
  // Error state
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center border rounded-lg bg-destructive/10 border-destructive/30">
        <h3 className="text-lg font-medium text-destructive">Unable to load organizations</h3>
        <p className="text-muted-foreground mt-2 mb-4">
          {error instanceof Error ? error.message : 'An unexpected error occurred'}
        </p>
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry}>
            Retry
          </Button>
        )}
      </div>
    );
  }

  // Empty state - when no organizations exist
  if (!isLoading && organizations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center border rounded-lg bg-muted/10">
        <h3 className="text-lg font-medium">
          {filterApplied ? 'No matching organizations found' : 'No organizations found'}
        </h3>
        <p className="text-muted-foreground mt-2 mb-1">
          {filterApplied
            ? 'Try changing your search criteria or clear filters'
            : 'Add your first organization to get started.'}
        </p>
      </div>
    );
  }

  return (
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading
            ? // Loading state with skeleton rows
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={`skeleton-${i}`} className="animate-pulse">
                  <TableCell>
                    <div className="space-y-2">
                      <Skeleton className="h-5 w-[180px]" />
                      <Skeleton className="h-3 w-[140px]" />
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-2">
                      <Skeleton className="h-5 w-[120px]" />
                      <Skeleton className="h-3 w-[150px]" />
                    </div>
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-[100px]" />
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end">
                      <Skeleton className="h-8 w-8 rounded-full" />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            : // Actual data rows
              organizations.map(org => (
                <TableRow
                  key={org._id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={e => {
                    // Make sure we're not clicking on the dropdown menu
                    const isDropdownClick = (e.target as HTMLElement).closest(
                      '[data-dropdown-trigger="true"]'
                    );
                    if (!isDropdownClick) {
                      onView(org._id);
                    }
                  }}
                >
                  <TableCell className="font-medium">
                    <div>
                      <div>{org.name}</div>
                      {org.description && (
                        <div className="text-xs text-muted-foreground mt-1 line-clamp-1">
                          {org.description}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {org.contactName || org.contactEmail ? (
                      <div>
                        {org.contactName && <div>{org.contactName}</div>}
                        {org.contactEmail && (
                          <div className="text-xs text-muted-foreground">{org.contactEmail}</div>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">No contact info</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {org.createdAt ? format(new Date(org.createdAt), 'MMM d, yyyy') : '-'}
                  </TableCell>
                  <TableCell onClick={e => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" data-dropdown-trigger="true">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Open menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onView(org._id)}>
                          <Eye className="mr-2 h-4 w-4" />
                          View details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onEdit(org._id)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => onDelete(org._id)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
        </TableBody>
      </Table>
    </div>
  );
}
