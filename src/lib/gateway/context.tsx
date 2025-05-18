'use client';

/**
 * Gateway Context Provider
 *
 * Provides React context for gateway connections and state management
 */
import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { gatewayService } from './gateway-service';
import { GatewayConnection, GatewayConnectionState, GatewayServiceContext } from './types';
import { toast } from 'sonner';

// Create context with a default implementation
const initialContext: GatewayServiceContext = {
  service: gatewayService,
  connectToGateway: async () => {
    throw new Error('Gateway context not initialized');
  },
  disconnectFromGateway: async () => {
    throw new Error('Gateway context not initialized');
  },
  connectionState: {},
  subscribeToTopic: () => {
    return () => {}; // No-op unsubscribe function
  },
};

// Create the context
export const GatewayContext = createContext<GatewayServiceContext>(initialContext);

interface GatewayProviderProps {
  children: React.ReactNode;
}

/**
 * Gateway Provider component
 */
export function GatewayProvider({ children }: GatewayProviderProps) {
  // Track connection states
  const [connectionState, setConnectionState] = useState<Record<string, GatewayConnectionState>>(
    {}
  );

  // Connect to a gateway
  const connectToGateway = useCallback(async (gatewayId: string): Promise<GatewayConnection> => {
    try {
      const connection = await gatewayService.connect(gatewayId);
      return connection;
    } catch (error) {
      toast.error(
        `Failed to connect to gateway: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      throw error;
    }
  }, []);

  // Disconnect from a gateway
  const disconnectFromGateway = useCallback(async (gatewayId: string): Promise<void> => {
    try {
      await gatewayService.disconnect(gatewayId);
    } catch (error) {
      console.error(`Error disconnecting from gateway ${gatewayId}:`, error);
    }
  }, []);

  // Subscribe to a topic on a gateway
  const subscribeToTopic = useCallback(
    (gatewayId: string, topic: string, callback: (data: unknown) => void): (() => void) => {
      const connection = gatewayService.getConnection(gatewayId);

      if (!connection) {
        toast.error(`Cannot subscribe: Gateway ${gatewayId} not connected`);
        return () => {}; // Return no-op function
      }

      // First, ensure we're subscribed on the gateway
      connection.subscribe([topic]).catch(error => {
        toast.error(
          `Failed to subscribe to topic ${topic}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      });

      // Then set up the data listener
      return connection.onData(topic, callback);
    },
    []
  );

  // Set up state tracking
  useEffect(() => {
    // Keep track of our listeners so we can clean them up
    const unsubscribeFunctions: (() => void)[] = [];

    // Function to track a gateway's state
    const trackGatewayState = (gatewayId: string) => {
      const unsubscribe = gatewayService.onConnectionStateChange(gatewayId, state => {
        setConnectionState(prev => ({
          ...prev,
          [gatewayId]: state,
        }));
      });

      unsubscribeFunctions.push(unsubscribe);
    };

    // Track existing connections
    gatewayService.getAllConnections().forEach(connection => {
      trackGatewayState(connection.id);
    });

    // Clean up on unmount
    return () => {
      unsubscribeFunctions.forEach(unsubscribe => unsubscribe());
    };
  }, []);

  // Create context value
  const contextValue = useMemo<GatewayServiceContext>(
    () => ({
      service: gatewayService,
      connectToGateway,
      disconnectFromGateway,
      connectionState,
      subscribeToTopic,
    }),
    [connectToGateway, disconnectFromGateway, connectionState, subscribeToTopic]
  );

  return <GatewayContext.Provider value={contextValue}>{children}</GatewayContext.Provider>;
}
