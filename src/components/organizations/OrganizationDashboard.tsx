'use client';

import React, { useState } from 'react';
import { CreateOrganizationDialog } from './CreateOrganizationDialog';
import { OrganizationsTable } from './OrganizationsTable';
// Removed import for TabbedOrganizationDetails
import { EditOrganizationDialog } from './EditOrganizationDialog';
import { Button } from '@/components/ui/button';
import { TablePagination } from '@/components/ui/table-pagination';
import { Search, X } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useOrganizations, useDeleteOrganization, useOrganization } from '@/hooks';

export function OrganizationDashboard() {
  // Router and URL parameters
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Get current pagination and filters from URL
  const page = Number(searchParams.get('page') || '1');
  const limit = Number(searchParams.get('limit') || '10');
  const searchQuery = searchParams.get('q') || '';

  // State for search input
  const [searchInput, setSearchInput] = useState(searchQuery);

  // Removed selectedOrgId state as we now use a separate page for details

  // State for the organization being edited directly (without showing details)
  const [editingOrgId, setEditingOrgId] = useState<string | null>(null);

  // Fetch data for the organization being edited
  const { organization: editingOrganization } = useOrganization(editingOrgId || '');

  // Fetch organizations with React Query hook
  const { organizations, isLoading, isError, error, pagination, refetch } = useOrganizations({
    page,
    limit,
    q: searchQuery || undefined,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });

  // Initialize organization deletion hook
  const { deleteOrg } = useDeleteOrganization();

  // Update URL with new pagination/filters
  const updateParams = (params: Record<string, string | number | null>) => {
    const newParams = new URLSearchParams(searchParams.toString());

    // Update or remove params
    Object.entries(params).forEach(([key, value]) => {
      if (value === null) {
        newParams.delete(key);
      } else {
        newParams.set(key, String(value));
      }
    });

    // Reset to page 1 when filters change
    if ('q' in params && params.q !== searchQuery) {
      newParams.set('page', '1');
    }

    router.push(`${pathname}?${newParams.toString()}`);
  };

  // Handle search submission
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateParams({ q: searchInput || null, page: 1 });
  };

  // Clear search filter
  const clearSearch = () => {
    setSearchInput('');
    updateParams({ q: null, page: 1 });
  };

  // Handle organization actions
  const handleViewDetails = (id: string) => {
    router.push(`/organizations/${id}`);
  };

  // Direct edit without showing details
  const handleEditOrganization = (id: string) => {
    setEditingOrgId(id);
  };

  // This gets called when deleting from the table
  const handleDeleteOrganization = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this organization?')) {
      try {
        await deleteOrg(id);
        toast.success('Organization deleted successfully');
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to delete organization');
      }
    }
  };

  return (
    <div className="container py-10 mx-auto">
      <div className="flex flex-col gap-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Organizations</h1>
            <p className="text-muted-foreground mt-1">Manage all your organizations in one place</p>
          </div>
          <CreateOrganizationDialog />
        </div>

        {/* Search and filters */}
        <div className="flex items-center space-x-2">
          <form onSubmit={handleSearch} className="flex-1 flex space-x-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search organizations..."
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
        <div className="grid grid-cols-1 gap-8">
          {/* Main table area */}
          <div>
            {/* Table */}
            <OrganizationsTable
              organizations={organizations}
              isLoading={isLoading}
              isError={isError}
              error={error}
              onView={handleViewDetails}
              onEdit={handleEditOrganization}
              onDelete={handleDeleteOrganization}
              onRetry={() => refetch()}
              filterApplied={!!searchQuery}
            />

            {/* Pagination - Standardized across all tabs */}
            <TablePagination
              pagination={
                pagination || {
                  currentPage: page,
                  totalPages: 1,
                  totalItems: organizations.length,
                  itemsPerPage: limit,
                  hasNextPage: false,
                  hasPreviousPage: false,
                }
              }
              useURLParams={true}
              showItemsPerPage={true}
            />
          </div>

          {/* Organization details moved to separate page */}

          {/* Edit organization dialog (not tied to details view) */}
          {editingOrganization && (
            <EditOrganizationDialog
              organization={editingOrganization}
              open={!!editingOrgId}
              onOpenChange={open => {
                if (!open) setEditingOrgId(null);
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
