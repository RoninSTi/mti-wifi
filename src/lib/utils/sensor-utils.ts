import { GatewayReference, SensorResponse } from '@/app/api/sensors/schemas';

/**
 * Safely extracts a gateway ID from a sensor object
 * @param sensor The sensor response object
 * @returns The gateway ID or undefined if not present
 */
export function getGatewayId(sensor: SensorResponse): string | undefined {
  // If gateway is missing, return undefined
  if (!sensor.gateway) {
    return undefined;
  }

  // Gateway is present and of GatewayReference type
  return sensor.gateway._id;
}

/**
 * Safely gets the sensor serial number as a number
 * @param sensor The sensor response object
 * @returns A number representing the serial or 0 if not present
 */
export function getSensorSerial(sensor: SensorResponse): number {
  // Handle undefined or null
  if (sensor.serial === undefined || sensor.serial === null) {
    return 0;
  }

  // Serial is already a number
  return sensor.serial;
}
