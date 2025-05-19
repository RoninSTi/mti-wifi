'use client';

import { GatewayResponse } from '@/app/api/gateways/schemas';
import React, { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  GatewayConnectionStatus,
  GatewayConnectionError,
  DynamicSensor,
  ResponseMessage,
  BaseMessage,
  getDynamicSensorsRequestSchema,
  dynamicSensorsResponseSchema,
} from './types';
import { GatewayService } from './gateway-service';

/**
 * Gateway context state interface
 */
export interface GatewayContextState {
  connections: Map<string, GatewayConnectionStatus>;
  errors: Map<string, GatewayConnectionError>;
  sensors: Map<string, DynamicSensor[]>;
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
  requestSensors: (gatewayId: string, serials?: number[]) => Promise<boolean>;
  refreshSensors: (gatewayId: string) => Promise<boolean>;
}

// Create the context with default values
export const GatewayContext = createContext<GatewayContextValue>({
  state: {
    connections: new Map(),
    errors: new Map(),
    sensors: new Map(),
    isLoading: false,
  },
  connect: async () => false,
  disconnect: () => {},
  getStatus: () => GatewayConnectionStatus.DISCONNECTED,
  getError: () => undefined,
  getSensors: () => [],
  requestSensors: async () => false,
  refreshSensors: async () => false,
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

    // Message handler for sensor data
    const onMessage = (data: { gatewayId: string; message: ResponseMessage | BaseMessage }) => {
      if (!isMounted.current) return;

      // Use Zod for validation specifically for RTN_DYN messages
      if (data.message.Type === 'RTN_DYN') {
        const result = dynamicSensorsResponseSchema.safeParse(data.message);
        if (result.success) {
          // Safe to use - properly typed through Zod inference
          setState(prev => {
            const newSensors = new Map(prev.sensors);
            newSensors.set(data.gatewayId, result.data.Data);
            return { ...prev, sensors: newSensors };
          });
        }
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

  // Create context value
  const contextValue = useMemo<GatewayContextValue>(
    () => ({
      state,
      connect,
      disconnect,
      getStatus,
      getError,
      getSensors,
      requestSensors,
      refreshSensors,
    }),
    [state, connect, disconnect, getStatus, getError, getSensors, requestSensors, refreshSensors]
  );

  return <GatewayContext.Provider value={contextValue}>{children}</GatewayContext.Provider>;
}
