'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { AreasTable } from './AreasTable';
import { CreateAreaDialog } from './CreateAreaDialog';
import { EditAreaDialog } from './EditAreaDialog';
import { useAreas, useDeleteArea, useArea } from '@/hooks';
import { Search, X, Grid3X3, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';

interface AreasTabProps {
  locationId: string;
  organizationId?: string;
}

export function AreasTab({ locationId, organizationId }: AreasTabProps) {
  const router = useRouter();
  // State for pagination and search
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // State for the area being edited
  const [editingAreaId, setEditingAreaId] = useState<string | null>(null);

  // Fetch data for the area being edited
  const { area: editingArea } = useArea(editingAreaId || '');

  // Fetch areas with React Query hook
  const { areas, isLoading, isError, error, pagination, refetch } = useAreas({
    page,
    limit,
    q: searchQuery || undefined,
    locationId,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });

  // Initialize area deletion hook
  const {
    deleteArea,
    isLoading: isDeleting,
    isError: isDeleteError,
    error: deleteError,
  } = useDeleteArea();

  // Handle area actions
  const handleViewDetails = (id: string) => {
    if (!organizationId) {
      console.error('organizationId not provided to AreasTab');
      return;
    }

    // Navigate to area details page - location-specific route when locationId is available
    if (locationId) {
      router.push(`/organizations/${organizationId}/locations/${locationId}/areas/${id}`);
    } else {
      router.push(`/organizations/${organizationId}/areas/${id}`);
    }
  };

  const handleEditArea = (id: string) => {
    setEditingAreaId(id);
  };

  const handleDeleteArea = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this area?')) {
      try {
        await deleteArea(id);
        toast.success('Area deleted successfully');
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to delete area');
      }
    }
  };

  // Handle search form submission
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(searchInput);
    setPage(1); // Reset to first page when searching
  };

  // Clear search
  const clearSearch = () => {
    setSearchInput('');
    setSearchQuery('');
    setPage(1); // Reset to first page when clearing search
  };

  // Handle pagination
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Areas</h3>
        <CreateAreaDialog locationId={locationId} />
      </div>

      {/* Search */}
      <div className="flex items-center space-x-2">
        <form onSubmit={handleSearch} className="flex-1 flex space-x-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search areas..."
              className="pl-8 [&::-webkit-search-cancel-button]:hidden [&::-ms-clear]:hidden"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
            />
            {searchInput && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-9 w-9 p-0"
                onClick={clearSearch}
                type="button"
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Clear</span>
              </Button>
            )}
          </div>
          <Button type="submit">Search</Button>
        </form>
      </div>

      {/* Content area */}
      <div>
        {/* Show empty state if no areas exist yet and no search is applied */}
        {!isLoading && !isError && areas.length === 0 && !searchQuery ? (
          <div className="rounded-lg border border-dashed p-8 text-center">
            <Grid3X3 className="mx-auto h-10 w-10 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium">No areas yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Add your first area to get started.
            </p>
            <CreateAreaDialog
              locationId={locationId}
              trigger={
                <Button className="mt-4">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Area
                </Button>
              }
            />
          </div>
        ) : (
          <>
            <AreasTable
              areas={areas}
              isLoading={isLoading}
              isError={isError}
              error={error}
              onView={handleViewDetails}
              onEdit={handleEditArea}
              onDelete={handleDeleteArea}
              filterApplied={!!searchQuery}
            />

            {/* Pagination */}
            {pagination && pagination.totalPages > 0 && (
              <div className="mt-4 flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  {isLoading ? (
                    <div className="h-5 w-[160px] bg-muted animate-pulse rounded"></div>
                  ) : (
                    <>
                      Showing {areas.length} of {pagination.totalItems} areas
                    </>
                  )}
                </div>

                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        href="#"
                        onClick={e => {
                          e.preventDefault();
                          if (pagination.hasPreviousPage) {
                            handlePageChange(page - 1);
                          }
                        }}
                        className={
                          !pagination.hasPreviousPage ? 'pointer-events-none opacity-50' : ''
                        }
                      />
                    </PaginationItem>

                    {/* Page numbers */}
                    {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                      .filter(p => {
                        // Show current page, first, last, and adjacent pages
                        return p === 1 || p === pagination.totalPages || Math.abs(p - page) <= 1;
                      })
                      .map((p, i, arr) => {
                        // Add ellipsis when there are gaps
                        const showEllipsisBefore = i > 0 && arr[i - 1] !== p - 1;

                        return (
                          <React.Fragment key={p}>
                            {showEllipsisBefore && (
                              <PaginationItem>
                                <span className="flex h-9 w-9 items-center justify-center">
                                  ...
                                </span>
                              </PaginationItem>
                            )}
                            <PaginationItem>
                              <PaginationLink
                                href="#"
                                onClick={e => {
                                  e.preventDefault();
                                  handlePageChange(p);
                                }}
                                isActive={page === p}
                              >
                                {p}
                              </PaginationLink>
                            </PaginationItem>
                          </React.Fragment>
                        );
                      })}

                    <PaginationItem>
                      <PaginationNext
                        href="#"
                        onClick={e => {
                          e.preventDefault();
                          if (pagination.hasNextPage) {
                            handlePageChange(page + 1);
                          }
                        }}
                        className={!pagination.hasNextPage ? 'pointer-events-none opacity-50' : ''}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>

                {/* Items per page selector */}
                <div className="flex items-center gap-2">
                  <select
                    className="text-sm h-8 rounded-md border border-input bg-background px-2"
                    value={limit}
                    onChange={e => {
                      setLimit(Number(e.target.value));
                      setPage(1); // Reset to first page when changing limit
                    }}
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                  </select>
                  <span className="text-sm text-muted-foreground">per page</span>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Edit area dialog */}
      {editingArea && (
        <EditAreaDialog
          area={editingArea}
          open={!!editingAreaId}
          onOpenChange={open => {
            if (!open) setEditingAreaId(null);
          }}
        />
      )}
    </div>
  );
}
