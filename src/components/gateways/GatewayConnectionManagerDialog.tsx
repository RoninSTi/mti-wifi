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
import { Loader, Wifi, Cable } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useGateways } from '@/hooks/useGateways';

interface GatewayDetailProps {
  gateway: GatewayResponse;
}

function GatewayDetail({ gateway }: GatewayDetailProps) {
  return (
    <Card className="mb-4">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle>{gateway.name}</CardTitle>
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
            View Gateways
          </Button>
        </DialogTrigger>
      )}

      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Gateways</DialogTitle>
          <DialogDescription>View available gateways in the system</DialogDescription>
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
