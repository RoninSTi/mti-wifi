'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Server, Plus } from 'lucide-react';
import { useEquipmentList } from '@/hooks';
import { CreateEquipmentDialog } from '../equipment/CreateEquipmentDialog';
import { EquipmentTable } from '../equipment/EquipmentTable';

interface EquipmentTabProps {
  areaId: string;
}

export function EquipmentTab({ areaId }: EquipmentTabProps) {
  // Fetch equipment list with React Query hook
  const { equipment, isLoading, isError, error, refetch } = useEquipmentList({
    areaId,
    page: 1,
    limit: 100, // Large limit to show all items
  });

  const handleViewEquipment = (id: string) => {
    console.log('View equipment:', id);
    // Implement view functionality
  };

  const handleEditEquipment = (id: string) => {
    console.log('Edit equipment:', id);
    // Implement edit functionality
  };

  const handleDeleteEquipment = (id: string) => {
    console.log('Delete equipment:', id);
    // Implement delete functionality
  };

  // Show empty state if no equipment exists
  if (!isLoading && !isError && equipment.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">Equipment</h3>
          <CreateEquipmentDialog areaId={areaId} onSuccess={() => refetch()} />
        </div>

        <div className="rounded-lg border border-dashed p-8 text-center">
          <Server className="mx-auto h-10 w-10 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium">No equipment yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Add your first equipment to get started.
          </p>
          <CreateEquipmentDialog
            areaId={areaId}
            onSuccess={() => refetch()}
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
        <CreateEquipmentDialog areaId={areaId} onSuccess={() => refetch()} />
      </div>

      <EquipmentTable
        equipment={equipment}
        isLoading={isLoading}
        isError={isError}
        error={error}
        onView={handleViewEquipment}
        onEdit={handleEditEquipment}
        onDelete={handleDeleteEquipment}
        onRetry={() => refetch()}
        filterApplied={false}
      />
    </div>
  );
}
