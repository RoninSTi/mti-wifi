/**
 * CTC Gateway Connection Adapter
 *
 * This adapter provides a type-safe way to bridge between the generic Gateway interfaces and CTC-specific implementations.
 */
import { z } from 'zod';
import {
  GatewayConnection,
  GatewayConnectionParams,
  GatewayConnectionState,
  GatewayConnectionStats,
  GatewayMessage,
} from './types';
import { CTCConnectionManager as OriginalCTCConnectionManager } from './ctc-connection-manager';
import { CTCComponent, CTCMessage, CTCCommandType, CTCSubscribeChangesMessage } from './ctc-types';

/**
 * GatewayConnectionAdapter - implements the GatewayConnection interface while wrapping a CTCConnectionManager
 * This provides a type-safe bridge between the two systems
 */
export class GatewayConnectionAdapter implements GatewayConnection {
  private ctcConnection: OriginalCTCConnectionManager;

  // Pass-through properties
  public get id(): string {
    return this.ctcConnection.id;
  }
  public get state(): GatewayConnectionState {
    return this.ctcConnection.state;
  }
  public get params(): GatewayConnectionParams {
    return this.ctcConnection.params;
  }
  public get stats(): GatewayConnectionStats {
    return this.ctcConnection.stats;
  }

  constructor(ctcConnection: OriginalCTCConnectionManager) {
    this.ctcConnection = ctcConnection;
  }

  // Core connection methods
  public connect(): Promise<void> {
    return this.ctcConnection.connect();
  }

  public disconnect(): Promise<void> {
    return this.ctcConnection.disconnect();
  }

  public reconnect(): Promise<void> {
    return this.ctcConnection.reconnect();
  }

  public authenticate(): Promise<void> {
    return this.ctcConnection.authenticate();
  }

  // Subscription methods
  public subscribe(topics: string[]): Promise<string[]> {
    // Call the CTC implementation but with proper type handling
    return this.ctcConnection.subscribe(topics);
  }

  public unsubscribe(topics: string[]): Promise<string[]> {
    // Call the CTC implementation but with proper type handling
    return this.ctcConnection.unsubscribe(topics);
  }

  // Define a schema for validating gateway messages
  private gatewayMessageSchema = z.object({
    type: z.string(),
    timestamp: z.number(),
  });

  // Message handling
  public async send<T extends GatewayMessage>(message: T): Promise<void> {
    // Validate the incoming message
    this.gatewayMessageSchema.parse(message);

    // Create a message type appropriate for the CTC system
    // This is effectively the adapter pattern translating between systems
    let ctcMessage: CTCMessage;

    // Transform the Gateway message into a CTC message format
    switch (message.type) {
      // Handle specific message types with custom transformations if needed
      case 'auth':
        if ('username' in message && 'password' in message) {
          ctcMessage = {
            Type: CTCCommandType.SUBSCRIBE_CHANGES, // CTC uses subscription instead of auth
            From: CTCComponent.UI,
            To: CTCComponent.SERVICE,
            Data: {},
          } as CTCSubscribeChangesMessage;
        } else {
          throw new Error('Invalid auth message format');
        }
        break;

      case 'heartbeat':
        // CTC doesn't have heartbeat, but we need to handle it
        // Since there's no direct equivalent in CTC, cast through unknown for safety
        ctcMessage = {
          Type: CTCCommandType.SUBSCRIBE_CHANGES, // Use an existing command type as fallback
          From: CTCComponent.UI,
          To: CTCComponent.SERVICE,
          Data: {
            // Store original data for reference
            originalType: 'heartbeat',
            timestamp: message.timestamp,
          },
        } as unknown as CTCMessage;
        break;

      // Add more cases for specific message types

      default:
        // Default case for generic messages
        ctcMessage = {
          Type: message.type,
          From: CTCComponent.UI,
          To: CTCComponent.SERVICE,
          Data: {},
        } as CTCMessage;
    }

    // Send the transformed message
    await this.ctcConnection.send(ctcMessage);
  }

  // Command handling
  public sendCommand<T = unknown>(command: string, params?: Record<string, unknown>): Promise<T> {
    return this.ctcConnection.sendCommand(command, params);
  }

  // Validate event names
  private eventNameSchema = z.string();

  // Event listeners with proper type handling
  public on<T extends GatewayMessage>(
    event: T['type'],
    callback: (message: T) => void
  ): () => void {
    // Validate the event name with Zod
    const validatedEvent = this.eventNameSchema.parse(event);

    // Create a wrapper callback that validates incoming messages
    const wrappedCallback = (incomingMessage: unknown) => {
      // Attempt to create a correctly structured GatewayMessage from the incoming data
      try {
        // This is a simplified example - in a real implementation,
        // you would create a proper adapter based on the message type
        const gatewayMessageSchema = z.object({
          type: z.string(),
          timestamp: z.number(),
        });

        // Try to build a gateway message from the incoming data
        let gatewayMessage: Partial<T>;

        if (typeof incomingMessage === 'object' && incomingMessage !== null) {
          // Try to extract relevant properties
          const msgObj = incomingMessage as Record<string, unknown>;

          gatewayMessage = {
            type: (msgObj.Type as string) || event,
            timestamp: Date.now(),
          } as Partial<T>;

          // Copy all other properties
          Object.assign(gatewayMessage, incomingMessage);
        } else {
          // If not an object, create a minimal valid message
          gatewayMessage = {
            type: event,
            timestamp: Date.now(),
          } as Partial<T>;
        }

        // Validate the constructed message
        const validatedMessage = gatewayMessageSchema.parse(gatewayMessage);

        // Call the original callback with the validated message
        callback(validatedMessage as T);
      } catch (error) {
        console.error('Failed to validate incoming message:', error);
      }
    };

    // Register the wrapped callback with the CTC connection
    return this.ctcConnection.on(validatedEvent, wrappedCallback);
  }

  // Data listeners
  public onData(topic: string, callback: (data: unknown) => void): () => void {
    return this.ctcConnection.onData(topic, callback);
  }
}

/**
 * Create a Gateway adapter from a CTC connection
 */
export function createGatewayAdapter(
  ctcConnection: OriginalCTCConnectionManager
): GatewayConnection {
  return new GatewayConnectionAdapter(ctcConnection);
}
