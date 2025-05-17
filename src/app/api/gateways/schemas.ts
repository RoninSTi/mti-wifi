import { z } from 'zod';

// Base fields schema for gateway validation
const gatewayBaseSchema = {
  name: z.string().min(1, 'Gateway name is required').max(100, 'Name cannot exceed 100 characters'),
  description: z.string().max(1000, 'Description cannot exceed 1000 characters').optional(),
  url: z.string().url('A valid URL is required').max(255, 'URL cannot exceed 255 characters'),
  username: z
    .string()
    .min(1, 'Username is required')
    .max(100, 'Username cannot exceed 100 characters'),
  password: z
    .string()
    .min(1, 'Password is required')
    .max(100, 'Password cannot exceed 100 characters'),
  serialNumber: z
    .string()
    .min(1, 'Serial number is required')
    .max(50, 'Serial number cannot exceed 50 characters'),
  location: z.string().min(1, 'Location ID is required'),
  status: z.enum(['disconnected', 'connected', 'authenticated']).default('disconnected').optional(),
};

// Schema for creating a new gateway
export const createGatewaySchema = z.object(gatewayBaseSchema);

// Schema for updating a gateway - location can't be changed, other fields optional
export const updateGatewaySchema = z
  .object({
    name: gatewayBaseSchema.name.optional(),
    description: gatewayBaseSchema.description,
    url: z
      .string()
      .url('A valid URL is required')
      .max(255, 'URL cannot exceed 255 characters')
      .optional(),
    username: gatewayBaseSchema.username.optional(),
    password: gatewayBaseSchema.password.optional(),
    serialNumber: gatewayBaseSchema.serialNumber.optional(),
    status: gatewayBaseSchema.status,
  })
  .refine(data => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  });

// Schema for the URL parameter
export const gatewayParamsSchema = z.object({
  id: z.string().min(1, 'Gateway ID is required'),
});

// Types derived from the Zod schemas
export type CreateGatewayInput = z.infer<typeof createGatewaySchema>;
export type UpdateGatewayInput = z.infer<typeof updateGatewaySchema>;
export type GatewayParams = z.infer<typeof gatewayParamsSchema>;

// Location reference schema for responses
export const locationReferenceSchema = z.object({
  _id: z.string(),
  name: z.string(),
});

// Response schema and type with sensitive data excluded
export const gatewayResponseSchema = z.object({
  _id: z.string(),
  name: gatewayBaseSchema.name,
  description: gatewayBaseSchema.description,
  url: gatewayBaseSchema.url,
  username: gatewayBaseSchema.username,
  password: gatewayBaseSchema.password, // Include password for internal use
  serialNumber: gatewayBaseSchema.serialNumber,
  location: locationReferenceSchema,
  status: z.enum(['disconnected', 'connected', 'authenticated']),
  lastConnectedAt: z.string().or(z.date()).optional(),
  lastAuthenticatedAt: z.string().or(z.date()).optional(),
  createdAt: z.string().or(z.date()),
  updatedAt: z.string().or(z.date()),
});

export type GatewayResponse = z.infer<typeof gatewayResponseSchema>;
