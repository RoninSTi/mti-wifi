import { z } from 'zod';

// Base fields schema for organization validation
const organizationBaseSchema = {
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
};

// Schema for creating a new organization - all fields required as defined
export const createOrganizationSchema = z.object(organizationBaseSchema);

// Schema for updating an organization - all fields optional
export const updateOrganizationSchema = z
  .object({
    name: organizationBaseSchema.name.optional(),
    description: organizationBaseSchema.description,
    contactName: organizationBaseSchema.contactName,
    contactEmail: organizationBaseSchema.contactEmail,
    contactPhone: organizationBaseSchema.contactPhone,
    address: organizationBaseSchema.address,
  })
  .refine(data => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  });

// Schema for the URL parameter
export const organizationParamsSchema = z.object({
  id: z.string().min(1, 'Organization ID is required'),
});

// Types derived from the Zod schemas
export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;
export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;
export type OrganizationParams = z.infer<typeof organizationParamsSchema>;

// Response schema and type
export const organizationResponseSchema = createOrganizationSchema.extend({
  _id: z.string(),
  createdAt: z.string().or(z.date()),
  updatedAt: z.string().or(z.date()),
});

export type OrganizationResponse = z.infer<typeof organizationResponseSchema>;
