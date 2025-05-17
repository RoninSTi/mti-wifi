import { useState, useCallback, useEffect } from 'react';
import { ctcApiService } from '@/lib/ctc/ctcApiService';
import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/api-client';
import {
  DiscoveryStage,
  DiscoveredSensor,
  DiscoveredSensorRaw,
  SensorAssociation,
} from '@/types/discovery';
import { SensorResponse } from '@/app/api/sensors/schemas';
import { useGatewayConnection } from '@/contexts/GatewayConnectionContext';

interface UseDiscoverSensorsOptions {
  equipmentId: string;
  onSuccess?: (sensors: SensorResponse[]) => void;
  onError?: (error: Error) => void;
}

interface UseDiscoverSensorsResult {
  // Discovery state
  stage: DiscoveryStage;
  setStage: (stage: DiscoveryStage) => void;
  discoveredSensors: DiscoveredSensor[];
  selectedCount: number;
  isConnecting: boolean;
  isDiscovering: boolean;
  isCreating: boolean;

  // Gateway connection options
  gatewayUrl: string;
  setGatewayUrl: (url: string) => void;
  username: string;
  setUsername: (username: string) => void;
  password: string;
  setPassword: (password: string) => void;

  // Methods
  connectToGateway: () => Promise<boolean>;
  discoverSensors: () => Promise<void>;
  toggleSelectSensor: (serial: number) => void;
  updateSensorName: (serial: number, name: string) => void;
  selectAllSensors: () => void;
  deselectAllSensors: () => void;
  createAssociatedSensors: () => Promise<void>;
  resetDiscovery: () => void;
}

/**
 * Hook for discovering sensors from connected gateway and associating them with equipment
 */
export function useDiscoverSensors({
  equipmentId,
  onSuccess,
  onError,
}: UseDiscoverSensorsOptions): UseDiscoverSensorsResult {
  // Get gateway connection context
  const { state: gatewayState } = useGatewayConnection();
  const hasActiveGateway = !!gatewayState.activeGateway;

  // Discovery state
  const [stage, setStage] = useState<DiscoveryStage>(() =>
    hasActiveGateway ? DiscoveryStage.DISCOVER : DiscoveryStage.CONNECT
  );
  const [discoveredSensors, setDiscoveredSensors] = useState<DiscoveredSensor[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDiscovering, setIsDiscovering] = useState(false);

  // Gateway connection settings
  const [gatewayUrl, setGatewayUrl] = useState(() => (hasActiveGateway ? 'Already connected' : ''));
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // Watch for changes in active gateway
  useEffect(() => {
    if (hasActiveGateway) {
      setStage(DiscoveryStage.DISCOVER);
      setGatewayUrl('Already connected');
    }
  }, [hasActiveGateway, gatewayState.activeGateway]);

  // Count of selected sensors
  const selectedCount = discoveredSensors.filter(s => s.selected).length;

  // Connect to gateway
  const connectToGateway = async (): Promise<boolean> => {
    if (!gatewayUrl || !username || !password) {
      toast.error('Please enter gateway URL, username, and password');
      return false;
    }

    setIsConnecting(true);

    try {
      // Attempt to connect to the gateway
      const connected = await ctcApiService.connect(gatewayUrl);

      if (!connected) {
        toast.error('Failed to connect to gateway');
        setIsConnecting(false);
        return false;
      }

      // Attempt to authenticate with the gateway
      const loginResponse = await ctcApiService.login(username, password);

      if (!loginResponse.Success) {
        toast.error('Authentication failed');
        ctcApiService.disconnect();
        setIsConnecting(false);
        return false;
      }

      // Successfully authenticated
      toast.success('Connected to gateway');
      setStage(DiscoveryStage.DISCOVER);
      setIsConnecting(false);
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to connect to gateway';

      toast.error(`Connection error: ${errorMessage}`);
      ctcApiService.disconnect();
      setIsConnecting(false);
      return false;
    }
  };

  // Discover sensors from connected gateway
  const discoverSensors = async (): Promise<void> => {
    setIsDiscovering(true);

    try {
      // Check if WebSocket is actually connected despite what the context says
      if (!ctcApiService.isConnectedToGateway() && hasActiveGateway) {
        // We think we're connected according to context, but the WebSocket is closed
        // Get the active gateway to reconnect
        const activeGatewayId = gatewayState.activeGateway;
        if (activeGatewayId) {
          const gatewayConnection = gatewayState.connections[activeGatewayId];
          if (gatewayConnection?.gateway) {
            const gateway = gatewayConnection.gateway;

            toast.info('Reconnecting to gateway...');

            // Attempt to reconnect
            const connected = await ctcApiService.connect(gateway.url);
            if (!connected) {
              toast.error('Failed to reconnect to gateway');
              setIsDiscovering(false);
              return;
            }

            // Ensure password is available from the gateway object
            if (!gateway.password) {
              toast.error('Missing gateway credentials');
              ctcApiService.disconnect();
              setIsDiscovering(false);
              return;
            }

            // Attempt to re-authenticate
            const loginResponse = await ctcApiService.login(gateway.username, gateway.password);
            if (!loginResponse.Success) {
              toast.error('Failed to authenticate with gateway');
              ctcApiService.disconnect();
              setIsDiscovering(false);
              return;
            }

            toast.success('Reconnected to gateway');
          }
        }
      }

      // Get connected sensors from the gateway
      const sensorData = await ctcApiService.getConnectedDynamicSensors();

      // Check if data is empty
      if (!sensorData) {
        toast.error('No data received from gateway');
        setIsDiscovering(false);
        return;
      }

      // Handle different data formats
      let processedSensorData: Record<string, unknown> = {};

      // Case 1: Regular object format (expected format)
      if (!Array.isArray(sensorData) && typeof sensorData === 'object') {
        processedSensorData = sensorData;
      }
      // Case 2: Array format (needs conversion)
      else if (Array.isArray(sensorData)) {
        sensorData.forEach((sensor: unknown, index: number) => {
          // Use Serial as key if available, otherwise use index
          // Safe type checking for sensor with Serial property
          const key =
            sensor &&
            typeof sensor === 'object' &&
            'Serial' in sensor &&
            (typeof sensor.Serial === 'number' || typeof sensor.Serial === 'string')
              ? String(sensor.Serial)
              : index.toString();
          processedSensorData[key] = sensor;
        });
      }

      if (Object.keys(processedSensorData).length === 0) {
        toast.info('No sensors found');
        setIsDiscovering(false);
        return;
      }

      // Fetch existing sensors to check for duplicates
      const existingResponse = await apiClient.get<SensorResponse[]>(
        `/api/sensors?equipmentId=${equipmentId}`
      );

      // Ensure existingSensors is always an array
      let existingSensors: SensorResponse[] = [];
      if (existingResponse.data) {
        if (Array.isArray(existingResponse.data)) {
          existingSensors = existingResponse.data;
        } else {
          // existingResponse.data is not an array, try to convert
          // Try to convert to array if it's an object with enumerable properties
          if (typeof existingResponse.data === 'object') {
            existingSensors = Object.values(existingResponse.data);
          }
        }
      }

      // Transform the sensor data for the UI
      const sensors: DiscoveredSensor[] = Object.values(processedSensorData)
        .map((sensorRaw: unknown) => {
          try {
            // Type check the sensorRaw object
            if (!sensorRaw || typeof sensorRaw !== 'object') {
              throw new Error('Invalid sensor data');
            }

            // Ensure we have a valid sensor object that matches our expected schema
            const sensorData = sensorRaw as Record<string, unknown>;
            const sensor: DiscoveredSensorRaw = {
              Serial: typeof sensorData.Serial === 'number' ? sensorData.Serial : 0,
              Connected: typeof sensorData.Connected === 'number' ? sensorData.Connected : 0,
              AccessPoint: typeof sensorData.AccessPoint === 'number' ? sensorData.AccessPoint : 0,
              PartNum: typeof sensorData.PartNum === 'string' ? sensorData.PartNum : 'Unknown',
              ReadRate: typeof sensorData.ReadRate === 'number' ? sensorData.ReadRate : 0,
              GMode: typeof sensorData.GMode === 'string' ? sensorData.GMode : '',
              FreqMode:
                typeof sensorData.FreqMode === 'string' || typeof sensorData.FreqMode === 'number'
                  ? String(sensorData.FreqMode)
                  : '',
              ReadPeriod: typeof sensorData.ReadPeriod === 'number' ? sensorData.ReadPeriod : 0,
              Samples: typeof sensorData.Samples === 'number' ? sensorData.Samples : 0,
              HwVer: typeof sensorData.HwVer === 'string' ? sensorData.HwVer : '',
              FmVer: typeof sensorData.FmVer === 'string' ? sensorData.FmVer : '',
            };

            // Generate a suggested name based on serial and part number
            const suggestedName = `${sensor.PartNum || 'Sensor'} ${sensor.Serial}`;

            // Check if this sensor already exists (by serial number)
            let existingSensor: SensorResponse | undefined = undefined;
            if (Array.isArray(existingSensors)) {
              existingSensor = existingSensors.find(s => s.serial === sensor.Serial);
            }

            return {
              ...sensor,
              selected: false,
              suggestedName,
              customName: existingSensor?.name || suggestedName,
              duplicate: !!existingSensor,
              existingId: existingSensor?._id,
            };
          } catch {
            // Error occurred while processing sensor data
            // Return a minimal valid sensor object to avoid breaking the UI
            // Use safe defaults for the fallback case
            return {
              Serial: 0, // Default to 0 for invalid sensors (will be filtered out later)
              Connected: 0,
              AccessPoint: 0,
              PartNum: 'Unknown',
              ReadRate: 0,
              GMode: '',
              FreqMode: '',
              ReadPeriod: 0,
              Samples: 0,
              HwVer: '',
              FmVer: '',
              selected: false,
              suggestedName: 'Unknown Sensor',
              customName: 'Unknown Sensor',
              duplicate: false,
            };
          }
        })
        .filter(sensor => sensor.Serial > 0); // Filter out any invalid sensors

      // Show warning if duplicates found
      const duplicates = sensors.filter(s => s.duplicate);
      if (duplicates.length > 0) {
        toast.warning(
          `${duplicates.length} sensor(s) already exist. They will be updated if selected.`
        );
      }

      // Update state with discovered sensors and move to next stage
      setDiscoveredSensors(sensors);
      // We only show a toast for the discovery itself, not for both discovery and creation
      toast.success(`Found ${sensors.length} sensors`);
      setStage(DiscoveryStage.ASSOCIATE);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to discover sensors';

      toast.error(`Discovery error: ${errorMessage}`);
    } finally {
      setIsDiscovering(false);
    }
  };

  // Toggle sensor selection
  const toggleSelectSensor = useCallback((serial: number): void => {
    setDiscoveredSensors(prev =>
      prev.map(sensor =>
        sensor.Serial === serial ? { ...sensor, selected: !sensor.selected } : sensor
      )
    );
  }, []);

  // Update sensor name
  const updateSensorName = useCallback((serial: number, name: string): void => {
    setDiscoveredSensors(prev =>
      prev.map(sensor => (sensor.Serial === serial ? { ...sensor, customName: name } : sensor))
    );
  }, []);

  // Select all sensors
  const selectAllSensors = useCallback((): void => {
    setDiscoveredSensors(prev => prev.map(sensor => ({ ...sensor, selected: true })));
  }, []);

  // Deselect all sensors
  const deselectAllSensors = useCallback((): void => {
    setDiscoveredSensors(prev => prev.map(sensor => ({ ...sensor, selected: false })));
  }, []);

  // Get query client for cache invalidation
  const queryClient = useQueryClient();

  // Mutation for creating sensors
  const createSensorsMutation = useMutation({
    mutationFn: async (sensors: SensorAssociation[]) => {
      // Use the fetch API directly for this specific endpoint to avoid issues with the apiClient
      const response = await fetch('/api/sensors/discover', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sensors,
          equipmentId,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to create sensors: ${response.status}`);
      }

      const data = await response.json();
      return data as SensorResponse[];
    },
    onSuccess: sensors => {
      // Invalidate related queries to trigger automatic refetching
      queryClient.invalidateQueries({ queryKey: ['sensors'] });
      queryClient.invalidateQueries({ queryKey: ['sensors', equipmentId] });
      queryClient.invalidateQueries({ queryKey: ['equipment', equipmentId] });

      // Show toast ONLY in the mutation callback to prevent duplicate notifications
      // This ensures the toast is only shown once per operation
      if (sensors && sensors.length > 0) {
        toast.success(`${sensors.length} sensor(s) created successfully`);
      } else {
        toast.info('No sensors were created');
      }

      // Call parent success handler if provided
      if (onSuccess) onSuccess(sensors);
    },
    onError: (error: Error) => {
      toast.error(`Failed to create sensors: ${error.message}`);
      if (onError) onError(error);
    },
  });

  // Create and associate sensors
  const createAssociatedSensors = async (): Promise<void> => {
    const selectedSensors = discoveredSensors.filter(s => s.selected);

    if (selectedSensors.length === 0) {
      toast.error('Please select at least one sensor');
      return;
    }

    // Prepare sensor data for submission
    const sensorAssociations: SensorAssociation[] = selectedSensors.map(sensor => {
      const association: SensorAssociation = {
        serial: sensor.Serial,
        name: sensor.customName || sensor.suggestedName || `Sensor ${sensor.Serial}`,
        equipmentId,
        partNumber: sensor.PartNum,
        hardwareVersion: sensor.HwVer,
        firmwareVersion: sensor.FmVer,
        accessPoint: sensor.AccessPoint,
        readRate: sensor.ReadRate,
        readPeriod: sensor.ReadPeriod,
        samples: sensor.Samples,
        gMode: sensor.GMode,
        freqMode: sensor.FreqMode
          ? typeof sensor.FreqMode === 'string'
            ? parseInt(sensor.FreqMode, 10)
            : Number(sensor.FreqMode)
          : undefined,
        connected: sensor.Connected === 1,
      };

      // If this is an existing sensor (duplicate), include its ID
      if (sensor.existingId) {
        association.sensorId = sensor.existingId;
      }

      return association;
    });

    // Create or update sensors
    await createSensorsMutation.mutateAsync(sensorAssociations);

    // Move to confirmation stage
    setStage(DiscoveryStage.CONFIRM);
  };

  // Reset discovery state
  const resetDiscovery = useCallback((): void => {
    // Only disconnect if this dialog initiated the connection
    if (gatewayUrl !== 'Already connected') {
      ctcApiService.disconnect();
    }

    // Reset data state
    setDiscoveredSensors([]);

    // Always reset to initial stage based on gateway connection
    if (hasActiveGateway) {
      // If there's an active gateway, go directly to discover stage
      setStage(DiscoveryStage.DISCOVER);
      setGatewayUrl('Already connected');
    } else {
      // No active gateway, so reset to connect stage
      setStage(DiscoveryStage.CONNECT);
      setGatewayUrl('');
    }

    // Always clear credentials
    setUsername('');
    setPassword('');

    // Reset the mutation state
    createSensorsMutation.reset();
  }, [gatewayUrl, hasActiveGateway, createSensorsMutation]);

  return {
    // State
    stage,
    setStage,
    discoveredSensors,
    selectedCount,
    isConnecting,
    isDiscovering,
    isCreating: createSensorsMutation.isPending,

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
  };
}
