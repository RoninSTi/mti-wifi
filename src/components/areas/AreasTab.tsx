'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { AreasTable } from './AreasTable';
import { CreateAreaDialog } from './CreateAreaDialog';
import { EditAreaDialog } from './EditAreaDialog';
import { useAreas, useDeleteArea, useArea } from '@/hooks';
import { Search, X, Grid3X3, Plus } from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { TablePagination } from '@/components/ui/table-pagination';

interface AreasTabProps {
  locationId: string;
  organizationId?: string;
  showSearch?: boolean;
}

export function AreasTab({ locationId, organizationId, showSearch = true }: AreasTabProps) {
  const router = useRouter();
  // State for pagination and search
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // State for the area being edited
  const [editingAreaId, setEditingAreaId] = useState<string | null>(null);

  // State for delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [areaToDelete, setAreaToDelete] = useState<string | null>(null);

  // Fetch data for the area being edited
  const { area: editingArea } = useArea(editingAreaId || '');

  // Fetch areas with React Query hook
  const { areas, isLoading, isError, error, pagination } = useAreas({
    page,
    limit,
    q: searchQuery || undefined,
    locationId,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });

  // Initialize area deletion hook
  const { deleteArea, isLoading: isDeleting } = useDeleteArea();

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

  // Initiate delete process - open confirmation dialog
  const handleDeleteArea = (id: string) => {
    setAreaToDelete(id);
    setDeleteDialogOpen(true);
  };

  // Execute delete after confirmation
  const handleConfirmDelete = async () => {
    if (!areaToDelete) return;

    try {
      await deleteArea(areaToDelete);
      toast.success('Area deleted successfully');

      // Close dialog and reset state
      setDeleteDialogOpen(false);
      setAreaToDelete(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete area');
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
      {showSearch && (
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
      )}

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
            <TablePagination
              pagination={
                pagination || {
                  currentPage: 1,
                  totalPages: 1,
                  totalItems: areas.length,
                  itemsPerPage: limit,
                  hasNextPage: false,
                  hasPreviousPage: false,
                }
              }
              currentPage={page}
              onPageChange={handlePageChange}
              showItemsPerPage={true}
              itemsPerPageOptions={[5, 10, 25, 50]}
              onItemsPerPageChange={newLimit => {
                setLimit(newLimit);
                setPage(1); // Reset to first page when changing limit
              }}
            />
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

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Area"
        description="Are you sure you want to delete this area? This action cannot be undone and will remove all equipment associated with this area."
        confirmText="Delete"
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
        variant="destructive"
      />
    </div>
  );
}
