'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { GatewaysTable } from './GatewaysTable';
import { CreateGatewayDialog } from './CreateGatewayDialog';
import { EditGatewayDialog } from './EditGatewayDialog';
import { useGateways, useDeleteGateway } from '@/hooks';
import { GatewayResponse } from '@/app/api/gateways/schemas';
import { Search, X, Wifi, Plus } from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { TablePagination } from '@/components/ui/table-pagination';

interface GatewaysTabProps {
  locationId: string;
  showSearch?: boolean;
}

export function GatewaysTab({ locationId, showSearch = true }: GatewaysTabProps) {
  // State for pagination and search
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // State for edit dialog
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingGateway, setEditingGateway] = useState<GatewayResponse | null>(null);

  // State for delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [gatewayToDelete, setGatewayToDelete] = useState<string | null>(null);

  // Fetch gateways with React Query hook
  const { gateways, isLoading, isError, error, pagination } = useGateways({
    page,
    limit,
    q: searchQuery || undefined,
    locationId,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });

  // Initialize gateway deletion hook
  const { deleteGateway, isLoading: isDeleting } = useDeleteGateway();

  // Handle gateway actions
  const handleEditGateway = (id: string) => {
    const gateway = gateways.find(g => g._id === id);
    if (gateway) {
      setEditingGateway(gateway);
      setEditDialogOpen(true);
    }
  };

  // Initiate delete process - open confirmation dialog
  const handleDeleteGateway = (id: string) => {
    setGatewayToDelete(id);
    setDeleteDialogOpen(true);
  };

  // Execute delete after confirmation
  const handleConfirmDelete = async () => {
    if (!gatewayToDelete) return;

    try {
      await deleteGateway(gatewayToDelete);
      toast.success('Gateway deleted successfully');

      // Close dialog and reset state
      setDeleteDialogOpen(false);
      setGatewayToDelete(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete gateway');
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
        <h3 className="text-lg font-medium">Gateways</h3>
        <CreateGatewayDialog locationId={locationId} />
      </div>

      {/* Search */}
      {showSearch && (
        <div className="flex items-center space-x-2">
          <form onSubmit={handleSearch} className="flex-1 flex space-x-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search gateways..."
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
        {/* Show empty state if no gateways exist yet and no search is applied */}
        {!isLoading && !isError && gateways.length === 0 && !searchQuery ? (
          <div className="rounded-lg border border-dashed p-8 text-center">
            <Wifi className="mx-auto h-10 w-10 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium">No gateways yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Add your first gateway to get started.
            </p>
            <CreateGatewayDialog
              locationId={locationId}
              trigger={
                <Button className="mt-4">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Gateway
                </Button>
              }
            />
          </div>
        ) : (
          <>
            <GatewaysTable
              gateways={gateways}
              isLoading={isLoading}
              isError={isError}
              error={error}
              onEdit={handleEditGateway}
              onDelete={handleDeleteGateway}
              filterApplied={!!searchQuery}
            />

            {/* Pagination - Standardized across all tabs */}
            <TablePagination
              pagination={
                pagination || {
                  currentPage: 1,
                  totalPages: 1,
                  totalItems: gateways.length,
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

      {/* Edit Gateway Dialog */}
      <EditGatewayDialog
        gateway={editingGateway}
        open={editDialogOpen}
        onOpenChange={open => {
          setEditDialogOpen(open);
          if (!open) {
            setEditingGateway(null);
          }
        }}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Gateway"
        description="Are you sure you want to delete this gateway? This action cannot be undone and will remove all data associated with this gateway."
        confirmText="Delete"
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
        variant="destructive"
      />
    </div>
  );
}
