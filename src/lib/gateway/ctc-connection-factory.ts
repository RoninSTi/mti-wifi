/**
 * CTC Gateway Connection Factory
 *
 * This factory module provides a way to create CTCConnectionManager instances
 * that can be used with the GatewayService. It hides the implementation details
 * of the CTCConnectionManager and provides a clean interface for working with
 * CTC gateways.
 */
import { z } from 'zod';
import { GatewayConnection, GatewayConnectionParams } from './types';
import { CTCConnectionManager } from './ctc-connection-manager';
import { createGatewayAdapter } from './ctc-adapter';

/**
 * Zod schema for validating connection parameters
 */
const connectionParamsSchema = z.object({
  id: z.string().min(1, 'Gateway ID is required'),
  url: z.string().url('Valid WebSocket URL required'),
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
  serialNumber: z.string().min(1, 'Serial number is required'),
  autoReconnect: z.boolean().optional().default(true),
  reconnectInterval: z.number().positive().optional().default(5000),
  maxReconnectAttempts: z.number().positive().optional().default(5),
});

/**
 * Create a new CTCConnectionManager that can be used with the GatewayService
 * @param params Connection parameters
 * @returns A GatewayConnection instance backed by a CTCConnectionManager
 */
export function createCTCConnection(params: GatewayConnectionParams): GatewayConnection {
  // Validate connection parameters
  const validParams = connectionParamsSchema.parse(params);

  // Create a CTCConnectionManager instance
  const ctcConnection = new CTCConnectionManager(validParams);

  // Create an adapter that properly implements GatewayConnection
  return createGatewayAdapter(ctcConnection);
}
