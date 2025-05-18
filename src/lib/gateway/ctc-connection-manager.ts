/**
 * CTC Gateway Connection Manager
 *
 * This class manages WebSocket connections to CTC gateways, handling:
 * - Connection establishment
 * - Subscription management
 * - Message sending/receiving
 * - Event emission for subscribed topics
 */
import { GatewayConnectionParams, GatewayConnectionState, GatewayConnectionStats } from './types';
import {
  CTCCommandType,
  CTCComponent,
  CTCMessage,
  CTCReturnErrorMessage,
  CTCSubscribeChangesMessage,
  CTCUnsubscribeChangesMessage,
  CTCGetDynamicSensorsMessage,
  CTCGetConnectedDynamicSensorsMessage,
  CTCTakeDynamicReadingMessage,
  CTCTakeDynamicTempReadingMessage,
  CTCTakeDynamicBatteryReadingMessage,
  CTCGetDynamicVibrationRecordsMessage,
  CTCReturnDynamicSensorsMessage,
  CTCReturnDynamicReadingsMessage,
  CTCNotifyAccessPointConnectedMessage,
  CTCNotifyDynamicReadingMessage,
  CTCNotifyDynamicTemperatureMessage,
  CTCNotifyDynamicBatteryMessage,
  CTCDynamicSensor,
  CTCDynamicReading,
  CTCStateChangeMessage,
} from './ctc-types';

type CTCMessageHandler<T extends CTCMessage> = (message: T) => void;
type CTCTopicHandler = (topic: string, data: unknown) => void;

/**
 * CTC Gateway Connection Manager
 * This class provides functionality similar to GatewayConnection but with CTC-specific types.
 * Use the adapter pattern to convert to/from the GatewayConnection interface.
 */
export class CTCConnectionManager {
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
  private messageHandlers: Map<string, Set<CTCMessageHandler<CTCMessage>>> = new Map();
  private topicHandlers: Map<string, Set<CTCTopicHandler>> = new Map();
  private reconnectTimer: NodeJS.Timeout | null = null;
  private commandResponses: Map<
    string,
    {
      resolve: (value: unknown) => void;
      reject: (reason: unknown) => void;
      timeout: NodeJS.Timeout;
    }
  > = new Map();

  private username: string;
  private password: string;
  private isSubscribed = false;
  private commandTimeout = 10000; // Default command timeout: 10 seconds

  /**
   * Create a new CTC gateway connection manager
   * @param params Connection parameters
   */
  constructor(params: GatewayConnectionParams) {
    this.params = {
      ...params,
      autoReconnect: params.autoReconnect ?? true,
      reconnectInterval: params.reconnectInterval ?? 5000,
      maxReconnectAttempts: params.maxReconnectAttempts ?? 5,
    };

    this.id = params.id;
    this.username = params.username;
    this.password = params.password;

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
    // If subscribed, unsubscribe first
    if (this.isSubscribed) {
      try {
        await this.unsubscribeFromChanges();
      } catch (error) {
        console.warn(`Error unsubscribing from gateway ${this.id}:`, error);
      }
    }

    // Clear timers
    this.clearReconnectTimer();

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
   * Authenticate with the gateway (for CTC, authentication is
   * handled via subscription to changes)
   */
  public async authenticate(): Promise<void> {
    if (!this.socket || this.state !== 'connected') {
      throw new Error('Cannot authenticate: Gateway not connected');
    }

    this.updateState('authenticating');

    // For CTC, we "authenticate" by subscribing to changes
    await this.subscribeToChanges();

    // Update state
    this.stats.authenticatedAt = new Date();
    this.updateState('authenticated');
  }

  /**
   * Subscribe to the CTC gateway for changes
   */
  private async subscribeToChanges(): Promise<void> {
    // Create subscription message
    const subscribeMessage: CTCSubscribeChangesMessage = {
      Type: CTCCommandType.SUBSCRIBE_CHANGES,
      From: CTCComponent.UI,
      To: CTCComponent.SERVICE,
      Data: {},
    };

    return new Promise<void>((resolve, reject) => {
      // Set up one-time error listener
      const errorHandler = (message: CTCReturnErrorMessage) => {
        this.off(CTCCommandType.RETURN_ERROR, errorHandler);
        const error = new Error(`Subscription failed: ${message.Data.Message}`);
        reject(error);
      };

      // Add error handler
      this.on<CTCReturnErrorMessage>(CTCCommandType.RETURN_ERROR, errorHandler);

      // Set subscription timeout
      const timeout = setTimeout(() => {
        this.off(CTCCommandType.RETURN_ERROR, errorHandler);
        const error = new Error('Subscription timeout');
        reject(error);
      }, this.commandTimeout);

      // Send subscription message
      this.send(subscribeMessage)
        .then(() => {
          // If we make it here without an error, it was successful
          clearTimeout(timeout);
          this.off(CTCCommandType.RETURN_ERROR, errorHandler);
          this.isSubscribed = true;
          resolve();
        })
        .catch(error => {
          clearTimeout(timeout);
          this.off(CTCCommandType.RETURN_ERROR, errorHandler);
          reject(error);
        });
    });
  }

  /**
   * Unsubscribe from the CTC gateway
   */
  private async unsubscribeFromChanges(): Promise<void> {
    // Create unsubscription message
    const unsubscribeMessage: CTCUnsubscribeChangesMessage = {
      Type: CTCCommandType.UNSUBSCRIBE_CHANGES,
      From: CTCComponent.UI,
      To: CTCComponent.SERVICE,
      Data: {},
    };

    return new Promise<void>((resolve, reject) => {
      // Set up one-time error listener
      const errorHandler = (message: CTCReturnErrorMessage) => {
        this.off(CTCCommandType.RETURN_ERROR, errorHandler);
        const error = new Error(`Unsubscription failed: ${message.Data.Message}`);
        reject(error);
      };

      // Add error handler
      this.on<CTCReturnErrorMessage>(CTCCommandType.RETURN_ERROR, errorHandler);

      // Set unsubscription timeout
      const timeout = setTimeout(() => {
        this.off(CTCCommandType.RETURN_ERROR, errorHandler);
        const error = new Error('Unsubscription timeout');
        reject(error);
      }, this.commandTimeout);

      // Send unsubscription message
      this.send(unsubscribeMessage)
        .then(() => {
          // If we make it here without an error, it was successful
          clearTimeout(timeout);
          this.off(CTCCommandType.RETURN_ERROR, errorHandler);
          this.isSubscribed = false;
          resolve();
        })
        .catch(error => {
          clearTimeout(timeout);
          this.off(CTCCommandType.RETURN_ERROR, errorHandler);
          reject(error);
        });
    });
  }

  /**
   * CTC version of subscribe - forwards to appropriate CTC command
   * @param _topics Topics to subscribe to (not used in CTC)
   * @returns List of successfully subscribed topics (always empty for CTC)
   */
  public async subscribe(_topics: string[] = []): Promise<string[]> {
    // For CTC API, we don't have granular topic subscription,
    // just a global subscription mechanism
    if (!this.isSubscribed) {
      await this.subscribeToChanges();
    }
    return [];
  }

  /**
   * CTC version of unsubscribe - forwards to appropriate CTC command
   * @param _topics Topics to unsubscribe from (not used in CTC)
   * @returns List of successfully unsubscribed topics (always empty for CTC)
   */
  public async unsubscribe(_topics: string[] = []): Promise<string[]> {
    // For CTC API, we don't have granular topic unsubscription,
    // just a global unsubscription mechanism
    if (this.isSubscribed) {
      await this.unsubscribeFromChanges();
    }
    return [];
  }

  /**
   * Send a message to the gateway
   * @param message Message to send
   */
  public async send<T extends CTCMessage>(message: T): Promise<void> {
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
   * (Implementation uses command-specific return types)
   * @param command Command type
   * @param params Command parameters
   * @returns Command response data
   */
  public async sendCommand<T = unknown>(
    command: string,
    params?: Record<string, unknown>
  ): Promise<T> {
    switch (command) {
      case 'getDynamicSensors':
        return this.getDynamicSensors((params?.serials as number[]) || []) as unknown as T;

      case 'getConnectedDynamicSensors':
        return this.getConnectedDynamicSensors() as unknown as T;

      case 'takeDynamicReading':
        if (!params?.serial || typeof params.serial !== 'number') {
          throw new Error('Serial number is required for takeDynamicReading');
        }
        return this.takeDynamicReading(params.serial as number) as unknown as T;

      case 'takeDynamicTemperatureReading':
        if (!params?.serial || typeof params.serial !== 'number') {
          throw new Error('Serial number is required for takeDynamicTemperatureReading');
        }
        return this.takeDynamicTemperatureReading(params.serial as number) as unknown as T;

      case 'takeDynamicBatteryReading':
        if (!params?.serial || typeof params.serial !== 'number') {
          throw new Error('Serial number is required for takeDynamicBatteryReading');
        }
        return this.takeDynamicBatteryReading(params.serial as number) as unknown as T;

      case 'getDynamicVibrationRecords':
        return this.getDynamicVibrationRecords(
          (params?.serials as number[]) || undefined,
          params?.start as string | undefined,
          params?.end as string | undefined,
          params?.max as number | undefined
        ) as unknown as T;

      default:
        throw new Error(`Unknown command: ${command}`);
    }
  }

  /**
   * Register an event listener for CTC message types
   * @param event Message type
   * @param callback Callback function
   * @returns Unsubscribe function
   */
  public on<T extends CTCMessage>(event: string, callback: (message: T) => void): () => void {
    // For CTC Gateway, we need to handle different message types
    if (event === 'error') {
      // Map standard error events to CTC error events
      return this.handleEventMapping(CTCCommandType.RETURN_ERROR, callback);
    }

    // For other event types, map directly to CTC types
    return this.handleEventMapping(event, callback);
  }

  /**
   * Internal implementation for CTC-specific message handling
   */
  private handleEventMapping<T extends CTCMessage>(
    event: string,
    callback: (message: T) => void
  ): () => void {
    const handlers = this.messageHandlers.get(event) || new Set();
    // Use a type-safe callback wrapper that ensures T extends CTCMessage
    const typedCallback = ((message: CTCMessage) => {
      if (message.Type === event) {
        callback(message as T);
      }
    }) as CTCMessageHandler<CTCMessage>;

    handlers.add(typedCallback);
    this.messageHandlers.set(event, handlers);

    // Return unsubscribe function
    return () => {
      // We need to use the internal handler to properly unregister
      this.removeEventHandler(event, typedCallback);
    };
  }

  /**
   * Remove an event listener
   * @param event Message type
   * @param callback Callback function
   */
  public off<T extends CTCMessage>(event: string, callback: (message: T) => void): void {
    // We need to create a wrapper just like in handleEventMapping
    // This is because removeEventHandler now only accepts CTCMessageHandler<CTCMessage>
    const typedCallback = ((message: CTCMessage) => {
      if (message.Type === event) {
        callback(message as T);
      }
    }) as CTCMessageHandler<CTCMessage>;

    // Call the internal handler with the correct callback type
    this.removeEventHandler(event, typedCallback);
  }

  /**
   * Internal implementation to remove an event listener
   * @param event Message type
   * @param callback Callback function
   */
  private removeEventHandler(event: string, callback: CTCMessageHandler<CTCMessage>): void {
    const handlers = this.messageHandlers.get(event);
    if (handlers) {
      handlers.delete(callback);
      if (handlers.size === 0) {
        this.messageHandlers.delete(event);
      }
    }
  }

  /**
   * Register a data listener for a specific topic
   * Maps CTC events to topic-based events for compatibility
   * @param topic Topic to listen for
   * @param callback Callback function
   * @returns Unsubscribe function
   */
  public onData(topic: string, callback: (data: unknown) => void): () => void {
    // For CTC, we map topics to message types
    // Example mapping:
    // "sensors" -> CTCCommandType.RETURN_DYNAMIC_SENSORS
    // "readings" -> CTCCommandType.NOTIFY_DYNAMIC_READING
    // "temperature" -> CTCCommandType.NOTIFY_DYNAMIC_TEMPERATURE
    // "battery" -> CTCCommandType.NOTIFY_DYNAMIC_BATTERY

    const handlers = this.topicHandlers.get(topic) || new Set();
    handlers.add(callback);
    this.topicHandlers.set(topic, handlers);

    // Return unsubscribe function
    return () => {
      const handlers = this.topicHandlers.get(topic);
      if (handlers) {
        handlers.delete(callback);
        if (handlers.size === 0) {
          this.topicHandlers.delete(topic);
        }
      }
    };
  }

  /**
   * Get dynamic sensors
   * @param serials Array of sensor serial numbers (empty for all)
   * @returns Promise resolving to sensor data
   */
  private async getDynamicSensors(serials: number[] = []): Promise<CTCDynamicSensor[]> {
    const message: CTCGetDynamicSensorsMessage = {
      Type: CTCCommandType.GET_DYNAMIC_SENSORS,
      From: CTCComponent.UI,
      To: CTCComponent.SERVICE,
      Data: {
        Serials: serials,
      },
    };

    return new Promise<CTCDynamicSensor[]>((resolve, reject) => {
      // Set up one-time response listener
      const responseHandler = (response: CTCReturnDynamicSensorsMessage) => {
        this.off(CTCCommandType.RETURN_DYNAMIC_SENSORS, responseHandler);
        resolve(response.Data.Sensors);
      };

      // Set up one-time error listener
      const errorHandler = (error: CTCReturnErrorMessage) => {
        this.off(CTCCommandType.RETURN_ERROR, errorHandler);
        reject(new Error(`Error getting sensors: ${error.Data.Message}`));
      };

      // Add handlers
      this.on<CTCReturnDynamicSensorsMessage>(
        CTCCommandType.RETURN_DYNAMIC_SENSORS,
        responseHandler
      );
      this.on<CTCReturnErrorMessage>(CTCCommandType.RETURN_ERROR, errorHandler);

      // Set timeout
      const timeout = setTimeout(() => {
        this.off(CTCCommandType.RETURN_DYNAMIC_SENSORS, responseHandler);
        this.off(CTCCommandType.RETURN_ERROR, errorHandler);
        reject(new Error('Timeout getting sensors'));
      }, this.commandTimeout);

      // Send message
      this.send(message).catch(error => {
        clearTimeout(timeout);
        this.off(CTCCommandType.RETURN_DYNAMIC_SENSORS, responseHandler);
        this.off(CTCCommandType.RETURN_ERROR, errorHandler);
        reject(error);
      });
    });
  }

  /**
   * Get connected dynamic sensors
   * @returns Promise resolving to connected sensor data
   */
  private async getConnectedDynamicSensors(): Promise<CTCDynamicSensor[]> {
    const message: CTCGetConnectedDynamicSensorsMessage = {
      Type: CTCCommandType.GET_CONNECTED_DYNAMIC_SENSORS,
      From: CTCComponent.UI,
      To: CTCComponent.SERVICE,
      Data: {},
    };

    return new Promise<CTCDynamicSensor[]>((resolve, reject) => {
      // Set up one-time response listener
      const responseHandler = (response: CTCReturnDynamicSensorsMessage) => {
        this.off(CTCCommandType.RETURN_DYNAMIC_SENSORS, responseHandler);
        resolve(response.Data.Sensors);
      };

      // Set up one-time error listener
      const errorHandler = (error: CTCReturnErrorMessage) => {
        this.off(CTCCommandType.RETURN_ERROR, errorHandler);
        reject(new Error(`Error getting connected sensors: ${error.Data.Message}`));
      };

      // Add handlers
      this.on<CTCReturnDynamicSensorsMessage>(
        CTCCommandType.RETURN_DYNAMIC_SENSORS,
        responseHandler
      );
      this.on<CTCReturnErrorMessage>(CTCCommandType.RETURN_ERROR, errorHandler);

      // Set timeout
      const timeout = setTimeout(() => {
        this.off(CTCCommandType.RETURN_DYNAMIC_SENSORS, responseHandler);
        this.off(CTCCommandType.RETURN_ERROR, errorHandler);
        reject(new Error('Timeout getting connected sensors'));
      }, this.commandTimeout);

      // Send message
      this.send(message).catch(error => {
        clearTimeout(timeout);
        this.off(CTCCommandType.RETURN_DYNAMIC_SENSORS, responseHandler);
        this.off(CTCCommandType.RETURN_ERROR, errorHandler);
        reject(error);
      });
    });
  }

  /**
   * Take dynamic reading
   * @param serial Sensor serial number
   * @returns Promise resolving when reading is triggered
   */
  private async takeDynamicReading(serial: number): Promise<void> {
    const message: CTCTakeDynamicReadingMessage = {
      Type: CTCCommandType.TAKE_DYNAMIC_READING,
      From: CTCComponent.UI,
      To: CTCComponent.SERVICE,
      Data: {
        Serial: serial,
      },
    };

    return new Promise<void>((resolve, reject) => {
      // Set up one-time error listener
      const errorHandler = (error: CTCReturnErrorMessage) => {
        this.off(CTCCommandType.RETURN_ERROR, errorHandler);
        reject(new Error(`Error taking reading: ${error.Data.Message}`));
      };

      // Add error handler
      this.on<CTCReturnErrorMessage>(CTCCommandType.RETURN_ERROR, errorHandler);

      // Set timeout
      const timeout = setTimeout(() => {
        this.off(CTCCommandType.RETURN_ERROR, errorHandler);
        // Timeout is not necessarily an error, since we don't get a direct response
        // on success, only notification messages
        resolve();
      }, this.commandTimeout);

      // Send message
      this.send(message)
        .then(() => {
          clearTimeout(timeout);
          this.off(CTCCommandType.RETURN_ERROR, errorHandler);
          resolve();
        })
        .catch(error => {
          clearTimeout(timeout);
          this.off(CTCCommandType.RETURN_ERROR, errorHandler);
          reject(error);
        });
    });
  }

  /**
   * Take dynamic temperature reading
   * @param serial Sensor serial number
   * @returns Promise resolving when temperature reading is triggered
   */
  private async takeDynamicTemperatureReading(serial: number): Promise<void> {
    const message: CTCTakeDynamicTempReadingMessage = {
      Type: CTCCommandType.TAKE_DYNAMIC_TEMP_READING,
      From: CTCComponent.UI,
      To: CTCComponent.SERVICE,
      Data: {
        Serial: serial,
      },
    };

    return new Promise<void>((resolve, reject) => {
      // Set up one-time error listener
      const errorHandler = (error: CTCReturnErrorMessage) => {
        this.off(CTCCommandType.RETURN_ERROR, errorHandler);
        reject(new Error(`Error taking temperature reading: ${error.Data.Message}`));
      };

      // Add error handler
      this.on<CTCReturnErrorMessage>(CTCCommandType.RETURN_ERROR, errorHandler);

      // Set timeout
      const timeout = setTimeout(() => {
        this.off(CTCCommandType.RETURN_ERROR, errorHandler);
        // Timeout is not necessarily an error, since we don't get a direct response
        // on success, only notification messages
        resolve();
      }, this.commandTimeout);

      // Send message
      this.send(message)
        .then(() => {
          clearTimeout(timeout);
          this.off(CTCCommandType.RETURN_ERROR, errorHandler);
          resolve();
        })
        .catch(error => {
          clearTimeout(timeout);
          this.off(CTCCommandType.RETURN_ERROR, errorHandler);
          reject(error);
        });
    });
  }

  /**
   * Take dynamic battery reading
   * @param serial Sensor serial number
   * @returns Promise resolving when battery reading is triggered
   */
  private async takeDynamicBatteryReading(serial: number): Promise<void> {
    const message: CTCTakeDynamicBatteryReadingMessage = {
      Type: CTCCommandType.TAKE_DYNAMIC_BATTERY_READING,
      From: CTCComponent.UI,
      To: CTCComponent.SERVICE,
      Data: {
        Serial: serial,
      },
    };

    return new Promise<void>((resolve, reject) => {
      // Set up one-time error listener
      const errorHandler = (error: CTCReturnErrorMessage) => {
        this.off(CTCCommandType.RETURN_ERROR, errorHandler);
        reject(new Error(`Error taking battery reading: ${error.Data.Message}`));
      };

      // Add error handler
      this.on<CTCReturnErrorMessage>(CTCCommandType.RETURN_ERROR, errorHandler);

      // Set timeout
      const timeout = setTimeout(() => {
        this.off(CTCCommandType.RETURN_ERROR, errorHandler);
        // Timeout is not necessarily an error, since we don't get a direct response
        // on success, only notification messages
        resolve();
      }, this.commandTimeout);

      // Send message
      this.send(message)
        .then(() => {
          clearTimeout(timeout);
          this.off(CTCCommandType.RETURN_ERROR, errorHandler);
          resolve();
        })
        .catch(error => {
          clearTimeout(timeout);
          this.off(CTCCommandType.RETURN_ERROR, errorHandler);
          reject(error);
        });
    });
  }

  /**
   * Get dynamic vibration records
   * @param serials Array of sensor serial numbers (undefined for all)
   * @param start Start date string (ISO format)
   * @param end End date string (ISO format)
   * @param max Maximum number of records to return
   * @returns Promise resolving to vibration records
   */
  private async getDynamicVibrationRecords(
    serials?: number[],
    start?: string,
    end?: string,
    max?: number
  ): Promise<CTCDynamicReading[]> {
    const message: CTCGetDynamicVibrationRecordsMessage = {
      Type: CTCCommandType.GET_DYNAMIC_VIBRATION_RECORDS,
      From: CTCComponent.UI,
      To: CTCComponent.SERVICE,
      Data: {
        ...(serials !== undefined && { Serials: serials }),
        ...(start !== undefined && { Start: start }),
        ...(end !== undefined && { End: end }),
        ...(max !== undefined && { Max: max }),
      },
    };

    return new Promise<CTCDynamicReading[]>((resolve, reject) => {
      // Set up one-time response listener
      const responseHandler = (response: CTCReturnDynamicReadingsMessage) => {
        this.off(CTCCommandType.RETURN_DYNAMIC_READINGS, responseHandler);
        resolve(response.Data.Readings);
      };

      // Set up one-time error listener
      const errorHandler = (error: CTCReturnErrorMessage) => {
        this.off(CTCCommandType.RETURN_ERROR, errorHandler);
        reject(new Error(`Error getting vibration records: ${error.Data.Message}`));
      };

      // Add handlers
      this.on<CTCReturnDynamicReadingsMessage>(
        CTCCommandType.RETURN_DYNAMIC_READINGS,
        responseHandler
      );
      this.on<CTCReturnErrorMessage>(CTCCommandType.RETURN_ERROR, errorHandler);

      // Set timeout
      const timeout = setTimeout(() => {
        this.off(CTCCommandType.RETURN_DYNAMIC_READINGS, responseHandler);
        this.off(CTCCommandType.RETURN_ERROR, errorHandler);
        reject(new Error('Timeout getting vibration records'));
      }, this.commandTimeout);

      // Send message
      this.send(message).catch(error => {
        clearTimeout(timeout);
        this.off(CTCCommandType.RETURN_DYNAMIC_READINGS, responseHandler);
        this.off(CTCCommandType.RETURN_ERROR, errorHandler);
        reject(error);
      });
    });
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
      const message = JSON.parse(event.data) as CTCMessage;

      // Update stats
      this.stats.messagesReceived++;
      this.stats.lastMessageAt = new Date();

      // Map specific CTC message types to topics
      if (message.Type === CTCCommandType.NOTIFY_DYNAMIC_READING) {
        const readingMessage = message as CTCNotifyDynamicReadingMessage;
        this.notifyTopicHandlers('reading', readingMessage.Data);
      } else if (message.Type === CTCCommandType.NOTIFY_DYNAMIC_TEMPERATURE) {
        const tempMessage = message as CTCNotifyDynamicTemperatureMessage;
        this.notifyTopicHandlers('temperature', tempMessage.Data);
      } else if (message.Type === CTCCommandType.NOTIFY_DYNAMIC_BATTERY) {
        const batteryMessage = message as CTCNotifyDynamicBatteryMessage;
        this.notifyTopicHandlers('battery', batteryMessage.Data);
      } else if (message.Type === CTCCommandType.RETURN_DYNAMIC_SENSORS) {
        const sensorsMessage = message as CTCReturnDynamicSensorsMessage;
        this.notifyTopicHandlers('sensors', sensorsMessage.Data.Sensors);
      } else if (message.Type === CTCCommandType.RETURN_DYNAMIC_READINGS) {
        const readingsMessage = message as CTCReturnDynamicReadingsMessage;
        this.notifyTopicHandlers('readings', readingsMessage.Data.Readings);
      } else if (message.Type === CTCCommandType.NOTIFY_ACCESS_POINT_CONNECTED) {
        const apMessage = message as CTCNotifyAccessPointConnectedMessage;
        this.notifyTopicHandlers('accessPoint', apMessage.Data);
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
   * Update connection state
   * @private
   */
  private updateState(state: GatewayConnectionState): void {
    if (this.state !== state) {
      const previousState = this.state;
      this.state = state;

      // Dispatch state change event to subscribers
      const stateChangeMessage: CTCStateChangeMessage = {
        Type: 'state_change',
        From: CTCComponent.SERVICE,
        To: CTCComponent.UI,
        Data: {
          previousState,
          state,
        },
      };

      this.dispatchMessage(stateChangeMessage);
    }
  }

  /**
   * Dispatch message to all registered handlers
   * @private
   */
  private dispatchMessage(message: CTCMessage): void {
    const handlers = this.messageHandlers.get(message.Type);

    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(message);
        } catch (error) {
          console.error(`Error in message handler for ${message.Type}:`, error);
        }
      });
    }
  }

  /**
   * Notify topic handlers about new data
   * @private
   */
  private notifyTopicHandlers(topic: string, data: unknown): void {
    const handlers = this.topicHandlers.get(topic);

    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(topic, data);
        } catch (error) {
          console.error(`Error in topic handler for ${topic}:`, error);
        }
      });
    }
  }

  /**
   * Set up default message handlers
   * @private
   */
  private setupDefaultHandlers(): void {
    // Handle error messages
    this.on(CTCCommandType.RETURN_ERROR, (message: CTCReturnErrorMessage) => {
      console.error(`Gateway ${this.id} error:`, message.Data.Error, message.Data.Message);
    });
  }
}
