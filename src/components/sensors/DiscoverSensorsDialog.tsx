'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Wifi, Search, Loader, Check, CircleCheck, AlertCircle, ArrowRight } from 'lucide-react';
import { useDiscoverSensors } from '@/hooks/useDiscoverSensors';
import { ctcApiService } from '@/lib/ctc/ctcApiService';
import { DiscoveryStage, DiscoveredSensor, StepStatus } from '@/types/discovery';
import { SensorResponse } from '@/app/api/sensors/schemas';
import { useGateways } from '@/hooks';
import { useGatewayConnections } from '@/hooks/useGatewayConnections';
import { GatewayResponse } from '@/app/api/gateways/schemas';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { GatewayConnectionManagerDialog } from '@/components/gateways/GatewayConnectionManagerDialog';

interface DiscoverSensorsDialogProps {
  equipmentId: string;
  trigger?: React.ReactNode;
  onComplete?: (sensors: SensorResponse[]) => void;
  defaultOpen?: boolean;
}

// Gateway selector component
interface GatewaySelectorProps {
  onSelectGateway: (gateway: GatewayResponse) => Promise<void>;
  isConnecting: boolean;
}

function GatewaySelector({ onSelectGateway, isConnecting }: GatewaySelectorProps) {
  // Get gateway connections to determine which ones are active
  const { isAuthenticated, isConnected } = useGatewayConnections();

  // Fetch all gateways with required parameter to trigger the query
  const { gateways, isLoading, isError } = useGateways({
    limit: 50, // Fetch up to 50 gateways
    status: undefined, // Explicitly pass a parameter to enable the query
  });

  // Sort connected gateways first, then by status and name, but only if we have gateways
  const sortedGateways = gateways.length
    ? [...gateways].sort((a, b) => {
        // First, sort by authentication status
        const aIsAuthenticated = isAuthenticated(a._id);
        const bIsAuthenticated = isAuthenticated(b._id);
        if (aIsAuthenticated && !bIsAuthenticated) return -1;
        if (!aIsAuthenticated && bIsAuthenticated) return 1;

        // Then, sort by connection status
        const aIsConnected = isConnected(a._id);
        const bIsConnected = isConnected(b._id);
        if (aIsConnected && !bIsConnected) return -1;
        if (!aIsConnected && bIsConnected) return 1;

        // Finally, sort alphabetically by name
        return a.name.localeCompare(b.name);
      })
    : [];

  if (isLoading) {
    return (
      <div className="flex justify-center items-center space-x-2 p-8">
        <Loader className="h-5 w-5 animate-spin" />
        <span>Loading gateways...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-4 border border-destructive/20 bg-destructive/10 rounded-md">
        <div className="flex items-center gap-2 text-destructive">
          <AlertCircle className="h-5 w-5" />
          <span className="font-medium">Failed to load gateways</span>
        </div>
        <p className="mt-2 text-sm">Please try again or connect manually.</p>
      </div>
    );
  }

  if (gateways.length === 0) {
    return (
      <div className="p-4 border bg-muted/40 rounded-md text-center">
        <p className="text-sm text-muted-foreground">
          No gateways found. Please add a gateway or connect manually.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="font-medium">Select a Gateway</h3>
      <div className="grid grid-cols-1 gap-3 max-h-[250px] overflow-y-auto pr-1">
        {sortedGateways.map(gateway => {
          const gatewayActive = isAuthenticated(gateway._id);
          const gatewayConnected = isConnected(gateway._id);

          return (
            <Card
              key={gateway._id}
              className={`p-3 cursor-pointer transition-all border hover:border-primary 
                ${gatewayActive ? 'border-green-500 bg-green-50 dark:bg-green-950' : ''}
                ${isConnecting ? 'opacity-50 pointer-events-none' : ''}
              `}
              onClick={() => {
                // Only proceed directly if the gateway is authenticated
                if (gatewayActive) {
                  onSelectGateway(gateway);
                }
                // Otherwise, don't do anything - the connection dialog trigger will handle it
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`p-1.5 rounded-full 
                    ${gatewayActive ? 'bg-green-100 dark:bg-green-900' : 'bg-muted'}`}
                  >
                    <Wifi
                      className={`h-4 w-4 
                      ${
                        gatewayActive
                          ? 'text-green-600 dark:text-green-400'
                          : gatewayConnected
                            ? 'text-blue-600 dark:text-blue-400'
                            : 'text-muted-foreground'
                      }`}
                    />
                  </div>
                  <div>
                    <div className="font-medium">{gateway.name}</div>
                    <div className="text-xs text-muted-foreground">{gateway.url}</div>
                  </div>
                </div>
                <div className="flex gap-2 items-center">
                  {gatewayActive && <Badge className="bg-green-500">Active</Badge>}
                  {gatewayConnected && !gatewayActive && (
                    <>
                      <Badge className="bg-blue-500">Connected</Badge>
                      <GatewayConnectionManagerDialog
                        gateway={gateway}
                        trigger={
                          <Button size="sm" variant="outline" className="h-7 ml-2">
                            Authenticate
                          </Button>
                        }
                      />
                    </>
                  )}
                  {!gatewayConnected && (
                    <>
                      <Badge variant="outline">Disconnected</Badge>
                      <GatewayConnectionManagerDialog
                        gateway={gateway}
                        trigger={
                          <Button size="sm" variant="outline" className="h-7 ml-2">
                            Connect
                          </Button>
                        }
                      />
                    </>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

/**
 * StepIndicator component for wizard flows
 * Displays step indicators with proper styling based on status
 */
interface StepIndicatorProps {
  number: number;
  label: string;
  status: StepStatus;
  onClick: () => void;
}

function StepIndicator({ number, label, status, onClick }: StepIndicatorProps) {
  // Determine styling and interactivity based on status
  const isClickable = status !== StepStatus.LOCKED;

  // Determine color styles based on status
  const getTextColorClass = (): string => {
    switch (status) {
      case StepStatus.ACTIVE:
        return 'text-primary';
      case StepStatus.COMPLETED:
        return 'text-green-600 dark:text-green-400';
      case StepStatus.AVAILABLE:
        return 'text-muted-foreground font-medium';
      case StepStatus.LOCKED:
      default:
        return 'text-muted-foreground';
    }
  };

  const getCircleColorClass = (): string => {
    switch (status) {
      case StepStatus.ACTIVE:
        return 'bg-primary text-primary-foreground';
      case StepStatus.COMPLETED:
        return 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400';
      case StepStatus.AVAILABLE:
      case StepStatus.LOCKED:
      default:
        return 'bg-muted';
    }
  };

  return (
    <button
      className={`flex flex-col items-center ${
        isClickable ? 'cursor-pointer' : 'cursor-not-allowed opacity-70'
      } ${getTextColorClass()}`}
      onClick={isClickable ? onClick : undefined}
      disabled={!isClickable}
      aria-current={status === StepStatus.ACTIVE ? 'step' : undefined}
    >
      <div
        className={`w-10 h-10 rounded-full flex items-center justify-center mb-1 ${getCircleColorClass()}`}
      >
        {status === StepStatus.COMPLETED ? <Check className="h-5 w-5" /> : number}
      </div>
      <span className="text-xs">{label}</span>
    </button>
  );
}

// Simplified main dialog component
export function DiscoverSensorsDialog({
  equipmentId,
  trigger,
  onComplete,
  defaultOpen = false,
}: DiscoverSensorsDialogProps) {
  // Simple controlled state from props
  const [isOpen, setIsOpen] = React.useState(defaultOpen);

  const {
    // State
    stage,
    setStage,
    discoveredSensors,
    selectedCount,
    isConnecting,
    isDiscovering,
    isCreating,

    // Gateway connection
    gatewayUrl,
    setGatewayUrl,
    setUsername,
    setPassword,

    // Methods
    connectToGateway,
    discoverSensors,
    toggleSelectSensor,
    updateSensorName,
    selectAllSensors,
    deselectAllSensors,
    createAssociatedSensors,
    resetDiscovery,
  } = useDiscoverSensors({
    equipmentId,
    onSuccess: sensors => {
      // Wait a moment before closing to show success state
      setTimeout(() => {
        setIsOpen(false);
        if (onComplete) onComplete(sensors);
      }, 1500);
    },
  });

  // Effect to handle defaultOpen prop changes
  React.useEffect(() => {
    setIsOpen(defaultOpen);
  }, [defaultOpen]);

  // Simple handler for dialog open/close
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);

    // Reset when closing
    if (!open) {
      resetDiscovery();

      // Notify parent when dialog is closed
      if (!open && onComplete && stage === DiscoveryStage.CONFIRM) {
        onComplete([]);
      }
    }
  };

  // Get the active tab based on the current stage
  const getActiveTab = () => {
    switch (stage) {
      case DiscoveryStage.CONNECT:
        return 'connect';
      case DiscoveryStage.DISCOVER:
        return 'discover';
      case DiscoveryStage.ASSOCIATE:
        return 'associate';
      case DiscoveryStage.CONFIRM:
        return 'confirm';
      default:
        return 'connect';
    }
  };

  /**
   * Determines the status of a specific step based on the current state of the discovery process
   *
   * @param step - The discovery stage to check status for
   * @returns The status of the step (locked, available, active, or completed)
   */
  const getStepStatus = (step: DiscoveryStage): StepStatus => {
    // Special case: ALWAYS lock the associate/select step on initial load to fix the issue
    if (step === DiscoveryStage.ASSOCIATE && discoveredSensors.length === 0) {
      return StepStatus.LOCKED;
    }

    // If this is the current stage, it's active
    if (stage === step) {
      return StepStatus.ACTIVE;
    }

    // Handle first step (always available)
    if (step === DiscoveryStage.CONNECT) {
      return stage > DiscoveryStage.CONNECT ? StepStatus.COMPLETED : StepStatus.AVAILABLE;
    }

    // For the Discover step
    if (step === DiscoveryStage.DISCOVER) {
      // If we're past this step, it's completed
      if (stage > DiscoveryStage.DISCOVER) {
        return StepStatus.COMPLETED;
      }

      // If gateway is connected, the step is available
      const isConnected = ctcApiService.isConnectedToGateway();
      return isConnected ? StepStatus.AVAILABLE : StepStatus.LOCKED;
    }

    // For the Associate (select) step
    if (step === DiscoveryStage.ASSOCIATE) {
      // If we're past this step, it's completed
      if (stage > DiscoveryStage.ASSOCIATE) {
        return StepStatus.COMPLETED;
      }

      // Only available if we have discovered sensors
      return discoveredSensors.length > 0 ? StepStatus.AVAILABLE : StepStatus.LOCKED;
    }

    // For the Confirm step
    if (step === DiscoveryStage.CONFIRM) {
      // This step is only active when we reach it (it's never available for direct navigation)
      // and it's never completed (it's the final step)
      return StepStatus.LOCKED;
    }

    // Default fallback (should never happen)
    return StepStatus.LOCKED;
  };

  // Removed debug logging for production

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}

      <DialogContent className="sm:max-w-[650px]">
        <DialogHeader>
          <div className="flex flex-col space-y-1">
            <DialogTitle>Discover Sensors</DialogTitle>
          </div>
        </DialogHeader>

        <div className="w-full mb-4">
          <div className="flex justify-between w-full">
            {/* Connect Step */}
            <StepIndicator
              number={1}
              label="Connect"
              status={getStepStatus(DiscoveryStage.CONNECT)}
              onClick={() => setStage(DiscoveryStage.CONNECT)}
            />

            {/* Discover Step */}
            <StepIndicator
              number={2}
              label="Discover"
              status={getStepStatus(DiscoveryStage.DISCOVER)}
              onClick={() => setStage(DiscoveryStage.DISCOVER)}
            />

            {/* Select Step */}
            <StepIndicator
              number={3}
              label="Select"
              status={getStepStatus(DiscoveryStage.ASSOCIATE)}
              onClick={() => setStage(DiscoveryStage.ASSOCIATE)}
            />

            {/* Confirm Step */}
            <StepIndicator
              number={4}
              label="Confirm"
              status={getStepStatus(DiscoveryStage.CONFIRM)}
              onClick={() => setStage(DiscoveryStage.CONFIRM)}
            />
          </div>
        </div>

        <Separator className="my-4" />

        <Tabs value={getActiveTab()}>
          {/* Hidden TabsList for accessibility */}
          <TabsList className="hidden">
            <TabsTrigger value="connect">Connect</TabsTrigger>
            <TabsTrigger value="discover">Discover</TabsTrigger>
            <TabsTrigger value="associate">Select</TabsTrigger>
            <TabsTrigger value="confirm">Confirm</TabsTrigger>
          </TabsList>

          {/* Step 1: Connect to Gateway */}
          <TabsContent value="connect" className="space-y-4 py-4">
            <GatewaySelector
              onSelectGateway={async gateway => {
                // If the gateway is already authenticated, proceed directly
                if (gateway.status === 'authenticated') {
                  // Set up connection with the already-authenticated gateway
                  setGatewayUrl(gateway.url);
                  setUsername(gateway.username);
                  setPassword(gateway.password || '');

                  // Connect and move to next stage
                  await connectToGateway();
                  setStage(DiscoveryStage.DISCOVER);
                } else {
                  // Return without proceeding - the gateway control component will handle connection
                  toast.info(`Please connect to gateway "${gateway.name}" first`);

                  // The gateway must be connected before we can proceed
                  return;
                }
              }}
              isConnecting={isConnecting}
            />

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
            </DialogFooter>
          </TabsContent>

          {/* Step 2: Discover Sensors */}
          <TabsContent value="discover" className="space-y-4 py-4">
            <div className="flex items-center space-x-2 mb-4">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-full">
                <Wifi className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="font-medium">Connected to Gateway</p>
                <p className="text-sm text-muted-foreground">
                  {gatewayUrl === 'Already connected' ? 'Active gateway connection' : gatewayUrl}
                </p>
              </div>
            </div>

            <div className="border border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-900 p-4 rounded-md mb-6">
              <h3 className="font-semibold text-lg mb-2 flex items-center">
                <Search className="h-5 w-5 mr-2" />
                Next Step: Discover Sensors
              </h3>
              <p className="text-sm mb-3">
                You are now connected to the gateway. Click the green button below to scan for
                available sensors.
              </p>
              <div className="text-sm font-medium">
                <span>This will:</span>
                <ul className="list-disc pl-5 mt-1 space-y-1">
                  <li>Scan the gateway for connected sensors</li>
                  <li>Check for existing sensors in your system</li>
                  <li>Allow you to select which sensors to associate with this equipment</li>
                </ul>
              </div>
            </div>

            <DialogFooter className="flex justify-center">
              <Button onClick={discoverSensors} disabled={isDiscovering} variant="discover">
                {isDiscovering ? (
                  <>
                    <Loader className="mr-2 h-4 w-4 animate-spin" />
                    Discovering Sensors...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    Discover Sensors
                  </>
                )}
              </Button>
            </DialogFooter>
          </TabsContent>

          {/* Step 3: Associate Sensors with Equipment */}
          <TabsContent value="associate" className="space-y-4 py-4">
            <div className="mb-2">
              <p className="text-sm">
                Select the sensors you want to associate with this equipment.
              </p>
            </div>

            <div className="border rounded-md overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="py-2 px-4 text-left font-medium">
                      <Checkbox
                        checked={
                          discoveredSensors.length > 0 && discoveredSensors.every(s => s.selected)
                        }
                        onCheckedChange={checked => {
                          if (checked) {
                            selectAllSensors();
                          } else {
                            deselectAllSensors();
                          }
                        }}
                        aria-label="Select all sensors"
                      />
                    </th>
                    <th className="py-2 px-4 text-left font-medium">Serial</th>
                    <th className="py-2 px-4 text-left font-medium">Part Number</th>
                    <th className="py-2 px-4 text-left font-medium">Status</th>
                    <th className="py-2 px-4 text-left font-medium">Name</th>
                  </tr>
                </thead>
                <tbody>
                  {discoveredSensors.map((sensor: DiscoveredSensor) => (
                    <tr key={sensor.Serial} className="border-t">
                      <td className="py-3 px-4">
                        <Checkbox
                          checked={sensor.selected}
                          onCheckedChange={() => toggleSelectSensor(sensor.Serial)}
                        />
                      </td>
                      <td className="py-3 px-4 font-mono text-sm">{sensor.Serial}</td>
                      <td className="py-3 px-4 font-mono text-sm">{sensor.PartNum}</td>
                      <td className="py-3 px-4">
                        <div className="flex gap-1">
                          {sensor.Connected === 1 ? (
                            <Badge className="bg-green-500">Connected</Badge>
                          ) : (
                            <Badge variant="outline">Disconnected</Badge>
                          )}

                          {sensor.duplicate && <Badge variant="secondary">Existing</Badge>}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Input
                          value={sensor.customName || ''}
                          onChange={e => updateSensorName(sensor.Serial, e.target.value)}
                          className="h-8 text-sm"
                          placeholder={sensor.suggestedName || `Sensor ${sensor.Serial}`}
                          disabled={!sensor.selected}
                        />
                      </td>
                    </tr>
                  ))}

                  {discoveredSensors.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-muted-foreground">
                        No sensors discovered. Go back and try again.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-2">
              <p className="text-sm text-muted-foreground">
                {selectedCount} of {discoveredSensors.length} sensors selected
              </p>
            </div>

            <DialogFooter className="flex justify-end mt-4">
              <Button
                onClick={createAssociatedSensors}
                disabled={selectedCount === 0 || isCreating}
              >
                {isCreating ? (
                  <>
                    <Loader className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <ArrowRight className="mr-2 h-4 w-4" />
                    Continue
                  </>
                )}
              </Button>
            </DialogFooter>
          </TabsContent>

          {/* Step 4: Confirmation */}
          <TabsContent value="confirm" className="space-y-4 py-4">
            <div className="flex flex-col items-center justify-center py-8">
              <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center mb-4">
                <CircleCheck className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>

              <h3 className="text-xl font-medium mb-2">Sensors Added Successfully</h3>

              <p className="text-center text-muted-foreground mb-4">
                {selectedCount} sensors have been associated with this equipment.
              </p>

              <Button onClick={() => setIsOpen(false)}>Close</Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
