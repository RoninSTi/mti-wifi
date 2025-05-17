'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { LocationsTable } from './LocationsTable';
import { CreateLocationDialog } from './CreateLocationDialog';
import { LocationDetails } from './LocationDetails';
import { EditLocationDialog } from './EditLocationDialog';
import { useLocations, useDeleteLocation, useLocation } from '@/hooks';
import { Search, X, MapPin, Plus, Loader2 } from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { TablePagination } from '@/components/ui/table-pagination';

interface LocationsTabProps {
  organizationId: string;
}

export function LocationsTab({ organizationId }: LocationsTabProps) {
  // State for pagination and search
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // State for selected location (for details view)
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);

  // State for the location being edited directly (without showing details)
  const [editingLocationId, setEditingLocationId] = useState<string | null>(null);

  // State for delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [locationToDelete, setLocationToDelete] = useState<string | null>(null);

  // Fetch data for the location being edited
  const { location: editingLocation } = useLocation(editingLocationId || '');

  // Fetch locations with React Query hook
  const { locations, isLoading, isError, error, pagination, refetch } = useLocations({
    page,
    limit,
    q: searchQuery || undefined,
    organizationId,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });

  // Initialize location deletion hook
  const { deleteLocation, isLoading: isDeleting } = useDeleteLocation();

  // Handle location actions
  const handleViewDetails = (id: string) => {
    setSelectedLocationId(id);
  };

  // Handle direct editing without showing details first
  const handleEditLocation = (id: string) => {
    setEditingLocationId(id);
  };

  // Initiate delete process - open confirmation dialog
  const handleDeleteLocation = (id: string) => {
    setLocationToDelete(id);
    setDeleteDialogOpen(true);
  };

  // Execute delete after confirmation
  const handleConfirmDelete = async () => {
    if (!locationToDelete) return;

    try {
      await deleteLocation(locationToDelete);
      toast.success('Location deleted successfully');

      // If we're currently viewing the deleted location, close the details panel
      if (selectedLocationId === locationToDelete) {
        setSelectedLocationId(null);
      }

      // Close dialog and reset state
      setDeleteDialogOpen(false);
      setLocationToDelete(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete location');
    }
  };

  // This only handles UI updates after deletion from the details panel
  const handleDeleteFromDetails = (_id: string) => {
    setSelectedLocationId(null);
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
        <h3 className="text-lg font-medium">Locations</h3>
        <CreateLocationDialog organizationId={organizationId} />
      </div>

      {/* Search */}
      <div className="flex items-center space-x-2">
        <form onSubmit={handleSearch} className="flex-1 flex space-x-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search locations..."
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
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* Main table area */}
        <div className={`${selectedLocationId ? 'hidden md:block md:col-span-2' : 'col-span-3'}`}>
          {/* Show empty state if no locations exist yet and no search is applied */}
          {!isLoading && !isError && locations.length === 0 && !searchQuery ? (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <MapPin className="mx-auto h-10 w-10 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium">No locations yet</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Add your first location to get started.
              </p>
              <CreateLocationDialog
                organizationId={organizationId}
                trigger={
                  <Button className="mt-4">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Location
                  </Button>
                }
              />
            </div>
          ) : (
            <>
              <LocationsTable
                locations={locations}
                isLoading={isLoading}
                isError={isError}
                error={error}
                onView={handleViewDetails}
                onEdit={handleEditLocation} // Now we'll edit directly
                onDelete={handleDeleteLocation}
                onRetry={() => refetch()}
                filterApplied={!!searchQuery}
              />

              {/* Pagination - Standardized across all tabs */}
              <TablePagination
                pagination={
                  pagination || {
                    currentPage: 1,
                    totalPages: 1,
                    totalItems: locations.length,
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

        {/* Location details sidebar */}
        {selectedLocationId && (
          <div className="col-span-3 md:col-span-1 order-first md:order-last">
            <LocationDetails
              locationId={selectedLocationId}
              onClose={() => setSelectedLocationId(null)}
              onDelete={handleDeleteFromDetails}
            />
          </div>
        )}
      </div>

      {/* Edit location dialog */}
      {editingLocation && (
        <EditLocationDialog
          location={editingLocation}
          open={!!editingLocationId}
          onOpenChange={open => {
            if (!open) setEditingLocationId(null);
          }}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Location"
        description="Are you sure you want to delete this location? This action cannot be undone and will remove all data associated with this location."
        confirmText="Delete"
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
        variant="destructive"
      />
    </div>
  );
}
