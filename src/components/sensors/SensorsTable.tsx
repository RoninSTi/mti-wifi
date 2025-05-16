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
import { PlusCircle, Wifi, WifiOff, MoreHorizontal } from 'lucide-react';
import { CreateSensorDialog } from './CreateSensorDialog';
import { EditSensorDialog } from './EditSensorDialog';
import { SensorDetails } from './SensorDetails';
import { useSensors } from '@/hooks/useSensors';
import { useDeleteSensor } from '@/hooks/useDeleteSensor';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface SensorsTableProps {
  equipmentId: string;
}

export function SensorsTable({ equipmentId }: SensorsTableProps) {
  const { sensors, isLoading, refetch } = useSensors(equipmentId, { limit: 20 });
  const { mutate: deleteSensor } = useDeleteSensor();
  const [selectedSensor, setSelectedSensor] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  // Dialog state is managed by the DeleteButton component

  // Helper function for status badge
  const getStatusBadge = (status: string) => {
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
    setSelectedSensor(sensorId);
    setDetailsOpen(true);
  };

  const handleDelete = (sensorId: string) => {
    deleteSensor(sensorId, {
      onSuccess: () => {
        refetch();
      },
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Sensors</h3>
        <CreateSensorDialog
          equipmentId={equipmentId}
          trigger={
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Sensor
            </Button>
          }
        />
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
            ) : sensors && sensors.length > 0 ? (
              sensors.map(sensor => (
                <TableRow key={sensor._id}>
                  <TableCell className="font-medium">{sensor.name}</TableCell>
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
                  <TableCell>
                    <div className="flex justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewDetails(sensor._id)}
                      >
                        Details
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <EditSensorDialog
                              sensorId={sensor._id}
                              trigger={<button className="w-full text-left">Edit</button>}
                              onComplete={refetch}
                            />
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onSelect={e => {
                              e.preventDefault();
                              handleDelete(sensor._id);
                            }}
                          >
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
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
                refetch();
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* We're handling delete via the dropdown menu directly */}
    </div>
  );
}
