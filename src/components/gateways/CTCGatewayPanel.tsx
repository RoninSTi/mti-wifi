'use client';

/**
 * CTC Gateway Panel
 *
 * A component that connects to a CTC gateway and displays sensor data
 */
import React, { useState } from 'react';
import {
  useCTCGatewayConnection,
  useCTCConnectedDynamicSensors,
  useCTCDynamicReadings,
} from '@/lib/gateway';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff, Loader2, Thermometer, Battery, Activity } from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface CTCGatewayPanelProps {
  gatewayId: string;
  autoConnect?: boolean;
}

/**
 * Panel for controlling and displaying CTC gateway data
 */
export function CTCGatewayPanel({ gatewayId, autoConnect = false }: CTCGatewayPanelProps) {
  const [selectedSensorId, setSelectedSensorId] = useState<number | null>(null);

  // Use CTC hooks
  const { state, isConnected, isAuthenticated, isConnecting, connect, disconnect } =
    useCTCGatewayConnection(gatewayId, autoConnect);

  // Get connected sensors
  const {
    data: sensors,
    isLoading: isLoadingSensors,
    refetch: refetchSensors,
  } = useCTCConnectedDynamicSensors(gatewayId);

  // Real-time readings
  const {
    reading,
    temperature,
    battery,
    isReading,
    triggerReading,
    triggerTemperatureReading,
    triggerBatteryReading,
  } = useCTCDynamicReadings(gatewayId);

  // Handle sensor selection
  const handleSelectSensor = (serial: number) => {
    setSelectedSensorId(serial);
  };

  // Get status badge color based on connection state
  const getStatusColor = () => {
    switch (state) {
      case 'authenticated':
        return 'bg-green-500';
      case 'connected':
        return 'bg-blue-500';
      case 'connecting':
      case 'authenticating':
      case 'reconnecting':
        return 'bg-yellow-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  // Handle reading trigger
  const handleTriggerReading = async () => {
    if (!selectedSensorId) {
      toast.error('Please select a sensor first');
      return;
    }

    try {
      await triggerReading(selectedSensorId);
      toast.success('Reading triggered successfully');
    } catch {
      // Error is already handled in the hook with toast notifications
    }
  };

  // Handle temperature reading trigger
  const handleTriggerTemperatureReading = async () => {
    if (!selectedSensorId) {
      toast.error('Please select a sensor first');
      return;
    }

    try {
      await triggerTemperatureReading(selectedSensorId);
      toast.success('Temperature reading triggered successfully');
    } catch {
      // Error is already handled in the hook with toast notifications
    }
  };

  // Handle battery reading trigger
  const handleTriggerBatteryReading = async () => {
    if (!selectedSensorId) {
      toast.error('Please select a sensor first');
      return;
    }

    try {
      await triggerBatteryReading(selectedSensorId);
      toast.success('Battery reading triggered successfully');
    } catch {
      // Error is already handled in the hook with toast notifications
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>CTC Gateway</CardTitle>
          <Badge className={getStatusColor()}>{state}</Badge>
        </div>
        <CardDescription>Connect to gateway and manage sensors</CardDescription>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="sensors" className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="sensors" className="flex-1">
              Sensors
            </TabsTrigger>
            <TabsTrigger value="readings" className="flex-1">
              Readings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="sensors" className="space-y-4">
            {/* Sensors list */}
            <div className="rounded-md border mt-4">
              <div className="bg-muted/50 p-3 font-medium flex items-center justify-between">
                <span>Connected Sensors</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetchSensors()}
                  disabled={!isAuthenticated}
                >
                  Refresh
                </Button>
              </div>

              {isLoadingSensors ? (
                <div className="p-4 space-y-3">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : sensors && sensors.length > 0 ? (
                <div className="divide-y">
                  {sensors.map(sensor => (
                    <div
                      key={sensor.Serial}
                      className={`p-3 flex items-center justify-between hover:bg-muted/50 cursor-pointer transition-colors ${
                        sensor.Serial === selectedSensorId ? 'bg-muted/70' : ''
                      }`}
                      onClick={() => handleSelectSensor(sensor.Serial)}
                    >
                      <div>
                        <div className="font-medium">
                          {sensor.Name || `Sensor ${sensor.Serial}`}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Serial: {sensor.Serial}
                          {sensor.FirmwareVersion && ` • Firmware: ${sensor.FirmwareVersion}`}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {sensor.BatteryLevel !== undefined && (
                          <div className="flex items-center gap-1 text-sm">
                            <Battery className="h-4 w-4" />
                            {sensor.BatteryLevel}%
                          </div>
                        )}
                        {sensor.TempC !== undefined && (
                          <div className="flex items-center gap-1 text-sm">
                            <Thermometer className="h-4 w-4" />
                            {sensor.TempC.toFixed(1)}°C
                          </div>
                        )}
                        <Badge
                          variant={sensor.Connected ? 'secondary' : 'outline'}
                          className="ml-2"
                        >
                          {sensor.Connected ? 'Connected' : 'Disconnected'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-muted-foreground">
                  {isAuthenticated ? 'No connected sensors found.' : 'Connect to view sensors.'}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="readings" className="space-y-4">
            {/* Reading controls */}
            <div className="rounded-md border p-4 space-y-4">
              <h3 className="font-medium">Sensor Actions</h3>

              {selectedSensorId ? (
                <div className="flex flex-wrap gap-3">
                  <Button
                    onClick={handleTriggerReading}
                    disabled={!isAuthenticated || isReading}
                    className="flex-1"
                  >
                    {isReading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Activity className="mr-2 h-4 w-4" />
                    )}
                    {isReading ? 'Reading...' : 'Take Reading'}
                  </Button>

                  <Button
                    onClick={handleTriggerTemperatureReading}
                    disabled={!isAuthenticated}
                    variant="outline"
                    className="flex-1"
                  >
                    <Thermometer className="mr-2 h-4 w-4" />
                    Temperature
                  </Button>

                  <Button
                    onClick={handleTriggerBatteryReading}
                    disabled={!isAuthenticated}
                    variant="outline"
                    className="flex-1"
                  >
                    <Battery className="mr-2 h-4 w-4" />
                    Battery
                  </Button>
                </div>
              ) : (
                <div className="p-4 text-center text-muted-foreground">
                  Select a sensor to perform actions.
                </div>
              )}
            </div>

            {/* Latest readings */}
            <div className="rounded-md border p-4 space-y-4">
              <h3 className="font-medium">Latest Readings</h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Vibration reading */}
                <Card className="bg-muted/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Vibration</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {reading ? (
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>X-RMS:</span>
                          <span>{reading.XRms?.toFixed(3) || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Y-RMS:</span>
                          <span>{reading.YRms?.toFixed(3) || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Z-RMS:</span>
                          <span>{reading.ZRms?.toFixed(3) || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Time:</span>
                          <span>{new Date(reading.Timestamp).toLocaleTimeString()}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center text-muted-foreground py-4">
                        No vibration data
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Temperature reading */}
                <Card className="bg-muted/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Temperature</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {temperature ? (
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Celsius:</span>
                          <span>{temperature.TempC.toFixed(1)}°C</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Fahrenheit:</span>
                          <span>{temperature.TempF.toFixed(1)}°F</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Time:</span>
                          <span>{new Date(temperature.Timestamp).toLocaleTimeString()}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center text-muted-foreground py-4">
                        No temperature data
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Battery reading */}
                <Card className="bg-muted/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Battery</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {battery ? (
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Level:</span>
                          <span>{battery.Level}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Time:</span>
                          <span>{new Date(battery.Timestamp).toLocaleTimeString()}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center text-muted-foreground py-4">No battery data</div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>

      <CardFooter className="flex justify-between gap-2">
        {/* Connect/Disconnect button */}
        {isConnected ? (
          <Button variant="outline" onClick={disconnect} className="flex-1">
            <WifiOff className="mr-2 h-4 w-4" />
            Disconnect
          </Button>
        ) : (
          <Button onClick={connect} disabled={isConnecting} className="flex-1">
            {isConnecting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Wifi className="mr-2 h-4 w-4" />
            )}
            {isConnecting ? 'Connecting...' : 'Connect'}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
