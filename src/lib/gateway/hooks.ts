'use client';

/**
 * Gateway Hooks
 *
 * Custom React hooks for interacting with gateway connections
 */
import { useContext, useEffect, useState, useCallback, useRef } from 'react';
import { GatewayContext } from './context';
import { GatewayConnectionState, GatewayConnection } from './types';
import { toast } from 'sonner';

/**
 * Hook to access the gateway service context
 * @returns Gateway service context
 */
export function useGatewayService() {
  const context = useContext(GatewayContext);

  if (!context) {
    throw new Error('useGatewayService must be used within a GatewayProvider');
  }

  return context;
}

/**
 * Hook to manage a gateway connection
 * @param gatewayId Gateway ID
 * @param autoConnect Whether to connect automatically
 * @returns Connection data and management functions
 */
export function useGatewayConnection(gatewayId: string, autoConnect = true) {
  const { service, connectToGateway, disconnectFromGateway, connectionState } = useGatewayService();
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
 * Generic type for topic data
 */
type TopicData<T> = {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  lastUpdated: Date | null;
};

/**
 * Hook to subscribe to a topic on a gateway
 * @param gatewayId Gateway ID
 * @param topic Topic to subscribe to
 * @param initialValue Initial value
 * @param validateData Optional validation function
 * @returns Topic data and subscription state
 */
export function useGatewayTopic<T = unknown>(
  gatewayId: string,
  topic: string,
  initialValue: T | null = null,
  validateData?: (data: unknown) => T
): TopicData<T> & { unsubscribe: () => void } {
  const { subscribeToTopic } = useGatewayService();
  const [data, setData] = useState<T | null>(initialValue);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Keep track of subscription with a ref so we can clean up
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Create unsubscribe function that cleans up the subscription
  const unsubscribe = useCallback(() => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
  }, []);

  // Effect to handle subscription
  useEffect(() => {
    // Clean up previous subscription
    unsubscribe();

    // Reset state
    setIsLoading(true);
    setError(null);

    try {
      // Subscribe to topic
      const unsubscribeFunc = subscribeToTopic(gatewayId, topic, newData => {
        try {
          // Validate data if validation function provided
          let validatedData: T;

          if (validateData) {
            try {
              validatedData = validateData(newData);
            } catch (validationError) {
              setError(
                validationError instanceof Error
                  ? validationError
                  : new Error(`Data validation error: ${validationError}`)
              );
              return;
            }
          } else {
            // No validation, use data as-is
            validatedData = newData as T;
          }

          // Update state
          setData(validatedData);
          setLastUpdated(new Date());
          setIsLoading(false);
          setError(null);
        } catch (error) {
          setError(error instanceof Error ? error : new Error('Error processing topic data'));
          setIsLoading(false);
        }
      });

      // Store unsubscribe function
      unsubscribeRef.current = unsubscribeFunc;
    } catch (error) {
      setError(error instanceof Error ? error : new Error('Error subscribing to topic'));
      setIsLoading(false);
    }

    // Clean up subscription on unmount or when dependencies change
    return unsubscribe;
  }, [gatewayId, topic, subscribeToTopic, validateData, unsubscribe]);

  return {
    data,
    isLoading,
    error,
    lastUpdated,
    unsubscribe,
  };
}

/**
 * Hook to send a command to a gateway
 * @param gatewayId Gateway ID
 * @returns Command function and state
 */
export function useGatewayCommand(gatewayId: string) {
  const { service } = useGatewayService();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const sendCommand = useCallback(
    async <T = unknown>(command: string, params?: Record<string, unknown>): Promise<T> => {
      const connection = service.getConnection(gatewayId);

      if (!connection) {
        const error = new Error(`Gateway ${gatewayId} not connected`);
        setError(error);
        toast.error(`Cannot send command: ${error.message}`);
        throw error;
      }

      if (connection.state !== 'authenticated') {
        const error = new Error(`Gateway ${gatewayId} not authenticated`);
        setError(error);
        toast.error(`Cannot send command: ${error.message}`);
        throw error;
      }

      setIsLoading(true);
      setError(null);

      try {
        const result = await connection.sendCommand<T>(command, params);
        return result;
      } catch (error) {
        setError(error instanceof Error ? error : new Error('Unknown error'));
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [service, gatewayId]
  );

  return {
    sendCommand,
    isLoading,
    error,
  };
}

/**
 * Hook to subscribe to multiple topics on a gateway
 * @param gatewayId Gateway ID
 * @param topicMap Map of topic keys to actual topics
 * @returns Map of topic data keyed by the keys from topicMap
 */
export function useGatewayTopics<T extends Record<string, unknown>>(
  gatewayId: string,
  topicMap: Record<keyof T, string>
): Record<keyof T, TopicData<unknown>> & { unsubscribeAll: () => void } {
  const { subscribeToTopic } = useGatewayService();

  // Create a state object for each topic
  const [topicStates, setTopicStates] = useState<Record<keyof T, TopicData<unknown>>>(() => {
    const initialStates: Record<string, TopicData<unknown>> = {};

    Object.keys(topicMap).forEach(key => {
      initialStates[key] = {
        data: null,
        isLoading: true,
        error: null,
        lastUpdated: null,
      };
    });

    return initialStates as Record<keyof T, TopicData<unknown>>;
  });

  // Keep track of subscriptions with a ref so we can clean up
  const unsubscribeFuncsRef = useRef<Record<string, () => void>>({});

  // Create unsubscribe function that cleans up all subscriptions
  const unsubscribeAll = useCallback(() => {
    Object.values(unsubscribeFuncsRef.current).forEach(unsubscribe => {
      unsubscribe();
    });
    unsubscribeFuncsRef.current = {};
  }, []);

  // Effect to handle subscriptions
  useEffect(() => {
    // Clean up previous subscriptions
    unsubscribeAll();

    // Subscribe to each topic
    Object.entries(topicMap).forEach(([key, topic]) => {
      try {
        // Subscribe to topic
        const unsubscribeFunc = subscribeToTopic(gatewayId, topic, newData => {
          setTopicStates(prev => ({
            ...prev,
            [key]: {
              data: newData,
              isLoading: false,
              error: null,
              lastUpdated: new Date(),
            },
          }));
        });

        // Store unsubscribe function
        unsubscribeFuncsRef.current[key] = unsubscribeFunc;
      } catch (error) {
        setTopicStates(prev => ({
          ...prev,
          [key]: {
            data: null,
            isLoading: false,
            error: error instanceof Error ? error : new Error('Error subscribing to topic'),
            lastUpdated: null,
          },
        }));
      }
    });

    // Clean up subscriptions on unmount or when dependencies change
    return unsubscribeAll;
  }, [gatewayId, topicMap, subscribeToTopic, unsubscribeAll]);

  return {
    ...topicStates,
    unsubscribeAll,
  };
}
