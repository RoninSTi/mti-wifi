/**
 * Gateway Connection Manager
 *
 * This class manages WebSocket connections to gateways, handling:
 * - Connection establishment and maintenance
 * - Authentication
 * - Message serialization/deserialization
 * - Reconnection logic
 * - Event emission
 */
import { v4 as uuidv4 } from 'uuid';
import {
  GatewayConnection,
  GatewayConnectionParams,
  GatewayConnectionState,
  GatewayConnectionStats,
  GatewayMessage,
  GatewayMessageTypes,
  AuthMessage,
  AuthResponseMessage,
  CommandMessage,
  CommandResponseMessage,
  SubscribeMessage,
  SubscribeResponseMessage,
  UnsubscribeMessage,
  UnsubscribeResponseMessage,
  TopicDataMessage,
  HeartbeatMessage,
  ErrorMessage,
  gatewayConnectionParamsSchema,
} from './types';

type MessageHandler<T extends GatewayMessage> = (message: T) => void;
type TopicHandler = (topic: string, data: unknown) => void;

/**
 * Implementation of the GatewayConnection interface
 */
export class GatewayConnectionManager implements GatewayConnection {
  public id: string;
  public state: GatewayConnectionState = 'disconnected';
  public params: GatewayConnectionParams;
  public stats: GatewayConnectionStats = {
    messagesSent: 0,
    messagesReceived: 0,
    reconnectAttempts: 0,
    errors: 0,
  };

  private socket: WebSocket | null = null;
  private messageHandlers: Map<string, Set<MessageHandler<GatewayMessageTypes>>> = new Map();
  private topicHandlers: Map<string, Set<TopicHandler>> = new Map();
  private commandResponses: Map<
    string,
    {
      resolve: (value: unknown) => void;
      reject: (reason: unknown) => void;
      timeout: NodeJS.Timeout;
    }
  > = new Map();
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private authToken: string | null = null;
  private commandTimeout = 30000; // Default command timeout: 30 seconds
  private heartbeatIntervalTime = 30000; // Default heartbeat interval: 30 seconds

  /**
   * Create a new gateway connection manager
   * @param params Connection parameters
   */
  constructor(params: GatewayConnectionParams) {
    // Validate connection parameters
    const validationResult = gatewayConnectionParamsSchema.safeParse(params);
    if (!validationResult.success) {
      throw new Error(`Invalid gateway connection parameters: ${validationResult.error.message}`);
    }

    this.params = {
      ...params,
      autoReconnect: params.autoReconnect ?? true,
      reconnectInterval: params.reconnectInterval ?? 5000,
      maxReconnectAttempts: params.maxReconnectAttempts ?? 5,
    };

    this.id = params.id;

    // Set up default message handlers
    this.setupDefaultHandlers();
  }

  /**
   * Connect to the gateway
   */
  public async connect(): Promise<void> {
    if (this.socket && (this.state === 'connected' || this.state === 'authenticated')) {
      console.warn(`Gateway ${this.id} already connected`);
      return;
    }

    // Clear any existing reconnect timer
    this.clearReconnectTimer();

    // Update state and attempt connection
    this.updateState('connecting');

    try {
      await this.createWebSocketConnection();
    } catch (error) {
      this.handleConnectionError(error);
      throw error;
    }
  }

  /**
   * Disconnect from the gateway
   */
  public async disconnect(): Promise<void> {
    // Clear timers
    this.clearReconnectTimer();
    this.clearHeartbeatInterval();

    // Close socket if it exists
    if (this.socket) {
      try {
        // Only close if not already closing/closed
        if (
          this.socket.readyState === WebSocket.OPEN ||
          this.socket.readyState === WebSocket.CONNECTING
        ) {
          this.socket.close(1000, 'Disconnect requested');
        }
      } catch (error) {
        console.error(`Error closing WebSocket for gateway ${this.id}:`, error);
      }

      this.socket = null;
    }

    this.updateState('disconnected');
  }

  /**
   * Force reconnection to the gateway
   */
  public async reconnect(): Promise<void> {
    await this.disconnect();
    return this.connect();
  }

  /**
   * Authenticate with the gateway
   */
  public async authenticate(): Promise<void> {
    if (!this.socket || this.state !== 'connected') {
      throw new Error('Cannot authenticate: Gateway not connected');
    }

    this.updateState('authenticating');

    const authMessage: AuthMessage = {
      type: 'auth',
      username: this.params.username,
      password: this.params.password,
      timestamp: Date.now(),
    };

    return new Promise<void>((resolve, reject) => {
      // Set up one-time listener for auth response
      const unsubscribe = this.on<AuthResponseMessage>('auth_response', response => {
        unsubscribe(); // Remove listener

        if (response.success) {
          this.authToken = response.token || null;
          this.stats.authenticatedAt = new Date();
          this.updateState('authenticated');

          // Start heartbeat after successful authentication
          this.startHeartbeat();

          resolve();
        } else {
          const error = new Error(`Authentication failed: ${response.error || 'Unknown error'}`);
          this.handleError(error);
          reject(error);
        }
      });

      // Set authentication timeout
      const timeout = setTimeout(() => {
        unsubscribe();
        const error = new Error('Authentication timeout');
        this.handleError(error);
        reject(error);
      }, 10000); // 10 second timeout

      // Send authentication message
      this.send(authMessage).catch(error => {
        clearTimeout(timeout);
        unsubscribe();
        this.handleError(error);
        reject(error);
      });
    });
  }

  /**
   * Subscribe to topics
   * @param topics Array of topics to subscribe to
   * @returns Array of successfully subscribed topics
   */
  public async subscribe(topics: string[]): Promise<string[]> {
    if (!this.socket || this.state !== 'authenticated') {
      throw new Error('Cannot subscribe: Gateway not authenticated');
    }

    if (!topics.length) {
      return [];
    }

    const subscribeMessage: SubscribeMessage = {
      type: 'subscribe',
      topics,
      timestamp: Date.now(),
    };

    return new Promise<string[]>((resolve, reject) => {
      // Set up one-time listener for subscribe response
      const unsubscribe = this.on<SubscribeResponseMessage>('subscribe_response', response => {
        unsubscribe(); // Remove listener

        if (response.success) {
          resolve(response.topics);
        } else {
          const errors = response.errors || {};
          const errorMessages = Object.entries(errors)
            .map(([topic, error]) => `${topic}: ${error}`)
            .join(', ');

          const error = new Error(`Subscription failed: ${errorMessages}`);
          reject(error);
        }
      });

      // Set subscription timeout
      const timeout = setTimeout(() => {
        unsubscribe();
        reject(new Error('Subscription timeout'));
      }, 10000); // 10 second timeout

      // Send subscription message
      this.send(subscribeMessage).catch(error => {
        clearTimeout(timeout);
        unsubscribe();
        reject(error);
      });
    });
  }

  /**
   * Unsubscribe from topics
   * @param topics Array of topics to unsubscribe from
   * @returns Array of successfully unsubscribed topics
   */
  public async unsubscribe(topics: string[]): Promise<string[]> {
    if (!this.socket || this.state !== 'authenticated') {
      throw new Error('Cannot unsubscribe: Gateway not authenticated');
    }

    if (!topics.length) {
      return [];
    }

    const unsubscribeMessage: UnsubscribeMessage = {
      type: 'unsubscribe',
      topics,
      timestamp: Date.now(),
    };

    return new Promise<string[]>((resolve, reject) => {
      // Set up one-time listener for unsubscribe response
      const unsubscribe = this.on<UnsubscribeResponseMessage>('unsubscribe_response', response => {
        unsubscribe(); // Remove listener

        if (response.success) {
          resolve(response.topics);
        } else {
          reject(new Error('Unsubscribe failed'));
        }
      });

      // Set unsubscribe timeout
      const timeout = setTimeout(() => {
        unsubscribe();
        reject(new Error('Unsubscribe timeout'));
      }, 10000); // 10 second timeout

      // Send unsubscribe message
      this.send(unsubscribeMessage).catch(error => {
        clearTimeout(timeout);
        unsubscribe();
        reject(error);
      });
    });
  }

  /**
   * Send a message to the gateway
   * @param message Message to send
   */
  public async send<T extends GatewayMessage>(message: T): Promise<void> {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      throw new Error('Cannot send message: WebSocket not connected');
    }

    try {
      const messageString = JSON.stringify(message);
      this.socket.send(messageString);
      this.stats.messagesSent++;
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  /**
   * Send a command to the gateway and wait for the response
   * @param command Command name
   * @param params Command parameters (optional)
   * @returns Command response data
   */
  public async sendCommand<T = unknown>(
    command: string,
    params?: Record<string, unknown>
  ): Promise<T> {
    if (!this.socket || this.state !== 'authenticated') {
      throw new Error('Cannot send command: Gateway not authenticated');
    }

    const commandId = uuidv4();
    const commandMessage: CommandMessage = {
      type: 'command',
      command,
      params,
      id: commandId,
      timestamp: Date.now(),
    };

    return new Promise<T>((resolve, reject) => {
      // Create timeout
      const timeout = setTimeout(() => {
        this.commandResponses.delete(commandId);
        reject(new Error(`Command timeout: ${command}`));
      }, this.commandTimeout);

      // Store promise callbacks
      this.commandResponses.set(commandId, {
        resolve: data => resolve(data as T),
        reject,
        timeout,
      });

      // Send command
      this.send(commandMessage).catch(error => {
        this.clearCommandResponse(commandId);
        reject(error);
      });
    });
  }

  /**
   * Register an event listener
   * @param event Event type
   * @param callback Callback function
   * @returns Unsubscribe function
   */
  public on<T extends GatewayMessage>(
    event: T['type'],
    callback: (message: T) => void
  ): () => void {
    // Create a type-safe callback wrapper
    const typedCallback = ((message: GatewayMessageTypes) => {
      if (message.type === event) {
        // This cast is safe because we've verified the message type matches the expected type
        callback(message as unknown as T);
      }
    }) as MessageHandler<GatewayMessageTypes>;

    const handlers = this.messageHandlers.get(event) || new Set();
    handlers.add(typedCallback);
    this.messageHandlers.set(event, handlers);

    // Return unsubscribe function
    return () => {
      const handlers = this.messageHandlers.get(event);
      if (handlers) {
        handlers.delete(typedCallback);
        if (handlers.size === 0) {
          this.messageHandlers.delete(event);
        }
      }
    };
  }

  /**
   * Register a data listener for a specific topic
   * @param topic Topic to listen for
   * @param callback Callback function
   * @returns Unsubscribe function
   */
  public onData(topic: string, callback: (data: unknown) => void): () => void {
    // Create callback wrapper to handle topic data messages
    const topicHandler: TopicHandler = (messageTopic, data) => {
      // Use pattern matching to support wildcards in topics
      if (this.topicMatches(messageTopic, topic)) {
        callback(data);
      }
    };

    const handlers = this.topicHandlers.get(topic) || new Set();
    handlers.add(topicHandler);
    this.topicHandlers.set(topic, handlers);

    // Return unsubscribe function
    return () => {
      const handlers = this.topicHandlers.get(topic);
      if (handlers) {
        handlers.delete(topicHandler);
        if (handlers.size === 0) {
          this.topicHandlers.delete(topic);
        }
      }
    };
  }

  /**
   * Create a WebSocket connection
   * @private
   */
  private async createWebSocketConnection(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      try {
        this.socket = new WebSocket(this.params.url);

        // Connection opened
        this.socket.onopen = () => {
          this.stats.connectedAt = new Date();
          this.stats.reconnectAttempts = 0; // Reset reconnect attempts on successful connection
          this.updateState('connected');
          resolve();
        };

        // Listen for messages
        this.socket.onmessage = event => {
          this.handleMessage(event);
        };

        // Connection closed
        this.socket.onclose = event => {
          this.handleClose(event);
        };

        // Connection error
        this.socket.onerror = event => {
          const error = new Error(`WebSocket error: ${event.type}`);
          this.handleError(error);

          // Only reject if still connecting
          if (this.state === 'connecting') {
            reject(error);
          }
        };
      } catch (error) {
        this.handleError(error);
        reject(error);
      }
    });
  }

  /**
   * Handle incoming WebSocket messages
   * @private
   */
  private handleMessage(event: MessageEvent): void {
    try {
      // Parse message
      const message = JSON.parse(event.data) as GatewayMessageTypes;

      // Update stats
      this.stats.messagesReceived++;
      this.stats.lastMessageAt = new Date();

      // Process by message type
      switch (message.type) {
        case 'command_response':
          this.handleCommandResponse(message as CommandResponseMessage);
          break;

        case 'topic_data':
          this.handleTopicData(message as TopicDataMessage);
          break;

        case 'error':
          this.handleErrorMessage(message as ErrorMessage);
          break;
      }

      // Dispatch to message handlers
      this.dispatchMessage(message);
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Handle WebSocket close event
   * @private
   */
  private handleClose(event: CloseEvent): void {
    const wasConnected = this.state === 'connected' || this.state === 'authenticated';

    // Clear heartbeat interval
    this.clearHeartbeatInterval();

    // Update state
    if (event.wasClean) {
      this.updateState('closed');
    } else {
      this.updateState('error');
      this.stats.errors++;

      // Log error
      console.error(`Gateway ${this.id} connection closed unexpectedly:`, event.code, event.reason);

      // Attempt reconnect if auto-reconnect is enabled and was previously connected
      if (this.params.autoReconnect && wasConnected) {
        this.scheduleReconnect();
      }
    }
  }

  /**
   * Handle connection errors
   * @private
   */
  private handleConnectionError(error: unknown): void {
    this.stats.errors++;
    this.updateState('error');

    console.error(`Gateway ${this.id} connection error:`, error);

    // Attempt reconnect if auto-reconnect is enabled
    if (this.params.autoReconnect) {
      this.scheduleReconnect();
    }
  }

  /**
   * Handle general errors
   * @private
   */
  private handleError(error: unknown): void {
    this.stats.errors++;
    console.error(`Gateway ${this.id} error:`, error);
  }

  /**
   * Schedule a reconnection attempt
   * @private
   */
  private scheduleReconnect(): void {
    // Clear any existing reconnect timer
    this.clearReconnectTimer();

    // Check if maximum reconnect attempts exceeded
    if (this.stats.reconnectAttempts >= (this.params.maxReconnectAttempts || 5)) {
      console.error(`Gateway ${this.id} maximum reconnect attempts exceeded`);
      this.updateState('closed');
      return;
    }

    // Update state and increment reconnect attempts
    this.updateState('reconnecting');
    this.stats.reconnectAttempts++;

    // Schedule reconnect
    this.reconnectTimer = setTimeout(() => {
      console.log(
        `Attempting to reconnect to gateway ${this.id} (attempt ${this.stats.reconnectAttempts})`
      );
      this.connect().catch(error => {
        console.error(`Gateway ${this.id} reconnect attempt failed:`, error);
      });
    }, this.params.reconnectInterval);
  }

  /**
   * Clear reconnect timer if it exists
   * @private
   */
  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  /**
   * Start heartbeat interval
   * @private
   */
  private startHeartbeat(): void {
    // Clear any existing heartbeat interval
    this.clearHeartbeatInterval();

    // Set up new heartbeat interval
    this.heartbeatInterval = setInterval(() => {
      const heartbeatMessage: HeartbeatMessage = {
        type: 'heartbeat',
        timestamp: Date.now(),
      };

      this.send(heartbeatMessage).catch(error => {
        console.error(`Gateway ${this.id} heartbeat error:`, error);
      });
    }, this.heartbeatIntervalTime);
  }

  /**
   * Clear heartbeat interval if it exists
   * @private
   */
  private clearHeartbeatInterval(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Update connection state
   * @private
   */
  private updateState(state: GatewayConnectionState): void {
    if (this.state !== state) {
      const previousState = this.state;
      this.state = state;

      // Dispatch state change event to subscribers
      this.dispatchMessage({
        type: 'state_change',
        state,
        previousState,
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Handle command response
   * @private
   */
  private handleCommandResponse(message: CommandResponseMessage): void {
    const commandResponse = this.commandResponses.get(message.id);

    if (commandResponse) {
      // Clear timeout and remove response handler
      clearTimeout(commandResponse.timeout);
      this.commandResponses.delete(message.id);

      // Resolve or reject promise
      if (message.success) {
        commandResponse.resolve(message.data);
      } else {
        commandResponse.reject(new Error(message.error || 'Command failed'));
      }
    }
  }

  /**
   * Handle topic data message
   * @private
   */
  private handleTopicData(message: TopicDataMessage): void {
    // Notify all topic handlers
    this.topicHandlers.forEach((handlers, topic) => {
      if (this.topicMatches(message.topic, topic)) {
        handlers.forEach(handler => {
          try {
            handler(message.topic, message.data);
          } catch (error) {
            console.error(`Error in topic handler for ${topic}:`, error);
          }
        });
      }
    });
  }

  /**
   * Handle error message from gateway
   * @private
   */
  private handleErrorMessage(message: ErrorMessage): void {
    this.stats.errors++;
    console.error(
      `Gateway ${this.id} error message:`,
      message.code,
      message.message,
      message.details
    );
  }

  /**
   * Dispatch message to all registered handlers
   * @private
   */
  private dispatchMessage(message: GatewayMessageTypes): void {
    const handlers = this.messageHandlers.get(message.type);

    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(message);
        } catch (error) {
          console.error(`Error in message handler for ${message.type}:`, error);
        }
      });
    }
  }

  /**
   * Clear a command response
   * @private
   */
  private clearCommandResponse(commandId: string): void {
    const response = this.commandResponses.get(commandId);
    if (response) {
      clearTimeout(response.timeout);
      this.commandResponses.delete(commandId);
    }
  }

  /**
   * Check if a topic matches a pattern
   * Supports wildcards (*) in patterns
   * @private
   */
  private topicMatches(topic: string, pattern: string): boolean {
    // Convert wildcard pattern to regex
    const regex = new RegExp(
      '^' +
        pattern
          .replace(/\./g, '\\.') // Escape dots
          .replace(/\*/g, '.*') // Convert * to .*
          .replace(/\?/g, '.') + // Convert ? to .
        '$'
    );

    return regex.test(topic);
  }

  /**
   * Set up default message handlers
   * @private
   */
  private setupDefaultHandlers(): void {
    // Handle heartbeat responses
    this.on('heartbeat_response', () => {
      // Heartbeat response received, connection is alive
    });
  }
}
