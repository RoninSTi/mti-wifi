'use client';

import React, { useState } from 'react';
import {
  useOrganizationsQuery,
  useOrganizationQuery,
  useCreateOrganizationMutation,
  useUpdateOrganizationMutation,
  useDeleteOrganizationMutation,
} from '@/hooks';
import {
  CreateOrganizationInput,
  UpdateOrganizationInput,
  OrganizationResponse,
} from '@/app/api/organizations/schemas';

/**
 * Example component demonstrating TanStack Query hooks for organizations
 */
export function OrganizationsExample() {
  // State for pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // Function to change items per page
  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit);
    setPage(1); // Reset to first page when changing limit
  };
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Query hook for fetching organizations
  const {
    data: organizationsData,
    isLoading: isLoadingOrganizations,
    error: organizationsError,
  } = useOrganizationsQuery({ page, limit });

  // Query hook for fetching a single organization
  const { data: organizationData, isLoading: isLoadingOrganization } = useOrganizationQuery(
    selectedId || '',
    {
      enabled: !!selectedId, // Only fetch when an ID is selected
    }
  );

  // Mutation hooks
  const createMutation = useCreateOrganizationMutation();
  const updateMutation = useUpdateOrganizationMutation(selectedId || '');
  const deleteMutation = useDeleteOrganizationMutation();

  // Example handlers
  const handleCreateOrganization = () => {
    const newOrg: CreateOrganizationInput = {
      name: `New Organization ${Date.now()}`,
      description: 'Created with TanStack Query',
    };

    createMutation.mutate(newOrg, {
      onSuccess: data => {
        console.log('Created successfully', data);
        // Additional logic after successful creation
      },
      onError: (error: Error) => {
        console.error('Creation failed', error);
        // Error handling logic
      },
    });
  };

  const handleUpdateOrganization = () => {
    if (!selectedId) return;

    const updates: UpdateOrganizationInput = {
      description: `Updated at ${new Date().toISOString()}`,
    };

    updateMutation.mutate(updates, {
      onSuccess: data => {
        console.log('Updated successfully', data);
        // Additional logic after successful update
      },
    });
  };

  const handleDeleteOrganization = (id: string) => {
    deleteMutation.mutate(id, {
      onSuccess: () => {
        console.log('Deleted successfully');
        if (selectedId === id) {
          setSelectedId(null);
        }
      },
    });
  };

  // Loading states
  if (isLoadingOrganizations) {
    return <div>Loading organizations...</div>;
  }

  // Error states
  if (organizationsError || organizationsData?.error) {
    return <div>Error loading organizations</div>;
  }

  const organizations = organizationsData?.data?.data || [];
  const pagination = organizationsData?.data?.meta;

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Organizations</h1>

      {/* Create button */}
      <button
        onClick={handleCreateOrganization}
        disabled={createMutation.isPending}
        className="px-4 py-2 bg-blue-500 text-white rounded mb-4"
      >
        {createMutation.isPending ? 'Creating...' : 'Create Organization'}
      </button>

      {/* Organizations list */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Organizations List</h2>
        <ul className="space-y-2">
          {organizations.map((org: OrganizationResponse) => (
            <li key={org._id} className="border p-3 rounded">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-bold">{org.name}</h3>
                  <p className="text-sm text-gray-600">{org.description || 'No description'}</p>
                </div>
                <div className="space-x-2">
                  <button
                    onClick={() => setSelectedId(org._id)}
                    className="px-3 py-1 bg-gray-200 rounded"
                  >
                    View
                  </button>
                  <button
                    onClick={() => handleDeleteOrganization(org._id)}
                    disabled={deleteMutation.isPending && deleteMutation.variables === org._id}
                    className="px-3 py-1 bg-red-500 text-white rounded"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Pagination */}
      {pagination && (
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex justify-between items-center">
            <div>
              Showing {organizations.length} of {pagination.totalItems} items
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={!pagination.hasPreviousPage}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >
                Previous
              </button>
              <span className="px-3 py-1">
                Page {pagination.currentPage} of {pagination.totalPages}
              </span>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={!pagination.hasNextPage}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>

          {/* Items per page selector */}
          <div className="flex items-center gap-2">
            <span>Items per page:</span>
            <select
              value={limit}
              onChange={e => handleLimitChange(Number(e.target.value))}
              className="border rounded px-2 py-1"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>
      )}

      {/* Selected organization details */}
      {selectedId && (
        <div className="mt-8 border p-4 rounded">
          <h2 className="text-xl font-semibold mb-4">Organization Details</h2>

          {isLoadingOrganization ? (
            <div>Loading details...</div>
          ) : organizationData?.error ? (
            <div>Error loading organization: {organizationData.error.message}</div>
          ) : organizationData?.data ? (
            <div>
              <h3 className="text-lg font-bold">{organizationData.data.name}</h3>
              <p className="mb-4">{organizationData.data.description || 'No description'}</p>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold">Contact Info</h4>
                  <p>Name: {organizationData.data.contactName || 'N/A'}</p>
                  <p>Email: {organizationData.data.contactEmail || 'N/A'}</p>
                  <p>Phone: {organizationData.data.contactPhone || 'N/A'}</p>
                </div>
                <div>
                  <h4 className="font-semibold">Other Details</h4>
                  <p>Address: {organizationData.data.address || 'N/A'}</p>
                  <p>Created: {new Date(organizationData.data.createdAt).toLocaleDateString()}</p>
                  <p>Updated: {new Date(organizationData.data.updatedAt).toLocaleDateString()}</p>
                </div>
              </div>

              <div className="mt-4">
                <button
                  onClick={handleUpdateOrganization}
                  disabled={updateMutation.isPending}
                  className="px-4 py-2 bg-green-500 text-white rounded"
                >
                  {updateMutation.isPending ? 'Updating...' : 'Update Description'}
                </button>
              </div>
            </div>
          ) : (
            <div>No data available</div>
          )}

          <button onClick={() => setSelectedId(null)} className="mt-4 px-3 py-1 border rounded">
            Close
          </button>
        </div>
      )}
    </div>
  );
}
