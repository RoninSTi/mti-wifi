'use client';

import { useGatewayConnection } from '@/lib/services/gateway/use-gateway-connection';
import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Battery, Thermometer, Waves } from 'lucide-react';
import { toast } from 'sonner';

interface SensorReadingsPanelProps {
  gatewayId: string;
  sensorSerial: number;
}

export function SensorReadingsPanel({ gatewayId, sensorSerial }: SensorReadingsPanelProps) {
  // Use the gateway connection hook to get state and methods
  const {
    status,
    isAuthenticated,
    sensors,
    getVibrationData,
    getTemperatureData,
    getBatteryData,
    takeBatteryReading,
    takeTemperatureReading,
    takeVibrationReading,
    fetchConnectedSensors,
  } = useGatewayConnection(gatewayId);

  // Local state for tracking readings and loading state
  const [isLoading, setIsLoading] = useState({
    connection: false,
    battery: false,
    temperature: false,
    vibration: false,
  });

  // Check if sensor is connected (using GET_DYN_CONNECTED result)
  const isSensorConnected = sensors.some(
    s => s.Serial === sensorSerial && (s.Connected === true || s.Connected === 1)
  );

  // Get the sensor data if available
  const sensor = sensors.find(s => s.Serial === sensorSerial);

  // Get the latest readings
  const batteryReadings = getBatteryData();
  const temperatureReadings = getTemperatureData();
  const vibrationReadings = getVibrationData();

  // Extract latest readings for this sensor - using useMemo to avoid recalculation on every render
  // Extract readings for the current sensor with proper typing and safe handling
  const serialString = sensorSerial.toString();

  const batteryReading =
    Object.values(batteryReadings)
      .filter(r => r.Serial === serialString)
      .sort((a, b) => b.ID - a.ID)[0] || undefined;

  const temperatureReading =
    Object.values(temperatureReadings)
      .filter(r => r.Serial === serialString)
      .sort((a, b) => b.ID - a.ID)[0] || undefined;

  const vibrationReading =
    Object.values(vibrationReadings)
      .filter(r => r.Serial === serialString)
      .sort((a, b) => b.ID - a.ID)[0] || undefined;

  // Log when readings change
  useEffect(() => {
    console.log('Sensor readings updated:', {
      hasBatteryReading: !!batteryReading,
      hasTemperatureReading: !!temperatureReading,
      hasVibrationReading: !!vibrationReading,
      batteryReadingsCount: Object.keys(batteryReadings).length,
      sensorSerial,
      timestamp: new Date().toISOString(),
    });
  }, [
    // Primary data sources
    batteryReadings,
    temperatureReadings,
    vibrationReadings,

    // Filtered readings
    batteryReading,
    temperatureReading,
    vibrationReading,

    // Identifiers
    sensorSerial,
    serialString,
  ]);

  // Request connected sensors once when component mounts
  useEffect(() => {
    // Only run once on mount, if authenticated
    if (isAuthenticated) {
      // Use setTimeout to slightly delay the call to avoid a potential race condition
      const timer = setTimeout(() => {
        fetchConnectedSensors();
        console.log('Fetching initial connected sensors');
      }, 100);

      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handler for requesting connected sensors
  const handleCheckConnection = async () => {
    if (!isAuthenticated) {
      toast.error('Gateway not authenticated');
      return;
    }

    setIsLoading(prev => ({ ...prev, connection: true }));
    try {
      await fetchConnectedSensors();
      toast.success('Connection check sent');
    } catch (error) {
      toast.error('Failed to check connections');
    } finally {
      setIsLoading(prev => ({ ...prev, connection: false }));
    }
  };

  // Generic function for taking readings
  const handleTakeReading = async (type: 'battery' | 'temperature' | 'vibration') => {
    if (!isAuthenticated) {
      toast.error('Gateway not authenticated');
      return;
    }

    if (!isSensorConnected) {
      toast.error('Sensor is not connected');
      return;
    }

    setIsLoading(prev => ({ ...prev, [type]: true }));

    try {
      let success = false;

      switch (type) {
        case 'battery':
          success = await takeBatteryReading(sensorSerial);
          break;
        case 'temperature':
          success = await takeTemperatureReading(sensorSerial);
          break;
        case 'vibration':
          success = await takeVibrationReading(sensorSerial);
          break;
      }

      if (success) {
        toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} reading requested`);
      } else {
        toast.error(`Failed to request ${type} reading`);
      }
    } catch (error) {
      toast.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(prev => ({ ...prev, [type]: false }));
    }
  };

  // Format timestamp for display with better type safety
  const formatDate = (date: string | undefined): string => {
    if (!date) return 'Never';
    try {
      const parsedDate = new Date(date);
      // Check if the date is valid
      if (isNaN(parsedDate.getTime())) {
        return 'Invalid date';
      }
      return parsedDate.toLocaleString();
    } catch {
      return 'Error parsing date';
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <div>Sensor Readings</div>
          <div className="flex gap-2">
            <Badge variant={isAuthenticated ? 'default' : 'destructive'}>
              Gateway {isAuthenticated ? 'Connected' : status}
            </Badge>
            <Badge variant={isSensorConnected ? 'default' : 'destructive'}>
              Sensor {isSensorConnected ? 'Connected' : 'Disconnected'}
            </Badge>
          </div>
        </CardTitle>
        <CardDescription>
          Serial: {sensorSerial}
          {sensor && <span> | Model: {sensor.PartNum}</span>}
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Battery Reading */}
          <div className="p-4 border rounded-lg">
            <div className="font-medium mb-2 flex items-center gap-1">
              <Battery className="h-4 w-4" />
              <span>Battery</span>
            </div>
            <div className="text-2xl font-bold">
              {batteryReading ? `${batteryReading.Batt}%` : '--'}
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              Last updated: {batteryReading ? formatDate(batteryReading.Time) : 'Never'}
            </div>
          </div>

          {/* Temperature Reading */}
          <div className="p-4 border rounded-lg">
            <div className="font-medium mb-2 flex items-center gap-1">
              <Thermometer className="h-4 w-4" />
              <span>Temperature</span>
            </div>
            <div className="text-2xl font-bold">
              {temperatureReading ? `${temperatureReading.Temp}°C` : '--'}
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              Last updated: {temperatureReading ? formatDate(temperatureReading.Time) : 'Never'}
            </div>
          </div>

          {/* Vibration Reading */}
          <div className="p-4 border rounded-lg">
            <div className="font-medium mb-2 flex items-center gap-1">
              <Waves className="h-4 w-4" />
              <span>Vibration</span>
            </div>
            <div className="text-sm mt-2">
              {vibrationReading ? (
                <div className="grid grid-cols-3 gap-1">
                  <div className="font-medium">X:</div>
                  <div className="col-span-2">{vibrationReading.X}</div>
                  <div className="font-medium">Y:</div>
                  <div className="col-span-2">{vibrationReading.Y}</div>
                  <div className="font-medium">Z:</div>
                  <div className="col-span-2">{vibrationReading.Z}</div>
                </div>
              ) : (
                '--'
              )}
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              Last updated: {vibrationReading ? formatDate(vibrationReading.Time) : 'Never'}
            </div>
          </div>
        </div>
      </CardContent>

      <CardFooter>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCheckConnection}
            disabled={!isAuthenticated || isLoading.connection}
          >
            {isLoading.connection ? 'Checking...' : 'Check Connection'}
          </Button>

          <Button
            size="sm"
            onClick={() => handleTakeReading('battery')}
            disabled={!isAuthenticated || !isSensorConnected || isLoading.battery}
          >
            {isLoading.battery ? 'Requesting...' : 'Battery Reading'}
          </Button>

          <Button
            size="sm"
            onClick={() => handleTakeReading('temperature')}
            disabled={!isAuthenticated || !isSensorConnected || isLoading.temperature}
          >
            {isLoading.temperature ? 'Requesting...' : 'Temperature Reading'}
          </Button>

          <Button
            size="sm"
            onClick={() => handleTakeReading('vibration')}
            disabled={!isAuthenticated || !isSensorConnected || isLoading.vibration}
          >
            {isLoading.vibration ? 'Requesting...' : 'Vibration Reading'}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
