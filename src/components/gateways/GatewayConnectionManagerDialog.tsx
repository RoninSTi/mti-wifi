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
import { Loader, Wifi, Cable, WifiOff, Link, AlertTriangle, Activity } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { useGateways } from '@/hooks/useGateways';
import { useGatewayConnection, useGatewayTopic, useGatewayCommand } from '@/lib/gateway/hooks';
import { Badge } from '@/components/ui/badge';
import { z } from 'zod';
import { toast } from 'sonner';

// Validate gateway connection params using Zod
const gatewaySchema = z.object({
  _id: z.string(),
  name: z.string(),
  serialNumber: z.string(),
  url: z.string().url('Invalid gateway URL'),
});

type ValidatedGateway = z.infer<typeof gatewaySchema>;

interface GatewayDetailProps {
  gateway: GatewayResponse;
}

// Schema for validating sensor data
const sensorDataSchema = z.object({
  Serial: z.number(),
  Timestamp: z.string(),
  XRms: z.number().optional(),
  YRms: z.number().optional(),
  ZRms: z.number().optional(),
  TempC: z.number().optional(),
  TempF: z.number().optional(),
});

type SensorData = z.infer<typeof sensorDataSchema>;

/**
 * SensorReadings component that displays live data from a connected gateway
 */
function SensorReadings({ gatewayId }: { gatewayId: string }) {
  // Use the gateway topic hook to subscribe to sensor readings
  const { data, isLoading, error } = useGatewayTopic<SensorData>(
    gatewayId,
    'reading',
    null,
    // Zod validator function
    (data: unknown) => {
      const result = sensorDataSchema.safeParse(data);
      if (!result.success) {
        throw new Error(`Invalid sensor data: ${result.error.message}`);
      }
      return result.data;
    }
  );

  // Use gateway command hook to request sensor readings
  const { sendCommand, isLoading: isCommandLoading } = useGatewayCommand(gatewayId);

  // Handler to request a new reading
  const requestReading = async () => {
    try {
      // Get first available sensor (simplified for demo)
      await sendCommand('takeDynamicReading', { serial: 1 });
      toast.success('Reading requested from sensor');
    } catch (error) {
      // Error already handled in hook
    }
  };

  if (isLoading) {
    return (
      <div className="py-3 flex justify-center">
        <Loader className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-3 text-xs text-muted-foreground">
        <div className="flex items-center justify-center">
          <AlertTriangle className="h-3 w-3 mr-1 text-amber-500" />
          Error loading sensor data
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="py-3 text-center">
        <p className="text-xs text-muted-foreground">No sensor data available</p>
        <Button
          size="sm"
          variant="outline"
          className="mt-2"
          onClick={requestReading}
          disabled={isCommandLoading}
        >
          <Activity className="mr-2 h-3 w-3" />
          Request Reading
        </Button>
      </div>
    );
  }

  // Format the timestamp to local date/time
  const timestamp = new Date(data.Timestamp).toLocaleString();

  return (
    <div className="text-xs">
      <h4 className="font-medium mb-2">Latest Sensor Reading</h4>
      <div className="grid grid-cols-2 gap-1">
        <div className="text-muted-foreground">Sensor ID</div>
        <div>{data.Serial}</div>

        <div className="text-muted-foreground">X-axis (RMS)</div>
        <div>{data.XRms?.toFixed(3) || 'N/A'}</div>

        <div className="text-muted-foreground">Y-axis (RMS)</div>
        <div>{data.YRms?.toFixed(3) || 'N/A'}</div>

        <div className="text-muted-foreground">Z-axis (RMS)</div>
        <div>{data.ZRms?.toFixed(3) || 'N/A'}</div>

        <div className="text-muted-foreground">Temperature</div>
        <div>{data.TempC ? `${data.TempC.toFixed(1)}°C / ${data.TempF?.toFixed(1)}°F` : 'N/A'}</div>

        <div className="text-muted-foreground">Timestamp</div>
        <div>{timestamp}</div>
      </div>

      <div className="mt-3 flex justify-end">
        <Button size="sm" variant="outline" onClick={requestReading} disabled={isCommandLoading}>
          <Activity className="mr-2 h-3 w-3" />
          Refresh
        </Button>
      </div>
    </div>
  );
}

function GatewayDetail({ gateway }: GatewayDetailProps) {
  // Validate the gateway data with Zod
  const validationResult = gatewaySchema.safeParse(gateway);
  const [showSensorData, setShowSensorData] = useState(false);

  // Use the gateway connection hook (autoConnect set to false)
  // Always use a valid ID (empty string as fallback if validation fails)
  const gatewayId = validationResult.success ? validationResult.data._id : '';
  const { state, isConnected, isAuthenticated, isConnecting, connect, disconnect } =
    useGatewayConnection(gatewayId, false);

  if (!validationResult.success) {
    return (
      <Card className="mb-4 border-red-200">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center">
              <AlertTriangle className="h-4 w-4 mr-2 text-red-500" />
              Invalid Gateway Data
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-red-500">
            This gateway has invalid configuration and cannot be connected.
          </div>
        </CardContent>
      </Card>
    );
  }

  const validGateway = validationResult.data;

  // Get status badge properties based on connection state
  const getStatusBadge = () => {
    switch (state) {
      case 'connected':
        return {
          label: 'Connected',
          variant: 'outline' as const,
          icon: <Wifi className="h-4 w-4 text-green-500 mr-2" />,
        };
      case 'authenticated':
        return {
          label: 'Authenticated',
          variant: 'default' as const,
          icon: <Link className="h-4 w-4 text-green-500 mr-2" />,
        };
      case 'connecting':
      case 'authenticating':
        return {
          label: 'Connecting...',
          variant: 'outline' as const,
          icon: <Loader className="h-4 w-4 text-amber-500 mr-2 animate-spin" />,
        };
      case 'error':
        return {
          label: 'Error',
          variant: 'destructive' as const,
          icon: <AlertTriangle className="h-4 w-4 mr-2" />,
        };
      default:
        return {
          label: 'Disconnected',
          variant: 'outline' as const,
          icon: <WifiOff className="h-4 w-4 text-muted-foreground mr-2" />,
        };
    }
  };

  const statusBadge = getStatusBadge();

  // Handle connection/disconnection
  const handleConnect = async () => {
    try {
      await connect();
      toast.success(`Connected to gateway ${validGateway.name}`);

      // Automatically show sensor data when connected
      if (!showSensorData) {
        setShowSensorData(true);
      }
    } catch (error) {
      // The error is already handled in the hook with toast notifications
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnect();
      toast.success(`Disconnected from gateway ${validGateway.name}`);

      // Hide sensor data when disconnected
      if (showSensorData) {
        setShowSensorData(false);
      }
    } catch (error) {
      toast.error(
        `Failed to disconnect: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  };

  // Toggle sensor data visibility
  const toggleSensorData = () => {
    setShowSensorData(prev => !prev);
  };

  return (
    <Card className="mb-4">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle>{validGateway.name}</CardTitle>
          <div className="flex items-center">
            {statusBadge.icon}
            <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
          </div>
        </div>
        <CardDescription className="text-xs">Serial: {validGateway.serialNumber}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2 text-sm mb-4">
          <div className="text-muted-foreground">URL</div>
          <div className="truncate font-mono text-xs" title={validGateway.url}>
            {validGateway.url}
          </div>
        </div>

        {/* Connection buttons */}
        <div className="flex justify-end space-x-2">
          {!isConnected && !isConnecting ? (
            <Button size="sm" onClick={handleConnect} disabled={isConnecting}>
              <Wifi className="mr-2 h-4 w-4" />
              Connect
            </Button>
          ) : (
            <>
              <Button size="sm" variant="secondary" onClick={toggleSensorData}>
                <Activity className="mr-2 h-4 w-4" />
                {showSensorData ? 'Hide Data' : 'Show Data'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleDisconnect}
                disabled={state === 'disconnected'}
              >
                <WifiOff className="mr-2 h-4 w-4" />
                Disconnect
              </Button>
            </>
          )}
        </div>
      </CardContent>

      {/* Sensor data section */}
      {isAuthenticated && showSensorData && (
        <CardFooter className="border-t pt-4">
          <SensorReadings gatewayId={validGateway._id} />
        </CardFooter>
      )}
    </Card>
  );
}

interface GatewayConnectionManagerDialogProps {
  trigger?: React.ReactNode;
  defaultOpen?: boolean;
}

export function GatewayConnectionManagerDialog({
  trigger,
  defaultOpen = false,
}: GatewayConnectionManagerDialogProps) {
  const [open, setOpen] = useState(defaultOpen);
  const { gateways, isLoading, error } = useGateways({});

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      ) : (
        <DialogTrigger asChild>
          <Button size="sm" variant="outline">
            <Cable className="mr-2 h-4 w-4" />
            Manage Gateways
          </Button>
        </DialogTrigger>
      )}

      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Gateway Connections</DialogTitle>
          <DialogDescription>Connect to and manage your gateways</DialogDescription>
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
          ) : gateways && gateways.length > 0 ? (
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
              {gateways.map(gateway => (
                <GatewayDetail key={gateway._id} gateway={gateway} />
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
