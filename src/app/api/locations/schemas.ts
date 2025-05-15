import { z } from 'zod';

// Base fields schema for location validation
const locationBaseSchema = {
  name: z
    .string()
    .min(1, 'Location name is required')
    .max(100, 'Name cannot exceed 100 characters'),
  description: z.string().max(1000, 'Description cannot exceed 1000 characters').optional(),
  address: z.string().max(200, 'Address cannot exceed 200 characters').optional(),
  city: z.string().max(100, 'City cannot exceed 100 characters').optional(),
  state: z.string().max(100, 'State cannot exceed 100 characters').optional(),
  zipCode: z.string().max(20, 'Zip code cannot exceed 20 characters').optional(),
  country: z.string().max(100, 'Country cannot exceed 100 characters').optional(),
  organization: z.string().min(1, 'Organization ID is required'),
};

// Schema for creating a new location
export const createLocationSchema = z.object(locationBaseSchema);

// Schema for updating a location - organization can't be changed, all other fields optional
export const updateLocationSchema = z
  .object({
    name: locationBaseSchema.name.optional(),
    description: locationBaseSchema.description,
    address: locationBaseSchema.address,
    city: locationBaseSchema.city,
    state: locationBaseSchema.state,
    zipCode: locationBaseSchema.zipCode,
    country: locationBaseSchema.country,
  })
  .refine(data => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  });

// Schema for the URL parameter
export const locationParamsSchema = z.object({
  id: z.string().min(1, 'Location ID is required'),
});

// Types derived from the Zod schemas
export type CreateLocationInput = z.infer<typeof createLocationSchema>;
export type UpdateLocationInput = z.infer<typeof updateLocationSchema>;
export type LocationParams = z.infer<typeof locationParamsSchema>;

// Response schema and type
export const locationResponseSchema = createLocationSchema.extend({
  _id: z.string(),
  createdAt: z.string().or(z.date()),
  updatedAt: z.string().or(z.date()),
});

export type LocationResponse = z.infer<typeof locationResponseSchema>;
