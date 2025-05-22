import { z } from 'zod';
import { baseMessageSchema } from './types';

/**
 * Detailed vibration reading schema with X, Y, Z arrays
 */
export const detailedVibrationReadingSchema = z.object({
  ID: z.number().int(),
  Serial: z.union([z.string(), z.number().int()]).transform(v => String(v)),
  Time: z.string(), // format: "yyyy-mm-dd hh:mm"
  Xpk: z.number(),
  Xpp: z.number(),
  Xrms: z.number(),
  Ypk: z.number(),
  Ypp: z.number(),
  Yrms: z.number(),
  Zpk: z.number(),
  Zpp: z.number(),
  Zrms: z.number(),
  X: z.array(z.number()),
  Y: z.array(z.number()),
  Z: z.array(z.number()),
});

export type DetailedVibrationReading = z.infer<typeof detailedVibrationReadingSchema>;

/**
 * Detailed vibration readings response schema
 */
export const detailedVibrationReadingsResponseSchema = baseMessageSchema.extend({
  Type: z.literal('RTN_DYN_READINGS'),
  From: z.literal('SERV'),
  Target: z.literal('UI'),
  Data: z.array(detailedVibrationReadingSchema),
});

export type DetailedVibrationReadingsResponse = z.infer<
  typeof detailedVibrationReadingsResponseSchema
>;
