'use client';

import { useGatewayConnection } from '@/lib/services/gateway/use-gateway-connection';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Battery, Thermometer, Waves, Calendar, Sigma, Zap, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { formatDate } from '@/lib/utils';
import { DetailedVibrationReading } from '@/lib/services/gateway/types-vibration';
import {
  VibrationWaveform,
  FFTResult,
  integrateWaveform,
  differentiateWaveform,
  performFFT,
  vibrationArrayToWaveform,
} from '@/lib/utils/vibration-processing';
import { z } from 'zod';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

// Zod schema for props validation
const _sensorHistoricalReadingsPropsSchema = z.object({
  gatewayId: z.string(),
  sensorSerial: z.number().int(),
  onTakeReading: z
    .function()
    .args(z.enum(['battery', 'temperature', 'vibration']))
    .returns(z.promise(z.void()))
    .optional(),
  readingLoading: z
    .object({
      battery: z.boolean(),
      temperature: z.boolean(),
      vibration: z.boolean(),
    })
    .optional(),
  isGatewayAuthenticated: z.boolean().optional(),
  isSensorConnected: z.boolean().optional(),
  initialLoad: z.boolean().optional(),
});

// Type inference from Zod schema
type SensorHistoricalReadingsProps = z.infer<typeof _sensorHistoricalReadingsPropsSchema>;

export function SensorHistoricalReadings({
  gatewayId,
  sensorSerial,
  onTakeReading,
  readingLoading,
  isGatewayAuthenticated,
  initialLoad,
}: SensorHistoricalReadingsProps) {
  // Use the gateway connection hook to get state and methods
  const {
    isAuthenticated,
    getVibrationData,
    getDetailedVibrationData,
    getTemperatureData,
    getBatteryData,
    fetchVibrationReadings,
    fetchTemperatureReadings,
    fetchBatteryReadings,
  } = useGatewayConnection(gatewayId);

  const [activeTab, setActiveTab] = useState<'battery' | 'temperature' | 'vibration'>('vibration');
  const [selectedVibrationReading, setSelectedVibrationReading] =
    useState<DetailedVibrationReading | null>(null);
  const [selectedAxis, setSelectedAxis] = useState<'x' | 'y' | 'z'>('x');
  const [isLoading, setIsLoading] = useState({
    battery: false,
    temperature: false,
    vibration: false,
  });

  // State for processed waveforms
  const [currentWaveform, setCurrentWaveform] = useState<VibrationWaveform | null>(null);
  const [processedWaveform, setProcessedWaveform] = useState<VibrationWaveform | null>(null);
  const [fftResult, setFFTResult] = useState<FFTResult | null>(null);
  const [waveformType, setWaveformType] = useState<'acceleration' | 'velocity' | 'displacement'>(
    'acceleration'
  );
  const [chartMode, setChartMode] = useState<'waveform' | 'fft'>('waveform');

  // Cache for processed waveforms to avoid recalculating
  const waveformCache = useRef<{
    velocityWaveforms: Map<string, VibrationWaveform>;
    displacementWaveforms: Map<string, VibrationWaveform>;
    fftResults: Map<string, FFTResult>;
  }>({
    velocityWaveforms: new Map(),
    displacementWaveforms: new Map(),
    fftResults: new Map(),
  });

  // Get the historical readings data
  const batteryReadings = getBatteryData();
  const temperatureReadings = getTemperatureData();
  const vibrationReadings = getVibrationData();
  const detailedVibrationReadings = getDetailedVibrationData();

  // Debug logs to see what data is received
  console.log('Historical readings component data:', {
    gatewayId,
    sensorSerial,
    serialString: sensorSerial.toString(),
    batteryReadingsKeys: Object.keys(batteryReadings),
    batteryReadingsCount: Object.keys(batteryReadings).length,
    detailedVibrationReadingsCount: Object.keys(detailedVibrationReadings).length,
  });

  // Date range state for filtering
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });

  // Define a function to refresh all data types
  const _refreshAllData = useCallback(async () => {
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

  // Load data on initial load (only once)
  const [initialLoadCompleted, setInitialLoadCompleted] = useState(false);

  useEffect(() => {
    // Only run this effect once when initialLoad is true and not yet completed
    if (initialLoad && !initialLoadCompleted && isAuthenticated) {
      console.log('Initial data load triggered');

      (async () => {
        setIsLoading({ battery: true, temperature: true, vibration: true });

        try {
          const options = {
            serials: [sensorSerial],
            start: dateRange.start,
            end: dateRange.end,
            max: 100,
          };

          console.log('Loading initial historical data with options:', options);

          // Load all types of data in parallel but don't show toast
          const [batteryResult, tempResult, vibResult] = await Promise.all([
            fetchBatteryReadings(options),
            fetchTemperatureReadings(options),
            fetchVibrationReadings(options),
          ]);

          console.log('Initial load results:', {
            battery: batteryResult,
            temperature: tempResult,
            vibration: vibResult,
          });

          // Intentionally NOT showing a toast notification for initial load
          setInitialLoadCompleted(true);
        } catch (error) {
          console.error('Error during initial data load:', error);
        } finally {
          setIsLoading({ battery: false, temperature: false, vibration: false });
        }
      })();
    }
  }, [
    initialLoad,
    initialLoadCompleted,
    isAuthenticated,
    sensorSerial,
    dateRange.start,
    dateRange.end,
    fetchBatteryReadings,
    fetchTemperatureReadings,
    fetchVibrationReadings,
  ]);

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

  // Using detailed vibration readings instead of basic ones
  // This code is kept for reference
  const _filteredVibrationReadings = Object.values(vibrationReadings)
    .filter(r => {
      // Normalize both serials to strings for comparison
      const readingSerial = String(r.Serial);
      const targetSerial = String(serialString);
      return readingSerial === targetSerial;
    })
    .sort((a, b) => new Date(b.Time).getTime() - new Date(a.Time).getTime());

  // Filter detailed vibration readings for this sensor
  const filteredDetailedVibrationReadings = Object.values(detailedVibrationReadings)
    .filter(r => {
      const readingSerial = String(r.Serial);
      const targetSerial = String(serialString);
      return readingSerial === targetSerial;
    })
    .sort((a, b) => new Date(b.Time).getTime() - new Date(a.Time).getTime());

  // Update selected vibration reading when detailed readings change
  useEffect(() => {
    if (filteredDetailedVibrationReadings.length > 0 && !selectedVibrationReading) {
      setSelectedVibrationReading(filteredDetailedVibrationReadings[0]);
    }
  }, [filteredDetailedVibrationReadings, selectedVibrationReading]);

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

  // Helper to transform array data into format for Recharts
  const getChartData = (reading: DetailedVibrationReading | null, axis: 'x' | 'y' | 'z') => {
    if (!reading) return [];

    const axisData = axis === 'x' ? reading.X : axis === 'y' ? reading.Y : reading.Z;

    // Transform array data into a format Recharts can use
    return axisData.map((value, index) => ({
      index,
      value,
    }));
  };

  // Generate a unique key for the current reading and axis
  const getWaveformCacheKey = useCallback((readingId: number, axis: 'x' | 'y' | 'z') => {
    return `${readingId}-${axis}`;
  }, []);

  // Processing functions for vibration data
  const updateCurrentWaveform = useCallback(() => {
    if (!selectedVibrationReading) {
      setCurrentWaveform(null);
      setProcessedWaveform(null);
      setFFTResult(null);
      return;
    }

    const axisData =
      selectedAxis === 'x'
        ? selectedVibrationReading.X
        : selectedAxis === 'y'
          ? selectedVibrationReading.Y
          : selectedVibrationReading.Z;

    // Assume 1kHz sample rate (typical for vibration sensors)
    const sampleRate = 1000;

    // Create the base acceleration waveform
    const waveform = vibrationArrayToWaveform(
      axisData,
      sampleRate,
      selectedAxis.toUpperCase() as 'X' | 'Y' | 'Z'
    );

    setCurrentWaveform(waveform);

    // Clear any processed waveform data for the new selection
    setProcessedWaveform(null);
    setFFTResult(null);
    setWaveformType('acceleration');
    setChartMode('waveform');

    // Check if we have cached processed data for this waveform
    const cacheKey = getWaveformCacheKey(selectedVibrationReading.ID, selectedAxis);

    // Clear FFT result if exists for consistency
    if (waveformCache.current.fftResults.has(cacheKey)) {
      // We don't set it immediately to avoid extra renders
      console.log(`Found cached FFT result for ${cacheKey}`);
    }
  }, [selectedVibrationReading, selectedAxis, getWaveformCacheKey]);

  const handleIntegration = useCallback(() => {
    const waveformToProcess = processedWaveform || currentWaveform;
    if (!waveformToProcess || !selectedVibrationReading) return;

    const cacheKey = getWaveformCacheKey(selectedVibrationReading.ID, selectedAxis);
    let integrated: VibrationWaveform;

    try {
      // Check if we're integrating from acceleration to velocity
      if (waveformType === 'acceleration') {
        // Check if we have this velocity waveform cached
        if (waveformCache.current.velocityWaveforms.has(cacheKey)) {
          console.log('Using cached velocity waveform');
          integrated = waveformCache.current.velocityWaveforms.get(cacheKey)!;
        } else {
          // Calculate and cache it
          console.log('Calculating velocity waveform');
          integrated = integrateWaveform(waveformToProcess);
          waveformCache.current.velocityWaveforms.set(cacheKey, integrated);
        }
      }
      // Check if we're integrating from velocity to displacement
      else if (waveformType === 'velocity') {
        // Check if we have this displacement waveform cached
        if (waveformCache.current.displacementWaveforms.has(cacheKey)) {
          console.log('Using cached displacement waveform');
          integrated = waveformCache.current.displacementWaveforms.get(cacheKey)!;
        } else {
          // Calculate and cache it
          console.log('Calculating displacement waveform');
          integrated = integrateWaveform(waveformToProcess);
          waveformCache.current.displacementWaveforms.set(cacheKey, integrated);
        }
      } else {
        // Shouldn't happen but handle it anyway
        throw new Error("Can't integrate from displacement");
      }

      setProcessedWaveform(integrated);

      // Update waveform type
      setWaveformType(prev => {
        if (prev === 'acceleration') return 'velocity';
        if (prev === 'velocity') return 'displacement';
        return prev;
      });

      toast.success(
        `Integrated to ${waveformType === 'acceleration' ? 'velocity' : 'displacement'}`
      );
    } catch (error) {
      toast.error(
        `Integration failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }, [
    currentWaveform,
    processedWaveform,
    waveformType,
    selectedVibrationReading,
    selectedAxis,
    getWaveformCacheKey,
  ]);

  const handleDifferentiation = useCallback(() => {
    const waveformToProcess = processedWaveform || currentWaveform;
    if (!waveformToProcess || !selectedVibrationReading) return;

    // Unused but kept for consistency with other handlers
    const _cacheKey = getWaveformCacheKey(selectedVibrationReading.ID, selectedAxis);

    try {
      // We don't cache differentiation results separately since they're essentially
      // the original acceleration data when going from velocity -> acceleration
      // This keeps the cache simpler
      console.log('Calculating differentiated waveform');
      const differentiated = differentiateWaveform(waveformToProcess);
      setProcessedWaveform(differentiated);

      // Update waveform type
      setWaveformType(prev => {
        if (prev === 'displacement') return 'velocity';
        if (prev === 'velocity') return 'acceleration';
        return prev;
      });

      toast.success(
        `Differentiated to ${waveformType === 'displacement' ? 'velocity' : 'acceleration'}`
      );
    } catch (error) {
      toast.error(
        `Differentiation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }, [
    currentWaveform,
    processedWaveform,
    waveformType,
    selectedVibrationReading,
    selectedAxis,
    getWaveformCacheKey,
  ]);

  const handleFFT = useCallback(async () => {
    const waveformToAnalyze = processedWaveform || currentWaveform;
    if (!waveformToAnalyze || !selectedVibrationReading) return;

    const cacheKey = getWaveformCacheKey(selectedVibrationReading.ID, selectedAxis);

    try {
      // Check if we have cached FFT results
      if (waveformCache.current.fftResults.has(cacheKey)) {
        console.log('Using cached FFT result');
        const fft = waveformCache.current.fftResults.get(cacheKey)!;
        setFFTResult(fft);
        setChartMode('fft');
        toast.success('FFT analysis loaded');
      } else {
        console.log('Calculating new FFT result');
        // Show loading toast for better UX during calculation
        const toastId = toast.loading('Calculating FFT...');

        const fft = await performFFT(waveformToAnalyze);

        // Cache the result
        waveformCache.current.fftResults.set(cacheKey, fft);

        // Update state and dismiss the loading toast
        setFFTResult(fft);
        setChartMode('fft');
        toast.dismiss(toastId);
        toast.success('FFT analysis completed');
      }
    } catch (error) {
      toast.error(`FFT failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [
    currentWaveform,
    processedWaveform,
    selectedVibrationReading,
    selectedAxis,
    getWaveformCacheKey,
  ]);

  const resetProcessing = useCallback(() => {
    setProcessedWaveform(null);
    setFFTResult(null);
    setWaveformType('acceleration');
    setChartMode('waveform');

    // Note: We don't clear the cache here because the cached data might be used again
    // if the user performs the same operations on the same data
  }, []);

  // Update waveform when selection changes
  useEffect(() => {
    updateCurrentWaveform();

    // We need to clear the processed waveform and FFT result when changing selection
    setProcessedWaveform(null);
    setFFTResult(null);
    setWaveformType('acceleration');
    setChartMode('waveform');
  }, [updateCurrentWaveform, selectedVibrationReading?.ID, selectedAxis]);

  // Render the vibration history table
  const renderVibrationHistory = () => {
    const hasDetailedReadings = filteredDetailedVibrationReadings.length > 0;

    if (!hasDetailedReadings) {
      return <div className="text-center py-8">No vibration history available</div>;
    }

    return (
      <div className="space-y-6">
        {/* Detailed vibration data */}
        <div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-sm font-medium">Select Reading:</label>
              <select
                className="w-full p-2 border rounded mt-1"
                value={selectedVibrationReading?.ID || ''}
                onChange={e => {
                  const readingId = parseInt(e.target.value);
                  const reading =
                    filteredDetailedVibrationReadings.find(r => r.ID === readingId) || null;
                  setSelectedVibrationReading(reading);
                }}
              >
                {filteredDetailedVibrationReadings.map(reading => (
                  <option key={reading.ID} value={reading.ID}>
                    {formatReadingDate(reading.Time)} (ID: {reading.ID})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium">Select Axis:</label>
              <div className="flex space-x-2 mt-1">
                <Button
                  variant={selectedAxis === 'x' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedAxis('x')}
                >
                  X-Axis
                </Button>
                <Button
                  variant={selectedAxis === 'y' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedAxis('y')}
                >
                  Y-Axis
                </Button>
                <Button
                  variant={selectedAxis === 'z' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedAxis('z')}
                >
                  Z-Axis
                </Button>
              </div>
            </div>
          </div>

          {selectedVibrationReading && (
            <div className="space-y-6">
              <Tabs defaultValue="chart">
                <TabsList className="grid grid-cols-2 w-[200px] mb-4">
                  <TabsTrigger value="chart">Chart</TabsTrigger>
                  <TabsTrigger value="metrics">Metrics</TabsTrigger>
                </TabsList>

                <TabsContent value="chart">
                  <div className="bg-card border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="font-medium flex items-center gap-1">
                        <Waves className="h-4 w-4" />
                        <span>
                          {selectedAxis.toUpperCase()}-Axis{' '}
                          {waveformType === 'acceleration'
                            ? 'Acceleration'
                            : waveformType === 'velocity'
                              ? 'Velocity'
                              : 'Displacement'}
                        </span>
                        {chartMode === 'fft' && ' (FFT)'}
                      </div>

                      {/* Processing Controls */}
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleIntegration}
                          disabled={!currentWaveform || waveformType === 'displacement'}
                          className="flex items-center gap-1"
                        >
                          <Sigma className="h-3 w-3" />∫ Integrate
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleDifferentiation}
                          disabled={!currentWaveform || waveformType === 'acceleration'}
                          className="flex items-center gap-1"
                        >
                          <TrendingUp className="h-3 w-3" />
                          d/dt Differentiate
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleFFT}
                          disabled={!currentWaveform}
                          className="flex items-center gap-1"
                        >
                          <Zap className="h-3 w-3" />
                          FFT
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={resetProcessing}
                          disabled={!processedWaveform && !fftResult}
                        >
                          Reset
                        </Button>
                      </div>
                    </div>

                    {/* Chart Mode Toggle */}
                    <div className="flex gap-2 mb-4">
                      <Button
                        variant={chartMode === 'waveform' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setChartMode('waveform')}
                        disabled={!currentWaveform}
                      >
                        Waveform
                      </Button>
                      <Button
                        variant={chartMode === 'fft' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setChartMode('fft')}
                        disabled={!fftResult}
                      >
                        FFT Spectrum
                      </Button>
                    </div>

                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        {chartMode === 'waveform' ? (
                          <LineChart
                            data={(() => {
                              const waveform = processedWaveform || currentWaveform;
                              if (!waveform)
                                return getChartData(selectedVibrationReading, selectedAxis);

                              return waveform.data.map((point, index) => ({
                                index,
                                value: point.value,
                                time: point.time,
                              }));
                            })()}
                            margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis
                              dataKey="index"
                              label={{ value: 'Sample', position: 'insideBottomRight', offset: -5 }}
                            />
                            <YAxis
                              label={{
                                value: (() => {
                                  if (waveformType === 'acceleration') return 'g';
                                  if (waveformType === 'velocity') return 'm/s';
                                  if (waveformType === 'displacement') return 'm';
                                  return 'g';
                                })(),
                                angle: -90,
                                position: 'insideLeft',
                              }}
                            />
                            <Tooltip
                              formatter={(value: number) => [
                                value.toFixed(6),
                                waveformType === 'acceleration'
                                  ? 'Acceleration (g)'
                                  : waveformType === 'velocity'
                                    ? 'Velocity (m/s)'
                                    : 'Displacement (m)',
                              ]}
                            />
                            <Legend />
                            <Line
                              type="monotone"
                              dataKey="value"
                              name={`${selectedAxis.toUpperCase()}-Axis ${waveformType}`}
                              stroke={
                                selectedAxis === 'x'
                                  ? '#8884d8'
                                  : selectedAxis === 'y'
                                    ? '#82ca9d'
                                    : '#ffc658'
                              }
                              activeDot={{ r: 4 }}
                              strokeWidth={1}
                            />
                          </LineChart>
                        ) : (
                          <LineChart
                            data={
                              fftResult
                                ? fftResult.frequencies.map((freq, index) => ({
                                    frequency: freq,
                                    magnitude: fftResult.magnitudes[index],
                                  }))
                                : []
                            }
                            margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis
                              dataKey="frequency"
                              label={{
                                value: 'Frequency (Hz)',
                                position: 'insideBottomRight',
                                offset: -5,
                              }}
                            />
                            <YAxis
                              label={{
                                value: 'Magnitude',
                                angle: -90,
                                position: 'insideLeft',
                              }}
                            />
                            <Tooltip
                              formatter={(value: number) => [value.toFixed(6), 'Magnitude']}
                            />
                            <Legend />
                            <Line
                              type="monotone"
                              dataKey="magnitude"
                              name="FFT Magnitude"
                              stroke="#ff7300"
                              activeDot={{ r: 4 }}
                              strokeWidth={1}
                            />
                          </LineChart>
                        )}
                      </ResponsiveContainer>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="metrics">
                  <div className="bg-card border rounded-lg p-4">
                    <div className="font-medium mb-4">Vibration Metrics</div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="p-3 border rounded-lg">
                        <div className="text-sm text-muted-foreground">X Peak</div>
                        <div className="text-xl font-bold">
                          {selectedVibrationReading.Xpk.toFixed(3)} g
                        </div>
                      </div>
                      <div className="p-3 border rounded-lg">
                        <div className="text-sm text-muted-foreground">X Peak-to-Peak</div>
                        <div className="text-xl font-bold">
                          {selectedVibrationReading.Xpp.toFixed(3)} g
                        </div>
                      </div>
                      <div className="p-3 border rounded-lg">
                        <div className="text-sm text-muted-foreground">X RMS</div>
                        <div className="text-xl font-bold">
                          {selectedVibrationReading.Xrms.toFixed(3)} g
                        </div>
                      </div>

                      <div className="p-3 border rounded-lg">
                        <div className="text-sm text-muted-foreground">Y Peak</div>
                        <div className="text-xl font-bold">
                          {selectedVibrationReading.Ypk.toFixed(3)} g
                        </div>
                      </div>
                      <div className="p-3 border rounded-lg">
                        <div className="text-sm text-muted-foreground">Y Peak-to-Peak</div>
                        <div className="text-xl font-bold">
                          {selectedVibrationReading.Ypp.toFixed(3)} g
                        </div>
                      </div>
                      <div className="p-3 border rounded-lg">
                        <div className="text-sm text-muted-foreground">Y RMS</div>
                        <div className="text-xl font-bold">
                          {selectedVibrationReading.Yrms.toFixed(3)} g
                        </div>
                      </div>

                      <div className="p-3 border rounded-lg">
                        <div className="text-sm text-muted-foreground">Z Peak</div>
                        <div className="text-xl font-bold">
                          {selectedVibrationReading.Zpk.toFixed(3)} g
                        </div>
                      </div>
                      <div className="p-3 border rounded-lg">
                        <div className="text-sm text-muted-foreground">Z Peak-to-Peak</div>
                        <div className="text-xl font-bold">
                          {selectedVibrationReading.Zpp.toFixed(3)} g
                        </div>
                      </div>
                      <div className="p-3 border rounded-lg">
                        <div className="text-sm text-muted-foreground">Z RMS</div>
                        <div className="text-xl font-bold">
                          {selectedVibrationReading.Zrms.toFixed(3)} g
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <Card className="mt-4">
      <CardContent className="pt-4">
        <div className="flex flex-col gap-4">
          {/* Tabs for different reading types */}
          <Tabs
            defaultValue="vibration"
            onValueChange={value => setActiveTab(value as 'battery' | 'temperature' | 'vibration')}
          >
            <div className="flex justify-between items-center mb-4">
              <TabsList className="grid grid-cols-3">
                <TabsTrigger value="vibration" className="flex items-center gap-1">
                  <Waves className="h-4 w-4" />
                  <span>Vibration</span>
                </TabsTrigger>
                <TabsTrigger value="temperature" className="flex items-center gap-1">
                  <Thermometer className="h-4 w-4" />
                  <span>Temperature</span>
                </TabsTrigger>
                <TabsTrigger value="battery" className="flex items-center gap-1">
                  <Battery className="h-4 w-4" />
                  <span>Battery</span>
                </TabsTrigger>
              </TabsList>

              {/* Take Reading Button - changes based on active tab */}
              {onTakeReading && (
                <Button
                  size="sm"
                  onClick={() => onTakeReading(activeTab)}
                  disabled={!isGatewayAuthenticated || readingLoading?.[activeTab]}
                  className="flex items-center gap-2"
                >
                  {activeTab === 'battery' && <Zap className="h-4 w-4" />}
                  {activeTab === 'temperature' && <Thermometer className="h-4 w-4" />}
                  {activeTab === 'vibration' && <Waves className="h-4 w-4" />}
                  {readingLoading?.[activeTab]
                    ? 'Requesting...'
                    : `Take ${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Reading`}
                </Button>
              )}
            </div>

            <TabsContent value="vibration" className="mt-0">
              {renderVibrationHistory()}
            </TabsContent>

            <TabsContent value="temperature" className="mt-0">
              {renderTemperatureHistory()}
            </TabsContent>

            <TabsContent value="battery" className="mt-0">
              {renderBatteryHistory()}
            </TabsContent>
          </Tabs>
        </div>
      </CardContent>

      <CardFooter className="border-t pt-4">
        <div className="w-full">
          {/* Date Range Selector */}
          <div className="flex flex-wrap items-end gap-4 p-4 bg-muted/20 rounded-lg">
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

          <div className="text-sm text-muted-foreground mt-2 text-center">
            Showing readings from {formatReadingDate(dateRange.start)} to{' '}
            {formatReadingDate(dateRange.end)}
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}
