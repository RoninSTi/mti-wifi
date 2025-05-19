'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Thermometer, Zap, Waves, History } from 'lucide-react';
import { useSensor } from '@/hooks/useSensor';
import { SensorRealTimeReadings, SensorHistoricalReadings } from '@/components/sensors/readings';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useTypedParams } from '@/lib/utils';
import { DetailPageBreadcrumbs } from '@/components/shared';
import { Badge } from '@/components/ui/badge';
import { getGatewayId, getSensorSerial } from '@/lib/utils/sensor-utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function SensorReadingsPage() {
  const router = useRouter();

  // Type-safe params
  type SensorDetailParams = {
    id: string; // Organization ID
    locationId: string; // Location ID
    areaId: string; // Area ID
    equipmentId: string; // Equipment ID
    sensorId: string; // Sensor ID
  };

  const {
    id: organizationId,
    locationId,
    areaId,
    equipmentId,
    sensorId,
  } = useTypedParams<SensorDetailParams>();

  // Fetch sensor details
  const { data, isLoading, isError, error } = useSensor(sensorId);

  // Handle back navigation
  const handleBack = () => {
    router.push(
      `/organizations/${organizationId}/locations/${locationId}/areas/${areaId}/equipment/${equipmentId}`
    );
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
  if (isError || !data?.data) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to load sensor details';
    return (
      <div className="container py-10 mx-auto">
        <div className="flex items-center gap-2 mb-6">
          <h1 className="text-2xl font-bold">Sensor not found</h1>
        </div>
        <div className="bg-destructive/10 text-destructive rounded-lg p-4 mt-6">
          <p>{errorMessage}</p>
          <Button className="mt-4" onClick={handleBack}>
            Return to Equipment
          </Button>
        </div>
      </div>
    );
  }

  const sensor = data.data;
  // Use utility functions to safely extract values
  const gatewayId = getGatewayId(sensor);
  const sensorSerial = getSensorSerial(sensor);

  return (
    <div className="container py-10 mx-auto">
      {/* Breadcrumb navigation */}
      <DetailPageBreadcrumbs className="mb-6" />

      {/* Header with title and actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{sensor.name}</h1>
            <p className="text-muted-foreground">
              Sensor Readings
              {sensor.serial && <span> | Serial: {sensor.serial}</span>}
            </p>
          </div>
        </div>
        <div>
          <Badge variant={sensor.connected ? 'default' : 'outline'}>
            {sensor.connected ? 'Connected' : 'Disconnected'}
          </Badge>
        </div>
      </div>

      {/* Add a tabbed interface for real-time vs historical data */}
      {gatewayId ? (
        <Tabs defaultValue="real-time" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="real-time" className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              <span>Real-time Readings</span>
            </TabsTrigger>
            <TabsTrigger value="historical" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              <span>Historical Data</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="real-time" className="mt-0">
            <SensorRealTimeReadings gatewayId={gatewayId} sensorSerial={sensorSerial} />
          </TabsContent>

          <TabsContent value="historical" className="mt-0">
            <SensorHistoricalReadings gatewayId={gatewayId} sensorSerial={sensorSerial} />
          </TabsContent>
        </Tabs>
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

      {/* Reading type information panels */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Temperature</CardTitle>
            <Thermometer className="h-5 w-5 text-orange-500" />
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              View temperature history and trends for this sensor.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Battery</CardTitle>
            <Zap className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Monitor battery levels and power consumption over time.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Vibration</CardTitle>
            <Waves className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Analyze vibration data and identify potential issues.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
