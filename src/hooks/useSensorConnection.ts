'use client';

import { useCallback, useEffect, useState } from 'react';
import { useGatewayWebSocket } from '@/components/gateways/GatewayWebSocketContext';
import { ReadingData, TemperatureData, BatteryData } from '@/lib/api/ctc-api';
import { useSensor } from './useSensor';

/**
 * Hook for managing sensor data and readings via WebSocket
 */
export function useSensorConnection(sensorId: string) {
  const { data, isLoading, error } = useSensor(sensorId);
  // Extract sensor data from response
  const sensor = data?.data;

  const {
    isSensorConnected,
    takeReading,
    takeTemperatureReading,
    takeBatteryReading,
    getReadings,
    getTemperatureReadings,
    getBatteryReadings,
    sensorStates,
  } = useGatewayWebSocket();

  // Local states for async operations
  const [isLoadingReading, setIsLoadingReading] = useState(false);
  const [isLoadingTemperature, setIsLoadingTemperature] = useState(false);
  const [isLoadingBattery, setIsLoadingBattery] = useState(false);

  // Data states
  const [readingData, setReadingData] = useState<ReadingData | null>(null);
  const [temperatureData, setTemperatureData] = useState<TemperatureData | null>(null);
  const [batteryData, setBatteryData] = useState<BatteryData | null>(null);
  const [historicalReadings, setHistoricalReadings] = useState<ReadingData[]>([]);
  const [historicalTemperatures, setHistoricalTemperatures] = useState<TemperatureData[]>([]);
  const [historicalBatteries, setHistoricalBatteries] = useState<BatteryData[]>([]);

  // Check if sensor is connected
  const isConnected = sensor?.serial ? isSensorConnected(sensor.serial) : false;

  // Get last connected timestamp
  const sensorState = sensor?.serial ? sensorStates.get(sensor.serial) : undefined;
  const lastConnectedAt = sensorState?.lastConnectedAt;

  // Get gateway ID from the sensor equipment relationship
  const getGatewayId = useCallback(() => {
    if (!sensor || !sensor.wsEndpoint) {
      throw new Error('No gateway information found on sensor');
    }
    return sensor.wsEndpoint;
  }, [sensor]);

  // Request a vibration reading
  const requestReading = useCallback(async () => {
    if (!sensor?.serial) {
      throw new Error('Sensor data incomplete');
    }

    const gatewayId = getGatewayId();

    setIsLoadingReading(true);
    try {
      const data = await takeReading(gatewayId, sensor.serial);
      setReadingData(data);
      return data;
    } finally {
      setIsLoadingReading(false);
    }
  }, [sensor, getGatewayId, takeReading]);

  // Request a temperature reading
  const requestTemperature = useCallback(async () => {
    if (!sensor?.serial) {
      throw new Error('Sensor data incomplete');
    }

    const gatewayId = getGatewayId();

    setIsLoadingTemperature(true);
    try {
      const data = await takeTemperatureReading(gatewayId, sensor.serial);
      setTemperatureData(data);
      return data;
    } finally {
      setIsLoadingTemperature(false);
    }
  }, [sensor, getGatewayId, takeTemperatureReading]);

  // Request a battery reading
  const requestBattery = useCallback(async () => {
    if (!sensor?.serial) {
      throw new Error('Sensor data incomplete');
    }

    const gatewayId = getGatewayId();

    setIsLoadingBattery(true);
    try {
      const data = await takeBatteryReading(gatewayId, sensor.serial);
      setBatteryData(data);
      return data;
    } finally {
      setIsLoadingBattery(false);
    }
  }, [sensor, getGatewayId, takeBatteryReading]);

  // Fetch historical readings
  const fetchHistoricalReadings = useCallback(
    async (count: number = 10) => {
      if (!sensor?.serial) {
        throw new Error('Sensor data incomplete');
      }

      const gatewayId = getGatewayId();

      const data = await getReadings(gatewayId, sensor.serial, count);
      setHistoricalReadings(data);
      return data;
    },
    [getReadings, sensor, getGatewayId]
  );

  // Fetch historical temperature readings
  const fetchHistoricalTemperatures = useCallback(
    async (count: number = 10) => {
      if (!sensor?.serial) {
        throw new Error('Sensor data incomplete');
      }

      const gatewayId = getGatewayId();

      const data = await getTemperatureReadings(gatewayId, sensor.serial, count);
      setHistoricalTemperatures(data);
      return data;
    },
    [getTemperatureReadings, sensor, getGatewayId]
  );

  // Fetch historical battery readings
  const fetchHistoricalBatteries = useCallback(
    async (count: number = 10) => {
      if (!sensor?.serial) {
        throw new Error('Sensor data incomplete');
      }

      const gatewayId = getGatewayId();

      const data = await getBatteryReadings(gatewayId, sensor.serial, count);
      setHistoricalBatteries(data);
      return data;
    },
    [getBatteryReadings, sensor, getGatewayId]
  );

  // Load all historical data when sensor is loaded
  useEffect(() => {
    if (sensor?.serial && isConnected && sensor.wsEndpoint) {
      fetchHistoricalReadings().catch(console.error);
      fetchHistoricalTemperatures().catch(console.error);
      fetchHistoricalBatteries().catch(console.error);
    }
  }, [
    fetchHistoricalBatteries,
    fetchHistoricalReadings,
    fetchHistoricalTemperatures,
    isConnected,
    sensor,
  ]);

  return {
    sensor,
    isLoading,
    error,
    isConnected,
    lastConnectedAt,

    // Vibration readings
    readingData,
    isLoadingReading,
    requestReading,
    historicalReadings,
    fetchHistoricalReadings,

    // Temperature readings
    temperatureData,
    isLoadingTemperature,
    requestTemperature,
    historicalTemperatures,
    fetchHistoricalTemperatures,

    // Battery readings
    batteryData,
    isLoadingBattery,
    requestBattery,
    historicalBatteries,
    fetchHistoricalBatteries,
  };
}
