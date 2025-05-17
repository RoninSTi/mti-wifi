'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { GatewayResponse } from '@/app/api/gateways/schemas';
import { useGatewayConnections } from '@/hooks';
import { Loader, Wifi, WifiOff, Shield, AlertTriangle, Cable } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

interface GatewayConnectionManagerDialogProps {
  gateway: GatewayResponse;
  trigger?: React.ReactNode;
  defaultOpen?: boolean;
}

export function GatewayConnectionManagerDialog({
  gateway,
  trigger,
  defaultOpen = false,
}: GatewayConnectionManagerDialogProps) {
  const [open, setOpen] = useState(defaultOpen);

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

  // Get status badge based on connection state
  const getStatusBadge = () => {
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

  // Status icon rendering
  const getStatusIcon = () => {
    switch (connectionStatus) {
      case 'connecting':
      case 'authenticating':
        return <Loader className="h-5 w-5 animate-spin text-yellow-500" />;
      case 'connected':
        return <Wifi className="h-5 w-5 text-blue-500" />;
      case 'authenticated':
        return <Shield className="h-5 w-5 text-green-500" />;
      case 'error':
        return <AlertTriangle className="h-5 w-5 text-destructive" />;
      case 'disconnected':
      default:
        return <WifiOff className="h-5 w-5 text-muted-foreground" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      ) : (
        <DialogTrigger asChild>
          <Button size="sm" variant="outline">
            <Cable className="mr-2 h-4 w-4" />
            Connect
          </Button>
        </DialogTrigger>
      )}

      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Gateway Connection Manager</DialogTitle>
          <DialogDescription>Manage connection to gateway {gateway.name}</DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          {/* Gateway information */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <CardTitle>{gateway.name}</CardTitle>
                {getStatusBadge()}
              </div>
              <CardDescription className="text-xs">Serial: {gateway.serialNumber}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-muted-foreground">URL</div>
                <div className="truncate font-mono text-xs" title={gateway.url}>
                  {gateway.url}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Connection status */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                {getStatusIcon()}
                Connection Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Status:</span>
                  <span className="text-sm">
                    {connectionStatus.charAt(0).toUpperCase() + connectionStatus.slice(1)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Active:</span>
                  <span className="text-sm">{isActive ? 'Yes' : 'No'}</span>
                </div>
                {connectionError && (
                  <div className="mt-2">
                    <Separator className="my-2" />
                    <div className="text-sm font-medium text-destructive">Error:</div>
                    <div className="text-sm text-destructive mt-1 bg-destructive/10 p-2 rounded border border-destructive/20">
                      {connectionError.includes('SUBSCRIBE')
                        ? `Subscription not supported by this gateway. Basic functionality will work normally.`
                        : connectionError}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex justify-end gap-2">
              <Button
                variant={isConnected(gateway._id) ? 'destructive' : 'default'}
                onClick={handleToggleConnection}
                disabled={
                  connectionStatus === 'connecting' || connectionStatus === 'authenticating'
                }
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
                <Button variant={isActive ? 'secondary' : 'outline'} onClick={handleSetActive}>
                  <Shield className="mr-2 h-4 w-4" />
                  {isActive ? 'Active' : 'Set Active'}
                </Button>
              )}
            </CardFooter>
          </Card>

          {/* Connection metadata when authenticated */}
          {isAuthenticated(gateway._id) && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Authentication Info</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-muted-foreground">Username</div>
                  <div>{gateway.username}</div>
                  <div className="text-muted-foreground">Status</div>
                  <div className="text-green-500">Authenticated</div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex justify-end pt-4">
            <Button variant="outline" type="button" onClick={() => setOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
