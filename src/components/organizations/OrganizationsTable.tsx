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
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export function OrganizationsTable({
  organizations,
  isLoading,
  onView,
  onEdit,
  onDelete,
}: OrganizationsTableProps) {
  // Empty state - when no organizations exist
  if (!isLoading && organizations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center border rounded-lg bg-muted/10">
        <h3 className="text-lg font-medium">No organizations found</h3>
        <p className="text-muted-foreground mt-1">Add your first organization to get started.</p>
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
                <TableRow key={`skeleton-${i}`}>
                  <TableCell>
                    <Skeleton className="h-6 w-[200px]" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-6 w-[150px]" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-6 w-[100px]" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-6 w-8" />
                  </TableCell>
                </TableRow>
              ))
            : // Actual data rows
              organizations.map(org => (
                <TableRow key={org._id}>
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
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
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
