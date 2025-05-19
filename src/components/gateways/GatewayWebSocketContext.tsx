'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import {
  CTCWebSocketManager,
  ConnectionState,
  WebSocketEvents,
  SensorData,
  ReadingData,
  TemperatureData,
  BatteryData,
} from '@/lib/api/ctc-api';
import { toast } from 'sonner';
import { useGateways } from '@/hooks/useGateways';

// Interface for gateway connection state
interface GatewayConnectionState {
  gatewayId: string;
  state: ConnectionState;
  lastConnectedAt?: Date;
  lastAuthenticatedAt?: Date;
}

// Interface for sensor connection state
interface SensorConnectionState {
  sensorSerial: number;
  connected: boolean;
  lastConnectedAt?: Date;
}

// WebSocket context value shape
interface WebSocketContextValue {
  // Connection management
  connectToGateway: (gatewayId: string) => Promise<boolean>;
  disconnectFromGateway: (gatewayId: string) => void;
  disconnectAllGateways: () => void;
  refreshGatewayConnections: () => Promise<void>;

  // State tracking
  gatewayStates: Map<string, GatewayConnectionState>;
  sensorStates: Map<number, SensorConnectionState>;

  // Gateway operations
  getConnectedSensors: (gatewayId: string) => Promise<SensorData[]>;

  // Sensor operations
  takeReading: (gatewayId: string, sensorSerial: number) => Promise<ReadingData>;
  takeTemperatureReading: (gatewayId: string, sensorSerial: number) => Promise<TemperatureData>;
  takeBatteryReading: (gatewayId: string, sensorSerial: number) => Promise<BatteryData>;
  getReadings: (gatewayId: string, sensorSerial: number, count?: number) => Promise<ReadingData[]>;
  getTemperatureReadings: (
    gatewayId: string,
    sensorSerial: number,
    count?: number
  ) => Promise<TemperatureData[]>;
  getBatteryReadings: (
    gatewayId: string,
    sensorSerial: number,
    count?: number
  ) => Promise<BatteryData[]>;

  // State helpers
  getGatewayState: (gatewayId: string) => ConnectionState;
  isSensorConnected: (sensorSerial: number) => boolean;
}

// Create the context with a default empty value
const WebSocketContext = createContext<WebSocketContextValue | null>(null);

export function GatewayWebSocketProvider({ children }: { children: React.ReactNode }) {
  // Get the WebSocket manager singleton
  const manager = useMemo(() => CTCWebSocketManager.getInstance(), []);

  // Get all gateways from API - use a large limit to ensure we get all gateways
  const { gateways, isLoading } = useGateways({ limit: 1000 });

  // Track connection state for gateways and sensors
  const [gatewayStates, setGatewayStates] = useState<Map<string, GatewayConnectionState>>(
    new Map()
  );
  const [sensorStates, setSensorStates] = useState<Map<number, SensorConnectionState>>(new Map());

  // Connect to a gateway
  const connectToGateway = useCallback(
    async (gatewayId: string): Promise<boolean> => {
      console.log(`Connecting to gateway with ID: ${gatewayId}`);
      console.log(`Available gateways: ${gateways?.length || 0}`);

      if (!gateways || gateways.length === 0) {
        console.error('No gateways available in state');
        toast.error('No gateways available');
        return false;
      }

      // Log all available gateway IDs for debugging
      console.log(
        'Available gateway IDs:',
        gateways.map(g => g._id)
      );

      const gateway = gateways.find(g => g._id === gatewayId);
      if (!gateway) {
        console.error(`Gateway not found with ID: ${gatewayId}`);
        toast.error(`Gateway not found: ${gatewayId}`);
        return false;
      }

      console.log(`Found gateway: ${gateway.name}, URL: ${gateway.url}`);

      try {
        console.log(`Attempting to connect to ${gateway.url} with username ${gateway.username}`);
        const success = await manager.connectToGateway(
          gatewayId,
          gateway.url,
          gateway.username,
          gateway.password
        );

        if (success) {
          console.log(`Successfully connected to gateway: ${gateway.name}`);
          setGatewayStates(prev => {
            const newState = new Map(prev);
            newState.set(gatewayId, {
              gatewayId,
              state: ConnectionState.CONNECTED,
              lastConnectedAt: new Date(),
            });
            return newState;
          });
          toast.success(`Connected to gateway: ${gateway.name}`);
        } else {
          console.error(`Failed to connect to gateway: ${gateway.name}`);
          toast.error(`Failed to connect to gateway: ${gateway.name}`);
        }

        return success;
      } catch (error) {
        console.error(`Error connecting to gateway ${gatewayId}:`, error);
        toast.error(
          `Connection error: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
        return false;
      }
    },
    [gateways, manager]
  );

  // Disconnect from a gateway
  const disconnectFromGateway = useCallback(
    (gatewayId: string): void => {
      manager.disconnectFromGateway(gatewayId);
      setGatewayStates(prev => {
        const newState = new Map(prev);
        const currentState = prev.get(gatewayId);
        if (currentState) {
          newState.set(gatewayId, {
            ...currentState,
            state: ConnectionState.DISCONNECTED,
          });
        }
        return newState;
      });
      const gateway = gateways?.find(g => g._id === gatewayId);
      toast.info(`Disconnected from gateway: ${gateway?.name || gatewayId}`);
    },
    [gateways, manager]
  );

  // Disconnect from all gateways
  const disconnectAllGateways = useCallback((): void => {
    manager.disconnectAll();
    setGatewayStates(prev => {
      const newState = new Map(prev);
      for (const [gatewayId, state] of prev.entries()) {
        newState.set(gatewayId, {
          ...state,
          state: ConnectionState.DISCONNECTED,
        });
      }
      return newState;
    });
    toast.info('Disconnected from all gateways');
  }, [manager]);

  // Refresh connections to all gateways
  const refreshGatewayConnections = useCallback(async (): Promise<void> => {
    if (!gateways || gateways.length === 0) {
      console.log('No gateways available for connection');
      return;
    }

    console.log(`Refreshing connections for ${gateways.length} gateways`);

    // Try to connect to each gateway
    for (const gateway of gateways) {
      const currentState = manager.getGatewayState(gateway._id);
      console.log(`Gateway ${gateway.name} (${gateway._id}) state: ${currentState}`);

      if (
        currentState === ConnectionState.DISCONNECTED ||
        currentState === ConnectionState.FAILED
      ) {
        console.log(`Attempting to connect to gateway: ${gateway.name}`);
        await connectToGateway(gateway._id);
      }
    }
  }, [connectToGateway, gateways, manager]);

  // Gateway state getter
  const getGatewayState = useCallback(
    (gatewayId: string): ConnectionState => {
      return manager.getGatewayState(gatewayId);
    },
    [manager]
  );

  // Sensor connection state getter
  const isSensorConnected = useCallback(
    (sensorSerial: number): boolean => {
      return manager.isSensorConnected(sensorSerial);
    },
    [manager]
  );

  // Get connected sensors for a gateway
  const getConnectedSensors = useCallback(
    async (gatewayId: string): Promise<SensorData[]> => {
      try {
        return await manager.getConnectedSensors(gatewayId);
      } catch (error) {
        console.error(`Error getting connected sensors for gateway ${gatewayId}:`, error);
        toast.error(
          `Failed to get connected sensors: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
        return [];
      }
    },
    [manager]
  );

  // Take a vibration reading from a sensor
  const takeReading = useCallback(
    async (gatewayId: string, sensorSerial: number): Promise<ReadingData> => {
      try {
        toast.info(`Taking vibration reading from sensor ${sensorSerial}...`);
        const reading = await manager.takeReading(gatewayId, sensorSerial);
        toast.success(`Vibration reading complete for sensor ${sensorSerial}`);
        return reading;
      } catch (error) {
        console.error(`Error taking reading from sensor ${sensorSerial}:`, error);
        toast.error(
          `Failed to take reading: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
        throw error;
      }
    },
    [manager]
  );

  // Take a temperature reading from a sensor
  const takeTemperatureReading = useCallback(
    async (gatewayId: string, sensorSerial: number): Promise<TemperatureData> => {
      try {
        toast.info(`Taking temperature reading from sensor ${sensorSerial}...`);
        const reading = await manager.takeTemperatureReading(gatewayId, sensorSerial);
        toast.success(
          `Temperature reading complete for sensor ${sensorSerial}: ${reading.temperature}°C`
        );
        return reading;
      } catch (error) {
        console.error(`Error taking temperature reading from sensor ${sensorSerial}:`, error);
        toast.error(
          `Failed to take temperature reading: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
        throw error;
      }
    },
    [manager]
  );

  // Take a battery reading from a sensor
  const takeBatteryReading = useCallback(
    async (gatewayId: string, sensorSerial: number): Promise<BatteryData> => {
      try {
        toast.info(`Taking battery reading from sensor ${sensorSerial}...`);
        const reading = await manager.takeBatteryReading(gatewayId, sensorSerial);
        toast.success(`Battery reading complete for sensor ${sensorSerial}: ${reading.battery}%`);
        return reading;
      } catch (error) {
        console.error(`Error taking battery reading from sensor ${sensorSerial}:`, error);
        toast.error(
          `Failed to take battery reading: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
        throw error;
      }
    },
    [manager]
  );

  // Get historical readings for a sensor
  const getReadings = useCallback(
    async (gatewayId: string, sensorSerial: number, count: number = 10): Promise<ReadingData[]> => {
      try {
        return await manager.getReadings(gatewayId, sensorSerial, count);
      } catch (error) {
        console.error(`Error getting readings for sensor ${sensorSerial}:`, error);
        toast.error(
          `Failed to get readings: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
        return [];
      }
    },
    [manager]
  );

  // Get historical temperature readings for a sensor
  const getTemperatureReadings = useCallback(
    async (
      gatewayId: string,
      sensorSerial: number,
      count: number = 10
    ): Promise<TemperatureData[]> => {
      try {
        return await manager.getTemperatureReadings(gatewayId, sensorSerial, count);
      } catch (error) {
        console.error(`Error getting temperature readings for sensor ${sensorSerial}:`, error);
        toast.error(
          `Failed to get temperature readings: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
        return [];
      }
    },
    [manager]
  );

  // Get historical battery readings for a sensor
  const getBatteryReadings = useCallback(
    async (gatewayId: string, sensorSerial: number, count: number = 10): Promise<BatteryData[]> => {
      try {
        return await manager.getBatteryReadings(gatewayId, sensorSerial, count);
      } catch (error) {
        console.error(`Error getting battery readings for sensor ${sensorSerial}:`, error);
        toast.error(
          `Failed to get battery readings: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
        return [];
      }
    },
    [manager]
  );

  // Set up event listeners
  useEffect(() => {
    // Gateway connection events
    const handleGatewayConnected = (data: { gatewayId: string }) => {
      setGatewayStates(prev => {
        const newState = new Map(prev);
        const currentState = prev.get(data.gatewayId) || {
          gatewayId: data.gatewayId,
          state: ConnectionState.DISCONNECTED,
        };
        newState.set(data.gatewayId, {
          ...currentState,
          state: ConnectionState.CONNECTED,
          lastConnectedAt: new Date(),
        });
        return newState;
      });
    };

    const handleGatewayDisconnected = (data: { gatewayId: string }) => {
      setGatewayStates(prev => {
        const newState = new Map(prev);
        const currentState = prev.get(data.gatewayId);
        if (currentState) {
          newState.set(data.gatewayId, {
            ...currentState,
            state: ConnectionState.DISCONNECTED,
          });
        }
        return newState;
      });
    };

    const handleGatewayAuthenticated = (data: { gatewayId: string }) => {
      setGatewayStates(prev => {
        const newState = new Map(prev);
        const currentState = prev.get(data.gatewayId) || {
          gatewayId: data.gatewayId,
          state: ConnectionState.DISCONNECTED,
        };
        newState.set(data.gatewayId, {
          ...currentState,
          state: ConnectionState.AUTHENTICATED,
          lastAuthenticatedAt: new Date(),
        });
        return newState;
      });
    };

    // Sensor connection events
    const handleSensorConnected = (data: { gatewayId: string; serial: number }) => {
      setSensorStates(prev => {
        const newState = new Map(prev);
        const currentState = prev.get(data.serial) || {
          sensorSerial: data.serial,
          connected: false,
        };
        newState.set(data.serial, {
          ...currentState,
          connected: true,
          lastConnectedAt: new Date(),
        });
        return newState;
      });
    };

    const handleSensorDisconnected = (data: { gatewayId: string; serial: number }) => {
      setSensorStates(prev => {
        const newState = new Map(prev);
        const currentState = prev.get(data.serial);
        if (currentState) {
          newState.set(data.serial, {
            ...currentState,
            connected: false,
          });
        }
        return newState;
      });
    };

    // Register event listeners
    manager.addEventListener(
      WebSocketEvents.CONNECTED,
      handleGatewayConnected as (data: unknown) => void
    );
    manager.addEventListener(
      WebSocketEvents.DISCONNECTED,
      handleGatewayDisconnected as (data: unknown) => void
    );
    manager.addEventListener(
      WebSocketEvents.AUTHENTICATED,
      handleGatewayAuthenticated as (data: unknown) => void
    );
    manager.addEventListener(
      WebSocketEvents.SENSOR_CONNECTED,
      handleSensorConnected as (data: unknown) => void
    );
    manager.addEventListener(
      WebSocketEvents.SENSOR_DISCONNECTED,
      handleSensorDisconnected as (data: unknown) => void
    );

    // Cleanup function to remove event listeners
    return () => {
      manager.removeEventListener(
        WebSocketEvents.CONNECTED,
        handleGatewayConnected as (data: unknown) => void
      );
      manager.removeEventListener(
        WebSocketEvents.DISCONNECTED,
        handleGatewayDisconnected as (data: unknown) => void
      );
      manager.removeEventListener(
        WebSocketEvents.AUTHENTICATED,
        handleGatewayAuthenticated as (data: unknown) => void
      );
      manager.removeEventListener(
        WebSocketEvents.SENSOR_CONNECTED,
        handleSensorConnected as (data: unknown) => void
      );
      manager.removeEventListener(
        WebSocketEvents.SENSOR_DISCONNECTED,
        handleSensorDisconnected as (data: unknown) => void
      );
    };
  }, [manager]);

  // Initialize gateway states when gateways are loaded
  useEffect(() => {
    if (gateways && !isLoading) {
      const initialGatewayStates = new Map<string, GatewayConnectionState>();

      gateways.forEach(gateway => {
        initialGatewayStates.set(gateway._id, {
          gatewayId: gateway._id,
          state:
            gateway.status === 'authenticated'
              ? ConnectionState.AUTHENTICATED
              : gateway.status === 'connected'
                ? ConnectionState.CONNECTED
                : ConnectionState.DISCONNECTED,
          lastConnectedAt: gateway.lastConnectedAt ? new Date(gateway.lastConnectedAt) : undefined,
          lastAuthenticatedAt: gateway.lastAuthenticatedAt
            ? new Date(gateway.lastAuthenticatedAt)
            : undefined,
        });
      });

      setGatewayStates(initialGatewayStates);
    }
  }, [gateways, isLoading]);

  // Reconnect to gateways when component mounts or gateways change
  useEffect(() => {
    if (gateways && !isLoading) {
      refreshGatewayConnections().catch(console.error);
    }

    // Cleanup: disconnect from all gateways when component unmounts
    return () => {
      disconnectAllGateways();
    };
  }, [disconnectAllGateways, gateways, isLoading, refreshGatewayConnections]);

  // Create context value
  const contextValue: WebSocketContextValue = {
    connectToGateway,
    disconnectFromGateway,
    disconnectAllGateways,
    refreshGatewayConnections,
    gatewayStates,
    sensorStates,
    getConnectedSensors,
    takeReading,
    takeTemperatureReading,
    takeBatteryReading,
    getReadings,
    getTemperatureReadings,
    getBatteryReadings,
    getGatewayState,
    isSensorConnected,
  };

  return <WebSocketContext.Provider value={contextValue}>{children}</WebSocketContext.Provider>;
}

// Custom hook to use the WebSocket context
export function useGatewayWebSocket() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useGatewayWebSocket must be used within a GatewayWebSocketProvider');
  }
  return context;
}
