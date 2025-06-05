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
  takeDynamicReadingRequestSchema,
  takeDynamicTemperatureRequestSchema,
  takeDynamicBatteryRequestSchema,
  getDynamicReadingsRequestSchema,
  getDynamicTemperaturesRequestSchema,
  getDynamicBatteriesRequestSchema,
  getConnectedSensorsRequestSchema,
  getDynamicSensorsRequestSchema,
  AccessPointConnectionNotification,
  VibrationReadingStartedNotification,
  VibrationReadingCompleteNotification,
  TemperatureReadingCompleteNotification,
  BatteryReadingCompleteNotification,
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
   * Take a dynamic vibration reading
   */
  public takeDynamicReading(gatewayId: string, serial: number): boolean {
    try {
      // Use Zod to create and validate the request message
      const takeDynamicReadingRequest = takeDynamicReadingRequestSchema.parse({
        Type: 'TAKE_DYN_READING',
        From: 'UI',
        To: 'SERV',
        Data: {
          Serial: serial,
        },
      });

      return this.sendMessage(gatewayId, takeDynamicReadingRequest);
    } catch (error) {
      console.error(
        'Invalid dynamic reading request format:',
        error instanceof Error ? error.message : 'Unknown error'
      );
      return false;
    }
  }

  /**
   * Take a dynamic temperature reading
   */
  public takeDynamicTemperature(gatewayId: string, serial: number): boolean {
    try {
      // Use Zod to create and validate the request message
      const takeDynamicTemperatureRequest = takeDynamicTemperatureRequestSchema.parse({
        Type: 'TAKE_DYN_TEMP',
        From: 'UI',
        To: 'SERV',
        Data: {
          Serial: serial,
        },
      });

      return this.sendMessage(gatewayId, takeDynamicTemperatureRequest);
    } catch (error) {
      console.error(
        'Invalid temperature reading request format:',
        error instanceof Error ? error.message : 'Unknown error'
      );
      return false;
    }
  }

  /**
   * Take a dynamic battery level reading
   */
  public takeDynamicBattery(gatewayId: string, serial: number): boolean {
    try {
      // Use Zod to create and validate the request message
      const takeDynamicBatteryRequest = takeDynamicBatteryRequestSchema.parse({
        Type: 'TAKE_DYN_BATT',
        From: 'UI',
        To: 'SERV',
        Data: {
          Serial: serial,
        },
      });

      return this.sendMessage(gatewayId, takeDynamicBatteryRequest);
    } catch (error) {
      console.error(
        'Invalid battery reading request format:',
        error instanceof Error ? error.message : 'Unknown error'
      );
      return false;
    }
  }

  /**
   * Get dynamic vibration readings
   */
  public getDynamicReadings(
    gatewayId: string,
    options?: { serials?: number[]; start?: string; end?: string; max?: number }
  ): boolean {
    try {
      // Use Zod to create and validate the request message
      const getDynamicReadingsRequest = getDynamicReadingsRequestSchema.parse({
        Type: 'GET_DYN_READINGS',
        From: 'UI',
        To: 'SERV',
        Data: {
          Serials: options?.serials,
          Start: options?.start,
          End: options?.end,
          Max: options?.max,
        },
      });

      return this.sendMessage(gatewayId, getDynamicReadingsRequest);
    } catch (error) {
      console.error(
        'Invalid get dynamic readings request format:',
        error instanceof Error ? error.message : 'Unknown error'
      );
      return false;
    }
  }

  /**
   * Get dynamic temperature readings
   */
  public getDynamicTemperatures(
    gatewayId: string,
    options?: { serials?: number[]; start?: string; end?: string; max?: number }
  ): boolean {
    try {
      // Use Zod to create and validate the request message
      const getDynamicTemperaturesRequest = getDynamicTemperaturesRequestSchema.parse({
        Type: 'GET_DYN_TEMPS',
        From: 'UI',
        To: 'SERV',
        Data: {
          Serials: options?.serials,
          Start: options?.start,
          End: options?.end,
          Max: options?.max,
        },
      });

      return this.sendMessage(gatewayId, getDynamicTemperaturesRequest);
    } catch (error) {
      console.error(
        'Invalid get dynamic temperatures request format:',
        error instanceof Error ? error.message : 'Unknown error'
      );
      return false;
    }
  }

  /**
   * Get dynamic battery readings
   */
  public getDynamicBatteries(
    gatewayId: string,
    options?: { serials?: number[]; start?: string; end?: string; max?: number }
  ): boolean {
    try {
      // Use Zod to create and validate the request message
      const getDynamicBatteriesRequest = getDynamicBatteriesRequestSchema.parse({
        Type: 'GET_DYN_BATTS',
        From: 'UI',
        To: 'SERV',
        Data: {
          Serials: options?.serials,
          Start: options?.start,
          End: options?.end,
          Max: options?.max,
        },
      });

      return this.sendMessage(gatewayId, getDynamicBatteriesRequest);
    } catch (error) {
      console.error(
        'Invalid get dynamic batteries request format:',
        error instanceof Error ? error.message : 'Unknown error'
      );
      return false;
    }
  }

  /**
   * Get sensor list and connection status via GET_DYN command
   */
  public getConnectedSensors(gatewayId: string): boolean {
    try {
      // Create the GET_DYN request with the proper schema
      const getDynRequest = requestMessageSchema.parse({
        Type: 'GET_DYN',
        From: 'UI',
        To: 'SERV',
        Data: {},
      });

      // Send the command through our proper messaging system
      return this.sendMessage(gatewayId, getDynRequest);
    } catch (error) {
      console.error('Failed to send GET_DYN command:', error);
      return false;
    }
  }

  /**
   * Send an authentication request to a gateway
   */
  public sendAuthRequest(gatewayId: string): boolean {
    const connection = this.connections.get(gatewayId);
    if (!connection || connection.status !== GatewayConnectionStatus.CONNECTED) {
      console.warn(
        `Cannot authenticate gateway ${gatewayId}: Not connected (current status: ${connection?.status})`
      );
      return false;
    }

    if (!connection.gateway.username || !connection.gateway.password) {
      console.error(`Authentication failed for gateway ${gatewayId}: Missing credentials`, {
        hasUsername: !!connection.gateway.username,
        hasPassword: !!connection.gateway.password,
      });
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

    console.log(
      `Authenticating gateway ${gatewayId} with username: ${connection.gateway.username}`
    );

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

    // Check connection and WebSocket state with detailed logging
    const hasWebSocket = !!connection.ws;
    const wsReadyState = connection.ws ? connection.ws.readyState : -1;
    const isWsOpen = wsReadyState === WebSocket.OPEN;

    // For most messages, check if status is ready - but login/auth messages can be sent while connecting
    let isStatusReady = false;
    if (validatedMessage.Type === 'POST_LOGIN') {
      // Allow login messages even during connecting or authenticating
      isStatusReady =
        connection.status === GatewayConnectionStatus.CONNECTED ||
        connection.status === GatewayConnectionStatus.AUTHENTICATING;
    } else {
      // For other messages, we should be fully connected or authenticated
      isStatusReady =
        connection.status === GatewayConnectionStatus.CONNECTED ||
        connection.status === GatewayConnectionStatus.AUTHENTICATED;
    }

    console.log(`Message send check for gateway ${gatewayId}:`, {
      messageType: validatedMessage.Type,
      hasWebSocket,
      wsReadyState,
      isWsOpen,
      connectionStatus: connection.status,
      isStatusReady,
    });

    // If not ready to send, queue the message
    if (!hasWebSocket || !isWsOpen) {
      console.log(`Queuing message: ${JSON.stringify(validatedMessage)} (WebSocket not ready)`);
      connection.messageQueue.push(validatedMessage);
      return true;
    }

    // If not in correct status, queue the message
    if (!isStatusReady) {
      console.log(
        `Queuing message: ${JSON.stringify(validatedMessage)} (Connection status not ready)`
      );
      connection.messageQueue.push(validatedMessage);
      return true;
    }

    try {
      // Send the message with debug logging
      const messageStr = JSON.stringify(validatedMessage);
      console.log(`Sending message: ${messageStr}`);

      // We've already checked connection.ws is not null above, but TypeScript
      // needs this additional null check to be certain it's not null at this point
      if (connection.ws) {
        connection.ws.send(messageStr);
        return true;
      } else {
        // This should never happen due to our checks above, but we need to handle it for type safety
        console.warn('WebSocket unexpectedly null when sending message');
        connection.messageQueue.push(validatedMessage);
        return false;
      }
    } catch (error) {
      // Handle send error
      const messageError: GatewayConnectionError = {
        message: error instanceof Error ? error.message : 'Unknown error sending message',
        timestamp: new Date(),
      };

      console.error(
        `Error sending message: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
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

    console.log(`WebSocket connected for gateway ${gatewayId}`);

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

    // Add a small delay to ensure WebSocket is ready before sending messages
    setTimeout(() => {
      // Verify the connection is still valid
      const currentConnection = this.connections.get(gatewayId);
      if (
        !currentConnection ||
        !currentConnection.ws ||
        currentConnection.ws.readyState !== WebSocket.OPEN
      ) {
        console.warn(
          `Connection lost before authentication could be sent for gateway ${gatewayId}`
        );
        return;
      }

      // Send authentication request
      console.log(`Sending authentication request for gateway ${gatewayId} (after brief delay)`);
      const authSuccess = this.sendAuthRequest(gatewayId);
      console.log(`Authentication request sent successfully: ${authSuccess}`);

      // Process queued messages
      if (authSuccess) {
        setTimeout(() => {
          console.log(`Processing message queue after authentication for gateway ${gatewayId}`);
          this.processMessageQueue(gatewayId);
        }, 100);
      }
    }, 300);
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

    console.log(`Received WebSocket message from ${gatewayId}:`, event.data);

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

      // Validate with base schema
      const baseResult = baseMessageSchema.safeParse(messageData);
      if (!baseResult.success) {
        throw new Error(`Invalid message format: ${baseResult.error.message}`);
      }

      // Process the message
      this.processMessage(gatewayId, messageData);
    } catch (error) {
      // Handle message parsing error with appropriate context
      const messageError: GatewayConnectionError = {
        message: error instanceof Error ? error.message : 'Unknown error processing message',
        code: 'MESSAGE_PARSE_ERROR',
        timestamp: new Date(),
      };

      console.error(`Error processing WebSocket message:`, error);
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

      // Emit message event with properly typed data
      this.emitEvent('message', {
        gatewayId,
        message: response,
      });

      // Handle specific message types based on discriminated union
      switch (response.Type) {
        case 'RTN_LOGIN':
          this.handleAuthResponse(gatewayId, response);
          break;
        case 'RTN_ERR':
          this.handleErrorResponse(gatewayId, response);
          break;
        case 'RTN_DYN':
          // Already handled by message event in context
          break;
        case 'RTN_DYN_READINGS':
        case 'RTN_DYN_TEMPS':
        case 'RTN_DYN_BATTS':
          // These are handled by the message event in the context
          break;
        case 'NOT_AP_CONN':
          this.handleAccessPointConnectionNotification(gatewayId, response);
          break;
        case 'NOT_DYN_CONN':
          // Already handled by message event in context
          break;
        case 'NOT_DYN_READING_STARTED':
          this.handleVibrationReadingStartedNotification(gatewayId, response);
          break;
        case 'NOT_DYN_READING':
          this.handleVibrationReadingCompleteNotification(gatewayId, response);
          break;
        case 'NOT_DYN_TEMP':
          this.handleTemperatureReadingCompleteNotification(gatewayId, response);
          break;
        case 'NOT_DYN_BATT':
          this.handleBatteryReadingCompleteNotification(gatewayId, response);
          break;
      }
    } else {
      // Attempt to validate as base message
      const baseResult = baseMessageSchema.safeParse(message);

      if (baseResult.success) {
        // Emit as base message - properly typed by Zod
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

      // After authentication and subscription, get sensor list with GET_DYN
      // Use the proper method from our service
      console.log('Authentication successful - sending initial GET_DYN to get sensor status');
      setTimeout(() => {
        this.getConnectedSensors(gatewayId);
      }, 300);
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
   * Handle access point connection notification
   */
  private handleAccessPointConnectionNotification(
    gatewayId: string,
    message: AccessPointConnectionNotification
  ): void {
    // Emit notification through the message event
    // The gateway context will handle updating the state
    console.log(`Access point connection notification for ${gatewayId}:`, message.Data);
  }

  /**
   * Handle vibration reading started notification
   */
  private handleVibrationReadingStartedNotification(
    gatewayId: string,
    message: VibrationReadingStartedNotification
  ): void {
    // Emit notification through the message event
    // The gateway context will handle updating the state
    console.log(`Vibration reading started notification for ${gatewayId}:`, message.Data);
  }

  /**
   * Handle vibration reading complete notification
   */
  private handleVibrationReadingCompleteNotification(
    gatewayId: string,
    message: VibrationReadingCompleteNotification
  ): void {
    // Emit notification through the message event
    // The gateway context will handle updating the state
    console.log(`Vibration reading complete notification for ${gatewayId}:`, message.Data);
  }

  /**
   * Handle temperature reading complete notification
   */
  private handleTemperatureReadingCompleteNotification(
    gatewayId: string,
    message: TemperatureReadingCompleteNotification
  ): void {
    // Emit notification through the message event
    // The gateway context will handle updating the state
    console.log(`Temperature reading complete notification for ${gatewayId}:`, message.Data);
  }

  /**
   * Handle battery reading complete notification
   */
  private handleBatteryReadingCompleteNotification(
    gatewayId: string,
    message: BatteryReadingCompleteNotification
  ): void {
    // Emit notification through the message event
    // The gateway context will handle updating the state
    console.log(`Battery reading complete notification for ${gatewayId}:`, message.Data);
  }

  /**
   * Process queued messages
   */
  private processMessageQueue(gatewayId: string): void {
    const connection = this.connections.get(gatewayId);
    if (!connection) return;

    // Only process if we have a valid WebSocket connection
    if (!connection.ws || connection.ws.readyState !== WebSocket.OPEN) {
      console.log(`Cannot process queue for gateway ${gatewayId}: WebSocket not open`, {
        hasWs: !!connection.ws,
        readyState: connection.ws ? connection.ws.readyState : -1,
      });
      return;
    }

    // Process all queued messages
    const queue = [...connection.messageQueue];
    connection.messageQueue = [];

    console.log(`Processing ${queue.length} queued messages for gateway ${gatewayId}`);

    // Special handling for direct WebSocket send to bypass the normal send mechanism
    queue.forEach(message => {
      try {
        // We've already checked connection.ws exists and is open above, but TypeScript
        // needs an additional null check here
        if (connection.ws) {
          const messageStr = JSON.stringify(message);
          console.log(`Directly sending queued message: ${messageStr}`);
          connection.ws.send(messageStr);
        }
      } catch (error) {
        console.error(
          `Error sending queued message: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
        // Re-queue the message if it fails
        connection.messageQueue.push(message);
      }
    });

    if (queue.length === 0) {
      console.log(`No queued messages for gateway ${gatewayId}`);
    } else {
      console.log(`Finished processing ${queue.length} queued messages for gateway ${gatewayId}`);
    }
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

    // We don't need to send any pings - WebSocket protocol handles keepalives
    // but we'll keep a periodic check to detect disconnections
    const interval = setInterval(() => {
      const connection = this.connections.get(gatewayId);
      if (!connection || !connection.ws || connection.ws.readyState !== WebSocket.OPEN) {
        console.log(`Ping interval detected gateway ${gatewayId} is disconnected`);
        this.stopPingInterval(gatewayId);
        return;
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
