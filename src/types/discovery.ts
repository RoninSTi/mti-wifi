import { z } from 'zod';
import { SensorDataSchema } from '@/lib/ctc/ctcApiService';

/**
 * Type definitions for sensor discovery and association
 */

// Type for raw discovered sensor data from the Gateway
export type DiscoveredSensorRaw = z.infer<typeof SensorDataSchema>;

// Extended schema for discovered sensors with additional UI state
export const DiscoveredSensorSchema = SensorDataSchema.extend({
  // UI state fields
  selected: z.boolean().default(false),
  suggestedName: z.string().optional(),
  customName: z.string().optional(),
  duplicate: z.boolean().default(false),
  existingId: z.string().optional(),
});

// Type for discovered sensor with UI state
export type DiscoveredSensor = z.infer<typeof DiscoveredSensorSchema>;

// Schema for sensor-equipment association
export const SensorAssociationSchema = z.object({
  sensorId: z.string().optional(), // Optional existing ID for updates
  serial: z.union([z.number().int().positive(), z.string().transform(val => parseInt(val, 10))]),
  name: z.string().min(1, 'Name is required'),
  equipmentId: z.string().min(1, 'Equipment is required'),
  partNumber: z.string().optional(),
  hardwareVersion: z.string().optional(),
  firmwareVersion: z.string().optional(),
  // Additional fields from CTC API
  accessPoint: z
    .union([z.number().optional(), z.string().transform(val => parseInt(val, 10))])
    .optional(),
  readRate: z
    .union([z.number().optional(), z.string().transform(val => parseInt(val, 10))])
    .optional(),
  readPeriod: z
    .union([z.number().optional(), z.string().transform(val => parseInt(val, 10))])
    .optional(),
  samples: z
    .union([z.number().optional(), z.string().transform(val => parseInt(val, 10))])
    .optional(),
  gMode: z.string().optional(),
  freqMode: z
    .union([z.number().optional(), z.string().transform(val => parseInt(val, 10))])
    .optional(),
  connected: z
    .union([
      z.boolean(),
      z.number().transform(val => val === 1),
      z.string().transform(val => val === 'true' || val === '1'),
    ])
    .default(false),
});

// Type for sensor-equipment association
export type SensorAssociation = z.infer<typeof SensorAssociationSchema>;

// Schema for the discovery payload sent to the server
export const DiscoverSensorsPayloadSchema = z.object({
  sensors: z.array(SensorAssociationSchema),
  equipmentId: z.string().min(1, 'Equipment ID is required'),
});

// Type for the discovery payload
export type DiscoverSensorsPayload = z.infer<typeof DiscoverSensorsPayloadSchema>;

// Type for the input to the associateDiscoveredSensors API function
export interface AssociateDiscoveredSensorsInput {
  sensors: SensorAssociation[];
  equipmentId: string;
}

// Discovery stage type for the wizard flow
export enum DiscoveryStage {
  CONNECT = 'connect',
  DISCOVER = 'discover',
  ASSOCIATE = 'associate',
  CONFIRM = 'confirm',
}

// Status type for step indicators in wizard flows
export enum StepStatus {
  // Step is not yet eligible to be accessed
  LOCKED = 'locked',
  // Step can be accessed but is not the current active step
  AVAILABLE = 'available',
  // Step is the current active step
  ACTIVE = 'active',
  // Step has been completed
  COMPLETED = 'completed',
}
