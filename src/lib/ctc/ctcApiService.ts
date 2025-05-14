import { EventEmitter } from 'events';

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
  private pendingRequests = new Map<string, (data: any) => void>();
  private requestId = 1;
  
  /**
   * Connect to the CTC API WebSocket
   * @param url - WebSocket URL for the CTC API
   */
  public async connect(url: string): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        this.socket = new WebSocket(url);
        
        this.socket.onopen = () => {
          this.isConnected = true;
          console.log('Connected to CTC WebSocket');
          resolve(true);
        };
        
        this.socket.onclose = () => {
          this.isConnected = false;
          console.log('Disconnected from CTC WebSocket');
          this.events.emit('disconnected');
        };
        
        this.socket.onerror = (error) => {
          console.error('WebSocket error:', error);
          this.events.emit('error', error);
          resolve(false);
        };
        
        this.socket.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            this.handleMessage(message);
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
  public async getDynamicSensors(serials: number[] = []): Promise<any> {
    const command = {
      Type: 'GET_DYN',
      From: 'UI',
      To: 'SERV',
      Data: {
        Serials: serials
      }
    };
    
    return this.sendCommand(command, 'RTN_DYN');
  }
  
  /**
   * Get all currently connected dynamic sensors
   * @returns Promise with connected sensor data
   */
  public async getConnectedDynamicSensors(): Promise<any> {
    const command = {
      Type: 'GET_DYN_CONNECTED',
      From: 'UI',
      To: 'SERV',
      Data: {}
    };
    
    return this.sendCommand(command, 'RTN_DYN');
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
        Serial: serial
      }
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
        Serial: serial
      }
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
        Serial: serial
      }
    };
    
    await this.sendCommand(command);
    // Note: The actual reading will be delivered via notification
  }
  
  /**
   * Get vibration records for specified sensors
   * @param options - Options for the query
   * @returns Promise with vibration reading records
   */
  public async getDynamicVibrationRecords(options: {
    serials?: number[];
    start?: string;
    end?: string;
    max?: number;
  } = {}): Promise<any> {
    const command = {
      Type: 'GET_DYN_READINGS',
      From: 'UI',
      To: 'SERV',
      Data: {
        Serials: options.serials || [],
        Start: options.start || '',
        End: options.end || '',
        Max: options.max || 25
      }
    };
    
    return this.sendCommand(command, 'RTN_DYN_READINGS');
  }
  
  /**
   * Get temperature records for specified sensors
   * @param options - Options for the query
   * @returns Promise with temperature reading records
   */
  public async getDynamicTemperatureRecords(options: {
    serials?: number[];
    start?: string;
    end?: string;
    max?: number;
  } = {}): Promise<any> {
    const command = {
      Type: 'GET_DYN_TEMPS',
      From: 'UI',
      To: 'SERV',
      Data: {
        Serials: options.serials || [],
        Start: options.start || '',
        End: options.end || '',
        Max: options.max || 25
      }
    };
    
    return this.sendCommand(command, 'RTN_DYN_TEMPS');
  }
  
  /**
   * Get battery level records for specified sensors
   * @param options - Options for the query
   * @returns Promise with battery level reading records
   */
  public async getDynamicBatteryRecords(options: {
    serials?: number[];
    start?: string;
    end?: string;
    max?: number;
  } = {}): Promise<any> {
    const command = {
      Type: 'GET_DYN_BATTS',
      From: 'UI',
      To: 'SERV',
      Data: {
        Serials: options.serials || [],
        Start: options.start || '',
        End: options.end || '',
        Max: options.max || 25
      }
    };
    
    return this.sendCommand(command, 'RTN_DYN_BATTS');
  }
  
  /**
   * Subscribe to changes
   * This will enable receiving notification commands
   */
  public async subscribeToChanges(): Promise<void> {
    const command = {
      Type: 'SUBSCRIBE',
      From: 'UI',
      To: 'SERV',
      Data: {}
    };
    
    await this.sendCommand(command);
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
      Data: {}
    };
    
    await this.sendCommand(command);
  }
  
  /**
   * Add event listener for notification events
   * @param event - Event name
   * @param listener - Event handler function
   */
  public on(event: string, listener: (...args: any[]) => void): void {
    this.events.on(event, listener);
  }
  
  /**
   * Remove event listener
   * @param event - Event name
   * @param listener - Event handler function
   */
  public off(event: string, listener: (...args: any[]) => void): void {
    this.events.off(event, listener);
  }
  
  /**
   * Send a command to the CTC API
   * @param command - Command object to send
   * @param expectedReturnType - Expected return command type
   * @returns Promise resolving with the response data
   */
  private async sendCommand(command: any, expectedReturnType?: string): Promise<any> {
    if (!this.isConnected || !this.socket) {
      throw new Error('Not connected to CTC WebSocket');
    }
    
    return new Promise((resolve, reject) => {
      try {
        // Add a request ID to track this specific command
        const requestId = this.requestId++;
        
        if (expectedReturnType) {
          // Store the resolve function for when we get the response
          this.pendingRequests.set(`${expectedReturnType}_${requestId}`, resolve);
          
          // Set a timeout to reject the promise if no response is received
          setTimeout(() => {
            if (this.pendingRequests.has(`${expectedReturnType}_${requestId}`)) {
              this.pendingRequests.delete(`${expectedReturnType}_${requestId}`);
              reject(new Error('Command timed out'));
            }
          }, 10000); // 10 second timeout
        } else {
          // If no return type is expected, resolve immediately after sending
          resolve(undefined);
        }
        
        // Send the command
        this.socket.send(JSON.stringify(command));
      } catch (error) {
        reject(error);
      }
    });
  }
  
  /**
   * Handle incoming messages from the WebSocket
   * @param message - Parsed message object
   */
  private handleMessage(message: any): void {
    const { Type, Data } = message;
    
    // Check if this is a return command matching a pending request
    for (const [key, resolver] of this.pendingRequests.entries()) {
      if (key.startsWith(`${Type}_`)) {
        resolver(Data);
        this.pendingRequests.delete(key);
        return;
      }
    }
    
    // Handle error responses
    if (Type === 'RTN_ERR') {
      console.error('CTC API Error:', Data.Error, 'Attempt:', Data.Attempt);
      this.events.emit('error', Data);
      return;
    }
    
    // Handle notifications
    switch (Type) {
      case 'NOT_DYN_CONN':
        this.events.emit('sensorConnectionChange', Data);
        break;
      case 'NOT_DYN_READING_STARTED':
        this.events.emit('vibrationReadingStarted', Data);
        break;
      case 'NOT_DYN_READING':
        this.events.emit('vibrationReading', Data);
        break;
      case 'NOT_DYN_TEMP':
        this.events.emit('temperatureReading', Data);
        break;
      case 'NOT_DYN_BATT':
        this.events.emit('batteryReading', Data);
        break;
      default:
        // Unknown notification type
        this.events.emit('unknownMessage', message);
    }
  }
}

// Export singleton instance
export const ctcApiService = new CTCApiService();