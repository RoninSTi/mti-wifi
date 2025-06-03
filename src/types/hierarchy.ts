import { z } from 'zod';

// Zod schemas for raw MongoDB documents (before transformation)
const mongoIdSchema = z.any().transform(val => {
  if (typeof val === 'string') return val;
  try {
    if (val && typeof val.toHexString === 'function') return val.toHexString();
    if (val && typeof val.toString === 'function') return val.toString();
    return String(val);
  } catch (error) {
    return String(val);
  }
});

const rawSensorSchema = z.object({
  _id: mongoIdSchema,
  name: z.string(),
  status: z.string(),
  connected: z.boolean(),
});

const rawEquipmentSchema = z.object({
  _id: mongoIdSchema,
  name: z.string(),
  status: z.string(),
  sensors: z.array(rawSensorSchema).default([]),
});

const rawAreaSchema = z.object({
  _id: mongoIdSchema,
  name: z.string(),
  equipment: z.array(rawEquipmentSchema).default([]),
});

const rawLocationSchema = z.object({
  _id: mongoIdSchema,
  name: z.string(),
  areas: z.array(rawAreaSchema).default([]),
});

export const rawOrganizationSchema = z.object({
  _id: mongoIdSchema,
  name: z.string(),
  locations: z.array(rawLocationSchema).default([]),
});

// Zod schemas for clean hierarchy data
export const hierarchySensorSchema = z.object({
  _id: z.string(),
  name: z.string(),
  status: z.enum(['active', 'inactive', 'warning', 'error']),
  connected: z.boolean(),
});

export const hierarchyEquipmentSchema = z.object({
  _id: z.string(),
  name: z.string(),
  status: z.enum(['active', 'inactive', 'maintenance', 'failed']),
  sensors: z.array(hierarchySensorSchema),
});

export const hierarchyAreaSchema = z.object({
  _id: z.string(),
  name: z.string(),
  equipment: z.array(hierarchyEquipmentSchema),
});

export const hierarchyLocationSchema = z.object({
  _id: z.string(),
  name: z.string(),
  areas: z.array(hierarchyAreaSchema),
});

export const organizationHierarchySchema = z.object({
  _id: z.string(),
  name: z.string(),
  locations: z.array(hierarchyLocationSchema),
});

// Inferred TypeScript types
export type RawOrganization = z.infer<typeof rawOrganizationSchema>;
export type HierarchySensor = z.infer<typeof hierarchySensorSchema>;
export type HierarchyEquipment = z.infer<typeof hierarchyEquipmentSchema>;
export type HierarchyArea = z.infer<typeof hierarchyAreaSchema>;
export type HierarchyLocation = z.infer<typeof hierarchyLocationSchema>;
export type OrganizationHierarchy = z.infer<typeof organizationHierarchySchema>;
