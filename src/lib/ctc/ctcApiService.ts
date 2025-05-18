import { EventEmitter } from 'events';
import { z } from 'zod';

/**
 * Zod schemas for CTC API interaction
 */

// Command schema used for runtime validation and type inference
export const CTCApiCommandSchema = z.object({
  Type: z.string(),
  From: z.string(),
  To: z.string(),
  Data: z.record(z.string(), z.unknown()),
});
type CTCApiCommand = z.infer<typeof CTCApiCommandSchema>;

// Response schema
export const CTCApiResponseSchema = z.object({
  Type: z.string(),
  From: z.string(),
  Target: z.string(),
  Data: z.union([
    z.record(z.string(), z.unknown()), // Object format
    z.array(z.unknown()), // Array format
    z.unknown(), // Any other format
  ]),
});
type CTCApiResponse = z.infer<typeof CTCApiResponseSchema>;

// Vibration reading schema for validation
export const VibrationReadingSchema = z.object({
  ID: z.number(),
  Serial: z.string(),
  Time: z.string(),
  X: z.string(),
  Y: z.string(),
  Z: z.string(),
});

// Temperature reading schema for validation
export const TemperatureReadingSchema = z.object({
  ID: z.number(),
  Serial: z.string(),
  Time: z.string(),
  Temp: z.number(),
});

// Battery reading schema for validation
export const BatteryReadingSchema = z.object({
  ID: z.number(),
  Serial: z.string(),
  Time: z.string(),
  Batt: z.number(),
});

// Sensor data schema for validation
export const SensorDataSchema = z.object({
  Serial: z.number(),
  Connected: z.number(),
  AccessPoint: z.number(),
  PartNum: z.string(),
  ReadRate: z.number(),
  GMode: z.string(),
  FreqMode: z.string(),
  ReadPeriod: z.number(),
  Samples: z.number(),
  HwVer: z.string(),
  FmVer: z.string(),
});

// Vibration records schema for validation
export const VibrationRecordsSchema = z.record(z.string(), VibrationReadingSchema);
type VibrationRecords = z.infer<typeof VibrationRecordsSchema>;

// Temperature records schema for validation
export const TemperatureRecordsSchema = z.record(z.string(), TemperatureReadingSchema);
type TemperatureRecords = z.infer<typeof TemperatureRecordsSchema>;

// Battery records schema for validation
export const BatteryRecordsSchema = z.record(z.string(), BatteryReadingSchema);
type BatteryRecords = z.infer<typeof BatteryRecordsSchema>;

// Sensor records schema for validation
export const SensorRecordsSchema = z.record(z.string(), SensorDataSchema);
type SensorRecords = z.infer<typeof SensorRecordsSchema>;

// Error data schema for validation
export const ErrorDataSchema = z.object({
  Attempt: z.string(),
  Error: z.string(),
});

// Login response schema for validation
export const LoginResponseSchema = z.object({
  Email: z.string().email(),
  First: z.string(),
  Last: z.string(),
  Success: z.boolean(),
  AccessLevel: z.number(),
  Verified: z.boolean(),
});
export type LoginResponse = z.infer<typeof LoginResponseSchema>;

// Record options interface
interface RecordOptions {
  serials?: number[];
  start?: string;
  end?: string;
  max?: number;
}

type EventHandler<T = unknown> = (data: T) => void;

/**
 * CTCApiService - Service for interacting with CTC Connect Wireless API via WebSockets
 *
 * This service handles:
 * - WebSocket connection to the CTC API
 * - Sending commands to the API
 * - Processing return commands
 * - Subscribing to notifications
 */
export class CTCApiService {
  private socket: WebSocket | null = null;
  private isConnected = false;
  private events = new EventEmitter();
  private pendingRequests = new Map<string, (data: Record<string, unknown>) => void>();
  private requestId = 1;

  /**
   * Check if the service is currently connected to the CTC API WebSocket
   * @returns True if connected, false otherwise
   */
  public isConnectedToGateway(): boolean {
    const connected = this.isConnected && this.socket !== null;
    console.log('WebSocket connection state:', {
      isConnected: this.isConnected,
      hasSocket: this.socket !== null,
      socketReadyState: this.socket ? this.socket.readyState : 'no socket',
    });
    return connected;
  }

  /**
   * Connect to the CTC API WebSocket
   * @param url - WebSocket URL for the CTC API
   */
  public async connect(url: string): Promise<boolean> {
    return new Promise(resolve => {
      try {
        this.socket = new WebSocket(url);

        this.socket.onopen = () => {
          this.isConnected = true;
          console.log('Connected to CTC WebSocket');
          this.events.emit('connected');
          resolve(true);
        };

        this.socket.onclose = () => {
          this.isConnected = false;
          console.log('Disconnected from CTC WebSocket');
          this.events.emit('disconnected');
        };

        this.socket.onerror = error => {
          console.error('WebSocket error:', error);
          this.events.emit('error', error);
          resolve(false);
        };

        this.socket.onmessage = event => {
          try {
            const parsedData = JSON.parse(event.data);
            const result = CTCApiResponseSchema.safeParse(parsedData);

            if (result.success) {
              this.handleMessage(result.data);
            } else {
              console.error('Invalid message format:', result.error);
            }
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };
      } catch (error) {
        console.error('Error connecting to WebSocket:', error);
        resolve(false);
      }
    });
  }

  /**
   * Disconnect from the CTC API WebSocket
   */
  public disconnect(): void {
    if (this.socket && this.isConnected) {
      console.log('Disconnecting from WebSocket');
      this.socket.close();
      this.socket = null;
      this.isConnected = false;
    }
  }

  /**
   * Get all dynamic sensors or specific sensors by serial numbers
   * @param serials - Optional array of serial numbers
   * @returns Promise with sensor data
   */
  public async getDynamicSensors(serials: number[] = []): Promise<SensorRecords> {
    const command = {
      Type: 'GET_DYN',
      From: 'UI',
      To: 'SERV',
      Data: {
        Serials: serials,
      },
    };

    return this.sendCommand(command, 'RTN_DYN');
  }

  /**
   * Get all currently connected dynamic sensors
   * @returns Promise with connected sensor data
   */
  public async getConnectedDynamicSensors(): Promise<SensorRecords> {
    try {
      // Use the GET_DYN_CONNECTED command specifically for connected sensors
      const command = {
        Type: 'GET_DYN_CONNECTED',
        From: 'UI',
        To: 'SERV',
        Data: {},
      };

      console.log('Sending GET_DYN_CONNECTED command');
      const result = await this.sendCommand<SensorRecords>(command, 'RTN_DYN');

      console.log('GET_DYN_CONNECTED result:', result);

      // Return only the results we got - no fallback
      // This ensures we only return truly connected sensors
      return result || {};
    } catch (error) {
      console.error('Error in getConnectedDynamicSensors:', error);
      throw error;
    }
  }

  /**
   * Take a vibration reading from a specific sensor
   * @param serial - Serial number of the sensor
   * @returns Promise resolving when the command is sent
   */
  public async takeDynamicVibrationReading(serial: number): Promise<void> {
    const command = {
      Type: 'TAKE_DYN_READING',
      From: 'UI',
      To: 'SERV',
      Data: {
        Serial: serial,
      },
    };

    await this.sendCommand(command);
    // Note: The actual reading will be delivered via notification
  }

  /**
   * Take a temperature reading from a specific sensor
   * @param serial - Serial number of the sensor
   * @returns Promise resolving when the command is sent
   */
  public async takeDynamicTemperatureReading(serial: number): Promise<void> {
    const command = {
      Type: 'TAKE_DYN_TEMP',
      From: 'UI',
      To: 'SERV',
      Data: {
        Serial: serial,
      },
    };

    await this.sendCommand(command);
    // Note: The actual reading will be delivered via notification
  }

  /**
   * Take a battery level reading from a specific sensor
   * @param serial - Serial number of the sensor
   * @returns Promise resolving when the command is sent
   */
  public async takeDynamicBatteryReading(serial: number): Promise<void> {
    const command = {
      Type: 'TAKE_DYN_BATT',
      From: 'UI',
      To: 'SERV',
      Data: {
        Serial: serial,
      },
    };

    await this.sendCommand(command);
    // Note: The actual reading will be delivered via notification
  }

  /**
   * Get vibration records for specified sensors
   * @param options - Options for the query
   * @returns Promise with vibration reading records
   */
  public async getDynamicVibrationRecords(options: RecordOptions = {}): Promise<VibrationRecords> {
    const command = {
      Type: 'GET_DYN_READINGS',
      From: 'UI',
      To: 'SERV',
      Data: {
        Serials: options.serials || [],
        Start: options.start || '',
        End: options.end || '',
        Max: options.max || 25,
      },
    };

    return this.sendCommand(command, 'RTN_DYN_READINGS');
  }

  /**
   * Send a direct command to the CTC API - useful for custom commands
   * @param commandType - The type of command to send
   * @param data - The data to include with the command
   * @returns Promise resolving when the command is sent
   */
  public async sendDirectCommand(
    commandType: string,
    data: Record<string, unknown> = {}
  ): Promise<void> {
    const command = {
      Type: commandType,
      From: 'UI',
      To: 'SERV',
      Data: data,
    };

    return this.sendCommand(command);
  }

  /**
   * Get temperature records for specified sensors
   * @param options - Options for the query
   * @returns Promise with temperature reading records
   */
  public async getDynamicTemperatureRecords(
    options: RecordOptions = {}
  ): Promise<TemperatureRecords> {
    const command = {
      Type: 'GET_DYN_TEMPS',
      From: 'UI',
      To: 'SERV',
      Data: {
        Serials: options.serials || [],
        Start: options.start || '',
        End: options.end || '',
        Max: options.max || 25,
      },
    };

    return this.sendCommand(command, 'RTN_DYN_TEMPS');
  }

  /**
   * Get battery level records for specified sensors
   * @param options - Options for the query
   * @returns Promise with battery level reading records
   */
  public async getDynamicBatteryRecords(options: RecordOptions = {}): Promise<BatteryRecords> {
    const command = {
      Type: 'GET_DYN_BATTS',
      From: 'UI',
      To: 'SERV',
      Data: {
        Serials: options.serials || [],
        Start: options.start || '',
        End: options.end || '',
        Max: options.max || 25,
      },
    };

    return this.sendCommand(command, 'RTN_DYN_BATTS');
  }

  /**
   * Subscribe to changes
   * This will enable receiving notification commands
   * Note: Not all gateways support this command
   * @returns A promise that resolves to true if subscription succeeded, false otherwise
   */
  /**
   * Subscribe to changes
   * This will enable receiving notification commands
   * Note: Not all gateways support this command
   * @returns A promise that resolves to true if subscription succeeded, false otherwise
   */
  public async subscribeToChanges(): Promise<boolean> {
    try {
      // We'll manually create a promise that resolves after a short timeout
      return new Promise(resolve => {
        // Create subscription command
        const command = {
          Type: 'SUBSCRIBE',
          From: 'UI',
          To: 'SERV',
          Data: {},
        };

        // Variable for timeout ID with proper scope
        let successTimeout: NodeJS.Timeout;

        // Add a one-time handler for subscription errors
        const handleSubscriptionError = () => {
          // Clear the success timeout
          clearTimeout(successTimeout);
          resolve(false);
        };

        // Listen for the subscription_error event
        this.events.once('subscription_error', handleSubscriptionError);

        // Send the command
        try {
          // Using try/catch inside the promise to avoid rejecting the outer promise
          this.socket?.send(JSON.stringify(command));

          // Wait a short time to see if we get an error response
          // If no error by this time, we assume subscription was successful
          successTimeout = setTimeout(() => {
            // Remove the error handler since we're resolving as success
            this.events.off('subscription_error', handleSubscriptionError);
            resolve(true);
          }, 500);
        } catch (e) {
          // Remove the error handler since we're resolving immediately
          this.events.off('subscription_error', handleSubscriptionError);
          console.error('Error sending subscription command:', e);
          resolve(false);
        }
      });
    } catch (error) {
      console.log('Subscription attempt failed:', error);
      return false;
    }
  }

  /**
   * Unsubscribe from changes
   * This will stop receiving notification commands
   */
  public async unsubscribeFromChanges(): Promise<void> {
    const command = {
      Type: 'UNSUBSCRIBE',
      From: 'UI',
      To: 'SERV',
      Data: {},
    };

    await this.sendCommand(command);
  }

  /**
   * Login to the CTC API
   * @param email - User email address
   * @param password - User password
   * @returns Promise with login response
   */
  public async login(email: string, password: string): Promise<LoginResponse> {
    const command = {
      Type: 'POST_LOGIN',
      From: 'UI',
      To: 'SERV',
      Data: {
        Email: email,
        Password: password,
      },
    };

    return this.sendCommand(command, 'RTN_LOGIN');
  }

  /**
   * Add event listener for notification events
   * @param event - Event name
   * @param listener - Event handler function
   */
  public on<T>(event: string, listener: EventHandler<T>): void {
    this.events.on(event, listener);
  }

  /**
   * Remove event listener
   * @param event - Event name
   * @param listener - Event handler function
   */
  public off<T>(event: string, listener: EventHandler<T>): void {
    this.events.off(event, listener);
  }

  /**
   * Send a command to the CTC API
   * @param command - Command object to send
   * @param expectedReturnType - Expected return command type
   * @returns Promise resolving with the response data
   */
  private async sendCommand<T = void>(
    command: CTCApiCommand,
    expectedReturnType?: string
  ): Promise<T> {
    if (!this.isConnected || !this.socket) {
      throw new Error('Not connected to CTC WebSocket');
    }

    return new Promise((resolve, reject) => {
      try {
        // Add a request ID to track this specific command
        const requestId = this.requestId++;

        if (expectedReturnType) {
          // Store the resolve function for when we get the response
          this.pendingRequests.set(
            `${expectedReturnType}_${requestId}`,
            (data: Record<string, unknown>) => {
              // Apply appropriate schema validation based on the expected return type
              switch (expectedReturnType) {
                case 'RTN_DYN': {
                  // Try to parse as SensorRecords
                  const result = SensorRecordsSchema.safeParse(data);
                  if (result.success) {
                    resolve(result.data as T);
                  } else {
                    console.warn(
                      'SensorRecords validation failed, handling as array:',
                      result.error
                    );

                    // If it's an array, convert to object format
                    if (Array.isArray(data)) {
                      try {
                        const objectData: Record<string, unknown> = {};
                        data.forEach((item: unknown, index: number) => {
                          // If we have a Serial property, use that as the key
                          // Safe type checking for item with Serial property
                          const key =
                            item &&
                            typeof item === 'object' &&
                            'Serial' in item &&
                            (typeof item.Serial === 'number' || typeof item.Serial === 'string')
                              ? String(item.Serial)
                              : index.toString();
                          objectData[key] = item;
                        });

                        // Try to validate the converted data
                        const convertedResult = SensorRecordsSchema.safeParse(objectData);
                        if (convertedResult.success) {
                          resolve(convertedResult.data as T);
                        } else {
                          console.error('Converted data still invalid:', convertedResult.error);
                          // Just pass the data through as-is as a last resort
                          resolve(data as T);
                        }
                      } catch (e) {
                        console.error('Error converting array data:', e);
                        resolve(data as T); // Pass through as a fallback
                      }
                    } else {
                      // As a last resort, just pass the data through
                      console.warn('Passing through unvalidated data for RTN_DYN');
                      resolve(data as T);
                    }
                  }
                  break;
                }
                case 'RTN_DYN_READINGS': {
                  const result = VibrationRecordsSchema.safeParse(data);
                  if (result.success) {
                    resolve(result.data as T);
                  } else {
                    reject(new Error(`Invalid VibrationRecords data: ${result.error.message}`));
                  }
                  break;
                }
                case 'RTN_DYN_TEMPS': {
                  const result = TemperatureRecordsSchema.safeParse(data);
                  if (result.success) {
                    resolve(result.data as T);
                  } else {
                    reject(new Error(`Invalid TemperatureRecords data: ${result.error.message}`));
                  }
                  break;
                }
                case 'RTN_DYN_BATTS': {
                  const result = BatteryRecordsSchema.safeParse(data);
                  if (result.success) {
                    resolve(result.data as T);
                  } else {
                    reject(new Error(`Invalid BatteryRecords data: ${result.error.message}`));
                  }
                  break;
                }
                case 'RTN_LOGIN': {
                  const result = LoginResponseSchema.safeParse(data);
                  if (result.success) {
                    resolve(result.data as T);
                  } else {
                    reject(new Error(`Invalid LoginResponse data: ${result.error.message}`));
                  }
                  break;
                }
                default:
                  // For unknown return types, just pass the data through
                  resolve(data as T);
              }
            }
          );

          // Set a timeout to reject the promise if no response is received
          setTimeout(() => {
            if (this.pendingRequests.has(`${expectedReturnType}_${requestId}`)) {
              this.pendingRequests.delete(`${expectedReturnType}_${requestId}`);
              reject(new Error('Command timed out'));
            }
          }, 10000); // 10 second timeout
        } else {
          // If no return type is expected, resolve immediately after sending
          resolve(undefined as T);
        }

        // Send the command
        // We've already checked that this.socket is not null at the beginning of the method
        this.socket!.send(JSON.stringify(command));
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Handle incoming messages from the WebSocket
   * @param message - Parsed message object
   */
  private handleMessage(message: CTCApiResponse): void {
    const { Type, Data } = message;

    console.log(
      'Received message:',
      Type,
      'Data type:',
      Array.isArray(Data) ? 'array' : typeof Data
    );

    // Check if this is a return command matching a pending request
    for (const [key, resolver] of this.pendingRequests.entries()) {
      if (key.startsWith(`${Type}_`)) {
        // If Data is an array but we expected an object, try to convert it
        if (Array.isArray(Data)) {
          console.log('Converting array data to object for:', Type);
          const objectData: Record<string, unknown> = {};
          Data.forEach((item, index) => {
            objectData[index.toString()] = item;
          });
          resolver(objectData);
        } else {
          resolver(Data as Record<string, unknown>);
        }
        this.pendingRequests.delete(key);
        return;
      }
    }

    // Handle error responses
    if (Type === 'RTN_ERR') {
      const errorResult = ErrorDataSchema.safeParse(Data);
      if (errorResult.success) {
        // Check if the error is for the SUBSCRIBE command
        if (errorResult.data.Attempt === 'SUBSCRIBE') {
          // Log subscription errors but don't emit an event
          console.log('Subscription error:', errorResult.data.Error);

          // Emit a special event that our subscribeToChanges method could listen for
          this.events.emit('subscription_error', errorResult.data);
        } else {
          // Log all other errors normally
          console.error(
            'CTC API Error:',
            errorResult.data.Error,
            'Attempt:',
            errorResult.data.Attempt
          );
          // Only emit the error if we have at least one listener to prevent unhandled errors
          if (this.events.listenerCount('error') > 0) {
            this.events.emit('error', errorResult.data);
          }
        }
      } else {
        console.error('CTC API Error with invalid format:', Data);
        // Only emit the error if we have at least one listener
        if (this.events.listenerCount('error') > 0) {
          this.events.emit('error', { Error: 'Unknown error', Attempt: 'Unknown' });
        }
      }
      return;
    }

    // Handle notifications
    switch (Type) {
      case 'NOT_DYN_CONN': {
        const result = SensorDataSchema.safeParse(Data);
        if (result.success) {
          this.events.emit('sensorConnectionChange', result.data);
        } else {
          console.error('Invalid sensor connection data:', result.error);
        }
        break;
      }
      case 'NOT_DYN_READING_STARTED':
        // This is just a notification, no specific schema needed
        this.events.emit('vibrationReadingStarted', Data);
        break;
      case 'NOT_DYN_READING': {
        const result = VibrationReadingSchema.safeParse(Data);
        if (result.success) {
          this.events.emit('vibrationReading', result.data);
        } else {
          console.error('Invalid vibration reading data:', result.error);
        }
        break;
      }
      case 'NOT_DYN_TEMP': {
        const result = TemperatureReadingSchema.safeParse(Data);
        if (result.success) {
          this.events.emit('temperatureReading', result.data);
        } else {
          console.error('Invalid temperature reading data:', result.error);
        }
        break;
      }
      case 'NOT_DYN_BATT': {
        const result = BatteryReadingSchema.safeParse(Data);
        if (result.success) {
          this.events.emit('batteryReading', result.data);
        } else {
          console.error('Invalid battery reading data:', result.error);
        }
        break;
      }
      default:
        // Unknown notification type
        this.events.emit('unknownMessage', message);
    }
  }
}

// Export singleton instance
export const ctcApiService = new CTCApiService();
