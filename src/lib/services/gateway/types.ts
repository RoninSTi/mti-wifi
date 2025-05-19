import { z } from 'zod';

/**
 * Base message schema for CTC Gateway WebSocket communication
 */
export const baseMessageSchema = z.object({
  Type: z.string(),
  From: z.string(),
  To: z.string().optional(),
  Target: z.string().optional(),
  Data: z.unknown(), // Use unknown instead of any for type safety
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
 * Strongly typed interfaces for sensor readings
 */
export interface VibrationReading {
  ID: number;
  Serial: string;
  Time: string;
  X: string;
  Y: string;
  Z: string;
}

export interface TemperatureReading {
  ID: number;
  Serial: string;
  Time: string;
  Temp: number;
}

export interface BatteryReading {
  ID: number;
  Serial: string;
  Time: string;
  Batt: number;
}

export type SensorReadings = {
  vibration: Record<string, VibrationReading>;
  temperature: Record<string, TemperatureReading>;
  battery: Record<string, BatteryReading>;
};

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
 * Take dynamic vibration reading request schema
 */
export const takeDynamicReadingRequestSchema = baseMessageSchema.extend({
  Type: z.literal('TAKE_DYN_READING'),
  From: z.literal('UI'),
  To: z.literal('SERV'),
  Data: z.object({
    Serial: z.number().int(),
  }),
});

export type TakeDynamicReadingRequest = z.infer<typeof takeDynamicReadingRequestSchema>;

/**
 * Take dynamic temperature reading request schema
 */
export const takeDynamicTemperatureRequestSchema = baseMessageSchema.extend({
  Type: z.literal('TAKE_DYN_TEMP'),
  From: z.literal('UI'),
  To: z.literal('SERV'),
  Data: z.object({
    Serial: z.number().int(),
  }),
});

export type TakeDynamicTemperatureRequest = z.infer<typeof takeDynamicTemperatureRequestSchema>;

/**
 * Take dynamic battery level reading request schema
 */
export const takeDynamicBatteryRequestSchema = baseMessageSchema.extend({
  Type: z.literal('TAKE_DYN_BATT'),
  From: z.literal('UI'),
  To: z.literal('SERV'),
  Data: z.object({
    Serial: z.number().int(),
  }),
});

export type TakeDynamicBatteryRequest = z.infer<typeof takeDynamicBatteryRequestSchema>;

/**
 * Get dynamic vibration records request schema
 */
export const getDynamicReadingsRequestSchema = baseMessageSchema.extend({
  Type: z.literal('GET_DYN_READINGS'),
  From: z.literal('UI'),
  To: z.literal('SERV'),
  Data: z.object({
    Serials: z.array(z.number().int()).optional(),
    Start: z.string().optional(), // yyyy-mm-dd
    End: z.string().optional(), // yyyy-mm-dd
    Max: z.number().int().optional(),
  }),
});

export type GetDynamicReadingsRequest = z.infer<typeof getDynamicReadingsRequestSchema>;

/**
 * Get dynamic temperature records request schema
 */
export const getDynamicTemperaturesRequestSchema = baseMessageSchema.extend({
  Type: z.literal('GET_DYN_TEMPS'),
  From: z.literal('UI'),
  To: z.literal('SERV'),
  Data: z.object({
    Serials: z.array(z.number().int()).optional(),
    Start: z.string().optional(), // yyyy-mm-dd
    End: z.string().optional(), // yyyy-mm-dd
    Max: z.number().int().optional(),
  }),
});

export type GetDynamicTemperaturesRequest = z.infer<typeof getDynamicTemperaturesRequestSchema>;

/**
 * Get dynamic battery records request schema
 */
export const getDynamicBatteriesRequestSchema = baseMessageSchema.extend({
  Type: z.literal('GET_DYN_BATTS'),
  From: z.literal('UI'),
  To: z.literal('SERV'),
  Data: z.object({
    Serials: z.array(z.number().int()).optional(),
    Start: z.string().optional(), // yyyy-mm-dd
    End: z.string().optional(), // yyyy-mm-dd
    Max: z.number().int().optional(),
  }),
});

export type GetDynamicBatteriesRequest = z.infer<typeof getDynamicBatteriesRequestSchema>;

/**
 * Return dynamic vibration records response schema
 */
export const dynamicReadingsResponseSchema = baseMessageSchema.extend({
  Type: z.literal('RTN_DYN_READINGS'),
  From: z.literal('SERV'),
  Target: z.literal('UI'),
  Data: z.array(
    z.object({
      ID: z.number().int(),
      Serial: z.union([z.number().int(), z.string()]).transform(v => String(v)),
      Time: z.string(), // format: "yyyy-mm-dd hh:mm"
      X: z.string(),
      Y: z.string(),
      Z: z.string(),
    })
  ),
});

export type DynamicReadingsResponse = z.infer<typeof dynamicReadingsResponseSchema>;

/**
 * Return dynamic temperature records response schema
 */
export const dynamicTemperaturesResponseSchema = baseMessageSchema.extend({
  Type: z.literal('RTN_DYN_TEMPS'),
  From: z.literal('SERV'),
  Target: z.literal('UI'),
  Data: z.array(
    z.object({
      ID: z.number().int(),
      Serial: z.union([z.number().int(), z.string()]).transform(v => String(v)),
      Time: z.string(), // format: "yyyy-mm-dd hh:mm"
      Temp: z.number().int(),
    })
  ),
});

export type DynamicTemperaturesResponse = z.infer<typeof dynamicTemperaturesResponseSchema>;

/**
 * Return dynamic battery level records response schema
 */
export const dynamicBatteriesResponseSchema = baseMessageSchema.extend({
  Type: z.literal('RTN_DYN_BATTS'),
  From: z.literal('SERV'),
  Target: z.literal('UI'),
  Data: z.array(
    z.object({
      ID: z.number().int(),
      Serial: z.union([z.number().int(), z.string()]).transform(v => String(v)),
      Time: z.string(), // format: "yyyy-mm-dd hh:mm"
      Batt: z.number().int(),
    })
  ),
});

export type DynamicBatteriesResponse = z.infer<typeof dynamicBatteriesResponseSchema>;

/**
 * Notify access point connected schema
 */
export const accessPointConnectionNotificationSchema = baseMessageSchema.extend({
  Type: z.literal('NOT_AP_CONN'),
  From: z.literal('SERV'),
  Target: z.literal('UI'),
  Data: z.object({
    Serial: z.number().int(),
    Connected: z.number().int(),
  }),
});

export type AccessPointConnectionNotification = z.infer<
  typeof accessPointConnectionNotificationSchema
>;

/**
 * Notify vibration reading started schema
 */
export const vibrationReadingStartedNotificationSchema = baseMessageSchema.extend({
  Type: z.literal('NOT_DYN_READING_STARTED'),
  From: z.literal('SERV'),
  Target: z.literal('UI'),
  Data: z.object({
    Serial: z.number().int(),
    Success: z.boolean(),
  }),
});

export type VibrationReadingStartedNotification = z.infer<
  typeof vibrationReadingStartedNotificationSchema
>;

/**
 * Notify vibration reading complete schema
 */
export const vibrationReadingCompleteNotificationSchema = baseMessageSchema.extend({
  Type: z.literal('NOT_DYN_READING'),
  From: z.literal('SERV'),
  Target: z.literal('UI'),
  Data: z.record(
    z.string(),
    z.object({
      ID: z.number().int(),
      Serial: z.union([z.string(), z.number().int()]).transform(v => String(v)),
      Time: z.string(), // yyyy-mm-dd
      X: z.string(),
      Y: z.string(),
      Z: z.string(),
    })
  ),
});

export type VibrationReadingCompleteNotification = z.infer<
  typeof vibrationReadingCompleteNotificationSchema
>;

/**
 * Notify temperature reading complete schema
 */
export const temperatureReadingCompleteNotificationSchema = baseMessageSchema.extend({
  Type: z.literal('NOT_DYN_TEMP'),
  From: z.literal('SERV'),
  Target: z.literal('UI'),
  Data: z.record(
    z.string(),
    z.object({
      ID: z.number().int(),
      Serial: z.union([z.string(), z.number().int()]).transform(v => String(v)),
      Time: z.string(), // yyyy-mm-dd
      Temp: z.number().int(),
    })
  ),
});

export type TemperatureReadingCompleteNotification = z.infer<
  typeof temperatureReadingCompleteNotificationSchema
>;

/**
 * Notify battery level reading complete schema
 */
export const batteryReadingCompleteNotificationSchema = baseMessageSchema.extend({
  Type: z.literal('NOT_DYN_BATT'),
  From: z.literal('SERV'),
  Target: z.literal('UI'),
  Data: z.record(
    z.string(),
    z.object({
      ID: z.number().int(),
      Serial: z.union([z.string(), z.number().int()]).transform(v => String(v)),
      Time: z.string(), // yyyy-mm-dd
      Batt: z.number().int(),
    })
  ),
});

export type BatteryReadingCompleteNotification = z.infer<
  typeof batteryReadingCompleteNotificationSchema
>;

/**
 * Union of all request message types
 */
export const requestMessageSchema = z.union([
  authRequestSchema,
  subscribeChangesRequestSchema,
  unsubscribeChangesRequestSchema,
  getDynamicSensorsRequestSchema,
  getConnectedSensorsRequestSchema,
  takeDynamicReadingRequestSchema,
  takeDynamicTemperatureRequestSchema,
  takeDynamicBatteryRequestSchema,
  getDynamicReadingsRequestSchema,
  getDynamicTemperaturesRequestSchema,
  getDynamicBatteriesRequestSchema,
]);

export type RequestMessage = z.infer<typeof requestMessageSchema>;

/**
 * Union of all response message types
 */
export const responseMessageSchema = z.union([
  authResponseSchema,
  errorResponseSchema,
  dynamicSensorsResponseSchema,
  dynamicReadingsResponseSchema,
  dynamicTemperaturesResponseSchema,
  dynamicBatteriesResponseSchema,
  sensorConnectionNotificationSchema,
  accessPointConnectionNotificationSchema,
  vibrationReadingStartedNotificationSchema,
  vibrationReadingCompleteNotificationSchema,
  temperatureReadingCompleteNotificationSchema,
  batteryReadingCompleteNotificationSchema,
]);

export type ResponseMessage = z.infer<typeof responseMessageSchema>;
