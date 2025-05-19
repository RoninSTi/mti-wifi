'use client';

import { useGatewayConnection } from '@/lib/services/gateway/use-gateway-connection';
import React, { useState, useEffect, useCallback } from 'react';
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
import { Battery, Thermometer, Waves, Calendar, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { formatDate } from '@/lib/utils';
import { z } from 'zod';

// Zod schema for props validation
const sensorHistoricalReadingsPropsSchema = z.object({
  gatewayId: z.string(),
  sensorSerial: z.number().int(),
});

// Type inference from Zod schema
type SensorHistoricalReadingsProps = z.infer<typeof sensorHistoricalReadingsPropsSchema>;

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

  // Debug logs to see what data is received
  console.log('Historical readings component data:', {
    gatewayId,
    sensorSerial,
    serialString: sensorSerial.toString(),
    batteryReadingsKeys: Object.keys(batteryReadings),
    batteryReadingsCount: Object.keys(batteryReadings).length,
    batteryReadings: batteryReadings,
  });

  // Date range state for filtering
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });

  // Define a function to refresh all data types
  const refreshAllData = useCallback(async () => {
    if (!isAuthenticated) {
      toast.error('Gateway not authenticated');
      return;
    }

    setIsLoading({ battery: true, temperature: true, vibration: true });

    try {
      const options = {
        serials: [sensorSerial],
        start: dateRange.start,
        end: dateRange.end,
        max: 100,
      };

      console.log('Refreshing all historical data with options:', options);

      // Load all types of data in parallel
      const [batteryResult, tempResult, vibResult] = await Promise.all([
        fetchBatteryReadings(options),
        fetchTemperatureReadings(options),
        fetchVibrationReadings(options),
      ]);

      console.log('Refresh results:', {
        battery: batteryResult,
        temperature: tempResult,
        vibration: vibResult,
      });

      if (batteryResult && tempResult && vibResult) {
        toast.success('All historical data refreshed');
      } else {
        toast.error('Some data failed to refresh');
      }
    } catch (error) {
      console.error('Error refreshing data:', error);
      toast.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading({ battery: false, temperature: false, vibration: false });
    }
  }, [
    isAuthenticated,
    sensorSerial,
    dateRange.start,
    dateRange.end,
    fetchBatteryReadings,
    fetchTemperatureReadings,
    fetchVibrationReadings,
  ]);

  // Load historical data when component mounts
  useEffect(() => {
    if (isAuthenticated) {
      console.log('Component mounted - loading initial historical data for sensor:', sensorSerial);
      refreshAllData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, gatewayId, sensorSerial]);

  // Filter readings for this sensor
  const serialString = sensorSerial.toString();

  const filteredBatteryReadings = Object.values(batteryReadings)
    .filter(r => {
      // Normalize both serials to strings for comparison
      const readingSerial = String(r.Serial);
      const targetSerial = String(serialString);
      console.log(
        'Comparing reading serial:',
        readingSerial,
        'with target:',
        targetSerial,
        'match:',
        readingSerial === targetSerial
      );
      return readingSerial === targetSerial;
    })
    .sort((a, b) => new Date(b.Time).getTime() - new Date(a.Time).getTime());

  console.log('Filtered battery readings:', filteredBatteryReadings);

  const filteredTemperatureReadings = Object.values(temperatureReadings)
    .filter(r => {
      // Normalize both serials to strings for comparison
      const readingSerial = String(r.Serial);
      const targetSerial = String(serialString);
      return readingSerial === targetSerial;
    })
    .sort((a, b) => new Date(b.Time).getTime() - new Date(a.Time).getTime());

  const filteredVibrationReadings = Object.values(vibrationReadings)
    .filter(r => {
      // Normalize both serials to strings for comparison
      const readingSerial = String(r.Serial);
      const targetSerial = String(serialString);
      return readingSerial === targetSerial;
    })
    .sort((a, b) => new Date(b.Time).getTime() - new Date(a.Time).getTime());

  // Handler for updating date range and refetching data
  const handleDateRangeUpdate = async () => {
    if (!isAuthenticated) {
      toast.error('Gateway not authenticated');
      return;
    }

    // Set loading state for the active tab
    setIsLoading(prev => ({ ...prev, [activeTab]: true }));

    try {
      const options = {
        serials: [sensorSerial],
        start: dateRange.start,
        end: dateRange.end,
        max: 100,
      };

      console.log(`Requesting historical ${activeTab} data with options:`, {
        ...options,
        serialString: String(sensorSerial), // Log the string version to verify format
      });

      let success = false;

      switch (activeTab) {
        case 'battery':
          success = await fetchBatteryReadings(options);
          console.log('Battery fetch result:', success);
          break;
        case 'temperature':
          success = await fetchTemperatureReadings(options);
          console.log('Temperature fetch result:', success);
          break;
        case 'vibration':
          success = await fetchVibrationReadings(options);
          console.log('Vibration fetch result:', success);
          break;
      }

      if (success) {
        // Explicitly check data after retrieval
        if (activeTab === 'battery') {
          const readings = getBatteryData();
          const readingsCount = Object.keys(readings).length;
          console.log('Battery readings after update:', {
            count: readingsCount,
            readings,
          });

          // Force a re-fetch of the data if needed
          if (readingsCount > 0) {
            // The readings are in the context, just need to make sure the component re-renders
            // This is handled by React because getBatteryData is part of the rendering process
          }
        }

        toast.success(`Historical ${activeTab} data updated`);
      } else {
        toast.error(`Failed to update historical ${activeTab} data`);
      }
    } catch (error) {
      console.error(`Error fetching ${activeTab} data:`, error);
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
      <div className="space-y-6">
        {/* Battery level visual indicator */}
        <div className="p-4 border rounded-lg bg-muted/20">
          <h3 className="text-sm font-medium mb-4">Battery Level Timeline</h3>
          <div className="grid grid-cols-1 gap-2">
            {filteredBatteryReadings.slice(0, 5).map(reading => (
              <div key={reading.ID} className="flex items-center gap-3">
                <div className="text-xs w-36 text-muted-foreground">
                  {formatReadingDate(reading.Time)}
                </div>
                <div className="flex-1 h-5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 transition-all"
                    style={{ width: `${reading.Batt}%` }}
                  ></div>
                </div>
                <div className="text-sm font-medium w-12 text-right">{reading.Batt}%</div>
              </div>
            ))}
          </div>
        </div>

        {/* Battery history table */}
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
                  <td className="py-2 px-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-16 h-3 bg-muted rounded-full overflow-hidden"
                        title={`${reading.Batt}%`}
                      >
                        <div
                          className="h-full bg-green-500"
                          style={{ width: `${reading.Batt}%` }}
                        ></div>
                      </div>
                      {reading.Batt}%
                    </div>
                  </td>
                  <td className="py-2 px-3">{reading.ID}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // Render the temperature history table
  const renderTemperatureHistory = () => {
    if (filteredTemperatureReadings.length === 0) {
      return <div className="text-center py-8">No temperature history available</div>;
    }

    // Find min and max temperature for scale
    let minTemp = Math.min(...filteredTemperatureReadings.map(r => r.Temp));
    let maxTemp = Math.max(...filteredTemperatureReadings.map(r => r.Temp));

    // Ensure there's at least a 10-degree range for visualization
    if (maxTemp - minTemp < 10) {
      minTemp = Math.max(0, minTemp - 5);
      maxTemp = maxTemp + 5;
    }

    // Temperature color function
    const getTempColor = (temp: number) => {
      // Blue (cold) to red (hot) gradient
      if (temp < 10) return 'bg-blue-500';
      if (temp < 20) return 'bg-blue-300';
      if (temp < 30) return 'bg-green-400';
      if (temp < 40) return 'bg-yellow-400';
      return 'bg-orange-500';
    };

    // Calculate percentage along the scale
    const getTempPercentage = (temp: number) => {
      return Math.min(100, Math.max(0, ((temp - minTemp) / (maxTemp - minTemp)) * 100));
    };

    return (
      <div className="space-y-6">
        {/* Temperature timeline */}
        <div className="p-4 border rounded-lg bg-muted/20">
          <h3 className="text-sm font-medium mb-4">Temperature Timeline</h3>
          <div className="grid grid-cols-1 gap-2">
            {filteredTemperatureReadings.slice(0, 5).map(reading => (
              <div key={reading.ID} className="flex items-center gap-3">
                <div className="text-xs w-36 text-muted-foreground">
                  {formatReadingDate(reading.Time)}
                </div>
                <div className="flex-1 h-5 bg-muted rounded-full overflow-hidden relative">
                  <div
                    className={`h-full ${getTempColor(reading.Temp)} transition-all`}
                    style={{ width: `${getTempPercentage(reading.Temp)}%` }}
                  ></div>
                </div>
                <div className="text-sm font-medium w-12 text-right">{reading.Temp}°C</div>
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-xs text-muted-foreground">
            <span>{minTemp}°C</span>
            <span>{maxTemp}°C</span>
          </div>
        </div>

        {/* Temperature history table */}
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
                  <td className="py-2 px-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-3 bg-muted rounded-full overflow-hidden relative">
                        <div
                          className={`h-full ${getTempColor(reading.Temp)}`}
                          style={{ width: `${getTempPercentage(reading.Temp)}%` }}
                        ></div>
                      </div>
                      {reading.Temp}°C
                    </div>
                  </td>
                  <td className="py-2 px-3">{reading.ID}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // Render the vibration history table
  const renderVibrationHistory = () => {
    if (filteredVibrationReadings.length === 0) {
      return <div className="text-center py-8">No vibration history available</div>;
    }

    // Parse vibration values for visualization
    const parseVibrationValue = (value: string) => {
      try {
        // Remove any units and return a number
        const numValue = parseFloat(value.replace(/[^0-9.-]+/g, ''));
        return isNaN(numValue) ? 0 : numValue;
      } catch {
        return 0;
      }
    };

    // Calculate max vibration value for relative scaling
    const vibrationValues = filteredVibrationReadings.flatMap(r => [
      parseVibrationValue(r.X),
      parseVibrationValue(r.Y),
      parseVibrationValue(r.Z),
    ]);

    const maxVibration = Math.max(...vibrationValues, 1); // Ensure non-zero

    // Get percentage of the max value for visualization
    const getVibrationPercentage = (value: string) => {
      const numValue = parseVibrationValue(value);
      return Math.min(100, Math.max(0, (numValue / maxVibration) * 100));
    };

    return (
      <div className="space-y-6">
        {/* Vibration timeline */}
        <div className="p-4 border rounded-lg bg-muted/20">
          <h3 className="text-sm font-medium mb-4">Recent Vibration Readings</h3>
          {filteredVibrationReadings.slice(0, 3).map(reading => (
            <div key={reading.ID} className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs text-muted-foreground">
                  {formatReadingDate(reading.Time)}
                </div>
                <div className="text-xs font-medium">ID: {reading.ID}</div>
              </div>

              <div className="grid grid-cols-1 gap-2">
                <div className="flex items-center gap-3">
                  <div className="text-sm font-medium w-6">X:</div>
                  <div className="flex-1 h-4 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500"
                      style={{ width: `${getVibrationPercentage(reading.X)}%` }}
                    ></div>
                  </div>
                  <div className="text-sm w-16 text-right">{reading.X}</div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-sm font-medium w-6">Y:</div>
                  <div className="flex-1 h-4 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500"
                      style={{ width: `${getVibrationPercentage(reading.Y)}%` }}
                    ></div>
                  </div>
                  <div className="text-sm w-16 text-right">{reading.Y}</div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-sm font-medium w-6">Z:</div>
                  <div className="flex-1 h-4 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-purple-500"
                      style={{ width: `${getVibrationPercentage(reading.Z)}%` }}
                    ></div>
                  </div>
                  <div className="text-sm w-16 text-right">{reading.Z}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Vibration history table */}
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
      </div>
    );
  };

  return (
    <Card className="mt-4">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Historical Readings</CardTitle>
            <CardDescription>Historical data for sensor {sensorSerial}</CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-1"
            onClick={refreshAllData}
            disabled={isLoading.battery || isLoading.temperature || isLoading.vibration}
          >
            <RefreshCw
              className={`h-4 w-4 mr-1 ${isLoading.battery || isLoading.temperature || isLoading.vibration ? 'animate-spin' : ''}`}
            />
            Refresh All
          </Button>
        </div>
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
