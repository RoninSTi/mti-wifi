'use client';

import { GatewayResponse } from '@/app/api/gateways/schemas';
import React, { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  GatewayConnectionStatus,
  GatewayConnectionError,
  DynamicSensor,
  ResponseMessage,
  BaseMessage,
  VibrationReading,
  TemperatureReading,
  BatteryReading,
  getDynamicSensorsRequestSchema,
  dynamicSensorsResponseSchema,
  dynamicReadingsResponseSchema,
  dynamicTemperaturesResponseSchema,
  dynamicBatteriesResponseSchema,
  vibrationReadingCompleteNotificationSchema,
  temperatureReadingCompleteNotificationSchema,
  batteryReadingCompleteNotificationSchema,
  sensorConnectionNotificationSchema,
} from './types';
import { GatewayService } from './gateway-service';

/**
 * Gateway context state interface
 */
export interface GatewayContextState {
  connections: Map<string, GatewayConnectionStatus>;
  errors: Map<string, GatewayConnectionError>;
  sensors: Map<string, DynamicSensor[]>;
  vibrationReadings: Map<string, Record<string, VibrationReading>>;
  temperatureReadings: Map<string, Record<string, TemperatureReading>>;
  batteryReadings: Map<string, Record<string, BatteryReading>>;
  isLoading: boolean;
}

/**
 * Gateway context interface
 */
export interface GatewayContextValue {
  state: GatewayContextState;
  connect: (gateway: GatewayResponse) => Promise<boolean>;
  disconnect: (gatewayId: string, reason?: string) => void;
  getStatus: (gatewayId: string) => GatewayConnectionStatus;
  getError: (gatewayId: string) => GatewayConnectionError | undefined;
  getSensors: (gatewayId: string) => DynamicSensor[];
  getVibrationReadings: (gatewayId: string) => Record<string, VibrationReading>;
  getTemperatureReadings: (gatewayId: string) => Record<string, TemperatureReading>;
  getBatteryReadings: (gatewayId: string) => Record<string, BatteryReading>;
  requestSensors: (gatewayId: string, serials?: number[]) => Promise<boolean>;
  refreshSensors: (gatewayId: string) => Promise<boolean>;
  requestConnectedSensors: (gatewayId: string) => Promise<boolean>;
  isSensorConnected: (gatewayId: string, serial: number) => boolean;
  takeDynamicReading: (gatewayId: string, serial: number) => Promise<boolean>;
  takeDynamicTemperature: (gatewayId: string, serial: number) => Promise<boolean>;
  takeDynamicBattery: (gatewayId: string, serial: number) => Promise<boolean>;
  requestDynamicReadings: (
    gatewayId: string,
    options?: { serials?: number[]; start?: string; end?: string; max?: number }
  ) => Promise<boolean>;
  requestDynamicTemperatures: (
    gatewayId: string,
    options?: { serials?: number[]; start?: string; end?: string; max?: number }
  ) => Promise<boolean>;
  requestDynamicBatteries: (
    gatewayId: string,
    options?: { serials?: number[]; start?: string; end?: string; max?: number }
  ) => Promise<boolean>;
}

// Create the context with default values
export const GatewayContext = createContext<GatewayContextValue>({
  state: {
    connections: new Map(),
    errors: new Map(),
    sensors: new Map(),
    vibrationReadings: new Map(),
    temperatureReadings: new Map(),
    batteryReadings: new Map(),
    isLoading: false,
  },
  connect: async () => false,
  disconnect: () => {},
  getStatus: () => GatewayConnectionStatus.DISCONNECTED,
  getError: () => undefined,
  getSensors: () => [],
  getVibrationReadings: () => ({}),
  getTemperatureReadings: () => ({}),
  getBatteryReadings: () => ({}),
  requestSensors: async () => false,
  refreshSensors: async () => false,
  requestConnectedSensors: async () => false,
  isSensorConnected: () => false,
  takeDynamicReading: async () => false,
  takeDynamicTemperature: async () => false,
  takeDynamicBattery: async () => false,
  requestDynamicReadings: async () => false,
  requestDynamicTemperatures: async () => false,
  requestDynamicBatteries: async () => false,
});

/**
 * Gateway context provider props
 */
export interface GatewayProviderProps {
  children: React.ReactNode;
}

/**
 * Gateway context provider component
 */
export function GatewayProvider({ children }: GatewayProviderProps) {
  // Get gateway service instance
  const gatewayService = useRef(GatewayService.getInstance());

  // Initialize state
  const [state, setState] = useState<GatewayContextState>({
    connections: new Map(),
    errors: new Map(),
    sensors: new Map(),
    vibrationReadings: new Map(),
    temperatureReadings: new Map(),
    batteryReadings: new Map(),
    isLoading: false,
  });

  // Flag for component mounted state
  const isMounted = useRef(true);

  // Set up event handlers
  useEffect(() => {
    const service = gatewayService.current;

    // Status change handler
    const onStatusChange = (data: { gatewayId: string; status: GatewayConnectionStatus }) => {
      if (!isMounted.current) return;

      setState(prev => {
        const newConnections = new Map(prev.connections);
        newConnections.set(data.gatewayId, data.status);
        return { ...prev, connections: newConnections };
      });
    };

    // Error handler
    const onError = (data: { gatewayId: string; error: GatewayConnectionError }) => {
      if (!isMounted.current) return;

      setState(prev => {
        const newErrors = new Map(prev.errors);
        newErrors.set(data.gatewayId, data.error);
        return { ...prev, errors: newErrors };
      });
    };

    // Message handler for sensor data and readings
    const onMessage = (data: { gatewayId: string; message: ResponseMessage | BaseMessage }) => {
      if (!isMounted.current) return;

      // Handle different message types based on their Type property
      switch (data.message.Type) {
        case 'RTN_DYN':
          // Use Zod for validation specifically for RTN_DYN messages
          const result = dynamicSensorsResponseSchema.safeParse(data.message);
          if (result.success) {
            // Safe to use - properly typed through Zod inference
            setState(prev => {
              const newSensors = new Map(prev.sensors);
              newSensors.set(data.gatewayId, result.data.Data);
              return { ...prev, sensors: newSensors };
            });
          }
          break;

        case 'RTN_DYN_READINGS':
          // Vibration readings - use Zod validation
          try {
            const result = dynamicReadingsResponseSchema.safeParse(data.message);
            if (result.success) {
              setState(prev => {
                const newVibrationReadings = new Map(prev.vibrationReadings);
                newVibrationReadings.set(data.gatewayId, result.data.Data);
                return { ...prev, vibrationReadings: newVibrationReadings };
              });
            }
          } catch (error) {
            console.error('Failed to validate vibration readings', error);
          }
          break;

        case 'RTN_DYN_TEMPS':
          // Temperature readings - use Zod validation
          try {
            const result = dynamicTemperaturesResponseSchema.safeParse(data.message);
            if (result.success) {
              setState(prev => {
                const newTemperatureReadings = new Map(prev.temperatureReadings);
                newTemperatureReadings.set(data.gatewayId, result.data.Data);
                return { ...prev, temperatureReadings: newTemperatureReadings };
              });
            }
          } catch (error) {
            console.error('Failed to validate temperature readings', error);
          }
          break;

        case 'RTN_DYN_BATTS':
          // Battery readings - use Zod validation
          try {
            const result = dynamicBatteriesResponseSchema.safeParse(data.message);
            if (result.success) {
              setState(prev => {
                const newBatteryReadings = new Map(prev.batteryReadings);
                newBatteryReadings.set(data.gatewayId, result.data.Data);
                return { ...prev, batteryReadings: newBatteryReadings };
              });
            }
          } catch (error) {
            console.error('Failed to validate battery readings', error);
          }
          break;

        case 'NOT_DYN_CONN':
          // Sensor connection notification
          try {
            // Validate the message
            const connNotification = sensorConnectionNotificationSchema.safeParse(data.message);
            if (connNotification.success) {
              const { Serial, Connected } = connNotification.data.Data;

              // If a sensor just connected, automatically request temperature and battery readings
              if (Connected) {
                console.log(
                  `Sensor ${Serial} connected to gateway ${data.gatewayId}. Requesting initial readings.`
                );

                // Create a small delay to ensure connection is fully established before requesting readings
                setTimeout(() => {
                  const service = gatewayService.current;

                  // Request temperature reading first
                  const tempResult = service.takeDynamicTemperature(data.gatewayId, Serial);
                  console.log(
                    `Automatic temperature reading request for sensor ${Serial}: ${tempResult ? 'sent' : 'failed'}`
                  );

                  // Then request battery reading after a small delay
                  setTimeout(() => {
                    const battResult = service.takeDynamicBattery(data.gatewayId, Serial);
                    console.log(
                      `Automatic battery reading request for sensor ${Serial}: ${battResult ? 'sent' : 'failed'}`
                    );
                  }, 500);
                }, 500);
              }
            }
          } catch (error) {
            console.error(
              'Error handling sensor connection notification:',
              error instanceof Error ? error.message : 'Unknown error'
            );
          }
          break;

        case 'NOT_DYN_READING':
          // Single vibration reading notification - add to existing readings
          try {
            const vibrationNotification = vibrationReadingCompleteNotificationSchema.safeParse(
              data.message
            );
            if (vibrationNotification.success) {
              const { ID, Serial, Time, X, Y, Z } = vibrationNotification.data.Data;

              // Update the vibration readings state
              setState(prev => {
                const newVibrationReadings = new Map(prev.vibrationReadings);
                const currentReadings = newVibrationReadings.get(data.gatewayId) || {};

                // Add this reading to the current readings
                newVibrationReadings.set(data.gatewayId, {
                  ...currentReadings,
                  [ID.toString()]: { ID, Serial, Time, X, Y, Z },
                });

                return { ...prev, vibrationReadings: newVibrationReadings };
              });

              console.log(`Received vibration reading for sensor ${Serial}`);
            }
          } catch (error) {
            console.error(
              'Error handling vibration reading notification:',
              error instanceof Error ? error.message : 'Unknown error'
            );
          }
          break;

        case 'NOT_DYN_TEMP':
          // Single temperature reading notification - add to existing readings
          try {
            const tempNotification = temperatureReadingCompleteNotificationSchema.safeParse(
              data.message
            );
            if (tempNotification.success) {
              const { ID, Serial, Time, Temp } = tempNotification.data.Data;

              // Update the temperature readings state
              setState(prev => {
                const newTemperatureReadings = new Map(prev.temperatureReadings);
                const currentReadings = newTemperatureReadings.get(data.gatewayId) || {};

                // Add this reading to the current readings
                newTemperatureReadings.set(data.gatewayId, {
                  ...currentReadings,
                  [ID.toString()]: { ID, Serial, Time, Temp },
                });

                return { ...prev, temperatureReadings: newTemperatureReadings };
              });

              console.log(`Received temperature reading for sensor ${Serial}: ${Temp}`);
            }
          } catch (error) {
            console.error(
              'Error handling temperature reading notification:',
              error instanceof Error ? error.message : 'Unknown error'
            );
          }
          break;

        case 'NOT_DYN_BATT':
          // Single battery reading notification - add to existing readings
          try {
            const battNotification = batteryReadingCompleteNotificationSchema.safeParse(
              data.message
            );
            if (battNotification.success) {
              const { ID, Serial, Time, Batt } = battNotification.data.Data;

              // Update the battery readings state
              setState(prev => {
                const newBatteryReadings = new Map(prev.batteryReadings);
                const currentReadings = newBatteryReadings.get(data.gatewayId) || {};

                // Add this reading to the current readings
                newBatteryReadings.set(data.gatewayId, {
                  ...currentReadings,
                  [ID.toString()]: { ID, Serial, Time, Batt },
                });

                return { ...prev, batteryReadings: newBatteryReadings };
              });

              console.log(`Received battery reading for sensor ${Serial}: ${Batt}`);
            }
          } catch (error) {
            console.error(
              'Error handling battery reading notification:',
              error instanceof Error ? error.message : 'Unknown error'
            );
          }
          break;
      }
    };

    // Subscribe to events
    const unsubStatus = service.on('status_change', onStatusChange);
    const unsubError = service.on('error', onError);
    const unsubMessage = service.on('message', onMessage);

    // Initial state setup
    setState(prev => ({
      ...prev,
      connections: service.getConnections(),
    }));

    // Cleanup on unmount
    return () => {
      isMounted.current = false;
      unsubStatus();
      unsubError();
      unsubMessage();
    };
  }, []);

  // Connect function
  const connect = useCallback(async (gateway: GatewayResponse) => {
    setState(prev => ({ ...prev, isLoading: true }));
    try {
      const result = await gatewayService.current.connect(gateway);
      return result;
    } finally {
      if (isMounted.current) {
        setState(prev => ({ ...prev, isLoading: false }));
      }
    }
  }, []);

  // Disconnect function
  const disconnect = useCallback((gatewayId: string, reason?: string) => {
    gatewayService.current.disconnect(gatewayId, reason);
  }, []);

  // Get status function
  const getStatus = useCallback(
    (gatewayId: string) => {
      return state.connections.get(gatewayId) || GatewayConnectionStatus.DISCONNECTED;
    },
    [state.connections]
  );

  // Get error function
  const getError = useCallback(
    (gatewayId: string) => {
      return state.errors.get(gatewayId);
    },
    [state.errors]
  );

  // Get sensors function
  const getSensors = useCallback(
    (gatewayId: string) => {
      return state.sensors.get(gatewayId) || [];
    },
    [state.sensors]
  );

  // Request sensors function
  const requestSensors = useCallback(async (gatewayId: string, serials?: number[]) => {
    const service = gatewayService.current;
    const status = service.getStatus(gatewayId);

    if (status !== GatewayConnectionStatus.AUTHENTICATED) {
      return false;
    }

    try {
      // Use Zod to create and validate the request message
      const getDynRequest = getDynamicSensorsRequestSchema.parse({
        Type: 'GET_DYN',
        From: 'UI',
        To: 'SERV',
        Data: {
          Serials: serials || [],
        },
      });

      return service.sendMessage(gatewayId, getDynRequest);
    } catch (error) {
      console.error(
        'Invalid sensor request format:',
        error instanceof Error ? error.message : 'Unknown error'
      );
      return false;
    }
  }, []);

  // Refresh sensors function
  const refreshSensors = useCallback(
    async (gatewayId: string) => {
      return requestSensors(gatewayId);
    },
    [requestSensors]
  );

  // Request connected sensors function
  const requestConnectedSensors = useCallback(async (gatewayId: string) => {
    const service = gatewayService.current;
    const status = service.getStatus(gatewayId);

    if (status !== GatewayConnectionStatus.AUTHENTICATED) {
      console.warn(
        `Cannot request connected sensors for gateway ${gatewayId}: Not authenticated (current status: ${status})`
      );
      return false;
    }

    return service.getConnectedSensors(gatewayId);
  }, []);

  // Check if a sensor is connected
  const isSensorConnected = useCallback(
    (gatewayId: string, serial: number) => {
      const sensors = getSensors(gatewayId);
      // Find the sensor with the matching serial number
      const sensor = sensors.find(s => s.Serial === serial);

      // Return true if sensor exists and Connected is true or 1
      return !!sensor && (sensor.Connected === true || sensor.Connected === 1);
    },
    [getSensors]
  );

  // Get vibration readings function
  const getVibrationReadings = useCallback(
    (gatewayId: string) => {
      return state.vibrationReadings.get(gatewayId) || {};
    },
    [state.vibrationReadings]
  );

  // Get temperature readings function
  const getTemperatureReadings = useCallback(
    (gatewayId: string) => {
      return state.temperatureReadings.get(gatewayId) || {};
    },
    [state.temperatureReadings]
  );

  // Get battery readings function
  const getBatteryReadings = useCallback(
    (gatewayId: string) => {
      return state.batteryReadings.get(gatewayId) || {};
    },
    [state.batteryReadings]
  );

  // Take dynamic vibration reading
  const takeDynamicReading = useCallback(async (gatewayId: string, serial: number) => {
    const service = gatewayService.current;
    return service.takeDynamicReading(gatewayId, serial);
  }, []);

  // Take dynamic temperature reading
  const takeDynamicTemperature = useCallback(async (gatewayId: string, serial: number) => {
    const service = gatewayService.current;
    return service.takeDynamicTemperature(gatewayId, serial);
  }, []);

  // Take dynamic battery reading
  const takeDynamicBattery = useCallback(async (gatewayId: string, serial: number) => {
    const service = gatewayService.current;
    return service.takeDynamicBattery(gatewayId, serial);
  }, []);

  // Request dynamic vibration readings
  const requestDynamicReadings = useCallback(
    async (
      gatewayId: string,
      options?: { serials?: number[]; start?: string; end?: string; max?: number }
    ) => {
      const service = gatewayService.current;
      return service.getDynamicReadings(gatewayId, options);
    },
    []
  );

  // Request dynamic temperature readings
  const requestDynamicTemperatures = useCallback(
    async (
      gatewayId: string,
      options?: { serials?: number[]; start?: string; end?: string; max?: number }
    ) => {
      const service = gatewayService.current;
      return service.getDynamicTemperatures(gatewayId, options);
    },
    []
  );

  // Request dynamic battery readings
  const requestDynamicBatteries = useCallback(
    async (
      gatewayId: string,
      options?: { serials?: number[]; start?: string; end?: string; max?: number }
    ) => {
      const service = gatewayService.current;
      return service.getDynamicBatteries(gatewayId, options);
    },
    []
  );

  // Create context value
  const contextValue = useMemo<GatewayContextValue>(
    () => ({
      state,
      connect,
      disconnect,
      getStatus,
      getError,
      getSensors,
      getVibrationReadings,
      getTemperatureReadings,
      getBatteryReadings,
      requestSensors,
      refreshSensors,
      requestConnectedSensors,
      isSensorConnected,
      takeDynamicReading,
      takeDynamicTemperature,
      takeDynamicBattery,
      requestDynamicReadings,
      requestDynamicTemperatures,
      requestDynamicBatteries,
    }),
    [
      state,
      connect,
      disconnect,
      getStatus,
      getError,
      getSensors,
      getVibrationReadings,
      getTemperatureReadings,
      getBatteryReadings,
      requestSensors,
      refreshSensors,
      requestConnectedSensors,
      isSensorConnected,
      takeDynamicReading,
      takeDynamicTemperature,
      takeDynamicBattery,
      requestDynamicReadings,
      requestDynamicTemperatures,
      requestDynamicBatteries,
    ]
  );

  return <GatewayContext.Provider value={contextValue}>{children}</GatewayContext.Provider>;
}
