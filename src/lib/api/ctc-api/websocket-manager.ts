import { CTCWebSocketService, ConnectionState, WebSocketEvents } from './websocket-service';
import { SensorData, ReadingData, TemperatureData, BatteryData } from './schemas';

/**
 * Manages multiple WebSocket connections to CTC gateways
 *
 * Provides:
 * - Creation and tracking of WebSocket connections per gateway
 * - Connection status tracking
 * - Event aggregation across all gateways
 */
export class CTCWebSocketManager {
  private static instance: CTCWebSocketManager;
  private connections: Map<string, CTCWebSocketService> = new Map();
  private eventListeners: Map<string, Set<(data?: unknown) => void>> = new Map();
  private gatewayStates: Map<string, ConnectionState> = new Map();
  private sensorStates: Map<number, boolean> = new Map();

  // Debounce timers for state changes
  private stateChangeTimers: Map<string, NodeJS.Timeout> = new Map();
  private stateChangePending: Map<string, ConnectionState> = new Map();
  private debounceDelay = 2000; // 2 seconds

  /**
   * Singleton constructor
   */
  private constructor() {
    // Private constructor for singleton pattern
  }

  /**
   * Get the singleton instance
   */
  public static getInstance(): CTCWebSocketManager {
    if (!CTCWebSocketManager.instance) {
      CTCWebSocketManager.instance = new CTCWebSocketManager();
    }
    return CTCWebSocketManager.instance;
  }

  /**
   * Create and connect to a gateway
   */
  public async connectToGateway(
    gatewayId: string,
    url: string,
    username: string,
    password: string
  ): Promise<boolean> {
    // Check if we already have a connection for this gateway
    if (this.connections.has(gatewayId)) {
      const existingConnection = this.connections.get(gatewayId)!;
      const state = existingConnection.getState();

      // If already connected or authenticating, return success
      if (
        state === ConnectionState.CONNECTED ||
        state === ConnectionState.AUTHENTICATED ||
        state === ConnectionState.AUTHENTICATING
      ) {
        return true;
      }

      // If failed or disconnected, close and recreate
      if (state === ConnectionState.FAILED || state === ConnectionState.DISCONNECTED) {
        existingConnection.close();
        this.connections.delete(gatewayId);
      }
    }

    // Create new connection
    const connection = new CTCWebSocketService(url, username, password);
    this.connections.set(gatewayId, connection);
    this.gatewayStates.set(gatewayId, ConnectionState.DISCONNECTED);

    // Set up event forwarding
    this.setupConnectionEvents(gatewayId, connection);

    try {
      const success = await connection.connect();
      return success;
    } catch (error) {
      console.error(`Failed to connect to gateway ${gatewayId}:`, error);
      return false;
    }
  }

  /**
   * Set up event forwarding from gateway connection to manager
   */
  private setupConnectionEvents(gatewayId: string, connection: CTCWebSocketService): void {
    // Forward connection state events with debouncing
    connection.addEventListener(WebSocketEvents.CONNECTED, () => {
      this.debouncedStateChange(gatewayId, ConnectionState.CONNECTED, () => {
        this.emitEvent(WebSocketEvents.CONNECTED, { gatewayId });
      });
    });

    connection.addEventListener(WebSocketEvents.DISCONNECTED, () => {
      // For disconnected state, use a shorter debounce or none at all
      // to ensure critical disconnections are reported quickly
      this.gatewayStates.set(gatewayId, ConnectionState.DISCONNECTED);
      this.emitEvent(WebSocketEvents.DISCONNECTED, { gatewayId });
    });

    connection.addEventListener(WebSocketEvents.AUTHENTICATED, data => {
      // For authenticated state, immediately update without debouncing
      // as this is an important terminal state
      this.gatewayStates.set(gatewayId, ConnectionState.AUTHENTICATED);
      this.emitEvent(WebSocketEvents.AUTHENTICATED, { gatewayId, data });
    });

    connection.addEventListener(WebSocketEvents.ERROR, error => {
      this.emitEvent(WebSocketEvents.ERROR, { gatewayId, error });
    });

    // Forward sensor events
    connection.addEventListener(WebSocketEvents.SENSOR_CONNECTED, data => {
      if (data && typeof data === 'object' && 'serial' in data) {
        this.sensorStates.set(data.serial as number, true);
        this.emitEvent(WebSocketEvents.SENSOR_CONNECTED, {
          gatewayId,
          serial: data.serial as number,
          connected: true,
        });
      }
    });

    connection.addEventListener(WebSocketEvents.SENSOR_DISCONNECTED, data => {
      if (data && typeof data === 'object' && 'serial' in data) {
        this.sensorStates.set(data.serial as number, false);
        this.emitEvent(WebSocketEvents.SENSOR_DISCONNECTED, {
          gatewayId,
          serial: data.serial as number,
          connected: false,
        });
      }
    });

    // Forward reading events
    connection.addEventListener(WebSocketEvents.READING_STARTED, data => {
      if (data && typeof data === 'object') {
        this.emitEvent(WebSocketEvents.READING_STARTED, {
          gatewayId,
          // Only pass validated properties
          ...(typeof data === 'object' ? data : {}),
        });
      }
    });

    connection.addEventListener(WebSocketEvents.READING_COMPLETED, data => {
      if (data && typeof data === 'object') {
        this.emitEvent(WebSocketEvents.READING_COMPLETED, {
          gatewayId,
          ...(typeof data === 'object' ? data : {}),
        });
      }
    });

    connection.addEventListener(WebSocketEvents.TEMPERATURE_READING, data => {
      if (data && typeof data === 'object') {
        this.emitEvent(WebSocketEvents.TEMPERATURE_READING, {
          gatewayId,
          ...(typeof data === 'object' ? data : {}),
        });
      }
    });

    connection.addEventListener(WebSocketEvents.BATTERY_READING, data => {
      if (data && typeof data === 'object') {
        this.emitEvent(WebSocketEvents.BATTERY_READING, {
          gatewayId,
          ...(typeof data === 'object' ? data : {}),
        });
      }
    });
  }

  /**
   * Get connection status for a gateway
   */
  public getGatewayState(gatewayId: string): ConnectionState {
    // Check if there's a pending state change
    if (this.stateChangePending.has(gatewayId)) {
      return this.stateChangePending.get(gatewayId)!;
    }

    // Otherwise return the current state
    return this.gatewayStates.get(gatewayId) || ConnectionState.DISCONNECTED;
  }

  /**
   * Check if a sensor is connected
   */
  public isSensorConnected(sensorSerial: number): boolean {
    return this.sensorStates.get(sensorSerial) || false;
  }

  /**
   * Get all connected gateways
   */
  public getConnectedGateways(): string[] {
    return Array.from(this.gatewayStates.entries())
      .filter(([_, state]) => state === ConnectionState.AUTHENTICATED)
      .map(([id]) => id);
  }

  /**
   * Disconnect from a gateway
   */
  public disconnectFromGateway(gatewayId: string): void {
    const connection = this.connections.get(gatewayId);
    if (connection) {
      connection.close();
      this.connections.delete(gatewayId);
      this.gatewayStates.set(gatewayId, ConnectionState.DISCONNECTED);
      this.emitEvent(WebSocketEvents.DISCONNECTED, { gatewayId });
    }
  }

  /**
   * Disconnect from all gateways
   */
  public disconnectAll(): void {
    for (const gatewayId of this.connections.keys()) {
      this.disconnectFromGateway(gatewayId);
    }
  }

  /**
   * Add event listener
   */
  public addEventListener(event: string, listener: (data?: unknown) => void): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)?.add(listener);
  }

  /**
   * Remove event listener
   */
  public removeEventListener(event: string, listener: (data?: unknown) => void): void {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event)?.delete(listener);
    }
  }

  /**
   * Emit event to all listeners
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
   * Debounce connection state changes to prevent UI flickering
   */
  private debouncedStateChange(
    gatewayId: string,
    newState: ConnectionState,
    callback: () => void
  ): void {
    // Cancel any pending state change
    if (this.stateChangeTimers.has(gatewayId)) {
      clearTimeout(this.stateChangeTimers.get(gatewayId)!);
    }

    // Store the pending state
    this.stateChangePending.set(gatewayId, newState);

    // Create a new timer
    const timer = setTimeout(() => {
      // Apply the state change
      const finalState = this.stateChangePending.get(gatewayId)!;
      this.gatewayStates.set(gatewayId, finalState);

      // Execute the callback
      callback();

      // Clean up
      this.stateChangeTimers.delete(gatewayId);
      this.stateChangePending.delete(gatewayId);
    }, this.debounceDelay);

    // Store the timer
    this.stateChangeTimers.set(gatewayId, timer);
  }

  /**
   * Get connection for gateway
   */
  private getGatewayConnection(gatewayId: string): CTCWebSocketService {
    const connection = this.connections.get(gatewayId);
    if (!connection) {
      throw new Error(`No connection found for gateway ${gatewayId}`);
    }
    return connection;
  }

  /**
   * Get connected sensors for a gateway
   */
  public async getConnectedSensors(gatewayId: string): Promise<SensorData[]> {
    const connection = this.getGatewayConnection(gatewayId);
    return await connection.getConnectedSensors();
  }

  /**
   * Take a vibration reading from a sensor
   */
  public async takeReading(gatewayId: string, sensorSerial: number): Promise<ReadingData> {
    const connection = this.getGatewayConnection(gatewayId);
    return await connection.takeReading(sensorSerial);
  }

  /**
   * Take a temperature reading from a sensor
   */
  public async takeTemperatureReading(
    gatewayId: string,
    sensorSerial: number
  ): Promise<TemperatureData> {
    const connection = this.getGatewayConnection(gatewayId);
    return await connection.takeTemperatureReading(sensorSerial);
  }

  /**
   * Take a battery reading from a sensor
   */
  public async takeBatteryReading(gatewayId: string, sensorSerial: number): Promise<BatteryData> {
    const connection = this.getGatewayConnection(gatewayId);
    return await connection.takeBatteryReading(sensorSerial);
  }

  /**
   * Get historical readings for a sensor
   */
  public async getReadings(
    gatewayId: string,
    sensorSerial: number,
    count: number = 10
  ): Promise<ReadingData[]> {
    const connection = this.getGatewayConnection(gatewayId);
    return await connection.getReadings(sensorSerial, count);
  }

  /**
   * Get historical temperature readings for a sensor
   */
  public async getTemperatureReadings(
    gatewayId: string,
    sensorSerial: number,
    count: number = 10
  ): Promise<TemperatureData[]> {
    const connection = this.getGatewayConnection(gatewayId);
    return await connection.getTemperatureReadings(sensorSerial, count);
  }

  /**
   * Get historical battery readings for a sensor
   */
  public async getBatteryReadings(
    gatewayId: string,
    sensorSerial: number,
    count: number = 10
  ): Promise<BatteryData[]> {
    const connection = this.getGatewayConnection(gatewayId);
    return await connection.getBatteryReadings(sensorSerial, count);
  }
}
