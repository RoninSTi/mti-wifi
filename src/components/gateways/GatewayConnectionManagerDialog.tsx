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
import { Loader, Wifi, WifiOff, Shield, AlertTriangle, Cable } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { useGateways } from '@/hooks/useGateways';
import { useGatewayWebSocket } from './GatewayWebSocketContext';
import { ConnectionState } from '@/lib/api/ctc-api';
import { Badge } from '@/components/ui/badge';
import { SensorData } from '@/lib/api/ctc-api';

interface GatewayDetailProps {
  gateway: GatewayResponse;
}

function GatewayDetail({ gateway }: GatewayDetailProps) {
  const { getGatewayState, connectToGateway, disconnectFromGateway, getConnectedSensors } =
    useGatewayWebSocket();

  const connectionState = getGatewayState(gateway._id);
  const isConnected =
    connectionState === ConnectionState.CONNECTED ||
    connectionState === ConnectionState.AUTHENTICATED;
  const isAuthenticated = connectionState === ConnectionState.AUTHENTICATED;

  const [isLoading, setIsLoading] = useState(false);
  const [sensors, setSensors] = useState<SensorData[]>([]);
  const [showSensors, setShowSensors] = useState(false);

  // Handle gateway connection toggle
  const handleConnectionToggle = async () => {
    if (isLoading) return;

    setIsLoading(true);
    try {
      if (isConnected) {
        disconnectFromGateway(gateway._id);
        setSensors([]);
        setShowSensors(false);
      } else {
        await connectToGateway(gateway._id);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Load connected sensors
  const handleLoadSensors = async () => {
    if (!isAuthenticated || isLoading) return;

    setIsLoading(true);
    try {
      const sensorData = await getConnectedSensors(gateway._id);
      setSensors(sensorData);
      setShowSensors(true);
    } catch (error) {
      console.error('Failed to load sensors:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Get connection status badge
  const getConnectionBadge = () => {
    switch (connectionState) {
      case ConnectionState.CONNECTED:
        return <Badge variant="secondary">Connected</Badge>;
      case ConnectionState.AUTHENTICATED:
        return <Badge>Authenticated</Badge>;
      case ConnectionState.CONNECTING:
      case ConnectionState.AUTHENTICATING:
      case ConnectionState.RECONNECTING:
        return <Badge variant="outline">Connecting...</Badge>;
      case ConnectionState.FAILED:
        return <Badge variant="destructive">Failed</Badge>;
      case ConnectionState.DISCONNECTED:
      default:
        return <Badge variant="outline">Disconnected</Badge>;
    }
  };

  // Get connection status icon
  const getConnectionIcon = () => {
    switch (connectionState) {
      case ConnectionState.CONNECTED:
        return <Wifi className="h-4 w-4 text-yellow-500" />;
      case ConnectionState.AUTHENTICATED:
        return <Shield className="h-4 w-4 text-green-500" />;
      case ConnectionState.CONNECTING:
      case ConnectionState.AUTHENTICATING:
      case ConnectionState.RECONNECTING:
        return <Loader className="h-4 w-4 text-blue-500 animate-spin" />;
      case ConnectionState.FAILED:
        return <AlertTriangle className="h-4 w-4 text-destructive" />;
      case ConnectionState.DISCONNECTED:
      default:
        return <WifiOff className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <Card className="mb-4">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle>{gateway.name}</CardTitle>
          <div className="flex items-center gap-2">
            {getConnectionIcon()}
            {getConnectionBadge()}
          </div>
        </div>
        <CardDescription className="text-xs">Serial: {gateway.serialNumber}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="text-muted-foreground">URL</div>
          <div className="truncate font-mono text-xs" title={gateway.url}>
            {gateway.url}
          </div>

          <div className="text-muted-foreground">Username</div>
          <div className="truncate font-mono text-xs">{gateway.username}</div>

          <div className="text-muted-foreground">Location</div>
          <div className="truncate text-xs">{gateway.location.name}</div>
        </div>

        {showSensors && sensors.length > 0 && (
          <div className="mt-4 border-t pt-4">
            <h4 className="text-sm font-semibold mb-2">Connected Sensors ({sensors.length})</h4>
            <div className="grid gap-2 text-xs">
              {sensors.map(sensor => (
                <div
                  key={sensor.serial}
                  className="flex items-center justify-between border rounded p-2"
                >
                  <div>
                    <div className="font-medium">Serial: {sensor.serial}</div>
                    <div className="text-muted-foreground">Part: {sensor.partNum}</div>
                  </div>
                  <Badge variant={sensor.connected === 1 ? 'default' : 'outline'}>
                    {sensor.connected === 1 ? 'Connected' : 'Disconnected'}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between pt-2">
        <Button
          variant="outline"
          size="sm"
          disabled={!isAuthenticated || isLoading}
          onClick={handleLoadSensors}
        >
          {showSensors ? 'Refresh Sensors' : 'Show Sensors'}
        </Button>
        <Button
          variant={isConnected ? 'destructive' : 'default'}
          size="sm"
          disabled={
            isLoading ||
            connectionState === ConnectionState.CONNECTING ||
            connectionState === ConnectionState.AUTHENTICATING
          }
          onClick={handleConnectionToggle}
        >
          {isLoading ? (
            <>
              <Loader className="mr-2 h-4 w-4 animate-spin" />
              {isConnected ? 'Disconnecting...' : 'Connecting...'}
            </>
          ) : isConnected ? (
            <>
              <WifiOff className="mr-2 h-4 w-4" />
              Disconnect
            </>
          ) : (
            <>
              <Wifi className="mr-2 h-4 w-4" />
              Connect
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}

interface GatewayConnectionManagerDialogProps {
  trigger?: React.ReactNode;
  defaultOpen?: boolean;
  gateway?: GatewayResponse;
}

export function GatewayConnectionManagerDialog({
  trigger,
  defaultOpen = false,
  gateway,
}: GatewayConnectionManagerDialogProps) {
  const [open, setOpen] = useState(defaultOpen);
  const { gateways, isLoading, error } = useGateways({ limit: 1000 });

  // If a specific gateway is provided, only show that one
  const gatewaysToDisplay = gateway ? [gateway] : gateways;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      ) : (
        <DialogTrigger asChild>
          <Button size="sm" variant="outline">
            <Cable className="mr-2 h-4 w-4" />
            Manage Connections
          </Button>
        </DialogTrigger>
      )}

      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Gateway Connections</DialogTitle>
          <DialogDescription>
            {gateway ? 'Manage connection to this gateway' : 'View and manage gateway connections'}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="py-8 text-center">
              <p className="text-muted-foreground">Failed to load gateways</p>
            </div>
          ) : gatewaysToDisplay && gatewaysToDisplay.length > 0 ? (
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
              {gatewaysToDisplay.map(g => (
                <GatewayDetail key={g._id} gateway={g} />
              ))}
            </div>
          ) : (
            <div className="py-8 text-center">
              <Wifi className="h-8 w-8 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No gateways found</p>
            </div>
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
