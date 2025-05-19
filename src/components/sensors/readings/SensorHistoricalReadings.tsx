'use client';

import { useGatewayConnection } from '@/lib/services/gateway/use-gateway-connection';
import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Battery, Thermometer, Waves, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { formatDate } from '@/lib/utils';

interface SensorHistoricalReadingsProps {
  gatewayId: string;
  sensorSerial: number;
}

export function SensorHistoricalReadings({
  gatewayId,
  sensorSerial,
}: SensorHistoricalReadingsProps) {
  // Use the gateway connection hook to get state and methods
  const {
    isAuthenticated,
    getVibrationData,
    getTemperatureData,
    getBatteryData,
    fetchVibrationReadings,
    fetchTemperatureReadings,
    fetchBatteryReadings,
  } = useGatewayConnection(gatewayId);

  const [activeTab, setActiveTab] = useState<'battery' | 'temperature' | 'vibration'>('battery');
  const [isLoading, setIsLoading] = useState({
    battery: false,
    temperature: false,
    vibration: false,
  });

  // Get the historical readings data
  const batteryReadings = getBatteryData();
  const temperatureReadings = getTemperatureData();
  const vibrationReadings = getVibrationData();

  // Filter readings for this sensor
  const serialString = sensorSerial.toString();

  const filteredBatteryReadings = Object.values(batteryReadings)
    .filter(r => r.Serial === serialString)
    .sort((a, b) => new Date(b.Time).getTime() - new Date(a.Time).getTime());

  const filteredTemperatureReadings = Object.values(temperatureReadings)
    .filter(r => r.Serial === serialString)
    .sort((a, b) => new Date(b.Time).getTime() - new Date(a.Time).getTime());

  const filteredVibrationReadings = Object.values(vibrationReadings)
    .filter(r => r.Serial === serialString)
    .sort((a, b) => new Date(b.Time).getTime() - new Date(a.Time).getTime());

  // Date range state for filtering
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });

  // Handler for updating date range and refetching data
  const handleDateRangeUpdate = async () => {
    if (!isAuthenticated) {
      toast.error('Gateway not authenticated');
      return;
    }

    setIsLoading(prev => ({ ...prev, [activeTab]: true }));

    try {
      const options = {
        serials: [sensorSerial],
        start: dateRange.start,
        end: dateRange.end,
        max: 100,
      };

      let success = false;

      switch (activeTab) {
        case 'battery':
          success = await fetchBatteryReadings(options);
          break;
        case 'temperature':
          success = await fetchTemperatureReadings(options);
          break;
        case 'vibration':
          success = await fetchVibrationReadings(options);
          break;
      }

      if (success) {
        toast.success(`Historical ${activeTab} data updated`);
      } else {
        toast.error(`Failed to update historical ${activeTab} data`);
      }
    } catch (error) {
      toast.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(prev => ({ ...prev, [activeTab]: false }));
    }
  };

  // Use the utils formatDate function with type-safe fallback handling
  const formatReadingDate = (date: string): string => {
    return formatDate(date, date);
  };

  // Render the battery history table
  const renderBatteryHistory = () => {
    if (filteredBatteryReadings.length === 0) {
      return <div className="text-center py-8">No battery history available</div>;
    }

    return (
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 px-3">Date</th>
              <th className="text-left py-2 px-3">Battery %</th>
              <th className="text-left py-2 px-3">ID</th>
            </tr>
          </thead>
          <tbody>
            {filteredBatteryReadings.map(reading => (
              <tr key={reading.ID} className="border-b hover:bg-muted">
                <td className="py-2 px-3">{formatReadingDate(reading.Time)}</td>
                <td className="py-2 px-3">{reading.Batt}%</td>
                <td className="py-2 px-3">{reading.ID}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // Render the temperature history table
  const renderTemperatureHistory = () => {
    if (filteredTemperatureReadings.length === 0) {
      return <div className="text-center py-8">No temperature history available</div>;
    }

    return (
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 px-3">Date</th>
              <th className="text-left py-2 px-3">Temperature (°C)</th>
              <th className="text-left py-2 px-3">ID</th>
            </tr>
          </thead>
          <tbody>
            {filteredTemperatureReadings.map(reading => (
              <tr key={reading.ID} className="border-b hover:bg-muted">
                <td className="py-2 px-3">{formatReadingDate(reading.Time)}</td>
                <td className="py-2 px-3">{reading.Temp}°C</td>
                <td className="py-2 px-3">{reading.ID}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // Render the vibration history table
  const renderVibrationHistory = () => {
    if (filteredVibrationReadings.length === 0) {
      return <div className="text-center py-8">No vibration history available</div>;
    }

    return (
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 px-3">Date</th>
              <th className="text-left py-2 px-3">X</th>
              <th className="text-left py-2 px-3">Y</th>
              <th className="text-left py-2 px-3">Z</th>
              <th className="text-left py-2 px-3">ID</th>
            </tr>
          </thead>
          <tbody>
            {filteredVibrationReadings.map(reading => (
              <tr key={reading.ID} className="border-b hover:bg-muted">
                <td className="py-2 px-3">{formatReadingDate(reading.Time)}</td>
                <td className="py-2 px-3">{reading.X}</td>
                <td className="py-2 px-3">{reading.Y}</td>
                <td className="py-2 px-3">{reading.Z}</td>
                <td className="py-2 px-3">{reading.ID}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="text-lg">Historical Readings</CardTitle>
        <CardDescription>Historical data for sensor {sensorSerial}</CardDescription>
      </CardHeader>

      <CardContent>
        <div className="flex flex-col gap-4">
          {/* Date Range Selector */}
          <div className="flex flex-wrap items-end gap-4 mb-4 p-4 bg-muted/30 rounded-lg">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>Start Date</span>
              </label>
              <input
                type="date"
                value={dateRange.start}
                onChange={e => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                className="px-3 py-2 border rounded-md text-sm"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">End Date</label>
              <input
                type="date"
                value={dateRange.end}
                onChange={e => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                className="px-3 py-2 border rounded-md text-sm"
              />
            </div>

            <Button
              variant="default"
              size="sm"
              onClick={handleDateRangeUpdate}
              disabled={isLoading.battery || isLoading.temperature || isLoading.vibration}
            >
              {isLoading[activeTab] ? 'Loading...' : 'Update Data'}
            </Button>
          </div>

          {/* Tabs for different reading types */}
          <Tabs
            defaultValue="battery"
            onValueChange={value => setActiveTab(value as 'battery' | 'temperature' | 'vibration')}
          >
            <TabsList className="grid grid-cols-3 mb-4">
              <TabsTrigger value="battery" className="flex items-center gap-1">
                <Battery className="h-4 w-4" />
                <span>Battery</span>
              </TabsTrigger>
              <TabsTrigger value="temperature" className="flex items-center gap-1">
                <Thermometer className="h-4 w-4" />
                <span>Temperature</span>
              </TabsTrigger>
              <TabsTrigger value="vibration" className="flex items-center gap-1">
                <Waves className="h-4 w-4" />
                <span>Vibration</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="battery" className="mt-0">
              {renderBatteryHistory()}
            </TabsContent>

            <TabsContent value="temperature" className="mt-0">
              {renderTemperatureHistory()}
            </TabsContent>

            <TabsContent value="vibration" className="mt-0">
              {renderVibrationHistory()}
            </TabsContent>
          </Tabs>
        </div>
      </CardContent>

      <CardFooter className="text-sm text-muted-foreground">
        Showing historical readings from {formatReadingDate(dateRange.start)} to{' '}
        {formatReadingDate(dateRange.end)}
      </CardFooter>
    </Card>
  );
}
