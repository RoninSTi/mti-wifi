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
  dynamicSensorSchema,
  dynamicReadingsResponseSchema,
  dynamicTemperaturesResponseSchema,
  dynamicBatteriesResponseSchema,
  vibrationReadingCompleteNotificationSchema,
  temperatureReadingCompleteNotificationSchema,
  batteryReadingCompleteNotificationSchema,
  sensorConnectionNotificationSchema,
} from './types';
import {
  detailedVibrationReadingsResponseSchema,
  DetailedVibrationReading,
} from './types-vibration';
import { GatewayService } from './gateway-service';

/**
 * Gateway context state interface
 */
export interface GatewayContextState {
  connections: Map<string, GatewayConnectionStatus>;
  errors: Map<string, GatewayConnectionError>;
  sensors: Map<string, DynamicSensor[]>;
  vibrationReadings: Map<string, Record<string, VibrationReading>>;
  detailedVibrationReadings: Map<string, Record<string, DetailedVibrationReading>>;
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
  getDetailedVibrationReadings: (gatewayId: string) => Record<string, DetailedVibrationReading>;
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
    detailedVibrationReadings: new Map(),
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
  getDetailedVibrationReadings: () => ({}),
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
    detailedVibrationReadings: new Map(),
    temperatureReadings: new Map(),
    batteryReadings: new Map(),
    isLoading: false,
  });

  // Flag for component mounted state
  const isMounted = useRef(true);

  // We'll initialize this function later with useCallback
  const requestConnectedSensorsRef = useRef<(gatewayId: string) => Promise<boolean>>(
    async () => false
  );

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
          try {
            // Use the dynamicSensorsResponseSchema from types.ts to validate the data
            const parseResult = dynamicSensorsResponseSchema.safeParse(data.message);

            if (parseResult.success) {
              // Extract the sensors data using the validated schema
              let sensorsArray: DynamicSensor[] = [];

              if (Array.isArray(parseResult.data.Data)) {
                // Direct array format
                sensorsArray = parseResult.data.Data;
              } else if (typeof parseResult.data.Data === 'object') {
                // Object format that might contain arrays
                const possibleArrays = Object.values(parseResult.data.Data).filter(Array.isArray);
                if (possibleArrays.length > 0) {
                  // Validate the array elements using the schema
                  const arrayData = possibleArrays[0];
                  // Parse each array item through the schema
                  const validItems = arrayData
                    .map(item => {
                      const result = dynamicSensorSchema.safeParse(item);
                      return result.success ? result.data : null;
                    })
                    .filter((item): item is DynamicSensor => item !== null);

                  sensorsArray = validItems;
                }
              }

              if (sensorsArray.length > 0) {
                setState(prev => {
                  const newSensors = new Map(prev.sensors);

                  // Process the validated sensors data - keep original properties
                  const validSensors = sensorsArray.filter(sensor => sensor.Serial !== undefined);

                  // Save to state
                  newSensors.set(data.gatewayId, validSensors);
                  return { ...prev, sensors: newSensors };
                });
              }
            } else {
              console.warn('RTN_DYN message has no usable sensor data:', data.message);
            }
          } catch (error) {
            console.error('Error processing RTN_DYN message:', error);
          }
          break;

        case 'RTN_DYN_READINGS':
          // First try to parse as detailed vibration readings
          try {
            console.log('Processing RTN_DYN_READINGS as detailed data:', data.message);
            const detailedResult = detailedVibrationReadingsResponseSchema.safeParse(data.message);
            if (detailedResult.success) {
              setState(prev => {
                const newDetailedVibrationReadings = new Map(prev.detailedVibrationReadings);

                // Convert array to record format for compatibility with existing code
                const readingsRecord: Record<string, DetailedVibrationReading> = {};
                detailedResult.data.Data.forEach(reading => {
                  readingsRecord[reading.ID.toString()] = reading;
                });

                console.log(
                  `Processed ${Object.keys(readingsRecord).length} detailed vibration readings`
                );
                newDetailedVibrationReadings.set(data.gatewayId, readingsRecord);

                // Also update the simple vibration readings for compatibility
                const newVibrationReadings = new Map(prev.vibrationReadings);
                const simpleReadingsRecord: Record<string, VibrationReading> = {};

                detailedResult.data.Data.forEach(reading => {
                  // Convert detailed reading to simple format
                  simpleReadingsRecord[reading.ID.toString()] = {
                    ID: reading.ID,
                    Serial: reading.Serial,
                    Time: reading.Time,
                    X: `${reading.Xpk}`, // Convert to string format
                    Y: `${reading.Ypk}`,
                    Z: `${reading.Zpk}`,
                  };
                });

                newVibrationReadings.set(data.gatewayId, simpleReadingsRecord);

                return {
                  ...prev,
                  detailedVibrationReadings: newDetailedVibrationReadings,
                  vibrationReadings: newVibrationReadings,
                };
              });
            } else {
              // If not detailed format, try the simple format
              console.log('Not a detailed format, trying simple format...');
              try {
                const result = dynamicReadingsResponseSchema.safeParse(data.message);
                if (result.success) {
                  setState(prev => {
                    const newVibrationReadings = new Map(prev.vibrationReadings);

                    // Convert array to record format for compatibility with existing code
                    const readingsRecord: Record<string, VibrationReading> = {};
                    result.data.Data.forEach(reading => {
                      readingsRecord[reading.ID.toString()] = reading;
                    });

                    newVibrationReadings.set(data.gatewayId, readingsRecord);
                    return { ...prev, vibrationReadings: newVibrationReadings };
                  });
                }
              } catch (error) {
                console.error('Failed to validate vibration readings (simple format)', error);
              }
            }
          } catch (error) {
            console.error('Failed to validate detailed vibration readings', error);
          }
          break;

        case 'RTN_DYN_TEMPS':
          // Temperature readings - use Zod validation
          try {
            console.log('Processing RTN_DYN_TEMPS:', data.message);
            const result = dynamicTemperaturesResponseSchema.safeParse(data.message);
            if (result.success) {
              setState(prev => {
                const newTemperatureReadings = new Map(prev.temperatureReadings);

                // Convert array to record format for compatibility with existing code
                const readingsRecord: Record<string, TemperatureReading> = {};
                result.data.Data.forEach(reading => {
                  readingsRecord[reading.ID.toString()] = reading;
                });

                newTemperatureReadings.set(data.gatewayId, readingsRecord);
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
            console.log('Processing RTN_DYN_BATTS:', data.message);
            const result = dynamicBatteriesResponseSchema.safeParse(data.message);
            if (result.success) {
              setState(prev => {
                const newBatteryReadings = new Map(prev.batteryReadings);

                // Convert array to record format for compatibility with existing code
                const readingsRecord: Record<string, BatteryReading> = {};
                result.data.Data.forEach(reading => {
                  readingsRecord[reading.ID.toString()] = reading;
                });

                console.log('Saving battery readings to context:', {
                  gatewayId: data.gatewayId,
                  readingsCount: Object.keys(readingsRecord).length,
                  readings: readingsRecord,
                });

                newBatteryReadings.set(data.gatewayId, readingsRecord);
                return { ...prev, batteryReadings: newBatteryReadings };
              });
            }
          } catch (error) {
            console.error('Failed to validate battery readings', error);
            console.error('Validation error details:', error);
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
            console.log('Parsing vibration notification:', JSON.stringify(data.message));
            const vibrationNotification = vibrationReadingCompleteNotificationSchema.safeParse(
              data.message
            );

            if (vibrationNotification.success) {
              console.log('Successfully parsed vibration notification');

              // The data contains a record of readings keyed by some ID
              const readings = Object.values(vibrationNotification.data.Data);

              // Process each reading in the record
              readings.forEach(reading => {
                const { ID, Serial, Time, X, Y, Z } = reading;

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
              });
            } else {
              console.error(
                'Failed to parse vibration reading notification:',
                vibrationNotification.error
              );
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
            console.log('Parsing temperature notification:', JSON.stringify(data.message));
            const tempNotification = temperatureReadingCompleteNotificationSchema.safeParse(
              data.message
            );

            if (tempNotification.success) {
              console.log('Successfully parsed temperature notification');

              // The data contains a record of readings keyed by some ID
              const readings = Object.values(tempNotification.data.Data);

              // Process each reading in the record
              readings.forEach(reading => {
                const { ID, Serial, Time, Temp } = reading;

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

                console.log(`Received temperature reading for sensor ${Serial}: ${Temp}°C`);
              });
            } else {
              console.error(
                'Failed to parse temperature reading notification:',
                tempNotification.error
              );
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
            console.log('Parsing battery notification:', JSON.stringify(data.message));
            const battNotification = batteryReadingCompleteNotificationSchema.safeParse(
              data.message
            );

            if (battNotification.success) {
              console.log('Successfully parsed battery notification');

              // The data contains a record of readings keyed by some ID
              const readings = Object.values(battNotification.data.Data);

              // Process each reading in the record
              readings.forEach(reading => {
                const { ID, Serial, Time, Batt } = reading;

                // Update the battery readings state
                setState(prev => {
                  const newBatteryReadings = new Map(prev.batteryReadings);
                  const currentReadings = newBatteryReadings.get(data.gatewayId) || {};

                  // Add this reading to the current readings
                  const updatedReadings = {
                    ...currentReadings,
                    [ID.toString()]: { ID, Serial, Time, Batt },
                  };

                  console.log(
                    `Updating battery reading for sensor ${Serial} in gateway ${data.gatewayId}:`,
                    {
                      batteryLevel: Batt,
                      readingCount: Object.keys(updatedReadings).length,
                      timestamp: new Date().toISOString(),
                    }
                  );

                  newBatteryReadings.set(data.gatewayId, updatedReadings);

                  return { ...prev, batteryReadings: newBatteryReadings };
                });

                console.log(`Received battery reading for sensor ${Serial}: ${Batt}%`);
              });
            } else {
              console.error(
                'Failed to parse battery reading notification:',
                battNotification.error
              );
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

    // Set up requestConnectedSensorsRef to use the service's getConnectedSensors method
    requestConnectedSensorsRef.current = async (gatewayId: string) => {
      const status = service.getStatus(gatewayId);
      if (status !== GatewayConnectionStatus.AUTHENTICATED) {
        console.warn(
          `Cannot request connected sensors for gateway ${gatewayId}: Not authenticated (current status: ${status})`
        );
        return false;
      }

      return service.getConnectedSensors(gatewayId);
    };

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
    return requestConnectedSensorsRef.current(gatewayId);
  }, []);

  // Check if a sensor is connected by looking at its Connected property
  const isSensorConnected = useCallback(
    (gatewayId: string, serial: number) => {
      const sensors = getSensors(gatewayId);
      // Check if the sensor exists and has Connected = 1 or true
      return sensors.some(s => s.Serial === serial && (s.Connected === 1 || s.Connected === true));
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

  // Get detailed vibration readings function
  const getDetailedVibrationReadings = useCallback(
    (gatewayId: string) => {
      return state.detailedVibrationReadings.get(gatewayId) || {};
    },
    [state.detailedVibrationReadings]
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
      getDetailedVibrationReadings,
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
      getDetailedVibrationReadings,
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

  // This effect is no longer needed - requestConnectedSensorsRef is set up in the main effect

  return <GatewayContext.Provider value={contextValue}>{children}</GatewayContext.Provider>;
}
