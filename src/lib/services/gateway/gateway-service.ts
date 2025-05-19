import { createApiSpan } from '@/telemetry/utils';
import {
  AuthResponse,
  BaseMessage,
  ErrorResponse,
  GatewayConnectionError,
  GatewayConnectionStatus,
  RequestMessage,
  ResponseMessage,
  authRequestSchema,
  baseMessageSchema,
  requestMessageSchema,
  responseMessageSchema,
  subscribeChangesRequestSchema,
} from './types';
import { GatewayResponse } from '@/app/api/gateways/schemas';

/**
 * Event types that the gateway service can emit
 */
export type GatewayServiceEventType =
  | 'status_change'
  | 'connected'
  | 'authenticated'
  | 'disconnected'
  | 'error'
  | 'message';

/**
 * Event data for gateway service events
 */
export type GatewayServiceEventData = {
  status_change: {
    gatewayId: string;
    status: GatewayConnectionStatus;
    previousStatus?: GatewayConnectionStatus;
  };
  connected: {
    gatewayId: string;
  };
  authenticated: {
    gatewayId: string;
    userData: {
      email: string;
      firstName?: string;
      lastName?: string;
      accessLevel?: number;
    };
  };
  disconnected: {
    gatewayId: string;
    reason?: string;
  };
  error: {
    gatewayId: string;
    error: GatewayConnectionError;
  };
  message: {
    gatewayId: string;
    message: ResponseMessage | BaseMessage;
  };
};

/**
 * Event handler function type
 */
export type GatewayServiceEventHandler<T extends GatewayServiceEventType> = (
  data: GatewayServiceEventData[T]
) => void;

/**
 * Gateway connection information
 */
interface GatewayConnection {
  gateway: GatewayResponse;
  status: GatewayConnectionStatus;
  ws: WebSocket | null;
  lastError?: GatewayConnectionError;
  messageQueue: RequestMessage[];
  reconnectTimeout?: NodeJS.Timeout;
  reconnectAttempts: number;
}

/**
 * Gateway service configuration
 */
export interface GatewayServiceConfig {
  maxReconnectAttempts: number;
  reconnectDelayMs: number;
  reconnectBackoffFactor: number;
  pingIntervalMs: number;
}

/**
 * Default gateway service configuration
 */
const DEFAULT_CONFIG: GatewayServiceConfig = {
  maxReconnectAttempts: 5,
  reconnectDelayMs: 1000,
  reconnectBackoffFactor: 1.5,
  pingIntervalMs: 30000, // 30 seconds
};

/**
 * Service for managing WebSocket connections to CTC gateways
 */
export class GatewayService {
  private connections: Map<string, GatewayConnection> = new Map();
  private eventHandlers: Map<
    GatewayServiceEventType,
    Set<GatewayServiceEventHandler<GatewayServiceEventType>>
  > = new Map();
  private pingIntervals: Map<string, NodeJS.Timeout> = new Map();
  private config: GatewayServiceConfig;
  private static instance: GatewayService | null = null;

  /**
   * Get the singleton instance of the gateway service
   */
  public static getInstance(config: Partial<GatewayServiceConfig> = {}): GatewayService {
    if (!GatewayService.instance) {
      GatewayService.instance = new GatewayService(config);
    }
    return GatewayService.instance;
  }

  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor(config: Partial<GatewayServiceConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Setup event handler sets
    this.eventHandlers.set('status_change', new Set());
    this.eventHandlers.set('connected', new Set());
    this.eventHandlers.set('authenticated', new Set());
    this.eventHandlers.set('disconnected', new Set());
    this.eventHandlers.set('error', new Set());
    this.eventHandlers.set('message', new Set());
  }

  /**
   * Connect to a gateway
   */
  public async connect(gateway: GatewayResponse): Promise<boolean> {
    return await createApiSpan('gateway.connect', async () => {
      if (!gateway._id || !gateway.url) {
        throw new Error('Invalid gateway: Missing ID or URL');
      }

      // Check if already connected or connecting
      const existing = this.connections.get(gateway._id);
      if (existing) {
        if (
          existing.status === GatewayConnectionStatus.CONNECTED ||
          existing.status === GatewayConnectionStatus.AUTHENTICATED ||
          existing.status === GatewayConnectionStatus.CONNECTING ||
          existing.status === GatewayConnectionStatus.AUTHENTICATING
        ) {
          return true;
        }

        // Clean up existing connection if it's in a bad state
        this.cleanupConnection(gateway._id);
      }

      // Initialize connection record
      const connection: GatewayConnection = {
        gateway,
        status: GatewayConnectionStatus.CONNECTING,
        ws: null,
        messageQueue: [],
        reconnectAttempts: 0,
      };
      this.connections.set(gateway._id, connection);

      // Emit status change event
      this.emitEvent('status_change', {
        gatewayId: gateway._id,
        status: GatewayConnectionStatus.CONNECTING,
        previousStatus: existing?.status,
      });

      try {
        // Create WebSocket connection
        const ws = new WebSocket(gateway.url);
        connection.ws = ws;

        // Set up event handlers
        ws.onopen = () => this.handleWebSocketOpen(gateway._id);
        ws.onclose = event => this.handleWebSocketClose(gateway._id, event);
        ws.onerror = event => this.handleWebSocketError(gateway._id, event);
        ws.onmessage = event => this.handleWebSocketMessage(gateway._id, event);

        return true;
      } catch (error) {
        // Handle connection error
        const connectionError: GatewayConnectionError = {
          message: error instanceof Error ? error.message : 'Unknown error connecting to gateway',
          timestamp: new Date(),
        };

        connection.status = GatewayConnectionStatus.ERROR;
        connection.lastError = connectionError;

        // Emit error event
        this.emitEvent('error', {
          gatewayId: gateway._id,
          error: connectionError,
        });

        // Emit status change event
        this.emitEvent('status_change', {
          gatewayId: gateway._id,
          status: GatewayConnectionStatus.ERROR,
          previousStatus: GatewayConnectionStatus.CONNECTING,
        });

        // Schedule reconnect if needed
        this.scheduleReconnect(gateway._id);

        return false;
      }
    });
  }

  /**
   * Disconnect from a gateway
   */
  public disconnect(gatewayId: string, reason?: string): void {
    const connection = this.connections.get(gatewayId);
    if (!connection) return;

    // Clean up connection
    this.cleanupConnection(gatewayId);

    // Update connection status
    connection.status = GatewayConnectionStatus.DISCONNECTED;
    this.connections.set(gatewayId, connection);

    // Emit disconnected event
    this.emitEvent('disconnected', {
      gatewayId,
      reason: reason || 'Disconnected by client',
    });

    // Emit status change event
    this.emitEvent('status_change', {
      gatewayId,
      status: GatewayConnectionStatus.DISCONNECTED,
    });
  }

  /**
   * Get the status of a gateway connection
   */
  public getStatus(gatewayId: string): GatewayConnectionStatus {
    const connection = this.connections.get(gatewayId);
    return connection?.status || GatewayConnectionStatus.DISCONNECTED;
  }

  /**
   * Get the last error for a gateway connection
   */
  public getLastError(gatewayId: string): GatewayConnectionError | undefined {
    const connection = this.connections.get(gatewayId);
    return connection?.lastError;
  }

  /**
   * Send an authentication request to a gateway
   */
  public sendAuthRequest(gatewayId: string): boolean {
    const connection = this.connections.get(gatewayId);
    if (!connection || connection.status !== GatewayConnectionStatus.CONNECTED) {
      return false;
    }

    // Update connection status
    connection.status = GatewayConnectionStatus.AUTHENTICATING;
    this.connections.set(gatewayId, connection);

    // Emit status change event
    this.emitEvent('status_change', {
      gatewayId,
      status: GatewayConnectionStatus.AUTHENTICATING,
      previousStatus: GatewayConnectionStatus.CONNECTED,
    });

    // Create and send authentication request using Zod for validation
    const authRequest = authRequestSchema.parse({
      Type: 'POST_LOGIN',
      From: 'UI',
      To: 'SERV',
      Data: {
        Email: connection.gateway.username,
        Password: connection.gateway.password,
      },
    });

    return this.sendMessage(gatewayId, authRequest);
  }

  /**
   * Send a message to a gateway
   */
  public sendMessage(gatewayId: string, message: RequestMessage): boolean {
    const connection = this.connections.get(gatewayId);
    if (!connection) return false;

    // Validate message with Zod schema - TypeScript knows this is already a RequestMessage
    // but we validate it to ensure runtime safety
    const validationResult = requestMessageSchema.safeParse(message);

    if (!validationResult.success) {
      // Handle validation error with proper error type from Zod
      // We could use validationResult.error.format() for detailed error information
      const messageError: GatewayConnectionError = {
        message: `Invalid message format: ${validationResult.error.message}`,
        code: 'VALIDATION_ERROR',
        timestamp: new Date(),
      };

      connection.lastError = messageError;

      // Emit error event
      this.emitEvent('error', {
        gatewayId,
        error: messageError,
      });

      return false;
    }

    // Message is valid, use the validated data
    const validatedMessage = validationResult.data;

    // If not connected, queue the message
    if (
      !connection.ws ||
      connection.ws.readyState !== WebSocket.OPEN ||
      (connection.status !== GatewayConnectionStatus.CONNECTED &&
        connection.status !== GatewayConnectionStatus.AUTHENTICATED)
    ) {
      connection.messageQueue.push(validatedMessage);
      return true;
    }

    try {
      // Send the message
      connection.ws.send(JSON.stringify(validatedMessage));
      return true;
    } catch (error) {
      // Handle send error
      const messageError: GatewayConnectionError = {
        message: error instanceof Error ? error.message : 'Unknown error sending message',
        timestamp: new Date(),
      };

      connection.lastError = messageError;

      // Emit error event
      this.emitEvent('error', {
        gatewayId,
        error: messageError,
      });

      return false;
    }
  }

  /**
   * Subscribe to a gateway service event
   */
  public on<T extends GatewayServiceEventType>(
    event: T,
    handler: GatewayServiceEventHandler<T>
  ): () => void {
    const handlers = this.eventHandlers.get(event);
    if (!handlers) return () => {};

    // Cast is safe here because we're ensuring the event type matches the handler type
    handlers.add(handler as GatewayServiceEventHandler<GatewayServiceEventType>);

    // Return unsubscribe function
    return () => {
      handlers.delete(handler as GatewayServiceEventHandler<GatewayServiceEventType>);
    };
  }

  /**
   * Get all active gateway connections
   */
  public getConnections(): Map<string, GatewayConnectionStatus> {
    const result = new Map<string, GatewayConnectionStatus>();

    this.connections.forEach((connection, gatewayId) => {
      result.set(gatewayId, connection.status);
    });

    return result;
  }

  /**
   * Clean up all connections
   */
  public cleanup(): void {
    this.connections.forEach((_, gatewayId) => {
      this.cleanupConnection(gatewayId);
    });

    this.connections.clear();
    this.eventHandlers.forEach(handlers => handlers.clear());
  }

  /**
   * Handle WebSocket open event
   */
  private handleWebSocketOpen(gatewayId: string): void {
    const connection = this.connections.get(gatewayId);
    if (!connection) return;

    // Update connection status
    connection.status = GatewayConnectionStatus.CONNECTED;
    connection.reconnectAttempts = 0;
    this.connections.set(gatewayId, connection);

    // Start ping interval
    this.startPingInterval(gatewayId);

    // Emit connected event
    this.emitEvent('connected', { gatewayId });

    // Emit status change event
    this.emitEvent('status_change', {
      gatewayId,
      status: GatewayConnectionStatus.CONNECTED,
      previousStatus: GatewayConnectionStatus.CONNECTING,
    });

    // Send authentication request
    this.sendAuthRequest(gatewayId);

    // Process queued messages
    this.processMessageQueue(gatewayId);
  }

  /**
   * Handle WebSocket close event
   */
  private handleWebSocketClose(gatewayId: string, event: CloseEvent): void {
    const connection = this.connections.get(gatewayId);
    if (!connection) return;

    // Stop ping interval
    this.stopPingInterval(gatewayId);

    // Determine if this was clean or not
    const wasConnected =
      connection.status === GatewayConnectionStatus.CONNECTED ||
      connection.status === GatewayConnectionStatus.AUTHENTICATED;
    const reason =
      event.reason ||
      (event.code !== 1000 ? `WebSocket closed with code ${event.code}` : undefined);

    // Update connection status
    const previousStatus = connection.status;
    connection.status = GatewayConnectionStatus.DISCONNECTED;
    connection.ws = null;
    this.connections.set(gatewayId, connection);

    // Emit disconnected event
    this.emitEvent('disconnected', {
      gatewayId,
      reason,
    });

    // Emit status change event
    this.emitEvent('status_change', {
      gatewayId,
      status: GatewayConnectionStatus.DISCONNECTED,
      previousStatus,
    });

    // Schedule reconnect if needed
    if (wasConnected) {
      this.scheduleReconnect(gatewayId);
    }
  }

  /**
   * Handle WebSocket error event
   */
  private handleWebSocketError(gatewayId: string, _event: Event): void {
    const connection = this.connections.get(gatewayId);
    if (!connection) return;

    // Create error object
    const wsError: GatewayConnectionError = {
      message: 'WebSocket error',
      timestamp: new Date(),
    };

    connection.lastError = wsError;

    // Emit error event
    this.emitEvent('error', {
      gatewayId,
      error: wsError,
    });

    // No need to update status or emit status change since onclose will be called after onerror
  }

  /**
   * Handle WebSocket message event
   */
  private handleWebSocketMessage(gatewayId: string, event: MessageEvent): void {
    const connection = this.connections.get(gatewayId);
    if (!connection) return;

    try {
      // Parse the raw message data
      let messageData: unknown;

      try {
        messageData = JSON.parse(event.data as string);
      } catch (parseError) {
        throw new Error(
          `Invalid JSON: ${parseError instanceof Error ? parseError.message : 'unknown error'}`
        );
      }

      // Validate basic message structure with Zod
      const baseResult = baseMessageSchema.safeParse(messageData);

      if (!baseResult.success) {
        // We could use baseResult.error.format() for detailed error information
        throw new Error(`Invalid message format: ${baseResult.error.message}`);
      }

      // Process the message with proper validation
      this.processMessage(gatewayId, messageData);
    } catch (error) {
      // Handle message parsing error with appropriate context
      const messageError: GatewayConnectionError = {
        message: error instanceof Error ? error.message : 'Unknown error processing message',
        code: 'MESSAGE_PARSE_ERROR',
        timestamp: new Date(),
      };

      connection.lastError = messageError;

      // Emit error event
      this.emitEvent('error', {
        gatewayId,
        error: messageError,
      });
    }
  }

  /**
   * Process a received message
   */
  private processMessage(gatewayId: string, message: unknown): void {
    const connection = this.connections.get(gatewayId);
    if (!connection) return;

    // Parse as a response message with Zod
    const responseResult = responseMessageSchema.safeParse(message);

    if (responseResult.success) {
      const response = responseResult.data;

      // Emit message event with properly typed response
      this.emitEvent('message', {
        gatewayId,
        message: response,
      });

      // Handle specific message types based on discriminated union
      switch (response.Type) {
        case 'RTN_LOGIN':
          // TypeScript now knows this is an AuthResponse
          this.handleAuthResponse(gatewayId, response);
          break;
        case 'RTN_ERR':
          // TypeScript now knows this is an ErrorResponse
          this.handleErrorResponse(gatewayId, response);
          break;
        case 'RTN_DYN':
          // TypeScript now knows this is a DynamicSensorsResponse
          // Handle sensor data if needed
          break;
        case 'NOT_DYN_CONN':
          // TypeScript now knows this is a SensorConnectionNotification
          // Handle sensor connection if needed
          break;
      }
    } else {
      // Try to parse as base message before emitting
      const baseResult = baseMessageSchema.safeParse(message);
      if (baseResult.success) {
        // Emit as base message if it passes basic validation
        this.emitEvent('message', {
          gatewayId,
          message: baseResult.data,
        });
      }
    }
  }

  /**
   * Handle authentication response
   */
  private handleAuthResponse(gatewayId: string, message: AuthResponse): void {
    const connection = this.connections.get(gatewayId);
    if (!connection) return;

    // Zod has already validated this structure, so TypeScript knows the exact shape
    const { Success, Email, First, Last, AccessLevel } = message.Data;

    if (Success) {
      // Authentication succeeded
      const previousStatus = connection.status;
      connection.status = GatewayConnectionStatus.AUTHENTICATED;

      // Update gateway in DB with status and timestamp
      connection.gateway.status = 'authenticated';
      connection.gateway.lastAuthenticatedAt = new Date();

      this.connections.set(gatewayId, connection);

      // Emit authenticated event
      this.emitEvent('authenticated', {
        gatewayId,
        userData: {
          email: Email,
          firstName: First,
          lastName: Last,
          accessLevel: AccessLevel,
        },
      });

      // Emit status change event
      this.emitEvent('status_change', {
        gatewayId,
        status: GatewayConnectionStatus.AUTHENTICATED,
        previousStatus,
      });

      // Subscribe to changes using Zod for validation
      const subscribeRequest = subscribeChangesRequestSchema.parse({
        Type: 'POST_SUB_CHANGES',
        From: 'UI',
        To: 'SERV',
        Data: {},
      });

      this.sendMessage(gatewayId, subscribeRequest);

      // Process any queued messages
      this.processMessageQueue(gatewayId);
    } else {
      // Authentication failed
      const authError: GatewayConnectionError = {
        message: 'Authentication failed',
        timestamp: new Date(),
      };

      connection.lastError = authError;
      connection.status = GatewayConnectionStatus.ERROR;

      this.connections.set(gatewayId, connection);

      // Emit error event
      this.emitEvent('error', {
        gatewayId,
        error: authError,
      });

      // Emit status change event
      this.emitEvent('status_change', {
        gatewayId,
        status: GatewayConnectionStatus.ERROR,
        previousStatus: GatewayConnectionStatus.AUTHENTICATING,
      });

      // Disconnect
      this.disconnect(gatewayId, 'Authentication failed');
    }
  }

  /**
   * Handle error response
   */
  private handleErrorResponse(gatewayId: string, message: ErrorResponse): void {
    const connection = this.connections.get(gatewayId);
    if (!connection) return;

    // Zod has already validated this structure, so this is type-safe
    const { Attempt, Error } = message.Data;

    // Create error object
    const responseError: GatewayConnectionError = {
      message: Error,
      code: Attempt,
      timestamp: new Date(),
    };

    connection.lastError = responseError;

    // Emit error event
    this.emitEvent('error', {
      gatewayId,
      error: responseError,
    });
  }

  /**
   * Process queued messages
   */
  private processMessageQueue(gatewayId: string): void {
    const connection = this.connections.get(gatewayId);
    if (!connection) return;

    // Process all queued messages
    const queue = [...connection.messageQueue];
    connection.messageQueue = [];

    queue.forEach(message => {
      this.sendMessage(gatewayId, message);
    });
  }

  /**
   * Schedule reconnect for a gateway
   */
  private scheduleReconnect(gatewayId: string): void {
    const connection = this.connections.get(gatewayId);
    if (!connection) return;

    // Clear any existing reconnect timeout
    if (connection.reconnectTimeout) {
      clearTimeout(connection.reconnectTimeout);
      connection.reconnectTimeout = undefined;
    }

    // Check if maximum reconnect attempts reached
    if (connection.reconnectAttempts >= this.config.maxReconnectAttempts) {
      return;
    }

    // Calculate delay with exponential backoff
    const factor = Math.pow(this.config.reconnectBackoffFactor, connection.reconnectAttempts);
    const delay = this.config.reconnectDelayMs * factor;

    // Schedule reconnect
    connection.reconnectAttempts++;
    connection.reconnectTimeout = setTimeout(() => {
      this.connect(connection.gateway);
    }, delay);

    this.connections.set(gatewayId, connection);
  }

  /**
   * Start ping interval for a gateway
   */
  private startPingInterval(gatewayId: string): void {
    // Clear any existing ping interval
    this.stopPingInterval(gatewayId);

    // Create new ping interval
    const interval = setInterval(() => {
      const connection = this.connections.get(gatewayId);
      if (!connection || !connection.ws || connection.ws.readyState !== WebSocket.OPEN) {
        this.stopPingInterval(gatewayId);
        return;
      }

      // Only send keepalive if authenticated
      if (connection.status === GatewayConnectionStatus.AUTHENTICATED) {
        // Send a GET_DYN request as a keepalive ping
        // This is a valid command from the API documentation
        const getDynRequest = requestMessageSchema.parse({
          Type: 'GET_DYN',
          From: 'UI',
          To: 'SERV',
          Data: {},
        });

        this.sendMessage(gatewayId, getDynRequest);
      }
    }, this.config.pingIntervalMs);

    this.pingIntervals.set(gatewayId, interval);
  }

  /**
   * Stop ping interval for a gateway
   */
  private stopPingInterval(gatewayId: string): void {
    const interval = this.pingIntervals.get(gatewayId);
    if (interval) {
      clearInterval(interval);
      this.pingIntervals.delete(gatewayId);
    }
  }

  /**
   * Clean up a gateway connection
   */
  private cleanupConnection(gatewayId: string): void {
    const connection = this.connections.get(gatewayId);
    if (!connection) return;

    // Stop ping interval
    this.stopPingInterval(gatewayId);

    // Clear reconnect timeout
    if (connection.reconnectTimeout) {
      clearTimeout(connection.reconnectTimeout);
      connection.reconnectTimeout = undefined;
    }

    // Close WebSocket if it exists
    if (connection.ws) {
      try {
        connection.ws.onopen = null;
        connection.ws.onclose = null;
        connection.ws.onerror = null;
        connection.ws.onmessage = null;

        if (
          connection.ws.readyState === WebSocket.OPEN ||
          connection.ws.readyState === WebSocket.CONNECTING
        ) {
          connection.ws.close();
        }
      } catch {
        // Ignore errors when closing
      }

      connection.ws = null;
    }
  }

  /**
   * Emit an event to all registered handlers
   */
  private emitEvent<T extends GatewayServiceEventType>(
    event: T,
    data: GatewayServiceEventData[T]
  ): void {
    const handlers = this.eventHandlers.get(event);
    if (!handlers) return;

    // Call all handlers with the data
    handlers.forEach(handler => {
      try {
        // Type casting here is safe because we registered handlers for specific events
        (handler as (data: GatewayServiceEventData[T]) => void)(data);
      } catch (error) {
        console.error(
          `Error in gateway service event handler for ${event}:`,
          error instanceof Error ? error.message : 'unknown error'
        );
      }
    });
  }
}
