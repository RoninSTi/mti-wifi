'use client';

/**
 * Gateway Connection Manager Component
 *
 * A component that manages gateway connections and displays status
 */
import React, { useState } from 'react';
import { useGatewayConnection, useGatewayCommand, useGatewayTopic } from '@/lib/gateway';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Wifi, WifiOff, Lock, Send } from 'lucide-react';
import { toast } from 'sonner';

interface GatewayConnectionManagerProps {
  gatewayId: string;
  autoConnect?: boolean;
}

/**
 * Component to display and manage a gateway connection
 */
export function GatewayConnectionManagerDialog({
  gatewayId,
  autoConnect = false,
}: GatewayConnectionManagerProps) {
  const [isStatusExpanded, setIsStatusExpanded] = useState(false);

  // Use gateway connection hook
  const {
    state,
    isConnected,
    isAuthenticated,
    isConnecting,
    error,
    connect,
    disconnect,
    getConnection,
  } = useGatewayConnection(gatewayId, autoConnect);

  // Use gateway command hook
  const { sendCommand, isLoading: isCommandLoading } = useGatewayCommand(gatewayId);

  // Subscribe to status topic if connected
  const { data: statusData } = useGatewayTopic<{ status: string; uptime: number }>(
    gatewayId,
    'system/status',
    null,
    // Optional validator function
    data => {
      if (typeof data !== 'object' || data === null) {
        throw new Error('Invalid status data');
      }

      const typedData = data as Record<string, unknown>;

      if (typeof typedData.status !== 'string' || typeof typedData.uptime !== 'number') {
        throw new Error('Invalid status data structure');
      }

      return {
        status: typedData.status,
        uptime: typedData.uptime,
      };
    }
  );

  // Handle ping command
  const handlePing = async () => {
    if (!isAuthenticated) {
      toast.error('Gateway not authenticated');
      return;
    }

    try {
      const result = await sendCommand<{ latency: number }>('ping', {});
      toast.success(`Ping successful! Latency: ${result.latency}ms`);
    } catch (error) {
      toast.error(`Ping failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Get status badge color based on connection state
  const getStatusColor = () => {
    switch (state) {
      case 'authenticated':
        return 'bg-green-500';
      case 'connected':
        return 'bg-blue-500';
      case 'connecting':
      case 'authenticating':
      case 'reconnecting':
        return 'bg-yellow-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  // Get connection stats if connected
  const getStats = () => {
    const connection = getConnection();
    if (!connection) return null;

    return connection.stats;
  };

  const stats = getStats();

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Gateway Connection</CardTitle>
          <Badge className={getStatusColor()}>{state}</Badge>
        </div>
        <CardDescription>Manage connection to gateway</CardDescription>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          {/* Status info */}
          <div className="flex justify-between items-center py-2 border-b">
            <span className="font-medium">Status</span>
            <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
          </div>

          {/* Authentication info */}
          <div className="flex justify-between items-center py-2 border-b">
            <span className="font-medium">Authentication</span>
            <span>{isAuthenticated ? 'Authenticated' : 'Not Authenticated'}</span>
          </div>

          {/* Gateway status data if available */}
          {statusData && (
            <div className="flex justify-between items-center py-2 border-b">
              <span className="font-medium">Gateway Status</span>
              <span>
                {statusData.status} (Uptime: {Math.floor(statusData.uptime / 60)} min)
              </span>
            </div>
          )}

          {/* Error display */}
          {error && (
            <div className="mt-2 p-2 bg-red-100 dark:bg-red-900/20 rounded text-red-800 dark:text-red-300 text-sm">
              {error.message}
            </div>
          )}

          {/* Connection stats if expanded */}
          {isStatusExpanded && stats && (
            <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800/50 rounded text-sm">
              <h4 className="font-medium mb-2">Connection Statistics</h4>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>Connected at:</span>
                  <span>{stats.connectedAt?.toLocaleString() || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Authenticated at:</span>
                  <span>{stats.authenticatedAt?.toLocaleString() || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Last message:</span>
                  <span>{stats.lastMessageAt?.toLocaleString() || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Messages sent:</span>
                  <span>{stats.messagesSent}</span>
                </div>
                <div className="flex justify-between">
                  <span>Messages received:</span>
                  <span>{stats.messagesReceived}</span>
                </div>
                <div className="flex justify-between">
                  <span>Errors:</span>
                  <span>{stats.errors}</span>
                </div>
              </div>
            </div>
          )}

          {/* Toggle for stats */}
          {isConnected && (
            <button
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
              onClick={() => setIsStatusExpanded(!isStatusExpanded)}
            >
              {isStatusExpanded ? 'Hide details' : 'Show details'}
            </button>
          )}
        </div>
      </CardContent>

      <CardFooter className="flex justify-between gap-2">
        {/* Connect/Disconnect button */}
        {isConnected ? (
          <Button variant="outline" onClick={disconnect} className="flex-1">
            <WifiOff className="mr-2 h-4 w-4" />
            Disconnect
          </Button>
        ) : (
          <Button onClick={connect} disabled={isConnecting} className="flex-1">
            {isConnecting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Wifi className="mr-2 h-4 w-4" />
            )}
            {isConnecting ? 'Connecting...' : 'Connect'}
          </Button>
        )}

        {/* Authenticate button */}
        {isConnected && !isAuthenticated && (
          <Button onClick={() => getConnection()?.authenticate()} className="flex-1">
            <Lock className="mr-2 h-4 w-4" />
            Authenticate
          </Button>
        )}

        {/* Ping button when authenticated */}
        {isAuthenticated && (
          <Button onClick={handlePing} disabled={isCommandLoading} className="flex-1">
            {isCommandLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            {isCommandLoading ? 'Sending...' : 'Ping'}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
