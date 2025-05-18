/**
 * CTC API Type Definitions
 *
 * This file contains interfaces specific to the CTC Wireless API protocol
 * based on the CTC Connect Wireless API documentation.
 */

/**
 * Base message structure for CTC API
 */
export interface CTCBaseMessage {
  Type: string; // Message type identifier
  From: string; // Source of the message
  To: string; // Destination of the message
  Data: unknown; // Message data (type-specific)
}

/**
 * Command Types
 */
export enum CTCCommandType {
  // Send commands
  LOGIN = 'POST_LOGIN',
  SUBSCRIBE_CHANGES = 'POST_SUB_CHANGES',
  UNSUBSCRIBE_CHANGES = 'POST_UNSUB_CHANGES',
  GET_DYNAMIC_SENSORS = 'GET_DYN',
  GET_CONNECTED_DYNAMIC_SENSORS = 'GET_DYN_CONNECTED',
  TAKE_DYNAMIC_READING = 'TAKE_DYN_READING',
  TAKE_DYNAMIC_TEMP_READING = 'TAKE_DYN_TEMP_READING',
  TAKE_DYNAMIC_BATTERY_READING = 'TAKE_DYN_BATT_READING',
  GET_DYNAMIC_VIBRATION_RECORDS = 'GET_DYN_READINGS',

  // Return commands
  RETURN_DYNAMIC_SENSORS = 'RTN_DYN',
  RETURN_DYNAMIC_READINGS = 'RTN_DYN_READINGS',
  RETURN_ERROR = 'RTN_ERR',

  // Notify commands
  NOTIFY_ACCESS_POINT_CONNECTED = 'NOT_AP_CONN',
  NOTIFY_DYNAMIC_READING_STARTED = 'NOT_DYN_READING_STARTED',
  NOTIFY_DYNAMIC_READING = 'NOT_DYN_READING',
  NOTIFY_DYNAMIC_TEMPERATURE = 'NOT_DYN_TEMP',
  NOTIFY_DYNAMIC_BATTERY = 'NOT_DYN_BATT',
}

/**
 * System components
 */
export enum CTCComponent {
  UI = 'UI', // User Interface (client)
  SERVICE = 'SERV', // Service (server)
}

/**
 * Subscribe to changes message
 */
export interface CTCSubscribeChangesMessage extends CTCBaseMessage {
  Type: CTCCommandType.SUBSCRIBE_CHANGES;
  From: CTCComponent.UI;
  To: CTCComponent.SERVICE;
  Data: Record<string, never>; // Empty object
}

/**
 * Unsubscribe to changes message
 */
export interface CTCUnsubscribeChangesMessage extends CTCBaseMessage {
  Type: CTCCommandType.UNSUBSCRIBE_CHANGES;
  From: CTCComponent.UI;
  To: CTCComponent.SERVICE;
  Data: Record<string, never>; // Empty object
}

/**
 * Get dynamic sensors message
 */
export interface CTCGetDynamicSensorsMessage extends CTCBaseMessage {
  Type: CTCCommandType.GET_DYNAMIC_SENSORS;
  From: CTCComponent.UI;
  To: CTCComponent.SERVICE;
  Data: {
    Serials: number[]; // Empty array for all sensors
  };
}

/**
 * Get connected dynamic sensors message
 */
export interface CTCGetConnectedDynamicSensorsMessage extends CTCBaseMessage {
  Type: CTCCommandType.GET_CONNECTED_DYNAMIC_SENSORS;
  From: CTCComponent.UI;
  To: CTCComponent.SERVICE;
  Data: Record<string, never>; // Empty object
}

/**
 * Take dynamic reading message
 */
export interface CTCTakeDynamicReadingMessage extends CTCBaseMessage {
  Type: CTCCommandType.TAKE_DYNAMIC_READING;
  From: CTCComponent.UI;
  To: CTCComponent.SERVICE;
  Data: {
    Serial: number;
  };
}

/**
 * Take dynamic temperature reading message
 */
export interface CTCTakeDynamicTempReadingMessage extends CTCBaseMessage {
  Type: CTCCommandType.TAKE_DYNAMIC_TEMP_READING;
  From: CTCComponent.UI;
  To: CTCComponent.SERVICE;
  Data: {
    Serial: number;
  };
}

/**
 * Take dynamic battery reading message
 */
export interface CTCTakeDynamicBatteryReadingMessage extends CTCBaseMessage {
  Type: CTCCommandType.TAKE_DYNAMIC_BATTERY_READING;
  From: CTCComponent.UI;
  To: CTCComponent.SERVICE;
  Data: {
    Serial: number;
  };
}

/**
 * Get dynamic vibration records message
 */
export interface CTCGetDynamicVibrationRecordsMessage extends CTCBaseMessage {
  Type: CTCCommandType.GET_DYNAMIC_VIBRATION_RECORDS;
  From: CTCComponent.UI;
  To: CTCComponent.SERVICE;
  Data: {
    Serials?: number[]; // Optional array of sensor serials
    Start?: string; // Optional start date (ISO string)
    End?: string; // Optional end date (ISO string)
    Max?: number; // Optional maximum number of records to return
  };
}

/**
 * Return dynamic sensors message
 */
export interface CTCReturnDynamicSensorsMessage extends CTCBaseMessage {
  Type: CTCCommandType.RETURN_DYNAMIC_SENSORS;
  From: CTCComponent.SERVICE;
  To: CTCComponent.UI;
  Data: {
    Sensors: CTCDynamicSensor[];
  };
}

/**
 * Return dynamic readings message
 */
export interface CTCReturnDynamicReadingsMessage extends CTCBaseMessage {
  Type: CTCCommandType.RETURN_DYNAMIC_READINGS;
  From: CTCComponent.SERVICE;
  To: CTCComponent.UI;
  Data: {
    Readings: CTCDynamicReading[];
  };
}

/**
 * Return error message
 */
export interface CTCReturnErrorMessage extends CTCBaseMessage {
  Type: CTCCommandType.RETURN_ERROR;
  From: CTCComponent.SERVICE;
  To: CTCComponent.UI;
  Data: {
    Error: string;
    Message: string;
  };
}

/**
 * Notify access point connected message
 */
export interface CTCNotifyAccessPointConnectedMessage extends CTCBaseMessage {
  Type: CTCCommandType.NOTIFY_ACCESS_POINT_CONNECTED;
  From: CTCComponent.SERVICE;
  To: CTCComponent.UI;
  Data: {
    Status: number; // 1 for connected, 0 for disconnected
    Mac: string; // MAC address of the access point
  };
}

/**
 * Notify dynamic reading started message
 */
export interface CTCNotifyDynamicReadingStartedMessage extends CTCBaseMessage {
  Type: CTCCommandType.NOTIFY_DYNAMIC_READING_STARTED;
  From: CTCComponent.SERVICE;
  To: CTCComponent.UI;
  Data: {
    Serial: number;
  };
}

/**
 * Notify dynamic reading message
 */
export interface CTCNotifyDynamicReadingMessage extends CTCBaseMessage {
  Type: CTCCommandType.NOTIFY_DYNAMIC_READING;
  From: CTCComponent.SERVICE;
  To: CTCComponent.UI;
  Data: CTCDynamicReading;
}

/**
 * Notify dynamic temperature message
 */
export interface CTCNotifyDynamicTemperatureMessage extends CTCBaseMessage {
  Type: CTCCommandType.NOTIFY_DYNAMIC_TEMPERATURE;
  From: CTCComponent.SERVICE;
  To: CTCComponent.UI;
  Data: {
    Serial: number;
    TempC: number;
    TempF: number;
    Timestamp: string; // ISO date string
  };
}

/**
 * Notify dynamic battery message
 */
export interface CTCNotifyDynamicBatteryMessage extends CTCBaseMessage {
  Type: CTCCommandType.NOTIFY_DYNAMIC_BATTERY;
  From: CTCComponent.SERVICE;
  To: CTCComponent.UI;
  Data: {
    Serial: number;
    Level: number; // Battery level percentage
    Timestamp: string; // ISO date string
  };
}

/**
 * Dynamic Sensor data structure
 */
export interface CTCDynamicSensor {
  Serial: number; // Sensor serial number
  Name?: string; // Optional sensor name
  FirmwareVersion?: string; // Optional firmware version
  Connected: boolean; // Whether the sensor is currently connected
  LastSeen?: string; // ISO date string of last communication
  BatteryLevel?: number; // Battery level percentage
  TempC?: number; // Last temperature in Celsius
  TempF?: number; // Last temperature in Fahrenheit
}

/**
 * Dynamic Reading data structure
 */
export interface CTCDynamicReading {
  Serial: number; // Sensor serial number
  Timestamp: string; // ISO date string
  XRms?: number; // RMS acceleration X-axis
  YRms?: number; // RMS acceleration Y-axis
  ZRms?: number; // RMS acceleration Z-axis
  XCrestFactor?: number; // Crest factor X-axis
  YCrestFactor?: number; // Crest factor Y-axis
  ZCrestFactor?: number; // Crest factor Z-axis
  XPeakAccel?: number; // Peak acceleration X-axis
  YPeakAccel?: number; // Peak acceleration Y-axis
  ZPeakAccel?: number; // Peak acceleration Z-axis
  TempC?: number; // Temperature in Celsius
  TempF?: number; // Temperature in Fahrenheit
  FftData?: number[]; // FFT frequency data
}

/**
 * Custom state change message used for internal state tracking
 * This doesn't come from the CTC API directly but is used for connection state tracking
 */
export interface CTCStateChangeMessage extends CTCBaseMessage {
  Type: 'state_change';
  From: CTCComponent.SERVICE;
  To: CTCComponent.UI;
  Data: {
    previousState: string;
    state: string;
  };
}

/**
 * Login message
 */
export interface CTCLoginMessage extends CTCBaseMessage {
  Type: CTCCommandType.LOGIN;
  From: CTCComponent.UI;
  To: CTCComponent.SERVICE;
  Data: {
    Email: string;
    Password: string;
  };
}

/**
 * Union type of all possible CTC message types
 */
export type CTCMessage =
  | CTCLoginMessage
  | CTCSubscribeChangesMessage
  | CTCUnsubscribeChangesMessage
  | CTCGetDynamicSensorsMessage
  | CTCGetConnectedDynamicSensorsMessage
  | CTCTakeDynamicReadingMessage
  | CTCTakeDynamicTempReadingMessage
  | CTCTakeDynamicBatteryReadingMessage
  | CTCGetDynamicVibrationRecordsMessage
  | CTCReturnDynamicSensorsMessage
  | CTCReturnDynamicReadingsMessage
  | CTCReturnErrorMessage
  | CTCNotifyAccessPointConnectedMessage
  | CTCNotifyDynamicReadingStartedMessage
  | CTCNotifyDynamicReadingMessage
  | CTCNotifyDynamicTemperatureMessage
  | CTCNotifyDynamicBatteryMessage
  | CTCStateChangeMessage;
