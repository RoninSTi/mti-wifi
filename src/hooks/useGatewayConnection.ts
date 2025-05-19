'use client';

import { useCallback, useEffect, useState } from 'react';
import { useGatewayWebSocket } from '@/components/gateways/GatewayWebSocketContext';
import { ConnectionState } from '@/lib/api/ctc-api';
import { useGateway } from './useGateway';

/**
 * Hook for managing gateway WebSocket connections
 */
export function useGatewayConnection(gatewayId: string) {
  const { connectToGateway, disconnectFromGateway, getGatewayState, gatewayStates } =
    useGatewayWebSocket();

  // Get gateway data from API
  const { gateway, isLoading, error } = useGateway(gatewayId);

  // Get connection state
  const connectionState = getGatewayState(gatewayId);

  // Track local state
  const [isConnecting, setIsConnecting] = useState(false);

  // Get last connected/authenticated timestamps
  const gatewayState = gatewayStates.get(gatewayId);
  const lastConnectedAt = gatewayState?.lastConnectedAt;
  const lastAuthenticatedAt = gatewayState?.lastAuthenticatedAt;

  // Check if connected
  const isConnected =
    connectionState === ConnectionState.CONNECTED ||
    connectionState === ConnectionState.AUTHENTICATED;

  // Check if authenticated
  const isAuthenticated = connectionState === ConnectionState.AUTHENTICATED;

  // Connect to gateway
  const connect = useCallback(async () => {
    if (isConnecting || isConnected) return;

    setIsConnecting(true);
    try {
      await connectToGateway(gatewayId);
    } finally {
      setIsConnecting(false);
    }
  }, [connectToGateway, gatewayId, isConnected, isConnecting]);

  // Disconnect from gateway
  const disconnect = useCallback(() => {
    disconnectFromGateway(gatewayId);
  }, [disconnectFromGateway, gatewayId]);

  // Auto-connect when gateway data is loaded
  useEffect(() => {
    if (gateway && !isLoading && !isConnected && !isConnecting) {
      connect().catch(console.error);
    }
  }, [connect, gateway, isConnected, isConnecting, isLoading]);

  return {
    gateway,
    isLoading,
    error,
    connect,
    disconnect,
    connectionState,
    isConnected,
    isAuthenticated,
    isConnecting,
    lastConnectedAt,
    lastAuthenticatedAt,
  };
}
