'use client';

import React from 'react';
import { useSensor } from '@/hooks/useSensor';
import { useDeleteSensor } from '@/hooks/useDeleteSensor';
import { useQueryClient } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EditSensorDialog } from './EditSensorDialog';
import { DeleteButton } from '@/components/ui/delete-button';
import { EntityMeta } from '@/components/ui/entity-meta';
import { Badge } from '@/components/ui/badge';
import { Loader2, Wifi, WifiOff } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface SensorDetailsProps {
  sensorId: string;
  onDelete?: () => void;
}

export function SensorDetails({ sensorId, onDelete }: SensorDetailsProps) {
  const { data, isLoading, isError, error } = useSensor(sensorId);
  const queryClient = useQueryClient();
  const { mutate: deleteSensor, isPending: isDeleting } = useDeleteSensor();
  const router = useRouter();
  // Dialog state is managed by the DeleteButton component

  const handleDelete = () => {
    deleteSensor(sensorId, {
      onSuccess: () => {
        if (onDelete) {
          onDelete();
        } else {
          // Navigate back to equipment page if no custom handler
          router.back();
        }
      },
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || !data?.data) {
    return (
      <div className="p-4 text-center">
        <p className="text-destructive">
          Error loading sensor: {error?.message || 'Unknown error'}
        </p>
        <Button
          onClick={() => queryClient.invalidateQueries({ queryKey: ['sensor', sensorId] })}
          className="mt-4"
        >
          Retry
        </Button>
      </div>
    );
  }

  const sensor = data.data;
  const statusColor = {
    active: 'green',
    inactive: 'gray',
    warning: 'yellow',
    error: 'red',
  }[sensor.status];

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-xl font-bold">{sensor.name}</CardTitle>
            {sensor.description && <CardDescription>{sensor.description}</CardDescription>}
          </div>
          <div className="flex items-center space-x-2">
            <Badge
              className={
                statusColor === 'green'
                  ? 'bg-green-500 hover:bg-green-600'
                  : statusColor === 'red'
                    ? 'bg-destructive'
                    : statusColor === 'yellow'
                      ? 'bg-yellow-500 hover:bg-yellow-600'
                      : 'bg-gray-500 hover:bg-gray-600'
              }
            >
              {sensor.status.charAt(0).toUpperCase() + sensor.status.slice(1)}
            </Badge>
            {sensor.connected ? (
              <Wifi className="h-4 w-4 text-green-500" />
            ) : (
              <WifiOff className="h-4 w-4 text-gray-400" />
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Identification</h3>
            <dl className="space-y-1">
              <div className="flex justify-between">
                <dt className="text-sm font-medium">Equipment:</dt>
                <dd className="text-sm">{sensor.equipment.name}</dd>
              </div>
              {sensor.serial && (
                <div className="flex justify-between">
                  <dt className="text-sm font-medium">Serial Number:</dt>
                  <dd className="text-sm">{sensor.serial}</dd>
                </div>
              )}
              {sensor.partNumber && (
                <div className="flex justify-between">
                  <dt className="text-sm font-medium">Part Number:</dt>
                  <dd className="text-sm">{sensor.partNumber}</dd>
                </div>
              )}
              {sensor.hardwareVersion && (
                <div className="flex justify-between">
                  <dt className="text-sm font-medium">Hardware Version:</dt>
                  <dd className="text-sm">{sensor.hardwareVersion}</dd>
                </div>
              )}
              {sensor.firmwareVersion && (
                <div className="flex justify-between">
                  <dt className="text-sm font-medium">Firmware Version:</dt>
                  <dd className="text-sm">{sensor.firmwareVersion}</dd>
                </div>
              )}
            </dl>
          </div>
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Configuration</h3>
            <dl className="space-y-1">
              {sensor.accessPoint !== undefined && (
                <div className="flex justify-between">
                  <dt className="text-sm font-medium">Access Point:</dt>
                  <dd className="text-sm">{sensor.accessPoint}</dd>
                </div>
              )}
              {sensor.readRate !== undefined && (
                <div className="flex justify-between">
                  <dt className="text-sm font-medium">Read Rate:</dt>
                  <dd className="text-sm">{sensor.readRate} Hz</dd>
                </div>
              )}
              {sensor.readPeriod !== undefined && (
                <div className="flex justify-between">
                  <dt className="text-sm font-medium">Read Period:</dt>
                  <dd className="text-sm">{sensor.readPeriod} ms</dd>
                </div>
              )}
              {sensor.samples !== undefined && (
                <div className="flex justify-between">
                  <dt className="text-sm font-medium">Samples:</dt>
                  <dd className="text-sm">{sensor.samples}</dd>
                </div>
              )}
              {sensor.gMode && (
                <div className="flex justify-between">
                  <dt className="text-sm font-medium">G Mode:</dt>
                  <dd className="text-sm">{sensor.gMode}</dd>
                </div>
              )}
              {sensor.freqMode && (
                <div className="flex justify-between">
                  <dt className="text-sm font-medium">Frequency Mode:</dt>
                  <dd className="text-sm">{sensor.freqMode}</dd>
                </div>
              )}
            </dl>
          </div>
        </div>

        <EntityMeta
          items={[
            { label: 'Created', value: new Date(sensor.createdAt).toLocaleString() },
            { label: 'Last Updated', value: new Date(sensor.updatedAt).toLocaleString() },
            {
              label: 'Last Connected',
              value: sensor.lastConnectedAt
                ? new Date(sensor.lastConnectedAt).toLocaleString()
                : 'Never',
            },
            {
              label: 'Status',
              value: sensor.status.charAt(0).toUpperCase() + sensor.status.slice(1),
            },
          ]}
        />
      </CardContent>
      <CardFooter className="flex justify-between pt-4 border-t">
        <DeleteButton onDelete={handleDelete} isDeleting={isDeleting} resourceName="sensor" />
        <EditSensorDialog
          sensorId={sensorId}
          trigger={<Button variant="outline">Edit Sensor</Button>}
          // No need for manual refetch as query invalidation will automatically trigger updates
          onComplete={() => {}}
        />
      </CardFooter>
    </Card>
  );
}
