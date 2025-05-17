import { useGatewayConnection } from '@/contexts/GatewayConnectionContext';
import { GatewayResponse } from '@/app/api/gateways/schemas';

// Connection statuses for a specific gateway
export type GatewayConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'authenticating'
  | 'authenticated'
  | 'error';

interface UseGatewayConnectionsResult {
  // Check if a gateway is connected or in the process of connecting
  isConnected: (gatewayId: string) => boolean;

  // Check if a gateway is fully authenticated
  isAuthenticated: (gatewayId: string) => boolean;

  // Get the connection status for a gateway
  getConnectionStatus: (gatewayId: string) => GatewayConnectionStatus;

  // Get any error message for the gateway connection
  getConnectionError: (gatewayId: string) => string | null;

  // Connect to a gateway
  connect: (gateway: GatewayResponse) => Promise<void>;

  // Disconnect from a gateway
  disconnect: (gatewayId: string) => void;

  // Get the active gateway ID (the one currently being used for operations)
  getActiveGatewayId: () => string | null;

  // Set the active gateway
  setActiveGateway: (gatewayId: string | null) => void;

  // Check if a gateway is the active one
  isActiveGateway: (gatewayId: string) => boolean;
}

/**
 * Custom hook for working with gateway connections
 * Provides simplified methods for connecting, disconnecting, and checking gateway status
 */
export function useGatewayConnections(): UseGatewayConnectionsResult {
  const { state, connectToGateway, disconnectFromGateway, setActiveGateway } =
    useGatewayConnection();

  // Check if gateway is connected or in the process
  const isConnected = (gatewayId: string): boolean => {
    const connection = state.connections[gatewayId];
    if (!connection) return false;

    return ['connected', 'authenticating', 'authenticated'].includes(connection.status);
  };

  // Check if gateway is fully authenticated
  const isAuthenticated = (gatewayId: string): boolean => {
    const connection = state.connections[gatewayId];
    if (!connection) return false;

    return connection.status === 'authenticated';
  };

  // Get the connection status
  const getConnectionStatus = (gatewayId: string): GatewayConnectionStatus => {
    return state.connections[gatewayId]?.status || 'disconnected';
  };

  // Get any connection error
  const getConnectionError = (gatewayId: string): string | null => {
    return state.connections[gatewayId]?.error || null;
  };

  // Connect to a gateway
  const connect = async (gateway: GatewayResponse): Promise<void> => {
    await connectToGateway(gateway);
  };

  // Disconnect from a gateway
  const disconnect = (gatewayId: string): void => {
    disconnectFromGateway(gatewayId);
  };

  // Get the active gateway ID
  const getActiveGatewayId = (): string | null => {
    return state.activeGateway;
  };

  // Check if a gateway is the active one
  const isActiveGateway = (gatewayId: string): boolean => {
    return state.activeGateway === gatewayId;
  };

  return {
    isConnected,
    isAuthenticated,
    getConnectionStatus,
    getConnectionError,
    connect,
    disconnect,
    getActiveGatewayId,
    setActiveGateway,
    isActiveGateway,
  };
}
