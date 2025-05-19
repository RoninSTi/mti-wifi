import { z } from 'zod';

/**
 * Base message schema for CTC Gateway WebSocket communication
 */
export const baseMessageSchema = z.object({
  Type: z.string(),
  From: z.string(),
  To: z.string().optional(),
  Target: z.string().optional(),
  Data: z.any(), // Match any data type
});

export type BaseMessage = z.infer<typeof baseMessageSchema>;

/**
 * Authentication request schema
 */
export const authRequestSchema = baseMessageSchema.extend({
  Type: z.literal('POST_LOGIN'),
  From: z.literal('UI'),
  To: z.literal('SERV'),
  Data: z.object({
    Email: z.string().email(),
    Password: z.string(),
  }),
});

export type AuthRequest = z.infer<typeof authRequestSchema>;

/**
 * Authentication response schema
 */
export const authResponseSchema = baseMessageSchema.extend({
  Type: z.literal('RTN_LOGIN'),
  From: z.literal('SERV'),
  Target: z.literal('UI'),
  Data: z.object({
    Email: z.string().email(),
    First: z.string().optional(),
    Last: z.string().optional(),
    Success: z.boolean(),
    AccessLevel: z.number().int().optional(),
    Verified: z.boolean().optional(),
  }),
});

export type AuthResponse = z.infer<typeof authResponseSchema>;

/**
 * Subscribe to changes request schema
 */
export const subscribeChangesRequestSchema = baseMessageSchema.extend({
  Type: z.literal('POST_SUB_CHANGES'),
  From: z.literal('UI'),
  To: z.literal('SERV'),
  Data: z.object({}).optional(),
});

export type SubscribeChangesRequest = z.infer<typeof subscribeChangesRequestSchema>;

/**
 * Unsubscribe from changes request schema
 */
export const unsubscribeChangesRequestSchema = baseMessageSchema.extend({
  Type: z.literal('POST_UNSUB_CHANGES'),
  From: z.literal('UI'),
  To: z.literal('SERV'),
  Data: z.object({}).optional(),
});

export type UnsubscribeChangesRequest = z.infer<typeof unsubscribeChangesRequestSchema>;

/**
 * Error response schema
 */
export const errorResponseSchema = baseMessageSchema.extend({
  Type: z.literal('RTN_ERR'),
  From: z.literal('SERV'),
  Target: z.literal('UI'),
  Data: z.object({
    Attempt: z.string(),
    Error: z.string(),
  }),
});

export type ErrorResponse = z.infer<typeof errorResponseSchema>;

/**
 * Get dynamic sensors request schema
 */
export const getDynamicSensorsRequestSchema = baseMessageSchema.extend({
  Type: z.literal('GET_DYN'),
  From: z.literal('UI'),
  To: z.literal('SERV'),
  Data: z.object({
    Serials: z.array(z.number().int()).optional(),
  }),
});

export type GetDynamicSensorsRequest = z.infer<typeof getDynamicSensorsRequestSchema>;

/**
 * Get connected dynamic sensors request schema
 */
export const getConnectedSensorsRequestSchema = baseMessageSchema.extend({
  Type: z.literal('GET_DYN_CONNECTED'),
  From: z.literal('UI'),
  To: z.literal('SERV'),
  Data: z.object({}).optional(),
});

export type GetConnectedSensorsRequest = z.infer<typeof getConnectedSensorsRequestSchema>;

/**
 * Dynamic sensor schema
 */
export const dynamicSensorSchema = z.object({
  Serial: z.number().int(),
  Connected: z.number().or(z.boolean()),
  AccessPoint: z.number().int(),
  PartNum: z.string(),
  ReadRate: z.number(),
  GMode: z.string(),
  FreqMode: z.number(),
  Coupling: z.number(),
  ReadPeriod: z.number(),
  Samples: z.number(),
  Fs: z.number(),
  Fmax: z.number(),
  HwVer: z.string(),
  FmVer: z.string(),
  Machine: z.string(),
  Early: z.number(),
  Crit: z.number(),
  Nickname: z.string(),
  Favorite: z.null(),
  EarlyUnit: z.string(),
  CritUnit: z.string(),
  VelocityMode: z.null(),
});

export type DynamicSensor = z.infer<typeof dynamicSensorSchema>;

/**
 * Dynamic sensors response schema
 */
export const dynamicSensorsResponseSchema = baseMessageSchema.extend({
  Type: z.literal('RTN_DYN'),
  From: z.literal('SERV'),
  Target: z.literal('UI'),
  // Exactly match the format with an array of sensors directly in Data
  Data: z.array(dynamicSensorSchema),
});

export type DynamicSensorsResponse = z.infer<typeof dynamicSensorsResponseSchema>;

/**
 * Sensor connection notification schema
 */
export const sensorConnectionNotificationSchema = baseMessageSchema.extend({
  Type: z.literal('NOT_DYN_CONN'),
  From: z.literal('SERV'),
  Target: z.literal('UI'),
  Data: z.object({
    Serial: z.number().int(),
    Connected: z.boolean(),
    Time: z.string(),
  }),
});

export type SensorConnectionNotification = z.infer<typeof sensorConnectionNotificationSchema>;

/**
 * Gateway connection status
 */
export enum GatewayConnectionStatus {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  AUTHENTICATING = 'authenticating',
  AUTHENTICATED = 'authenticated',
  ERROR = 'error',
}

/**
 * Gateway connection error
 */
export interface GatewayConnectionError {
  message: string;
  code?: string;
  timestamp: Date;
}

/**
 * Union of all request message types
 */
export const requestMessageSchema = z.union([
  authRequestSchema,
  subscribeChangesRequestSchema,
  unsubscribeChangesRequestSchema,
  getDynamicSensorsRequestSchema,
  getConnectedSensorsRequestSchema,
]);

export type RequestMessage = z.infer<typeof requestMessageSchema>;

/**
 * Union of all response message types
 */
export const responseMessageSchema = z.union([
  authResponseSchema,
  errorResponseSchema,
  dynamicSensorsResponseSchema,
  sensorConnectionNotificationSchema,
]);

export type ResponseMessage = z.infer<typeof responseMessageSchema>;
