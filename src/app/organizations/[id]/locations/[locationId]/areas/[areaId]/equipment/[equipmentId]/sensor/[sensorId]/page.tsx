'use client';

import React from 'react';
import { useSensor } from '@/hooks/useSensor';
import { SensorHistoricalReadings } from '@/components/sensors/readings';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useTypedParams } from '@/lib/utils';
import { DetailPageBreadcrumbs } from '@/components/shared';
import { Badge } from '@/components/ui/badge';
import { getGatewayId, getSensorSerial } from '@/lib/utils/sensor-utils';
import { useGatewayConnection } from '@/lib/services/gateway/use-gateway-connection';

export default function SensorReadingsPage() {
  // Type-safe params
  type SensorDetailParams = {
    id: string; // Organization ID
    locationId: string; // Location ID
    areaId: string; // Area ID
    equipmentId: string; // Equipment ID
    sensorId: string; // Sensor ID
  };

  const { sensorId } = useTypedParams<SensorDetailParams>();

  // Fetch sensor details
  const { sensor, isLoading, isError, error } = useSensor(sensorId);

  // Use utility functions to safely extract values
  const gatewayId = sensor ? getGatewayId(sensor) : null;
  const sensorSerial = sensor ? getSensorSerial(sensor) : null;

  // Use gateway connection hook for status badges (only if gatewayId exists)
  const gatewayConnection = useGatewayConnection(gatewayId || '');

  // Check if sensor is connected (using same logic as realtime readings)
  const isSensorConnected =
    gatewayId && sensorSerial
      ? gatewayConnection.sensors.some(
          s => s.Serial === sensorSerial && (s.Connected === true || s.Connected === 1)
        )
      : false;

  // Local state for tracking loading state of reading requests
  const [readingLoading, setReadingLoading] = React.useState({
    battery: false,
    temperature: false,
    vibration: false,
  });

  // Generic function for taking readings (same logic as realtime component)
  const handleTakeReading = async (type: 'battery' | 'temperature' | 'vibration') => {
    if (!gatewayConnection.isAuthenticated) {
      return;
    }

    if (!isSensorConnected || !sensorSerial) {
      return;
    }

    setReadingLoading(prev => ({ ...prev, [type]: true }));

    try {
      switch (type) {
        case 'battery':
          await gatewayConnection.takeBatteryReading(sensorSerial);
          break;
        case 'temperature':
          await gatewayConnection.takeTemperatureReading(sensorSerial);
          break;
        case 'vibration':
          await gatewayConnection.takeVibrationReading(sensorSerial);
          break;
      }
    } catch {
      // Error handling can be added here if needed
    } finally {
      setReadingLoading(prev => ({ ...prev, [type]: false }));
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="container py-10 mx-auto">
        <div className="flex items-center gap-2 mb-6">
          <Skeleton className="h-8 w-[250px]" />
        </div>
        <div className="grid grid-cols-1 gap-8">
          <Skeleton className="h-[500px] w-full" />
        </div>
      </div>
    );
  }

  // Error state
  if (isError || !sensor) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to load sensor details';
    return (
      <div className="container py-10 mx-auto">
        <div className="flex items-center gap-2 mb-6">
          <h1 className="text-2xl font-bold">Sensor not found</h1>
        </div>
        <div className="bg-destructive/10 text-destructive rounded-lg p-4 mt-6">
          <p>{errorMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-10 mx-auto">
      {/* Breadcrumb navigation */}
      <DetailPageBreadcrumbs className="mb-6" />

      {/* Header with title and actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <div className="flex items-center gap-2">
          <div>
            <h1 className="text-2xl font-bold">{sensor.name}</h1>
            {sensor.serial && <p className="text-muted-foreground">Serial: {sensor.serial}</p>}
          </div>
        </div>
        {gatewayId && (
          <div className="flex gap-2">
            <Badge variant={gatewayConnection.isAuthenticated ? 'default' : 'secondary'}>
              Gateway {gatewayConnection.isAuthenticated ? '🟢' : '🔴'}
            </Badge>
            <Badge variant={isSensorConnected ? 'default' : 'secondary'}>
              Sensor {isSensorConnected ? '🟢' : '🔴'}
            </Badge>
          </div>
        )}
      </div>

      {/* Historical Data with integrated reading controls */}
      {gatewayId && sensorSerial ? (
        <SensorHistoricalReadings
          gatewayId={gatewayId}
          sensorSerial={sensorSerial}
          onTakeReading={handleTakeReading}
          readingLoading={readingLoading}
          isGatewayAuthenticated={gatewayConnection.isAuthenticated}
          isSensorConnected={isSensorConnected}
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>No Gateway Connection</CardTitle>
          </CardHeader>
          <CardContent>
            <p>
              This sensor is not connected to any gateway. Please assign a gateway to view sensor
              readings.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
