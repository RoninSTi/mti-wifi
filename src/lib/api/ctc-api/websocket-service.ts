import { createApiSpan } from '@/telemetry/utils';
import {
  SendCommand,
  ReturnCommand,
  NotifyCommand,
  Message,
  messageSchema,
  sendCommandSchema,
  PostLoginCommand,
  ReturnLoginCommand,
  SensorData,
  ReadingData,
  TemperatureData,
  BatteryData,
} from './schemas';

// Event names for the WebSocket service
export enum WebSocketEvents {
  OPEN = 'open',
  CLOSE = 'close',
  ERROR = 'error',
  MESSAGE = 'message',
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  AUTHENTICATED = 'authenticated',
  SENSOR_CONNECTED = 'sensor_connected',
  SENSOR_DISCONNECTED = 'sensor_disconnected',
  READING_STARTED = 'reading_started',
  READING_COMPLETED = 'reading_completed',
  TEMPERATURE_READING = 'temperature_reading',
  BATTERY_READING = 'battery_reading',
}

// Event listener type
type EventListener = (data: unknown) => void;

// WebSocket connection states
export enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  AUTHENTICATING = 'authenticating',
  AUTHENTICATED = 'authenticated',
  RECONNECTING = 'reconnecting',
  FAILED = 'failed',
}

/**
 * Manages WebSocket connection to a CTC gateway
 *
 * Handles:
 * - Connection establishment and maintenance
 * - Authentication
 * - Command sending
 * - Response and notification processing
 * - Reconnection on failure
 */
export class CTCWebSocketService {
  private ws: WebSocket | null = null;
  private url: string;
  private username: string;
  private password: string;
  private state: ConnectionState = ConnectionState.DISCONNECTED;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 1000; // Start with 1 second
  private eventListeners: Map<string, Set<EventListener>> = new Map();
  private commandCallbacks: Map<string, (response: unknown) => void> = new Map();
  private reconnectTimer: NodeJS.Timeout | null = null;
  private pingInterval: NodeJS.Timeout | null = null;
  private messageQueue: SendCommand[] = [];

  /**
   * Create a new WebSocket service for a CTC gateway
   */
  constructor(url: string, username: string, password: string) {
    this.url = url;
    this.username = username;
    this.password = password;
  }

  /**
   * Get the current connection state
   */
  public getState(): ConnectionState {
    return this.state;
  }

  /**
   * Connect to the gateway and authenticate
   */
  public async connect(): Promise<boolean> {
    return await createApiSpan('ctc.websocket.connect', async () => {
      if (this.ws !== null) {
        if (
          this.state === ConnectionState.CONNECTED ||
          this.state === ConnectionState.AUTHENTICATED ||
          this.state === ConnectionState.AUTHENTICATING
        ) {
          return true; // Already connected or in the process
        }
        this.close(); // Close existing connection to start fresh
      }

      this.setState(ConnectionState.CONNECTING);

      try {
        return await new Promise<boolean>((resolve, reject) => {
          // Set timeout to fail if connection takes too long
          const connectionTimeout = setTimeout(() => {
            reject(new Error('Connection timeout'));
          }, 10000);

          this.ws = new WebSocket(this.url);

          this.ws.onopen = () => {
            clearTimeout(connectionTimeout);
            this.setState(ConnectionState.CONNECTED);
            this.resetReconnectAttempts();
            this.startPingInterval();
            this.emitEvent(WebSocketEvents.OPEN);
            this.emitEvent(WebSocketEvents.CONNECTED);

            // Process any queued messages
            this.processMessageQueue();

            // Authenticate after connection
            this.authenticate()
              .then(success => resolve(success))
              .catch(error => reject(error));
          };

          this.ws.onclose = event => {
            clearTimeout(connectionTimeout);
            this.handleDisconnection(event);
          };

          this.ws.onerror = error => {
            clearTimeout(connectionTimeout);
            this.emitEvent(WebSocketEvents.ERROR, error);
            this.setState(ConnectionState.FAILED);
            reject(error);
          };

          this.ws.onmessage = event => this.handleMessage(event);
        });
      } catch (error) {
        this.setState(ConnectionState.FAILED);
        this.scheduleReconnect();
        throw error;
      }
    });
  }

  /**
   * Authenticate with the gateway
   */
  private async authenticate(): Promise<boolean> {
    if (this.state !== ConnectionState.CONNECTED) {
      throw new Error('Cannot authenticate: not connected');
    }

    this.setState(ConnectionState.AUTHENTICATING);

    try {
      const loginCommand: PostLoginCommand = {
        Type: 'POST_LOGIN',
        From: 'UI',
        To: 'SERV',
        Data: {
          Email: this.username,
          Password: this.password,
        },
      };

      const response = await this.sendCommand<ReturnLoginCommand>(loginCommand);

      if (response.Data.Success) {
        this.setState(ConnectionState.AUTHENTICATED);
        this.emitEvent(WebSocketEvents.AUTHENTICATED, response.Data);

        // Subscribe to real-time notifications
        this.subscribeToChanges();

        return true;
      } else {
        this.setState(ConnectionState.FAILED);
        throw new Error('Authentication failed');
      }
    } catch (error) {
      this.setState(ConnectionState.FAILED);
      throw error;
    }
  }

  /**
   * Subscribe to real-time notifications
   */
  private async subscribeToChanges(): Promise<void> {
    await this.sendCommand({
      Type: 'POST_SUB_CHANGES',
      From: 'UI',
      To: 'SERV',
      Data: {},
    });
  }

  /**
   * Send a command to the gateway and wait for a response
   */
  public async sendCommand<T extends ReturnCommand>(command: SendCommand): Promise<T> {
    return await createApiSpan('ctc.websocket.sendCommand', async () => {
      // Validate command
      const validatedCommand = sendCommandSchema.parse(command);

      if (
        this.state !== ConnectionState.CONNECTED &&
        this.state !== ConnectionState.AUTHENTICATED
      ) {
        if (this.state === ConnectionState.DISCONNECTED || this.state === ConnectionState.FAILED) {
          // Queue the message and try to reconnect
          this.messageQueue.push(validatedCommand);
          await this.connect();
          return Promise.reject(new Error('Connection in progress, command queued'));
        } else {
          // Queue the message for later processing
          this.messageQueue.push(validatedCommand);
          return Promise.reject(new Error('Not connected, command queued'));
        }
      }

      return new Promise<T>((resolve, reject) => {
        // Generate a unique ID for this command to match with response
        const commandId = `${command.Type}_${Date.now()}`;

        // Set timeout to fail if response takes too long
        const responseTimeout = setTimeout(() => {
          this.commandCallbacks.delete(commandId);
          reject(new Error('Command response timeout'));
        }, 10000);

        // Store callback for response handling
        this.commandCallbacks.set(commandId, response => {
          clearTimeout(responseTimeout);
          resolve(response as T);
        });

        // Send the command
        this.sendMessage(validatedCommand);
      });
    });
  }

  /**
   * Send a raw message to the WebSocket
   */
  private sendMessage(message: SendCommand): void {
    // Update activity timestamp when sending messages
    this.updateActivityTimestamp();

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      // Queue the message for later
      this.messageQueue.push(message);
    }
  }

  /**
   * Process any queued messages
   */
  private processMessageQueue(): void {
    if (this.messageQueue.length === 0) return;

    // Clone and clear the queue
    const queuedMessages = [...this.messageQueue];
    this.messageQueue = [];

    // Process each message
    queuedMessages.forEach(message => {
      this.sendMessage(message);
    });
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(event: MessageEvent): void {
    // Update activity timestamp for any message
    this.updateActivityTimestamp();

    try {
      const data = JSON.parse(event.data);

      // Try to validate the message
      const result = messageSchema.safeParse(data);
      if (!result.success) {
        console.error('Invalid message format:', result.error);
        this.emitEvent(WebSocketEvents.ERROR, {
          message: 'Invalid message format',
          error: result.error,
          data,
        });
        return;
      }

      const message = result.data;

      // Emit the general message event with the parsed message
      this.emitEvent(WebSocketEvents.MESSAGE, message);

      // Handle the message based on its type
      this.handleTypedMessage(message);
    } catch (error) {
      console.error('Error processing message:', error);
      this.emitEvent(WebSocketEvents.ERROR, {
        message: 'Error processing message',
        error,
        data: event.data,
      });
    }
  }

  /**
   * Handle messages based on their type
   */
  private handleTypedMessage(message: Message): void {
    // Handle response messages
    if ('Target' in message && message.Target === 'UI') {
      if (message.Type.startsWith('RTN_')) {
        // This is a response to a command
        this.handleResponseMessage(message as ReturnCommand);
      } else if (message.Type.startsWith('NOT_')) {
        // This is a notification
        this.handleNotificationMessage(message as NotifyCommand);
      }
    }
  }

  /**
   * Handle response messages
   */
  private handleResponseMessage(message: ReturnCommand): void {
    // Find all callbacks that might be waiting for this response type
    // and call them with the message
    const responseName = message.Type.replace('RTN_', 'POST_');
    const matchingCallbacks = Array.from(this.commandCallbacks.entries()).filter(([key]) =>
      key.startsWith(responseName)
    );

    if (matchingCallbacks.length > 0) {
      // Call each matching callback with the response
      matchingCallbacks.forEach(([key, callback]) => {
        callback(message);
        this.commandCallbacks.delete(key);
      });
    } else {
      // No matching callbacks found, might be an unsolicited response
      console.warn('Unhandled response:', message);
    }
  }

  /**
   * Handle notification messages
   */
  private handleNotificationMessage(message: NotifyCommand): void {
    // Handle different notification types
    switch (message.Type) {
      case 'NOT_AP_CONN':
        // Access point connection status change
        const apConnected = message.Data.Connected === 1;
        console.log(
          'Access point connection status change:',
          apConnected ? 'connected' : 'disconnected'
        );

        // When connected, update state and emit event
        if (apConnected) {
          this.emitEvent(WebSocketEvents.CONNECTED, message.Data);
        } else {
          // For disconnection, only log but don't emit events that would trigger UI changes
          // This helps prevent flickering during temporary disconnections
          console.log('Access point disconnected - suppressing UI update to prevent flickering');
        }
        break;

      case 'NOT_DYN_CONN':
        // Sensor connection status change
        const sensorConnected = message.Data.Connected === 1;
        this.emitEvent(
          sensorConnected ? WebSocketEvents.SENSOR_CONNECTED : WebSocketEvents.SENSOR_DISCONNECTED,
          { serial: message.Data.DynSerial, connected: sensorConnected }
        );
        break;

      case 'NOT_DYN_READING_STARTED':
        // Vibration reading started
        this.emitEvent(WebSocketEvents.READING_STARTED, message.Data);
        break;

      case 'NOT_DYN_READING':
        // Vibration reading completed
        this.emitEvent(WebSocketEvents.READING_COMPLETED, message.Data);
        break;

      case 'NOT_DYN_TEMP':
        // Temperature reading
        this.emitEvent(WebSocketEvents.TEMPERATURE_READING, message.Data);
        break;

      case 'NOT_DYN_BATT':
        // Battery reading
        this.emitEvent(WebSocketEvents.BATTERY_READING, message.Data);
        break;

      default:
        console.warn('Unhandled notification:', message);
    }
  }

  /**
   * Update the connection state
   */
  private setState(state: ConnectionState): void {
    this.state = state;
  }

  /**
   * Handle connection close
   */
  private handleDisconnection(event: CloseEvent): void {
    this.stopPingInterval();

    // Don't emit disconnected event for temporary closures
    // Only change state and emit events if this was an unexpected closure
    if (!event.wasClean) {
      console.log('WebSocket closed unexpectedly, reason:', event.reason, 'code:', event.code);
      this.setState(ConnectionState.DISCONNECTED);
      this.emitEvent(WebSocketEvents.CLOSE, event);
      this.emitEvent(WebSocketEvents.DISCONNECTED);

      // Attempt reconnection only for unexpected closures and specific error codes
      // 1000 (Normal Closure) and 1001 (Going Away) should not trigger reconnects
      if (event.code !== 1000 && event.code !== 1001) {
        this.scheduleReconnect();
      }
    } else {
      console.log('WebSocket closed cleanly');
      // Just update internal state without emitting events for clean closures
      this.setState(ConnectionState.DISCONNECTED);
    }
  }

  /**
   * Schedule a reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      this.setState(ConnectionState.FAILED);
      return;
    }

    this.setState(ConnectionState.RECONNECTING);
    this.reconnectAttempts++;

    // Exponential backoff
    const delay = Math.min(30000, this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1));

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    this.reconnectTimer = setTimeout(() => {
      this.connect().catch(error => {
        console.error('Reconnection failed:', error);
      });
    }, delay);
  }

  /**
   * Reset reconnection attempts counter
   */
  private resetReconnectAttempts(): void {
    this.reconnectAttempts = 0;
  }

  /**
   * Start a ping interval to keep the connection alive
   */
  private startPingInterval(): void {
    this.stopPingInterval();
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        // Check if the connection has been active recently
        const lastActive = Date.now() - (this._lastActivityTimestamp || 0);
        if (lastActive > 20000) {
          // Only ping if inactive for more than 20 seconds
          console.log('Sending ping to keep connection alive');
          // Use a harmless command as a ping
          this.sendMessage({
            Type: 'PING',
            From: 'UI',
            To: 'SERV',
            Data: { timestamp: Date.now() },
          } as SendCommand);
        }
      }
    }, 30000); // Every 30 seconds
  }

  // Track activity timestamp
  private _lastActivityTimestamp: number = 0;

  // Update the activity timestamp on any message
  private updateActivityTimestamp(): void {
    this._lastActivityTimestamp = Date.now();
  }

  /**
   * Stop the ping interval
   */
  private stopPingInterval(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  /**
   * Close the WebSocket connection
   */
  public close(): void {
    this.stopPingInterval();

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
        this.ws.close();
      }
      this.ws = null;
    }

    this.setState(ConnectionState.DISCONNECTED);
  }

  /**
   * Add an event listener
   */
  public addEventListener(event: string, listener: EventListener): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)?.add(listener);
  }

  /**
   * Remove an event listener
   */
  public removeEventListener(event: string, listener: EventListener): void {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event)?.delete(listener);
    }
  }

  /**
   * Emit an event to all listeners
   */
  private emitEvent(event: string, data?: unknown): void {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event)?.forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Get information about all connected sensors
   */
  public async getConnectedSensors(): Promise<SensorData[]> {
    if (this.state !== ConnectionState.AUTHENTICATED) {
      throw new Error('Not authenticated');
    }

    const response = await this.sendCommand({
      Type: 'GET_DYN_CONNECTED',
      From: 'UI',
      To: 'SERV',
      Data: {},
    });

    if ('Dynamizers' in response.Data) {
      return response.Data.Dynamizers;
    }
    throw new Error('Invalid response: Dynamizers not found in response data');
  }

  /**
   * Request a vibration reading from a sensor
   */
  public async takeReading(sensorSerial: number): Promise<ReadingData> {
    if (this.state !== ConnectionState.AUTHENTICATED) {
      throw new Error('Not authenticated');
    }

    return new Promise((resolve, reject) => {
      // Set up a one-time listener for the reading completion event
      const readingListener: EventListener = unknownData => {
        if (
          unknownData &&
          typeof unknownData === 'object' &&
          'serial' in unknownData &&
          unknownData.serial === sensorSerial
        ) {
          const data = unknownData as ReadingData;
          this.removeEventListener(WebSocketEvents.READING_COMPLETED, readingListener);
          resolve(data);
        }
      };

      this.addEventListener(WebSocketEvents.READING_COMPLETED, readingListener);

      // Set a timeout to reject the promise if the reading takes too long
      const timeout = setTimeout(() => {
        this.removeEventListener(WebSocketEvents.READING_COMPLETED, readingListener);
        reject(new Error('Reading timeout'));
      }, 30000); // 30 seconds timeout

      // Send the command to take a reading
      this.sendCommand({
        Type: 'TAKE_DYN_READING',
        From: 'UI',
        To: 'SERV',
        Data: {
          DynSerial: sensorSerial,
        },
      }).catch(error => {
        clearTimeout(timeout);
        this.removeEventListener(WebSocketEvents.READING_COMPLETED, readingListener);
        reject(error);
      });
    });
  }

  /**
   * Request a temperature reading from a sensor
   */
  public async takeTemperatureReading(sensorSerial: number): Promise<TemperatureData> {
    if (this.state !== ConnectionState.AUTHENTICATED) {
      throw new Error('Not authenticated');
    }

    return new Promise((resolve, reject) => {
      // Set up a one-time listener for the temperature reading event
      const temperatureListener: EventListener = unknownData => {
        if (
          unknownData &&
          typeof unknownData === 'object' &&
          'serial' in unknownData &&
          unknownData.serial === sensorSerial
        ) {
          const data = unknownData as TemperatureData;
          this.removeEventListener(WebSocketEvents.TEMPERATURE_READING, temperatureListener);
          resolve(data);
        }
      };

      this.addEventListener(WebSocketEvents.TEMPERATURE_READING, temperatureListener);

      // Set a timeout to reject the promise if the reading takes too long
      const timeout = setTimeout(() => {
        this.removeEventListener(WebSocketEvents.TEMPERATURE_READING, temperatureListener);
        reject(new Error('Temperature reading timeout'));
      }, 30000); // 30 seconds timeout

      // Send the command to take a temperature reading
      this.sendCommand({
        Type: 'TAKE_DYN_TEMP',
        From: 'UI',
        To: 'SERV',
        Data: {
          DynSerial: sensorSerial,
        },
      }).catch(error => {
        clearTimeout(timeout);
        this.removeEventListener(WebSocketEvents.TEMPERATURE_READING, temperatureListener);
        reject(error);
      });
    });
  }

  /**
   * Request a battery level reading from a sensor
   */
  public async takeBatteryReading(sensorSerial: number): Promise<BatteryData> {
    if (this.state !== ConnectionState.AUTHENTICATED) {
      throw new Error('Not authenticated');
    }

    return new Promise((resolve, reject) => {
      // Set up a one-time listener for the battery reading event
      const batteryListener: EventListener = unknownData => {
        if (
          unknownData &&
          typeof unknownData === 'object' &&
          'serial' in unknownData &&
          unknownData.serial === sensorSerial
        ) {
          const data = unknownData as BatteryData;
          this.removeEventListener(WebSocketEvents.BATTERY_READING, batteryListener);
          resolve(data);
        }
      };

      this.addEventListener(WebSocketEvents.BATTERY_READING, batteryListener);

      // Set a timeout to reject the promise if the reading takes too long
      const timeout = setTimeout(() => {
        this.removeEventListener(WebSocketEvents.BATTERY_READING, batteryListener);
        reject(new Error('Battery reading timeout'));
      }, 30000); // 30 seconds timeout

      // Send the command to take a battery reading
      this.sendCommand({
        Type: 'TAKE_DYN_BATT',
        From: 'UI',
        To: 'SERV',
        Data: {
          DynSerial: sensorSerial,
        },
      }).catch(error => {
        clearTimeout(timeout);
        this.removeEventListener(WebSocketEvents.BATTERY_READING, batteryListener);
        reject(error);
      });
    });
  }

  /**
   * Get historical readings for a sensor
   */
  public async getReadings(sensorSerial: number, count: number = 10): Promise<ReadingData[]> {
    if (this.state !== ConnectionState.AUTHENTICATED) {
      throw new Error('Not authenticated');
    }

    const response = await this.sendCommand({
      Type: 'GET_DYN_READINGS',
      From: 'UI',
      To: 'SERV',
      Data: {
        DynSerial: sensorSerial,
        Count: count,
      },
    });

    if ('Readings' in response.Data) {
      return response.Data.Readings;
    }
    throw new Error('Invalid response: Readings not found in response data');
  }

  /**
   * Get historical temperature readings for a sensor
   */
  public async getTemperatureReadings(
    sensorSerial: number,
    count: number = 10
  ): Promise<TemperatureData[]> {
    if (this.state !== ConnectionState.AUTHENTICATED) {
      throw new Error('Not authenticated');
    }

    const response = await this.sendCommand({
      Type: 'GET_DYN_TEMPS',
      From: 'UI',
      To: 'SERV',
      Data: {
        DynSerial: sensorSerial,
        Count: count,
      },
    });

    if ('Temperatures' in response.Data) {
      return response.Data.Temperatures;
    }
    throw new Error('Invalid response: Temperatures not found in response data');
  }

  /**
   * Get historical battery readings for a sensor
   */
  public async getBatteryReadings(
    sensorSerial: number,
    count: number = 10
  ): Promise<BatteryData[]> {
    if (this.state !== ConnectionState.AUTHENTICATED) {
      throw new Error('Not authenticated');
    }

    const response = await this.sendCommand({
      Type: 'GET_DYN_BATTS',
      From: 'UI',
      To: 'SERV',
      Data: {
        DynSerial: sensorSerial,
        Count: count,
      },
    });

    if ('Batteries' in response.Data) {
      return response.Data.Batteries;
    }
    throw new Error('Invalid response: Batteries not found in response data');
  }
}
