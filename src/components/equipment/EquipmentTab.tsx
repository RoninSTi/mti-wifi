'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { EquipmentTable } from './EquipmentTable';
import { CreateEquipmentDialog } from './CreateEquipmentDialog';
import { EditEquipmentDialog } from './EditEquipmentDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useEquipmentList, useDeleteEquipment } from '@/hooks';
import { Loader2, Search, Plus, RefreshCw } from 'lucide-react';
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
import { CustomPagination } from '@/components/ui/custom-pagination';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PaginationMeta } from '@/lib/pagination/types';
import { Pagination } from '@/components/ui/pagination';

interface EquipmentTabProps {
  areaId: string;
}

export function EquipmentTab({ areaId }: EquipmentTabProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<
    'active' | 'inactive' | 'maintenance' | 'failed' | undefined
  >(undefined);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [equipmentToDelete, setEquipmentToDelete] = useState<string | null>(null);
  const [isAlertDialogOpen, setIsAlertDialogOpen] = useState(false);

  // Fetch equipment list with pagination and filters
  const { equipment, isLoading, isError, error, pagination, refetch } = useEquipmentList({
    areaId,
    page,
    limit,
    q: searchQuery || undefined,
    status: statusFilter,
  });

  // Delete mutation
  const { deleteEquipment, isLoading: isDeleting } = useDeleteEquipment();

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setPage(1); // Reset to first page when search changes
  };

  // Handle status filter change
  const handleStatusFilterChange = (value: string) => {
    if (value === 'all') {
      setStatusFilter(undefined);
    } else if (
      value === 'active' ||
      value === 'inactive' ||
      value === 'maintenance' ||
      value === 'failed'
    ) {
      setStatusFilter(value);
    }
    setPage(1); // Reset to first page when filter changes
  };

  // Navigate to equipment details page
  const handleViewEquipment = (id: string) => {
    // Get the organization ID from the URL
    const pathParts = window.location.pathname.split('/');
    const orgIndex = pathParts.findIndex(part => part === 'organizations');
    const organizationId =
      orgIndex >= 0 && orgIndex + 1 < pathParts.length ? pathParts[orgIndex + 1] : '';

    router.push(`/organizations/${organizationId}/equipment/${id}`);
  };

  // Open edit dialog for equipment
  const handleEditEquipment = (id: string) => {
    // This is handled by the EditEquipmentDialog component
    console.log('Edit equipment:', id);
  };

  // Handle delete confirmation
  const handleDeleteConfirm = async () => {
    if (!equipmentToDelete) return;

    try {
      const result = await deleteEquipment(equipmentToDelete);
      if (result.error) {
        toast.error(result.error.message || 'Failed to delete equipment');
      } else {
        toast.success('Equipment deleted successfully');
        await refetch();
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'An error occurred while deleting equipment'
      );
    } finally {
      setEquipmentToDelete(null);
      setIsAlertDialogOpen(false);
    }
  };

  // Open delete confirmation dialog
  const handleDeleteEquipment = (id: string) => {
    setEquipmentToDelete(id);
    setIsAlertDialogOpen(true);
  };

  // Render the search bar with filters
  const renderSearchBar = () => (
    <div className="flex flex-col sm:flex-row gap-4 mb-6">
      <div className="relative flex-1">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search equipment..."
          className="pl-8 w-full"
          value={searchQuery}
          onChange={handleSearchChange}
        />
      </div>
      <Select value={statusFilter || 'all'} onValueChange={handleStatusFilterChange}>
        <SelectTrigger className="w-full sm:w-[180px]">
          <SelectValue placeholder="Filter by status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Statuses</SelectItem>
          <SelectItem value="active">Active</SelectItem>
          <SelectItem value="inactive">Inactive</SelectItem>
          <SelectItem value="maintenance">Maintenance</SelectItem>
          <SelectItem value="failed">Failed</SelectItem>
        </SelectContent>
      </Select>
      <div className="flex gap-2">
        <Button variant="outline" size="icon" onClick={() => refetch()} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
        <CreateEquipmentDialog
          areaId={areaId}
          trigger={
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Equipment
            </Button>
          }
        />
      </div>
    </div>
  );

  // Render pagination controls if needed
  const renderPagination = (paginationData: PaginationMeta | null) => {
    if (!paginationData || paginationData.totalPages <= 1) return null;

    return (
      <div className="flex justify-center mt-6">
        <CustomPagination
          currentPage={paginationData.currentPage}
          totalPages={paginationData.totalPages}
          onPageChange={setPage}
        />
      </div>
    );
  };

  // If there's no equipment and no filters are applied, show empty state
  const renderEmptyState = () => {
    const isFilterApplied = !!searchQuery || !!statusFilter;

    if (equipment.length === 0 && !isFilterApplied && !isLoading && !isError) {
      return (
        <div className="rounded-lg border p-8 text-center">
          <h3 className="text-lg font-medium">No equipment found</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Get started by adding equipment to this area.
          </p>
          <CreateEquipmentDialog
            areaId={areaId}
            trigger={
              <Button className="mt-4">
                <Plus className="mr-2 h-4 w-4" />
                Add First Equipment
              </Button>
            }
          />
        </div>
      );
    }

    return null;
  };

  return (
    <div className="space-y-4">
      {renderSearchBar()}

      {renderEmptyState()}

      <EquipmentTable
        equipment={equipment}
        isLoading={isLoading}
        isError={isError}
        error={error}
        onView={handleViewEquipment}
        onEdit={handleEditEquipment}
        onDelete={handleDeleteEquipment}
        onRetry={refetch}
        filterApplied={!!searchQuery || !!statusFilter}
      />

      {renderPagination(pagination)}

      {/* Delete confirmation dialog */}
      <AlertDialog open={isAlertDialogOpen} onOpenChange={setIsAlertDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this equipment and any
              associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} disabled={isDeleting}>
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
