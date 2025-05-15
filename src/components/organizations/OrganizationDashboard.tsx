'use client';

import React, { useState } from 'react';
import { CreateOrganizationDialog } from './CreateOrganizationDialog';
import { OrganizationsTable } from './OrganizationsTable';
import { OrganizationDetails } from './OrganizationDetails';
import { EditOrganizationDialog } from './EditOrganizationDialog';
import { Button } from '@/components/ui/button';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
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

  // State for selected organization (for details view)
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);

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
  const {
    deleteOrg,
    isLoading: isDeleting,
    isError: isDeleteError,
    error: deleteError,
    isSuccess: isDeleteSuccess,
  } = useDeleteOrganization();

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
    setSelectedOrgId(id);
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

        // If we're currently viewing the deleted organization, close the details panel
        if (selectedOrgId === id) {
          setSelectedOrgId(null);
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to delete organization');
      }
    }
  };

  // This only handles UI updates after deletion from the details panel
  const handleDeleteFromDetails = (id: string) => {
    toast.success('Organization deleted successfully');
    setSelectedOrgId(null);
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Main table area */}
          <div className={`${selectedOrgId ? 'hidden md:block md:col-span-2' : 'col-span-3'}`}>
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

            {/* Pagination */}
            {pagination && pagination.totalPages > 0 && (
              <div className="mt-4 flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  {isLoading ? (
                    <div className="h-5 w-[160px] bg-muted animate-pulse rounded"></div>
                  ) : (
                    <>
                      Showing {organizations.length} of {pagination.totalItems} organizations
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
                            updateParams({ page: page - 1 });
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
                                  updateParams({ page: p });
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
                            updateParams({ page: page + 1 });
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
                    onChange={e => updateParams({ limit: Number(e.target.value), page: 1 })}
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

          {/* Organization details sidebar */}
          {selectedOrgId && (
            <div className="col-span-3 md:col-span-1 order-first md:order-last">
              <OrganizationDetails
                organizationId={selectedOrgId}
                onClose={() => setSelectedOrgId(null)}
                onDelete={handleDeleteFromDetails}
              />
            </div>
          )}

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
