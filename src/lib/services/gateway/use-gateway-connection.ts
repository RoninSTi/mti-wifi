'use client';

import { useContext, useMemo } from 'react';
import { GatewayContext } from './gateway-context';
import { GatewayConnectionStatus } from './types';
import { GatewayResponse } from '@/app/api/gateways/schemas';

/**
 * Hook for managing a specific gateway connection
 * @param gatewayId ID of the gateway to connect to
 * @returns Gateway connection state and methods
 */
export function useGatewayConnection(gatewayId?: string) {
  const {
    state,
    connect,
    disconnect,
    getStatus,
    getError,
    getSensors,
    requestSensors,
    refreshSensors,
  } = useContext(GatewayContext);

  const gatewayState = useMemo(() => {
    if (!gatewayId) {
      return {
        status: GatewayConnectionStatus.DISCONNECTED,
        error: undefined,
        sensors: [],
        isConnected: false,
        isConnecting: false,
        isAuthenticated: false,
        isAuthenticating: false,
        hasError: false,
      };
    }

    const status = getStatus(gatewayId);
    const error = getError(gatewayId);
    const sensors = getSensors(gatewayId);

    return {
      status,
      error,
      sensors,
      isConnected: status === GatewayConnectionStatus.CONNECTED,
      isConnecting: status === GatewayConnectionStatus.CONNECTING,
      isAuthenticated: status === GatewayConnectionStatus.AUTHENTICATED,
      isAuthenticating: status === GatewayConnectionStatus.AUTHENTICATING,
      hasError: status === GatewayConnectionStatus.ERROR,
    };
  }, [gatewayId, getStatus, getError, getSensors]);

  /**
   * Connect to the gateway
   */
  const connectToGateway = async (gateway: GatewayResponse) => {
    if (!gateway._id) {
      throw new Error('Gateway ID is required');
    }

    return await connect(gateway);
  };

  /**
   * Disconnect from the gateway
   */
  const disconnectFromGateway = (reason?: string) => {
    if (!gatewayId) return;
    disconnect(gatewayId, reason);
  };

  /**
   * Request sensors from the gateway
   */
  const fetchSensors = async (serials?: number[]) => {
    if (!gatewayId) return false;
    return await requestSensors(gatewayId, serials);
  };

  /**
   * Refresh sensors from the gateway
   */
  const reloadSensors = async () => {
    if (!gatewayId) return false;
    return await refreshSensors(gatewayId);
  };

  return {
    ...gatewayState,
    isLoading: state.isLoading,
    connect: connectToGateway,
    disconnect: disconnectFromGateway,
    fetchSensors,
    reloadSensors,
  };
}

/**
 * Hook for accessing global gateway connection state
 * @returns All gateway connections
 */
export function useGatewayConnections() {
  const { state, connect, disconnect } = useContext(GatewayContext);

  const { connections, isLoading } = state;

  const connectionEntries = useMemo(() => {
    return Array.from(connections.entries()).map(([id, status]) => ({
      id,
      status,
      isConnected: status === GatewayConnectionStatus.CONNECTED,
      isAuthenticated: status === GatewayConnectionStatus.AUTHENTICATED,
      hasError: status === GatewayConnectionStatus.ERROR,
    }));
  }, [connections]);

  /**
   * Connect to a gateway
   */
  const connectToGateway = async (gateway: GatewayResponse) => {
    if (!gateway._id) {
      throw new Error('Gateway ID is required');
    }

    return await connect(gateway);
  };

  /**
   * Disconnect from a gateway
   */
  const disconnectFromGateway = (gatewayId: string, reason?: string) => {
    disconnect(gatewayId, reason);
  };

  return {
    connections: connectionEntries,
    isLoading,
    connect: connectToGateway,
    disconnect: disconnectFromGateway,
  };
}
