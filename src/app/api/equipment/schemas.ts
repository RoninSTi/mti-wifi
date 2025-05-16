import { z } from 'zod';

// Base fields schema for equipment validation
const equipmentBaseSchema = {
  name: z
    .string()
    .min(1, 'Equipment name is required')
    .max(100, 'Name cannot exceed 100 characters'),
  description: z.string().max(1000, 'Description cannot exceed 1000 characters').optional(),
  area: z.string().min(1, 'Area ID is required'),
  equipmentType: z.string().min(1, 'Equipment type is required'),
  manufacturer: z.string().max(100, 'Manufacturer cannot exceed 100 characters').optional(),
  modelNumber: z.string().max(100, 'Model number cannot exceed 100 characters').optional(),
  serialNumber: z.string().max(100, 'Serial number cannot exceed 100 characters').optional(),
  installationDate: z.string().or(z.date()).optional(),
  lastMaintenanceDate: z.string().or(z.date()).optional(),
  maintenanceInterval: z.number().int().positive().optional(),
  criticalityLevel: z.enum(['low', 'medium', 'high', 'critical']).default('medium').optional(),
  status: z.enum(['active', 'inactive', 'maintenance', 'failed']).default('active'),
  notes: z.string().max(1000, 'Notes cannot exceed 1000 characters').optional(),
};

// Schema for creating new equipment
export const createEquipmentSchema = z.object(equipmentBaseSchema);

// Schema for updating equipment - all fields optional except area which cannot be changed
export const updateEquipmentSchema = z
  .object({
    name: equipmentBaseSchema.name.optional(),
    description: equipmentBaseSchema.description,
    equipmentType: z.string().min(1, 'Equipment type is required').optional(),
    manufacturer: equipmentBaseSchema.manufacturer,
    modelNumber: equipmentBaseSchema.modelNumber,
    serialNumber: equipmentBaseSchema.serialNumber,
    installationDate: equipmentBaseSchema.installationDate,
    lastMaintenanceDate: equipmentBaseSchema.lastMaintenanceDate,
    maintenanceInterval: equipmentBaseSchema.maintenanceInterval,
    criticalityLevel: equipmentBaseSchema.criticalityLevel,
    status: equipmentBaseSchema.status.optional(),
    notes: equipmentBaseSchema.notes,
  })
  .refine(data => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  });

// Schema for the URL parameter
export const equipmentParamsSchema = z.object({
  id: z.string().min(1, 'Equipment ID is required'),
});

// Organization reference schema for responses
export const organizationReferenceSchema = z.object({
  _id: z.string(),
  name: z.string(),
});

// Location reference schema for responses
export const locationReferenceSchema = z.object({
  _id: z.string(),
  name: z.string(),
  organization: organizationReferenceSchema,
  address: z.string().optional(),
});

// Area reference schema for responses
export const areaReferenceSchema = z.object({
  _id: z.string(),
  name: z.string(),
  location: locationReferenceSchema.optional(),
  organization: organizationReferenceSchema.optional(),
});

// Response schema and type
export const equipmentResponseSchema = z.object({
  _id: z.string(),
  name: equipmentBaseSchema.name,
  description: equipmentBaseSchema.description,
  area: areaReferenceSchema,
  equipmentType: equipmentBaseSchema.equipmentType,
  manufacturer: equipmentBaseSchema.manufacturer,
  modelNumber: equipmentBaseSchema.modelNumber,
  serialNumber: equipmentBaseSchema.serialNumber,
  installationDate: z.string().or(z.date()).optional(),
  lastMaintenanceDate: z.string().or(z.date()).optional(),
  maintenanceInterval: equipmentBaseSchema.maintenanceInterval,
  criticalityLevel: equipmentBaseSchema.criticalityLevel,
  status: equipmentBaseSchema.status,
  notes: equipmentBaseSchema.notes,
  createdAt: z.string().or(z.date()),
  updatedAt: z.string().or(z.date()),
  nextMaintenanceDate: z.string().or(z.date()).nullable().optional(),
  maintenanceDue: z.boolean().optional(),
});

// Types derived from the Zod schemas
export type CreateEquipmentInput = z.infer<typeof createEquipmentSchema>;
export type UpdateEquipmentInput = z.infer<typeof updateEquipmentSchema>;
export type EquipmentParams = z.infer<typeof equipmentParamsSchema>;
export type EquipmentResponse = z.infer<typeof equipmentResponseSchema>;
