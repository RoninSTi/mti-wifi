'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { GatewayResponse } from '@/app/api/gateways/schemas';
import { useGatewayConnections } from '@/hooks';
import { Loader, Wifi, WifiOff, Shield, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface GatewayConnectionControlsProps {
  gateway: GatewayResponse;
  size?: 'default' | 'sm' | 'lg';
}

export function GatewayConnectionControls({
  gateway,
  size = 'default',
}: GatewayConnectionControlsProps) {
  const {
    isConnected,
    isAuthenticated,
    getConnectionStatus,
    getConnectionError,
    connect,
    disconnect,
    isActiveGateway,
    setActiveGateway,
  } = useGatewayConnections();

  const connectionStatus = getConnectionStatus(gateway._id);
  const connectionError = getConnectionError(gateway._id);
  const isActive = isActiveGateway(gateway._id);

  // Determine the badge and icon to show based on the connection status
  const getBadge = () => {
    switch (connectionStatus) {
      case 'connecting':
        return <Badge className="bg-yellow-500">Connecting</Badge>;
      case 'connected':
        return <Badge className="bg-blue-500">Connected</Badge>;
      case 'authenticating':
        return <Badge className="bg-yellow-500">Authenticating</Badge>;
      case 'authenticated':
        return <Badge className="bg-green-500">Authenticated</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      case 'disconnected':
      default:
        return <Badge variant="outline">Disconnected</Badge>;
    }
  };

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case 'connecting':
      case 'authenticating':
        return <Loader className="h-4 w-4 animate-spin" />;
      case 'connected':
        return <Wifi className="h-4 w-4" />;
      case 'authenticated':
        return <Shield className="h-4 w-4" />;
      case 'error':
        return <AlertTriangle className="h-4 w-4" />;
      case 'disconnected':
      default:
        return <WifiOff className="h-4 w-4" />;
    }
  };

  // Handle connect/disconnect
  const handleToggleConnection = async () => {
    if (isConnected(gateway._id)) {
      disconnect(gateway._id);
    } else {
      await connect(gateway);
    }
  };

  // Handle setting active gateway
  const handleSetActive = () => {
    setActiveGateway(isActive ? null : gateway._id);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        {getStatusIcon()}
        {getBadge()}
        {connectionError && (
          <span className="text-xs text-destructive ml-2" title={connectionError}>
            {connectionError.length > 30 ? `${connectionError.slice(0, 30)}...` : connectionError}
          </span>
        )}
      </div>

      <div className="flex gap-2 mt-1">
        <Button
          variant={isConnected(gateway._id) ? 'destructive' : 'default'}
          size={size}
          onClick={handleToggleConnection}
          disabled={connectionStatus === 'connecting' || connectionStatus === 'authenticating'}
        >
          {connectionStatus === 'connecting' || connectionStatus === 'authenticating' ? (
            <Loader className="mr-2 h-4 w-4 animate-spin" />
          ) : isConnected(gateway._id) ? (
            <WifiOff className="mr-2 h-4 w-4" />
          ) : (
            <Wifi className="mr-2 h-4 w-4" />
          )}
          {isConnected(gateway._id) ? 'Disconnect' : 'Connect'}
        </Button>

        {isAuthenticated(gateway._id) && (
          <Button
            variant={isActive ? 'secondary' : 'outline'}
            size={size}
            onClick={handleSetActive}
          >
            <Shield className="mr-2 h-4 w-4" />
            {isActive ? 'Active' : 'Set Active'}
          </Button>
        )}
      </div>
    </div>
  );
}
