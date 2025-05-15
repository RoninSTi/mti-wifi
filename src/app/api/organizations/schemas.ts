import { z } from 'zod';

// Schema for creating a new organization
export const createOrganizationSchema = z.object({
  name: z
    .string()
    .min(1, 'Organization name is required')
    .max(100, 'Name cannot exceed 100 characters'),
  description: z.string().max(1000, 'Description cannot exceed 1000 characters').optional(),
  contactName: z.string().max(100, 'Contact name cannot exceed 100 characters').optional(),
  contactEmail: z
    .string()
    .email('Invalid email address')
    .max(100, 'Email cannot exceed 100 characters')
    .optional(),
  contactPhone: z.string().max(20, 'Phone number cannot exceed 20 characters').optional(),
  address: z.string().max(200, 'Address cannot exceed 200 characters').optional(),
});

// Types derived from the Zod schemas
export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;

// Response schema and type
export const organizationResponseSchema = createOrganizationSchema.extend({
  _id: z.string(),
  createdAt: z.string().or(z.date()),
  updatedAt: z.string().or(z.date()),
});

export type OrganizationResponse = z.infer<typeof organizationResponseSchema>;
