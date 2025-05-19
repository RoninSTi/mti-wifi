'use client';

import { BatteryReading, TemperatureReading, VibrationReading } from '@/lib/services/gateway/types';
import { useGatewayConnection } from '@/lib/services/gateway/use-gateway-connection';
import { useState, useEffect } from 'react';
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

interface SensorReadingsPanelProps {
  gatewayId: string;
  sensorSerial: number;
}

export function SensorReadingsPanel({ gatewayId, sensorSerial }: SensorReadingsPanelProps) {
  const {
    sensors,
    getVibrationData,
    getTemperatureData,
    getBatteryData,
    takeVibrationReading,
    takeTemperatureReading,
    takeBatteryReading,
    isSensorConnected,
    fetchConnectedSensors,
  } = useGatewayConnection(gatewayId);

  // Local state to track readings
  const [batteryReading, setBatteryReading] = useState<BatteryReading | null>(null);
  const [temperatureReading, setTemperatureReading] = useState<TemperatureReading | null>(null);
  const [vibrationReading, setVibrationReading] = useState<VibrationReading | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState({
    battery: false,
    temperature: false,
    vibration: false,
    connection: false,
  });

  // Get the sensor data if available
  const sensor = sensors.find(s => s.Serial === sensorSerial);

  // Get latest readings
  const batteryReadings = getBatteryData();
  const temperatureReadings = getTemperatureData();
  const vibrationReadings = getVibrationData();

  // Check if sensor is connected
  useEffect(() => {
    const connected = isSensorConnected(sensorSerial);
    setIsConnected(connected);
  }, [isSensorConnected, sensorSerial, sensors]);

  // Update readings when they change
  useEffect(() => {
    // Get the most recent readings (since they're keyed by ID)
    const getBatteryReading = () => {
      const readings = Object.values(batteryReadings);
      if (readings.length === 0) return null;

      // Filter by this sensor's serial and sort by ID (most recent first)
      const sensorReadings = readings
        .filter(reading => reading.Serial === sensorSerial.toString())
        .sort((a, b) => b.ID - a.ID);

      return sensorReadings[0] || null;
    };

    const getTemperatureReading = () => {
      const readings = Object.values(temperatureReadings);
      if (readings.length === 0) return null;

      // Filter by this sensor's serial and sort by ID (most recent first)
      const sensorReadings = readings
        .filter(reading => reading.Serial === sensorSerial.toString())
        .sort((a, b) => b.ID - a.ID);

      return sensorReadings[0] || null;
    };

    const getVibrationReading = () => {
      const readings = Object.values(vibrationReadings);
      if (readings.length === 0) return null;

      // Filter by this sensor's serial and sort by ID (most recent first)
      const sensorReadings = readings
        .filter(reading => reading.Serial === sensorSerial.toString())
        .sort((a, b) => b.ID - a.ID);

      return sensorReadings[0] || null;
    };

    setBatteryReading(getBatteryReading());
    setTemperatureReading(getTemperatureReading());
    setVibrationReading(getVibrationReading());
  }, [batteryReadings, temperatureReadings, vibrationReadings, sensorSerial]);

  // Handler to check sensor connection
  const handleCheckConnection = async () => {
    setIsLoading(prev => ({ ...prev, connection: true }));
    try {
      const result = await fetchConnectedSensors();
      if (result) {
        console.log('Checking sensor connection status...');
      } else {
        console.error('Could not send connection check request');
      }
    } catch (error) {
      console.error(
        'Connection check error:',
        error instanceof Error ? error.message : 'Unknown error'
      );
    } finally {
      setIsLoading(prev => ({ ...prev, connection: false }));
    }
  };

  // Handler to fetch a battery reading
  const handleFetchBatteryReading = async () => {
    if (!isConnected) {
      console.error('Cannot request reading from a disconnected sensor');
      return;
    }

    setIsLoading(prev => ({ ...prev, battery: true }));
    try {
      const result = await takeBatteryReading(sensorSerial);
      if (result) {
        console.log('Battery reading request sent');
      } else {
        console.error('Could not send battery reading request');
      }
    } catch (error) {
      console.error(
        'Battery reading error:',
        error instanceof Error ? error.message : 'Unknown error'
      );
    } finally {
      setIsLoading(prev => ({ ...prev, battery: false }));
    }
  };

  // Handler to fetch a temperature reading
  const handleFetchTemperatureReading = async () => {
    if (!isConnected) {
      console.error('Cannot request reading from a disconnected sensor');
      return;
    }

    setIsLoading(prev => ({ ...prev, temperature: true }));
    try {
      const result = await takeTemperatureReading(sensorSerial);
      if (result) {
        console.log('Temperature reading request sent');
      } else {
        console.error('Could not send temperature reading request');
      }
    } catch (error) {
      console.error(
        'Temperature reading error:',
        error instanceof Error ? error.message : 'Unknown error'
      );
    } finally {
      setIsLoading(prev => ({ ...prev, temperature: false }));
    }
  };

  // Handler to fetch a vibration reading
  const handleFetchVibrationReading = async () => {
    if (!isConnected) {
      console.error('Cannot request reading from a disconnected sensor');
      return;
    }

    setIsLoading(prev => ({ ...prev, vibration: true }));
    try {
      const result = await takeVibrationReading(sensorSerial);
      if (result) {
        console.log('Vibration reading request sent');
      } else {
        console.error('Could not send vibration reading request');
      }
    } catch (error) {
      console.error(
        'Vibration reading error:',
        error instanceof Error ? error.message : 'Unknown error'
      );
    } finally {
      setIsLoading(prev => ({ ...prev, vibration: false }));
    }
  };

  // Format a timestamp as a readable date
  const formatTimestamp = (timestamp: string) => {
    if (!timestamp) return 'N/A';
    try {
      return new Date(timestamp).toLocaleString();
    } catch {
      return timestamp;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Sensor Readings
          <Badge variant={isConnected ? 'default' : 'destructive'}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </Badge>
        </CardTitle>
        <CardDescription>
          Serial: {sensorSerial}
          {sensor && <span> | Model: {sensor.PartNum}</span>}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Battery Reading */}
          <div className="p-4 border rounded-lg">
            <div className="font-semibold mb-2">Battery</div>
            <div className="text-2xl font-bold">
              {batteryReading ? `${batteryReading.Batt}%` : 'N/A'}
            </div>
            <div className="text-sm text-gray-500">
              {batteryReading ? formatTimestamp(batteryReading.Time) : 'No reading available'}
            </div>
          </div>

          {/* Temperature Reading */}
          <div className="p-4 border rounded-lg">
            <div className="font-semibold mb-2">Temperature</div>
            <div className="text-2xl font-bold">
              {temperatureReading ? `${temperatureReading.Temp}°C` : 'N/A'}
            </div>
            <div className="text-sm text-gray-500">
              {temperatureReading
                ? formatTimestamp(temperatureReading.Time)
                : 'No reading available'}
            </div>
          </div>

          {/* Vibration Reading */}
          <div className="p-4 border rounded-lg">
            <div className="font-semibold mb-2">Vibration</div>
            <div className="text-xs">
              {vibrationReading ? (
                <>
                  <div>X: {vibrationReading.X}</div>
                  <div>Y: {vibrationReading.Y}</div>
                  <div>Z: {vibrationReading.Z}</div>
                </>
              ) : (
                'N/A'
              )}
            </div>
            <div className="text-sm text-gray-500">
              {vibrationReading ? formatTimestamp(vibrationReading.Time) : 'No reading available'}
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex flex-wrap justify-between gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleCheckConnection}
          disabled={isLoading.connection}
        >
          {isLoading.connection ? 'Checking...' : 'Check Connection'}
        </Button>
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={handleFetchBatteryReading}
            disabled={isLoading.battery || !isConnected}
          >
            {isLoading.battery ? 'Requesting...' : 'Battery Reading'}
          </Button>
          <Button
            size="sm"
            onClick={handleFetchTemperatureReading}
            disabled={isLoading.temperature || !isConnected}
          >
            {isLoading.temperature ? 'Requesting...' : 'Temperature Reading'}
          </Button>
          <Button
            size="sm"
            onClick={handleFetchVibrationReading}
            disabled={isLoading.vibration || !isConnected}
          >
            {isLoading.vibration ? 'Requesting...' : 'Vibration Reading'}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
