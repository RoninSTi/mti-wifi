import { z } from 'zod';

// Base fields schema for area validation
const areaBaseSchema = {
  name: z.string().min(1, 'Area name is required').max(100, 'Name cannot exceed 100 characters'),
  description: z.string().max(1000, 'Description cannot exceed 1000 characters').optional(),
  location: z.string().min(1, 'Location ID is required'),
  floorLevel: z.number().optional(),
  buildingSection: z.string().max(100, 'Building section cannot exceed 100 characters').optional(),
  areaType: z
    .enum(['production', 'storage', 'office', 'utility', 'other'])
    .default('other')
    .optional(),
};

// Schema for creating a new area
export const createAreaSchema = z.object(areaBaseSchema);

// Schema for updating an area - partial fields
export const updateAreaSchema = z
  .object({
    name: areaBaseSchema.name.optional(),
    description: areaBaseSchema.description,
    floorLevel: areaBaseSchema.floorLevel,
    buildingSection: areaBaseSchema.buildingSection,
    areaType: areaBaseSchema.areaType,
  })
  .refine(data => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  });

// Schema for the URL parameter
export const areaParamsSchema = z.object({
  id: z.string().min(1, 'Area ID is required'),
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
  address: z.string().optional(),
  organization: organizationReferenceSchema.optional(),
});

// Response schema and type
export const areaResponseSchema = z.object({
  _id: z.string(),
  name: areaBaseSchema.name,
  description: areaBaseSchema.description,
  location: locationReferenceSchema,
  floorLevel: areaBaseSchema.floorLevel,
  buildingSection: areaBaseSchema.buildingSection,
  areaType: areaBaseSchema.areaType,
  createdAt: z.string().or(z.date()),
  updatedAt: z.string().or(z.date()),
});

// Types derived from the Zod schemas
export type CreateAreaInput = z.infer<typeof createAreaSchema>;
export type UpdateAreaInput = z.infer<typeof updateAreaSchema>;
export type AreaParams = z.infer<typeof areaParamsSchema>;
export type AreaResponse = z.infer<typeof areaResponseSchema>;
