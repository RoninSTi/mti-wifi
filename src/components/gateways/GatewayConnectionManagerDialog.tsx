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
import { Loader, Wifi, Cable, AlertCircle, CheckCircle2, AlertTriangle } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { useGateways } from '@/hooks/useGateways';
import { Badge } from '@/components/ui/badge';
import { useGatewayConnection, useGatewayConnections } from '@/lib/services/gateway';
import { GatewayConnectionStatus } from '@/lib/services/gateway';
import { toast } from 'sonner';

interface GatewayDetailProps {
  gateway: GatewayResponse;
}

function GatewayDetail({ gateway }: GatewayDetailProps) {
  const { status, error, connect, disconnect, isAuthenticated, isConnecting, isAuthenticating } =
    useGatewayConnection(gateway._id);

  const handleConnect = async () => {
    try {
      if (isAuthenticated || isConnecting || isAuthenticating) {
        await disconnect();
        toast.success(`Disconnected from ${gateway.name}`);
      } else {
        const result = await connect(gateway);
        if (result) {
          toast.success(`Connecting to ${gateway.name}`);
        } else {
          toast.error(`Failed to connect to ${gateway.name}`);
        }
      }
    } catch (error) {
      toast.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const getStatusBadge = () => {
    switch (status) {
      case GatewayConnectionStatus.CONNECTED:
        return (
          <Badge variant="outline" className="bg-blue-500/10 text-blue-500">
            Connected
          </Badge>
        );
      case GatewayConnectionStatus.CONNECTING:
        return (
          <Badge variant="outline" className="bg-blue-500/10 text-blue-500">
            Connecting...
          </Badge>
        );
      case GatewayConnectionStatus.AUTHENTICATED:
        return (
          <Badge variant="outline" className="bg-green-500/10 text-green-500">
            Authenticated
          </Badge>
        );
      case GatewayConnectionStatus.AUTHENTICATING:
        return (
          <Badge variant="outline" className="bg-blue-500/10 text-blue-500">
            Authenticating...
          </Badge>
        );
      case GatewayConnectionStatus.ERROR:
        return (
          <Badge variant="outline" className="bg-red-500/10 text-red-500">
            Error
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-gray-500/10">
            Disconnected
          </Badge>
        );
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case GatewayConnectionStatus.AUTHENTICATED:
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case GatewayConnectionStatus.CONNECTED:
      case GatewayConnectionStatus.CONNECTING:
      case GatewayConnectionStatus.AUTHENTICATING:
        return <Loader className="h-4 w-4 animate-spin text-blue-500" />;
      case GatewayConnectionStatus.ERROR:
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <Card className="mb-4">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            {getStatusIcon()}
            {gateway.name}
          </CardTitle>
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
          <div className="text-muted-foreground">Location</div>
          <div className="truncate text-xs">{gateway.location.name}</div>
        </div>
        {error && (
          <div className="mt-2 text-xs text-red-500">
            {error.message} {error.code ? `(${error.code})` : ''}
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button
          size="sm"
          variant={isAuthenticated ? 'secondary' : 'default'}
          className="w-full"
          onClick={handleConnect}
          disabled={isConnecting || isAuthenticating}
        >
          {isConnecting || isAuthenticating ? (
            <>
              <Loader className="mr-2 h-3 w-3 animate-spin" />
              {isConnecting ? 'Connecting...' : 'Authenticating...'}
            </>
          ) : isAuthenticated ? (
            'Disconnect'
          ) : (
            'Connect'
          )}
        </Button>
      </CardFooter>
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
  const { connections } = useGatewayConnections();

  const connectedCount = connections.filter(c => c.isAuthenticated || c.isConnected).length;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      ) : (
        <DialogTrigger asChild>
          <Button size="sm" variant="outline">
            <Cable className="mr-2 h-4 w-4" />
            {connectedCount > 0 ? `Gateways (${connectedCount})` : 'Gateways'}
          </Button>
        </DialogTrigger>
      )}

      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Gateways</DialogTitle>
          <DialogDescription>Manage connections to available gateways</DialogDescription>
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
