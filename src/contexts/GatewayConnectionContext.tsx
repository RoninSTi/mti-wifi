'use client';

import React, {
  createContext,
  useReducer,
  useContext,
  ReactNode,
  useCallback,
  useEffect,
} from 'react';
import { ctcApiService } from '@/lib/ctc/ctcApiService';
import { toast } from 'sonner';
import { GatewayResponse } from '@/app/api/gateways/schemas';
import { useUpdateGateway } from '@/hooks';

// Define the types for our context
interface GatewayConnection {
  gateway: GatewayResponse | null;
  status:
    | 'disconnected'
    | 'connecting'
    | 'connected'
    | 'authenticating'
    | 'authenticated'
    | 'error';
  error: string | null;
}

type ConnectionMap = Record<string, GatewayConnection>;

interface GatewayConnectionState {
  connections: ConnectionMap;
  activeGateway: string | null;
}

// Define action types
type GatewayConnectionAction =
  | { type: 'CONNECT_START'; payload: { gateway: GatewayResponse } }
  | { type: 'CONNECT_SUCCESS'; payload: { gatewayId: string } }
  | { type: 'CONNECT_ERROR'; payload: { gatewayId: string; error: string } }
  | { type: 'AUTH_START'; payload: { gatewayId: string } }
  | { type: 'AUTH_SUCCESS'; payload: { gatewayId: string; withWarning?: string } }
  | { type: 'AUTH_ERROR'; payload: { gatewayId: string; error: string } }
  | { type: 'DISCONNECT'; payload: { gatewayId: string } }
  | { type: 'SET_ACTIVE_GATEWAY'; payload: { gatewayId: string | null } };

// Define context type
interface GatewayConnectionContextType {
  state: GatewayConnectionState;
  connectToGateway: (gateway: GatewayResponse) => Promise<void>;
  disconnectFromGateway: (gatewayId: string) => void;
  setActiveGateway: (gatewayId: string | null) => void;
}

// Create context
const GatewayConnectionContext = createContext<GatewayConnectionContextType | undefined>(undefined);

// Reducer function
function gatewayConnectionReducer(
  state: GatewayConnectionState,
  action: GatewayConnectionAction
): GatewayConnectionState {
  switch (action.type) {
    case 'CONNECT_START':
      return {
        ...state,
        connections: {
          ...state.connections,
          [action.payload.gateway._id]: {
            gateway: action.payload.gateway,
            status: 'connecting',
            error: null,
          },
        },
      };
    case 'CONNECT_SUCCESS':
      return {
        ...state,
        connections: {
          ...state.connections,
          [action.payload.gatewayId]: {
            ...state.connections[action.payload.gatewayId],
            status: 'connected',
            error: null,
          },
        },
      };
    case 'CONNECT_ERROR':
      return {
        ...state,
        connections: {
          ...state.connections,
          [action.payload.gatewayId]: {
            ...state.connections[action.payload.gatewayId],
            status: 'error',
            error: action.payload.error,
          },
        },
      };
    case 'AUTH_START':
      return {
        ...state,
        connections: {
          ...state.connections,
          [action.payload.gatewayId]: {
            ...state.connections[action.payload.gatewayId],
            status: 'authenticating',
          },
        },
      };
    case 'AUTH_SUCCESS':
      return {
        ...state,
        connections: {
          ...state.connections,
          [action.payload.gatewayId]: {
            ...state.connections[action.payload.gatewayId],
            status: 'authenticated',
            error: action.payload.withWarning || null,
          },
        },
      };
    case 'AUTH_ERROR':
      return {
        ...state,
        connections: {
          ...state.connections,
          [action.payload.gatewayId]: {
            ...state.connections[action.payload.gatewayId],
            status: 'error',
            error: action.payload.error,
          },
        },
      };
    case 'DISCONNECT':
      return {
        ...state,
        connections: {
          ...state.connections,
          [action.payload.gatewayId]: {
            ...state.connections[action.payload.gatewayId],
            status: 'disconnected',
            error: null,
          },
        },
        activeGateway:
          state.activeGateway === action.payload.gatewayId ? null : state.activeGateway,
      };
    case 'SET_ACTIVE_GATEWAY':
      return {
        ...state,
        activeGateway: action.payload.gatewayId,
      };
    default:
      return state;
  }
}

// Provider component
interface GatewayConnectionProviderProps {
  children: ReactNode;
}

export function GatewayConnectionProvider({ children }: GatewayConnectionProviderProps) {
  const [state, dispatch] = useReducer(gatewayConnectionReducer, {
    connections: {},
    activeGateway: null,
  });

  const { updateGateway } = useUpdateGateway();

  // Set up error handler for ctcApiService
  useEffect(() => {
    // Add an error handler to prevent unhandled errors
    const handleError = (error: unknown) => {
      console.log('CTC API Error (handled):', error);
    };

    ctcApiService.on('error', handleError);

    // Clean up event listener on unmount
    return () => {
      ctcApiService.off('error', handleError);
    };
  }, []);

  // Connect to gateway
  const connectToGateway = useCallback(
    async (gateway: GatewayResponse) => {
      try {
        // Mark gateway as connecting
        dispatch({ type: 'CONNECT_START', payload: { gateway } });

        // Attempt to connect
        const connected = await ctcApiService.connect(gateway.url);

        if (!connected) {
          dispatch({
            type: 'CONNECT_ERROR',
            payload: { gatewayId: gateway._id, error: 'Failed to connect to gateway' },
          });
          toast.error(`Failed to connect to gateway ${gateway.name}`);
          return;
        }

        // Successfully connected
        dispatch({ type: 'CONNECT_SUCCESS', payload: { gatewayId: gateway._id } });
        // Don't show toast for the connection step since we'll show one for authentication

        // Start authentication
        dispatch({ type: 'AUTH_START', payload: { gatewayId: gateway._id } });

        try {
          // Authenticate with the gateway
          const loginResponse = await ctcApiService.login(gateway.username, gateway.password);

          if (!loginResponse.Success) {
            dispatch({
              type: 'AUTH_ERROR',
              payload: { gatewayId: gateway._id, error: 'Authentication failed' },
            });
            toast.error(`Authentication failed for gateway ${gateway.name}`);
            // Disconnect on auth failure
            ctcApiService.disconnect();
            return;
          }

          try {
            // Try to subscribe to changes first (some gateways may not support this)
            const subscribed = await ctcApiService.subscribeToChanges();

            // Authentication successful - dispatch with or without warning based on subscription result
            if (!subscribed) {
              console.log(
                'Subscription not supported by this gateway - continuing without subscription'
              );
              dispatch({
                type: 'AUTH_SUCCESS',
                payload: {
                  gatewayId: gateway._id,
                  withWarning:
                    'Subscription not supported by this gateway. Basic functionality will work normally.',
                },
              });
            } else {
              dispatch({
                type: 'AUTH_SUCCESS',
                payload: {
                  gatewayId: gateway._id,
                  withWarning: '',
                },
              });
            }
          } catch (subscribeError) {
            // Just log the error but don't fail the entire connection
            console.log(
              'Subscription not supported by this gateway - continuing without subscription'
            );
            dispatch({
              type: 'AUTH_SUCCESS',
              payload: {
                gatewayId: gateway._id,
                withWarning:
                  'Subscription not supported by this gateway. Basic functionality will work normally.',
              },
            });
          }

          // Update gateway status in database first
          await updateGateway({
            id: gateway._id,
            data: {
              status: 'authenticated',
            },
          });

          // Set this as active gateway
          dispatch({ type: 'SET_ACTIVE_GATEWAY', payload: { gatewayId: gateway._id } });

          // Show success toast after all operations are complete
          toast.success(`Authenticated with gateway ${gateway.name}`);
        } catch (authError) {
          dispatch({
            type: 'AUTH_ERROR',
            payload: {
              gatewayId: gateway._id,
              error: authError instanceof Error ? authError.message : 'Authentication failed',
            },
          });
          toast.error(
            `Authentication error: ${authError instanceof Error ? authError.message : 'Unknown error'}`
          );
          // Disconnect on auth error
          ctcApiService.disconnect();
        }
      } catch (error) {
        dispatch({
          type: 'CONNECT_ERROR',
          payload: {
            gatewayId: gateway._id,
            error: error instanceof Error ? error.message : 'Connection failed',
          },
        });
        toast.error(
          `Connection error: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    },
    [updateGateway]
  );

  // Disconnect from gateway
  const disconnectFromGateway = useCallback(
    (gatewayId: string) => {
      const gateway = state.connections[gatewayId]?.gateway;
      if (!gateway) return;

      ctcApiService.disconnect();
      dispatch({ type: 'DISCONNECT', payload: { gatewayId } });
      toast.info(`Disconnected from gateway ${gateway.name}`);

      // Update gateway status in database
      updateGateway({
        id: gatewayId,
        data: {
          status: 'disconnected',
        },
      }).catch(error => {
        console.error('Failed to update gateway status:', error);
      });
    },
    [state.connections, updateGateway]
  );

  // Set active gateway
  const setActiveGateway = useCallback((gatewayId: string | null) => {
    dispatch({ type: 'SET_ACTIVE_GATEWAY', payload: { gatewayId } });
  }, []);

  return (
    <GatewayConnectionContext.Provider
      value={{ state, connectToGateway, disconnectFromGateway, setActiveGateway }}
    >
      {children}
    </GatewayConnectionContext.Provider>
  );
}

// Custom hook to use the context
export function useGatewayConnection() {
  const context = useContext(GatewayConnectionContext);
  if (context === undefined) {
    throw new Error('useGatewayConnection must be used within a GatewayConnectionProvider');
  }
  return context;
}
