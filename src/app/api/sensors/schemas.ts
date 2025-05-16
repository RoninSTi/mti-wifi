import { z } from 'zod';
import { equipmentReferenceSchema } from '../equipment/schemas';

// Base fields schema for sensor validation
const sensorBaseSchema = {
  name: z.string().min(1, 'Sensor name is required').max(100, 'Name cannot exceed 100 characters'),
  description: z.string().max(1000, 'Description cannot exceed 1000 characters').optional(),
  equipment: z.string().min(1, 'Equipment ID is required'),
  // Make serial and partNumber optional
  serial: z.number().int().positive('Serial number must be a positive integer').optional(),
  partNumber: z.string().min(1, 'Part number is required').optional(),
  hardwareVersion: z.string().optional(),
  firmwareVersion: z.string().optional(),
  position: z
    .object({
      x: z.number().optional(),
      y: z.number().optional(),
      z: z.number().optional(),
    })
    .optional(),
  accessPoint: z.number().int().optional(),
  // System-managed fields with defaults
  connected: z.boolean().default(false),
  lastConnectedAt: z.string().or(z.date()).optional(),
  readRate: z.number().optional(),
  readPeriod: z.number().optional(),
  samples: z.number().int().optional(),
  gMode: z.string().optional(),
  freqMode: z.string().optional(),
  status: z.enum(['active', 'inactive', 'warning', 'error']).default('inactive'),
  wsEndpoint: z.string().optional(),
};

// Schema for creating new sensor
export const createSensorSchema = z.object(sensorBaseSchema);

// Schema for updating sensor - all fields optional except equipment which cannot be changed
export const updateSensorSchema = z
  .object({
    name: sensorBaseSchema.name.optional(),
    description: sensorBaseSchema.description,
    serial: z.number().int().positive().optional(),
    partNumber: z.string().optional(),
    hardwareVersion: sensorBaseSchema.hardwareVersion,
    firmwareVersion: sensorBaseSchema.firmwareVersion,
    position: sensorBaseSchema.position,
    accessPoint: sensorBaseSchema.accessPoint,
    connected: z.boolean().optional(),
    lastConnectedAt: z.string().or(z.date()).optional(),
    readRate: sensorBaseSchema.readRate,
    readPeriod: sensorBaseSchema.readPeriod,
    samples: sensorBaseSchema.samples,
    gMode: sensorBaseSchema.gMode,
    freqMode: sensorBaseSchema.freqMode,
    status: sensorBaseSchema.status.optional(),
    wsEndpoint: sensorBaseSchema.wsEndpoint,
  })
  .refine(data => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  });

// Schema for the URL parameter
export const sensorParamsSchema = z.object({
  id: z.string().min(1, 'Sensor ID is required'),
});

// Response schema and type
export const sensorResponseSchema = z.object({
  _id: z.string(),
  name: sensorBaseSchema.name,
  description: sensorBaseSchema.description,
  equipment: equipmentReferenceSchema,
  serial: z.number().optional(),
  partNumber: z.string().optional(),
  hardwareVersion: z.string().optional(),
  firmwareVersion: z.string().optional(),
  position: sensorBaseSchema.position,
  accessPoint: z.number().optional(),
  connected: z.boolean(),
  lastConnectedAt: z.string().or(z.date()).optional(),
  readRate: z.number().optional(),
  readPeriod: z.number().optional(),
  samples: z.number().optional(),
  gMode: z.string().optional(),
  freqMode: z.string().optional(),
  status: sensorBaseSchema.status,
  wsEndpoint: z.string().optional(),
  createdAt: z.string().or(z.date()),
  updatedAt: z.string().or(z.date()),
});

// Types derived from the Zod schemas
export type CreateSensorInput = z.infer<typeof createSensorSchema>;
export type UpdateSensorInput = z.infer<typeof updateSensorSchema>;
export type SensorParams = z.infer<typeof sensorParamsSchema>;
export type SensorResponse = z.infer<typeof sensorResponseSchema>;
