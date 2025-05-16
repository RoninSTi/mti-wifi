'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Server, Plus, Search, X, Loader2 } from 'lucide-react';
import { useEquipmentList, useDeleteEquipment } from '@/hooks';
import { CreateEquipmentDialog } from '../equipment/CreateEquipmentDialog';
import { EditEquipmentDialog } from '../equipment/EditEquipmentDialog';
import { EquipmentTable } from '../equipment/EquipmentTable';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';

interface EquipmentTabProps {
  areaId: string;
}

export function EquipmentTab({ areaId }: EquipmentTabProps) {
  // State for pagination and search
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch equipment list with React Query hook
  const { equipment, isLoading, isError, error, pagination } = useEquipmentList({
    areaId,
    page,
    limit,
    q: searchQuery || undefined,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });

  // Use router for navigation
  const router = useRouter();

  // Navigate to equipment details page
  const handleViewEquipment = (id: string) => {
    // Get the organization ID from the URL
    const pathParts = window.location.pathname.split('/');
    const orgIndex = pathParts.findIndex(part => part === 'organizations');
    const organizationId =
      orgIndex >= 0 && orgIndex + 1 < pathParts.length ? pathParts[orgIndex + 1] : '';

    // Navigate to equipment details page
    if (organizationId) {
      router.push(`/organizations/${organizationId}/equipment/${id}`);
    }
  };

  // State for edit dialog
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingEquipmentId, setEditingEquipmentId] = useState<string>('');

  // Handle edit button click
  const handleEditEquipment = (id: string) => {
    setEditingEquipmentId(id);
    setEditDialogOpen(true);
  };

  // State for delete dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingEquipmentId, setDeletingEquipmentId] = useState<string>('');
  const [deletingEquipmentName, setDeletingEquipmentName] = useState<string>('');
  const { deleteEquipment, isLoading: isDeleting } = useDeleteEquipment();

  // Handle delete button click
  const handleDeleteEquipment = (id: string) => {
    const equipmentItem = equipment.find(item => item._id === id);
    if (equipmentItem) {
      setDeletingEquipmentId(id);
      setDeletingEquipmentName(equipmentItem.name);
      setDeleteDialogOpen(true);
    }
  };

  // Handle confirm delete
  const handleConfirmDelete = async () => {
    try {
      await deleteEquipment(deletingEquipmentId);
      setDeleteDialogOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete equipment');
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

  // Show empty state if no equipment exists
  if (!isLoading && !isError && equipment.length === 0 && !searchQuery) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">Equipment</h3>
          <CreateEquipmentDialog areaId={areaId} />
        </div>

        <div className="rounded-lg border border-dashed p-8 text-center">
          <Server className="mx-auto h-10 w-10 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium">No equipment yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Add your first equipment to get started.
          </p>
          <CreateEquipmentDialog
            areaId={areaId}
            trigger={
              <Button className="mt-4">
                <Plus className="mr-2 h-4 w-4" />
                Add Equipment
              </Button>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Equipment</h3>
        <CreateEquipmentDialog areaId={areaId} />
      </div>

      {/* Search */}
      <div className="flex items-center space-x-2">
        <form onSubmit={handleSearch} className="flex-1 flex space-x-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search equipment..."
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

      {/* Show empty search results message if no equipment found with filters */}
      {!isLoading && !isError && equipment.length === 0 && searchQuery ? (
        <div className="rounded-lg border p-8 text-center">
          <h3 className="text-lg font-medium">No results found</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Try adjusting your search or filter criteria.
          </p>
        </div>
      ) : (
        <EquipmentTable
          equipment={equipment}
          isLoading={isLoading}
          isError={isError}
          error={error}
          onView={handleViewEquipment}
          onEdit={handleEditEquipment}
          onDelete={handleDeleteEquipment}
          filterApplied={!!searchQuery}
        />
      )}

      {/* Edit Equipment Dialog - only rendered when dialog should be open */}
      {editDialogOpen && editingEquipmentId && (
        <EditEquipmentDialog
          equipmentId={editingEquipmentId}
          open={true}
          onOpenChange={setEditDialogOpen}
          trigger={<span className="hidden" />}
        />
      )}

      {/* Delete Equipment Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the equipment &quot;
              {deletingEquipmentName}&quot;.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete Equipment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Pagination */}
      {pagination && pagination.totalPages > 0 && (
        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {isLoading ? (
              <div className="h-5 w-[160px] bg-muted animate-pulse rounded"></div>
            ) : (
              <>
                Showing {equipment.length} of {pagination.totalItems} equipment items
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
                  className={!pagination.hasPreviousPage ? 'pointer-events-none opacity-50' : ''}
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
                          <span className="flex h-9 w-9 items-center justify-center">...</span>
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
    </div>
  );
}
