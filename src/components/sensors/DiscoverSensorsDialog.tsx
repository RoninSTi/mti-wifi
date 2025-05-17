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
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Wifi,
  WifiOff,
  Search,
  Loader,
  Check,
  ArrowLeft,
  ArrowRight,
  Clipboard,
  CircleCheck,
} from 'lucide-react';
import { useDiscoverSensors } from '@/hooks/useDiscoverSensors';
import { ctcApiService } from '@/lib/ctc/ctcApiService';
import { DiscoveryStage, DiscoveredSensor } from '@/types/discovery';
import { SensorResponse } from '@/app/api/sensors/schemas';
import { useGatewayConnection } from '@/contexts/GatewayConnectionContext';

interface DiscoverSensorsDialogProps {
  equipmentId: string;
  trigger?: React.ReactNode;
  onComplete?: (sensors: SensorResponse[]) => void;
  defaultOpen?: boolean;
}

export function DiscoverSensorsDialog({
  equipmentId,
  onComplete,
  defaultOpen = false,
}: Omit<DiscoverSensorsDialogProps, 'trigger'>) {
  const [open, setOpen] = React.useState(defaultOpen);
  const { state: gatewayState } = useGatewayConnection();

  // Update open state when defaultOpen changes
  React.useEffect(() => {
    setOpen(defaultOpen);
  }, [defaultOpen]);

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
    username,
    setUsername,
    password,
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
        setOpen(false);
        if (onComplete) onComplete(sensors);
      }, 1500);
    },
  });

  // Handle dialog open/close
  const handleOpenChange = (isOpen: boolean) => {
    // Set the open state first
    setOpen(isOpen);

    if (isOpen) {
      // Dialog is being opened - check gateway status
      console.log(
        'Opening discovery dialog. Current gateway connection status:',
        ctcApiService.isConnectedToGateway() ? 'Connected' : 'Not connected'
      );
    } else {
      // Dialog is being closed - reset state
      console.log('Closing discovery dialog, resetting state');
      // Use setTimeout to ensure state reset happens after the dialog animation completes
      setTimeout(() => {
        resetDiscovery();
      }, 300);
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

  // Log the current stage for debugging
  console.log(
    'Current stage:',
    stage,
    'Active tab:',
    getActiveTab(),
    'Gateway connection:',
    ctcApiService.isConnectedToGateway() ? 'Connected' : 'Not connected',
    'Gateway URL:',
    gatewayUrl
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {/* No trigger needed as this dialog is opened programmatically */}

      <DialogContent className="sm:max-w-[650px]">
        <DialogHeader>
          <div className="flex flex-col space-y-1">
            <DialogTitle>Discover Sensors</DialogTitle>
            <p className="text-sm text-muted-foreground">
              {stage === DiscoveryStage.CONNECT && 'Step 1: Connect to a gateway'}
              {stage === DiscoveryStage.DISCOVER &&
                'Step 2: Click the green button to scan for sensors'}
              {stage === DiscoveryStage.ASSOCIATE &&
                'Step 3: Select sensors to associate with equipment'}
              {stage === DiscoveryStage.CONFIRM && 'Step 4: Sensors associated successfully'}
            </p>
          </div>
        </DialogHeader>

        <div className="w-full border-b pb-2 mb-4">
          <div className="flex justify-between w-full">
            <div
              className={`flex flex-col items-center ${
                stage === DiscoveryStage.CONNECT
                  ? 'text-primary'
                  : 'text-green-600 dark:text-green-400'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center mb-1 ${
                  stage === DiscoveryStage.CONNECT
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400'
                }`}
              >
                {stage !== DiscoveryStage.CONNECT ? <Check className="h-4 w-4" /> : '1'}
              </div>
              <span className="text-xs">Connect</span>
            </div>
            <div
              className={`flex flex-col items-center ${stage === DiscoveryStage.DISCOVER ? 'text-primary' : stage > DiscoveryStage.DISCOVER ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center mb-1 ${
                  stage === DiscoveryStage.DISCOVER
                    ? 'bg-primary text-primary-foreground'
                    : stage > DiscoveryStage.DISCOVER
                      ? 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400'
                      : 'bg-muted'
                }`}
              >
                {stage > DiscoveryStage.DISCOVER ? <Check className="h-4 w-4" /> : '2'}
              </div>
              <span className="text-xs">Discover</span>
            </div>
            <div
              className={`flex flex-col items-center ${stage === DiscoveryStage.ASSOCIATE ? 'text-primary' : stage > DiscoveryStage.ASSOCIATE ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center mb-1 ${
                  stage === DiscoveryStage.ASSOCIATE
                    ? 'bg-primary text-primary-foreground'
                    : stage > DiscoveryStage.ASSOCIATE
                      ? 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400'
                      : 'bg-muted'
                }`}
              >
                {stage > DiscoveryStage.ASSOCIATE ? <Check className="h-4 w-4" /> : '3'}
              </div>
              <span className="text-xs">Select</span>
            </div>
            <div
              className={`flex flex-col items-center ${stage === DiscoveryStage.CONFIRM ? 'text-primary' : 'text-muted-foreground'}`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center mb-1 ${stage === DiscoveryStage.CONFIRM ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
              >
                <span>4</span>
              </div>
              <span className="text-xs">Confirm</span>
            </div>
          </div>
        </div>

        <Tabs value={getActiveTab()} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="connect" disabled={stage !== DiscoveryStage.CONNECT}>
              1. Connect
            </TabsTrigger>
            <TabsTrigger value="discover" disabled={stage !== DiscoveryStage.DISCOVER}>
              2. Discover
            </TabsTrigger>
            <TabsTrigger value="associate" disabled={stage !== DiscoveryStage.ASSOCIATE}>
              3. Select
            </TabsTrigger>
            <TabsTrigger value="confirm" disabled={stage !== DiscoveryStage.CONFIRM}>
              4. Confirm
            </TabsTrigger>
          </TabsList>

          {/* Step 1: Connect to Gateway */}
          <TabsContent value="connect" className="space-y-4 py-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="gateway-url">Gateway URL</Label>
                <Input
                  id="gateway-url"
                  placeholder="ws://gateway.example.com:8080"
                  value={gatewayUrl}
                  onChange={e => setGatewayUrl(e.target.value)}
                  disabled={isConnecting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  placeholder="Enter username"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  disabled={isConnecting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  disabled={isConnecting}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={connectToGateway}
                disabled={isConnecting || !gatewayUrl || !username || !password}
              >
                {isConnecting ? (
                  <>
                    <Loader className="mr-2 h-4 w-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Wifi className="mr-2 h-4 w-4" />
                    Connect
                  </>
                )}
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

            <DialogFooter className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => {
                  setStage(DiscoveryStage.CONNECT);
                  // Only disconnect if we didn't automatically skip the connection step
                  if (gatewayUrl !== 'Already connected') {
                    ctcApiService.disconnect();
                  }
                }}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>

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
            <div className="flex justify-between items-center mb-2">
              <p className="text-sm">
                Select the sensors you want to associate with this equipment.
              </p>

              <div className="flex space-x-2">
                <Button onClick={selectAllSensors} size="sm" variant="outline">
                  Select All
                </Button>
                <Button onClick={deselectAllSensors} size="sm" variant="outline">
                  Deselect All
                </Button>
              </div>
            </div>

            <div className="border rounded-md overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="py-2 px-4 text-left font-medium">Select</th>
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

            <DialogFooter className="flex justify-between mt-4">
              <Button variant="outline" onClick={() => setStage(DiscoveryStage.DISCOVER)}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>

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

              <Button onClick={() => setOpen(false)}>Close</Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
