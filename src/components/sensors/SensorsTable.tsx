'use client';

import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PlusCircle, Wifi, WifiOff, MoreHorizontal, Eye, Edit, Trash, Scan } from 'lucide-react';
import { CreateSensorDialog } from './CreateSensorDialog';
import { EditSensorDialog } from './EditSensorDialog';
import { SensorDetails } from './SensorDetails';
import { useSensors } from '@/hooks/useSensors';
import { useDeleteSensor } from '@/hooks/useDeleteSensor';
import { useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
// Import the specific schema for proper typing
import { SensorResponse } from '@/app/api/sensors/schemas';
import { useRouter } from 'next/navigation';

interface SensorsTableProps {
  equipmentId: string;
  organizationId: string;
}

export function SensorsTable({ equipmentId, organizationId }: SensorsTableProps) {
  // Dialog state
  const [selectedSensor, setSelectedSensor] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [sensorToDelete, setSensorToDelete] = useState<string | null>(null);

  // Router for navigation
  const router = useRouter();

  // Fetch sensors without pagination
  const { sensors, isLoading, isError } = useSensors(equipmentId, {
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });

  // Get queryClient for direct cache manipulation if needed
  const queryClient = useQueryClient();

  const { mutate: deleteSensor, isPending: isDeleting } = useDeleteSensor();

  // Helper function for status badge using the correct type from SensorResponse
  const getStatusBadge = (status: SensorResponse['status']) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500 hover:bg-green-600">Active</Badge>;
      case 'inactive':
        return <Badge variant="outline">Inactive</Badge>;
      case 'warning':
        return <Badge className="bg-yellow-500 hover:bg-yellow-600">Warning</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleViewDetails = (sensorId: string) => {
    // Open the sensor details dialog
    setSelectedSensor(sensorId);
    setDetailsOpen(true);
  };

  // Initiate delete process - open the confirmation dialog
  const handleDeleteClick = (sensorId: string) => {
    setSensorToDelete(sensorId);
    setDeleteDialogOpen(true);
  };

  // Execute the delete after confirmation
  const handleConfirmDelete = () => {
    if (!sensorToDelete) return;

    deleteSensor(sensorToDelete, {
      onSuccess: () => {
        // Toast is handled in the useDeleteSensor hook
        // No need to call refetch - query invalidation in the useDeleteSensor hook
        // will automatically trigger a refetch
      },
      onError: () => {
        // Error toast is handled in the useDeleteSensor hook
      },
      onSettled: () => {
        // Clean up state
        setSensorToDelete(null);
        setDeleteDialogOpen(false);
      },
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Sensors</h3>
        <div className="flex items-center gap-2">
          <CreateSensorDialog
            equipmentId={equipmentId}
            trigger={
              <Button>
                <PlusCircle className="h-4 w-4" />
                Add Sensor
              </Button>
            }
          />
        </div>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Serial Number</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Connection</TableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={`skeleton-${i}`}>
                  <TableCell>
                    <Skeleton className="h-5 w-32" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-16" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-8 w-8" />
                  </TableCell>
                </TableRow>
              ))
            ) : isError ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  <div className="flex flex-col items-center justify-center space-y-3">
                    <p className="text-destructive">Error loading sensors</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        queryClient.invalidateQueries({
                          queryKey: ['sensors', { equipmentId }],
                        })
                      }
                    >
                      Try again
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : sensors && sensors.length > 0 ? (
              sensors.map(sensor => (
                <TableRow
                  key={sensor._id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={e => {
                    // Prevent row click when clicking on the dropdown menu
                    if ((e.target as HTMLElement).closest('.dropdown-trigger')) {
                      return;
                    }
                    handleViewDetails(sensor._id);
                  }}
                >
                  <TableCell className="font-medium">
                    <span className="text-primary">{sensor.name}</span>
                  </TableCell>
                  <TableCell>{sensor.serial ?? 'N/A'}</TableCell>
                  <TableCell>{getStatusBadge(sensor.status)}</TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      {sensor.connected ? (
                        <>
                          <Wifi className="h-4 w-4 text-green-500 mr-2" />
                          <span>Connected</span>
                        </>
                      ) : (
                        <>
                          <WifiOff className="h-4 w-4 text-muted-foreground mr-2" />
                          <span className="text-muted-foreground">Disconnected</span>
                        </>
                      )}
                    </div>
                  </TableCell>
                  <TableCell onClick={e => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="dropdown-trigger">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">More options</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleViewDetails(sensor._id)}>
                          <Eye className="mr-2 h-4 w-4" />
                          View details
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            // Find the edit dialog and set it up for this sensor
                            setSelectedSensor(sensor._id);
                            setEditDialogOpen(true);
                          }}
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => handleDeleteClick(sensor._id)}
                        >
                          <Trash className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  <div className="flex flex-col items-center justify-center space-y-3">
                    <p className="text-muted-foreground text-sm">No sensors found</p>
                    <p className="text-xs text-muted-foreground">
                      Add sensors to start monitoring this equipment
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Sensor Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Sensor Details</DialogTitle>
          </DialogHeader>
          {selectedSensor && (
            <SensorDetails
              sensorId={selectedSensor}
              onDelete={() => {
                setDetailsOpen(false);
                // No need to call refetch - query invalidation in the
                // deletion hook will trigger automatic refetching
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Sensor Dialog */}
      {selectedSensor && (
        <EditSensorDialog
          sensorId={selectedSensor}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          trigger={<span style={{ display: 'none' }}></span>}
          onComplete={() => {
            // No need for manual refetch - query invalidation in the update hook
            // will trigger automatic refetching
          }}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Are you sure?"
        description="This action cannot be undone. This will permanently delete this sensor."
        confirmText="Delete"
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
        variant="destructive"
      />
    </div>
  );
}
