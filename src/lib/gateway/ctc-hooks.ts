'use client';

/**
 * CTC Gateway Hooks
 *
 * Custom React hooks for interacting with CTC gateway connections
 */
import { useContext, useEffect, useState, useCallback } from 'react';
import { GatewayContext } from './context';
import { GatewayConnection } from './types';
import { CTCDynamicSensor, CTCDynamicReading, CTCCommandType } from './ctc-types';
import { toast } from 'sonner';
import { z } from 'zod';

/**
 * Hook to manage a CTC gateway connection
 * @param gatewayId Gateway ID
 * @param autoConnect Whether to connect automatically
 * @returns Connection data and management functions
 */
export function useCTCGatewayConnection(gatewayId: string, autoConnect = true) {
  const { service, connectToGateway, disconnectFromGateway, connectionState } =
    useContext(GatewayContext);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Get connection state for this gateway
  const state = connectionState[gatewayId] || 'disconnected';
  const isConnected = state === 'connected' || state === 'authenticated';
  const isAuthenticated = state === 'authenticated';

  // Connect to gateway
  const connect = useCallback(async () => {
    if (isConnecting || isConnected) return;

    setIsConnecting(true);
    setError(null);

    try {
      await connectToGateway(gatewayId);
    } catch (error) {
      setError(error instanceof Error ? error : new Error('Unknown error'));
      throw error;
    } finally {
      setIsConnecting(false);
    }
  }, [connectToGateway, gatewayId, isConnecting, isConnected]);

  // Disconnect from gateway
  const disconnect = useCallback(async () => {
    await disconnectFromGateway(gatewayId);
  }, [disconnectFromGateway, gatewayId]);

  // Get gateway connection
  const getConnection = useCallback((): GatewayConnection | null => {
    return service.getConnection(gatewayId);
  }, [service, gatewayId]);

  // Auto-connect on mount if enabled
  useEffect(() => {
    if (autoConnect && !isConnected && !isConnecting) {
      connect().catch(error => {
        console.error(`Error auto-connecting to gateway ${gatewayId}:`, error);
      });
    }

    // Clean up on unmount
    return () => {
      // No automatic disconnection on unmount as other components might still need the connection
      // To disconnect, explicitly call disconnect() or set autoDisconnect prop
    };
  }, [autoConnect, connect, isConnected, isConnecting, gatewayId]);

  return {
    state,
    isConnected,
    isAuthenticated,
    isConnecting,
    error,
    connect,
    disconnect,
    getConnection,
  };
}

/**
 * Generic type for data with loading state
 */
type DataState<T> = {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  lastUpdated: Date | null;
  refetch: () => Promise<T>;
};

/**
 * Hook to get all dynamic sensors
 * @param gatewayId Gateway ID
 * @param serials Optional array of sensor serial numbers
 * @returns Sensor data with loading state
 */
export function useCTCDynamicSensors(
  gatewayId: string,
  serials?: number[]
): DataState<CTCDynamicSensor[]> {
  const { service } = useContext(GatewayContext);
  const [data, setData] = useState<CTCDynamicSensor[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Fetch sensors data
  const refetch = useCallback(async (): Promise<CTCDynamicSensor[]> => {
    setIsLoading(true);
    setError(null);

    try {
      const connection = service.getConnection(gatewayId);
      if (!connection) {
        throw new Error('Gateway not connected');
      }

      // Use sendCommand to get sensors
      const command = serials ? 'getDynamicSensors' : 'getConnectedDynamicSensors';
      const params = serials ? { serials } : undefined;

      const sensors = await connection.sendCommand<CTCDynamicSensor[]>(command, params);

      setData(sensors);
      setLastUpdated(new Date());
      setIsLoading(false);

      return sensors;
    } catch (error) {
      setError(error instanceof Error ? error : new Error('Unknown error'));
      setIsLoading(false);
      throw error;
    }
  }, [gatewayId, service, serials]);

  // Set up subscription to sensors topic
  useEffect(() => {
    const connection = service.getConnection(gatewayId);
    if (!connection) return;

    // Subscribe to sensors topic
    const unsubscribe = connection.onData('sensors', data => {
      setData(data as CTCDynamicSensor[]);
      setLastUpdated(new Date());
      setIsLoading(false);
      setError(null);
    });

    // Initial fetch
    refetch().catch(error => {
      console.error('Error fetching sensors:', error);
    });

    return unsubscribe;
  }, [gatewayId, service, refetch]);

  return {
    data,
    isLoading,
    error,
    lastUpdated,
    refetch,
  };
}

/**
 * Hook to get connected dynamic sensors
 * @param gatewayId Gateway ID
 * @returns Connected sensor data with loading state
 */
export function useCTCConnectedDynamicSensors(gatewayId: string): DataState<CTCDynamicSensor[]> {
  return useCTCDynamicSensors(gatewayId);
}

/**
 * Hook to get dynamic vibration records
 * @param gatewayId Gateway ID
 * @param options Query options
 * @returns Vibration records with loading state
 */
export function useCTCDynamicVibrationRecords(
  gatewayId: string,
  options: {
    serials?: number[];
    start?: string;
    end?: string;
    max?: number;
  } = {}
): DataState<CTCDynamicReading[]> {
  const { service } = useContext(GatewayContext);
  const [data, setData] = useState<CTCDynamicReading[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Fetch vibration records
  const refetch = useCallback(async (): Promise<CTCDynamicReading[]> => {
    setIsLoading(true);
    setError(null);

    try {
      const connection = service.getConnection(gatewayId);
      if (!connection) {
        throw new Error('Gateway not connected');
      }

      // Use sendCommand to get vibration records
      const readings = await connection.sendCommand<CTCDynamicReading[]>(
        'getDynamicVibrationRecords',
        {
          serials: options.serials,
          start: options.start,
          end: options.end,
          max: options.max,
        }
      );

      setData(readings);
      setLastUpdated(new Date());
      setIsLoading(false);

      return readings;
    } catch (error) {
      setError(error instanceof Error ? error : new Error('Unknown error'));
      setIsLoading(false);
      throw error;
    }
  }, [gatewayId, service, options]);

  // Set up subscription to readings topic
  useEffect(() => {
    const connection = service.getConnection(gatewayId);
    if (!connection) return;

    // Subscribe to readings topic
    const unsubscribe = connection.onData('readings', data => {
      setData(data as CTCDynamicReading[]);
      setLastUpdated(new Date());
      setIsLoading(false);
      setError(null);
    });

    // Initial fetch
    refetch().catch(error => {
      console.error('Error fetching vibration records:', error);
    });

    return unsubscribe;
  }, [gatewayId, service, refetch]);

  return {
    data,
    isLoading,
    error,
    lastUpdated,
    refetch,
  };
}

/**
 * Hook to subscribe to real-time dynamic readings
 * @param gatewayId Gateway ID
 * @returns Latest reading data with loading state
 */
export function useCTCDynamicReadings(gatewayId: string): {
  reading: CTCDynamicReading | null;
  temperature: { Serial: number; TempC: number; TempF: number; Timestamp: string } | null;
  battery: { Serial: number; Level: number; Timestamp: string } | null;
  isReading: boolean;
  triggerReading: (serial: number) => Promise<void>;
  triggerTemperatureReading: (serial: number) => Promise<void>;
  triggerBatteryReading: (serial: number) => Promise<void>;
} {
  const { service } = useContext(GatewayContext);
  const [reading, setReading] = useState<CTCDynamicReading | null>(null);
  const [temperature, setTemperature] = useState<{
    Serial: number;
    TempC: number;
    TempF: number;
    Timestamp: string;
  } | null>(null);
  const [battery, setBattery] = useState<{
    Serial: number;
    Level: number;
    Timestamp: string;
  } | null>(null);
  const [isReading, setIsReading] = useState<boolean>(false);

  // Set up subscription to reading topics
  useEffect(() => {
    const connection = service.getConnection(gatewayId);
    if (!connection) return;

    // Set up unsubscribe functions
    const unsubscribeFuncs: (() => void)[] = [];

    // Subscribe to reading started notification
    unsubscribeFuncs.push(
      connection.on(
        CTCCommandType.NOTIFY_DYNAMIC_READING_STARTED as unknown as string,
        (_message: unknown) => {
          // No validation needed for this message since we're just setting a flag
          setIsReading(true);
        }
      )
    );

    // Define Zod schema for reading notification
    const readingDataSchema = z.object({
      Data: z
        .object({
          Serial: z.number(),
          XRms: z.number().optional(),
          YRms: z.number().optional(),
          ZRms: z.number().optional(),
          Timestamp: z.string(),
        })
        .transform(data => data as CTCDynamicReading),
    });

    // Subscribe to reading notification
    unsubscribeFuncs.push(
      connection.on(
        CTCCommandType.NOTIFY_DYNAMIC_READING as unknown as string,
        (message: unknown) => {
          try {
            // Validate and parse the message using Zod
            const validatedMessage = readingDataSchema.safeParse(message);
            if (validatedMessage.success) {
              setReading(validatedMessage.data.Data);
              setIsReading(false);
            } else {
              console.error('Invalid reading data:', validatedMessage.error);
            }
          } catch (error) {
            console.error('Error processing reading message:', error);
          }
        }
      )
    );

    // Define Zod schema for temperature notification
    const temperatureDataSchema = z.object({
      Data: z.object({
        Serial: z.number(),
        TempC: z.number(),
        TempF: z.number(),
        Timestamp: z.string(),
      }),
    });

    // Subscribe to temperature notification
    unsubscribeFuncs.push(
      connection.on(
        CTCCommandType.NOTIFY_DYNAMIC_TEMPERATURE as unknown as string,
        (message: unknown) => {
          try {
            // Validate and parse the message using Zod
            const validatedMessage = temperatureDataSchema.safeParse(message);
            if (validatedMessage.success) {
              setTemperature(validatedMessage.data.Data);
            } else {
              console.error('Invalid temperature data:', validatedMessage.error);
            }
          } catch (error) {
            console.error('Error processing temperature message:', error);
          }
        }
      )
    );

    // Define Zod schema for battery notification
    const batteryDataSchema = z.object({
      Data: z.object({
        Serial: z.number(),
        Level: z.number(),
        Timestamp: z.string(),
      }),
    });

    // Subscribe to battery notification
    unsubscribeFuncs.push(
      connection.on(
        CTCCommandType.NOTIFY_DYNAMIC_BATTERY as unknown as string,
        (message: unknown) => {
          try {
            // Validate and parse the message using Zod
            const validatedMessage = batteryDataSchema.safeParse(message);
            if (validatedMessage.success) {
              setBattery(validatedMessage.data.Data);
            } else {
              console.error('Invalid battery data:', validatedMessage.error);
            }
          } catch (error) {
            console.error('Error processing battery message:', error);
          }
        }
      )
    );

    // Clean up subscriptions
    return () => {
      unsubscribeFuncs.forEach(unsubscribe => unsubscribe());
    };
  }, [gatewayId, service]);

  // Trigger reading
  const triggerReading = useCallback(
    async (serial: number): Promise<void> => {
      try {
        const connection = service.getConnection(gatewayId);
        if (!connection) {
          throw new Error('Gateway not connected');
        }

        await connection.sendCommand('takeDynamicReading', { serial });
        setIsReading(true);
      } catch (error) {
        toast.error(
          `Failed to trigger reading: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
        throw error;
      }
    },
    [gatewayId, service]
  );

  // Trigger temperature reading
  const triggerTemperatureReading = useCallback(
    async (serial: number): Promise<void> => {
      try {
        const connection = service.getConnection(gatewayId);
        if (!connection) {
          throw new Error('Gateway not connected');
        }

        await connection.sendCommand('takeDynamicTemperatureReading', { serial });
      } catch (error) {
        toast.error(
          `Failed to trigger temperature reading: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
        throw error;
      }
    },
    [gatewayId, service]
  );

  // Trigger battery reading
  const triggerBatteryReading = useCallback(
    async (serial: number): Promise<void> => {
      try {
        const connection = service.getConnection(gatewayId);
        if (!connection) {
          throw new Error('Gateway not connected');
        }

        await connection.sendCommand('takeDynamicBatteryReading', { serial });
      } catch (error) {
        toast.error(
          `Failed to trigger battery reading: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
        throw error;
      }
    },
    [gatewayId, service]
  );

  return {
    reading,
    temperature,
    battery,
    isReading,
    triggerReading,
    triggerTemperatureReading,
    triggerBatteryReading,
  };
}
