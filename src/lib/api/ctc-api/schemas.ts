import { z } from 'zod';

// =========================================================
// Base Message Schemas
// =========================================================

// Common message fields that all CTC messages share
const baseMessageSchema = z.object({
  Type: z.string(),
  From: z.string(),
});

// Schema for send commands (messages sent from UI to server)
export const sendCommandBaseSchema = baseMessageSchema.extend({
  From: z.literal('UI'),
  To: z.literal('SERV'),
});

// Schema for return commands (responses from server to UI)
export const returnCommandBaseSchema = baseMessageSchema.extend({
  From: z.literal('SERV'),
  Target: z.literal('UI'),
});

// Schema for notification commands (asynchronous messages from server)
export const notifyCommandBaseSchema = baseMessageSchema.extend({
  From: z.literal('SERV'),
  Target: z.literal('UI'),
});

// =========================================================
// Authentication Messages
// =========================================================

// POST_LOGIN request
export const postLoginSchema = sendCommandBaseSchema.extend({
  Type: z.literal('POST_LOGIN'),
  Data: z.object({
    Email: z.string().email(),
    Password: z.string(),
  }),
});

// RTN_LOGIN response
export const returnLoginSchema = returnCommandBaseSchema.extend({
  Type: z.literal('RTN_LOGIN'),
  Data: z.object({
    Email: z.string().email(),
    First: z.string(),
    Last: z.string(),
    Success: z.boolean(),
    AccessLevel: z.number(),
    Verified: z.boolean(),
  }),
});

// =========================================================
// Subscription Messages
// =========================================================

// POST_SUB_CHANGES request
export const postSubscribeChangesSchema = sendCommandBaseSchema.extend({
  Type: z.literal('POST_SUB_CHANGES'),
  Data: z.object({}),
});

// POST_UNSUB_CHANGES request
export const postUnsubscribeChangesSchema = sendCommandBaseSchema.extend({
  Type: z.literal('POST_UNSUB_CHANGES'),
  Data: z.object({}),
});

// =========================================================
// Notification Messages
// =========================================================

// NOT_AP_CONN (Access Point Connection) notification
export const notifyAccessPointConnectionSchema = notifyCommandBaseSchema.extend({
  Type: z.literal('NOT_AP_CONN'),
  Data: z.object({
    APSerial: z.number(),
    Connected: z.number(), // 0 or 1
  }),
});

// NOT_DYN_CONN (Sensor Connection) notification
export const notifySensorConnectionSchema = notifyCommandBaseSchema.extend({
  Type: z.literal('NOT_DYN_CONN'),
  Data: z.object({
    DynSerial: z.number(),
    Connected: z.number(), // 0 or 1
  }),
});

// =========================================================
// Sensor Information Messages
// =========================================================

// Sensor data object schema (used in multiple messages)
export const sensorDataSchema = z.object({
  serial: z.number(),
  connected: z.number(), // 0 or 1
  accessPoint: z.number(),
  partNum: z.string(),
  readRate: z.number(),
  gMode: z.string(),
  freqMode: z.string(),
  readPeriod: z.number(),
  samples: z.number(),
  hwVer: z.string(),
  fmVer: z.string(),
});

// GET_DYN request
export const getDynamizerSchema = sendCommandBaseSchema.extend({
  Type: z.literal('GET_DYN'),
  Data: z.object({
    DynSerials: z.array(z.number()),
  }),
});

// GET_DYN_CONNECTED request
export const getConnectedDynamizersSchema = sendCommandBaseSchema.extend({
  Type: z.literal('GET_DYN_CONNECTED'),
  Data: z.object({}),
});

// RTN_DYN response
export const returnDynamizerSchema = returnCommandBaseSchema.extend({
  Type: z.literal('RTN_DYN'),
  Data: z.object({
    Dynamizers: z.array(sensorDataSchema),
  }),
});

// =========================================================
// Sensor Reading Messages
// =========================================================

// TAKE_DYN_READING request
export const takeDynamizerReadingSchema = sendCommandBaseSchema.extend({
  Type: z.literal('TAKE_DYN_READING'),
  Data: z.object({
    DynSerial: z.number(),
  }),
});

// Reading data schema
export const readingDataSchema = z.object({
  id: z.number(),
  serial: z.number(),
  created: z.string(), // ISO date string
  x: z.array(z.number()),
  y: z.array(z.number()),
  z: z.array(z.number()),
});

// NOT_DYN_READING_STARTED notification
export const notifyDynamizerReadingStartedSchema = notifyCommandBaseSchema.extend({
  Type: z.literal('NOT_DYN_READING_STARTED'),
  Data: z.object({
    DynSerial: z.number(),
  }),
});

// NOT_DYN_READING notification
export const notifyDynamizerReadingSchema = notifyCommandBaseSchema.extend({
  Type: z.literal('NOT_DYN_READING'),
  Data: readingDataSchema,
});

// GET_DYN_READINGS request
export const getDynamizerReadingsSchema = sendCommandBaseSchema.extend({
  Type: z.literal('GET_DYN_READINGS'),
  Data: z.object({
    DynSerial: z.number(),
    Count: z.number(),
  }),
});

// RTN_DYN_READINGS response
export const returnDynamizerReadingsSchema = returnCommandBaseSchema.extend({
  Type: z.literal('RTN_DYN_READINGS'),
  Data: z.object({
    Readings: z.array(readingDataSchema),
  }),
});

// =========================================================
// Temperature Reading Messages
// =========================================================

// TAKE_DYN_TEMP request
export const takeDynamizerTemperatureSchema = sendCommandBaseSchema.extend({
  Type: z.literal('TAKE_DYN_TEMP'),
  Data: z.object({
    DynSerial: z.number(),
  }),
});

// Temperature data schema
export const temperatureDataSchema = z.object({
  id: z.number(),
  serial: z.number(),
  created: z.string(), // ISO date string
  temperature: z.number(),
});

// NOT_DYN_TEMP notification
export const notifyDynamizerTemperatureSchema = notifyCommandBaseSchema.extend({
  Type: z.literal('NOT_DYN_TEMP'),
  Data: temperatureDataSchema,
});

// GET_DYN_TEMPS request
export const getDynamizerTemperaturesSchema = sendCommandBaseSchema.extend({
  Type: z.literal('GET_DYN_TEMPS'),
  Data: z.object({
    DynSerial: z.number(),
    Count: z.number(),
  }),
});

// RTN_DYN_TEMPS response
export const returnDynamizerTemperaturesSchema = returnCommandBaseSchema.extend({
  Type: z.literal('RTN_DYN_TEMPS'),
  Data: z.object({
    Temperatures: z.array(temperatureDataSchema),
  }),
});

// =========================================================
// Battery Reading Messages
// =========================================================

// TAKE_DYN_BATT request
export const takeDynamizerBatterySchema = sendCommandBaseSchema.extend({
  Type: z.literal('TAKE_DYN_BATT'),
  Data: z.object({
    DynSerial: z.number(),
  }),
});

// Battery data schema
export const batteryDataSchema = z.object({
  id: z.number(),
  serial: z.number(),
  created: z.string(), // ISO date string
  battery: z.number(),
});

// NOT_DYN_BATT notification
export const notifyDynamizerBatterySchema = notifyCommandBaseSchema.extend({
  Type: z.literal('NOT_DYN_BATT'),
  Data: batteryDataSchema,
});

// GET_DYN_BATTS request
export const getDynamizerBatteriesSchema = sendCommandBaseSchema.extend({
  Type: z.literal('GET_DYN_BATTS'),
  Data: z.object({
    DynSerial: z.number(),
    Count: z.number(),
  }),
});

// RTN_DYN_BATTS response
export const returnDynamizerBatteriesSchema = returnCommandBaseSchema.extend({
  Type: z.literal('RTN_DYN_BATTS'),
  Data: z.object({
    Batteries: z.array(batteryDataSchema),
  }),
});

// =========================================================
// Error Message
// =========================================================

// RTN_ERR response
export const returnErrorSchema = returnCommandBaseSchema.extend({
  Type: z.literal('RTN_ERR'),
  Data: z.object({
    Message: z.string(),
    Code: z.number().optional(),
  }),
});

// =========================================================
// Union Types for Message Handling
// =========================================================

// Ping message (for keeping connection alive)
export const pingCommandSchema = sendCommandBaseSchema.extend({
  Type: z.literal('PING'),
  Data: z.object({
    timestamp: z.number(),
  }),
});

// All send commands
export const sendCommandSchema = z.discriminatedUnion('Type', [
  postLoginSchema,
  postSubscribeChangesSchema,
  postUnsubscribeChangesSchema,
  getDynamizerSchema,
  getConnectedDynamizersSchema,
  takeDynamizerReadingSchema,
  takeDynamizerTemperatureSchema,
  takeDynamizerBatterySchema,
  getDynamizerReadingsSchema,
  getDynamizerTemperaturesSchema,
  getDynamizerBatteriesSchema,
  pingCommandSchema,
]);

// All return commands
export const returnCommandSchema = z.discriminatedUnion('Type', [
  returnLoginSchema,
  returnDynamizerSchema,
  returnDynamizerReadingsSchema,
  returnDynamizerTemperaturesSchema,
  returnDynamizerBatteriesSchema,
  returnErrorSchema,
]);

// All notification commands
export const notifyCommandSchema = z.discriminatedUnion('Type', [
  notifyAccessPointConnectionSchema,
  notifySensorConnectionSchema,
  notifyDynamizerReadingStartedSchema,
  notifyDynamizerReadingSchema,
  notifyDynamizerTemperatureSchema,
  notifyDynamizerBatterySchema,
]);

// Any valid message (send, return, or notify)
export const messageSchema = z.union([sendCommandSchema, returnCommandSchema, notifyCommandSchema]);

// =========================================================
// TypeScript Types
// =========================================================

// Export types derived from the Zod schemas
export type BaseMessage = z.infer<typeof baseMessageSchema>;
export type SendCommand = z.infer<typeof sendCommandSchema>;
export type ReturnCommand = z.infer<typeof returnCommandSchema>;
export type NotifyCommand = z.infer<typeof notifyCommandSchema>;
export type Message = z.infer<typeof messageSchema>;

export type PostLoginCommand = z.infer<typeof postLoginSchema>;
export type ReturnLoginCommand = z.infer<typeof returnLoginSchema>;
export type PingCommand = z.infer<typeof pingCommandSchema>;

export type SensorData = z.infer<typeof sensorDataSchema>;
export type ReadingData = z.infer<typeof readingDataSchema>;
export type TemperatureData = z.infer<typeof temperatureDataSchema>;
export type BatteryData = z.infer<typeof batteryDataSchema>;
