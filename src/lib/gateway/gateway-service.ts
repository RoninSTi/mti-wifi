/**
 * Gateway Service
 *
 * Service for managing gateway connections, providing:
 * - Connection management (connect, disconnect, reconnect)
 * - Connection state tracking
 * - Gateway data retrieval from database
 * - Event subscription
 */
import {
  GatewayConnection,
  GatewayConnectionState,
  GatewayService,
  StateChangeMessage,
} from './types';
import { GatewayConnectionManager } from './connection-manager';
import { getGateway } from '@/lib/api/gateways';

/**
 * Implementation of the GatewayService interface
 */
export class GatewayServiceImpl implements GatewayService {
  // Map of gateway ID to connection
  private connections: Map<string, GatewayConnection> = new Map();

  // Map of gateway ID to connection state change listeners
  private stateChangeListeners: Map<string, Set<(state: GatewayConnectionState) => void>> =
    new Map();

  /**
   * Connect to a gateway
   * @param gatewayId Gateway ID
   * @returns Gateway connection
   */
  public async connect(gatewayId: string): Promise<GatewayConnection> {
    // Check if already connected
    const existingConnection = this.getConnection(gatewayId);
    if (existingConnection) {
      if (
        existingConnection.state === 'connected' ||
        existingConnection.state === 'authenticated'
      ) {
        return existingConnection;
      }

      // Existing connection in bad state, disconnect first
      await this.disconnect(gatewayId);
    }

    // Fetch gateway details from API
    const response = await getGateway(gatewayId);

    if (response.error) {
      throw new Error(`Failed to fetch gateway details: ${response.error.message}`);
    }

    const gateway = response.data;
    if (!gateway) {
      throw new Error(`Gateway not found: ${gatewayId}`);
    }

    // Create connection params
    const connectionParams = {
      id: gateway._id.toString(),
      url: gateway.url,
      username: gateway.username,
      password: gateway.password,
      serialNumber: gateway.serialNumber,
      autoReconnect: true,
    };

    // Create connection
    const connection = new GatewayConnectionManager(connectionParams);

    // Set up state change listener
    connection.on<StateChangeMessage>('state_change', message => {
      this.notifyStateChange(gatewayId, message.state);
    });

    // Store connection
    this.connections.set(gatewayId, connection);

    // Establish connection
    await connection.connect();

    // Authenticate
    await connection.authenticate();

    return connection;
  }

  /**
   * Disconnect from a gateway
   * @param gatewayId Gateway ID
   */
  public async disconnect(gatewayId: string): Promise<void> {
    const connection = this.getConnection(gatewayId);

    if (connection) {
      await connection.disconnect();
      this.connections.delete(gatewayId);
    }
  }

  /**
   * Get a gateway connection
   * @param gatewayId Gateway ID
   * @returns Gateway connection or null if not connected
   */
  public getConnection(gatewayId: string): GatewayConnection | null {
    return this.connections.get(gatewayId) || null;
  }

  /**
   * Get all gateway connections
   * @returns Array of gateway connections
   */
  public getAllConnections(): GatewayConnection[] {
    return Array.from(this.connections.values());
  }

  /**
   * Check if connected to a gateway
   * @param gatewayId Gateway ID
   * @returns True if connected
   */
  public isConnected(gatewayId: string): boolean {
    const connection = this.getConnection(gatewayId);

    if (!connection) {
      return false;
    }

    return connection.state === 'connected' || connection.state === 'authenticated';
  }

  /**
   * Check if authenticated with a gateway
   * @param gatewayId Gateway ID
   * @returns True if authenticated
   */
  public isAuthenticated(gatewayId: string): boolean {
    const connection = this.getConnection(gatewayId);

    if (!connection) {
      return false;
    }

    return connection.state === 'authenticated';
  }

  /**
   * Listen for connection state changes
   * @param gatewayId Gateway ID
   * @param callback Callback function
   * @returns Unsubscribe function
   */
  public onConnectionStateChange(
    gatewayId: string,
    callback: (state: GatewayConnectionState) => void
  ): () => void {
    let listeners = this.stateChangeListeners.get(gatewayId);

    if (!listeners) {
      listeners = new Set();
      this.stateChangeListeners.set(gatewayId, listeners);
    }

    listeners.add(callback);

    // Immediately notify of current state if connected
    const connection = this.getConnection(gatewayId);
    if (connection) {
      callback(connection.state);
    }

    // Return unsubscribe function
    return () => {
      const listeners = this.stateChangeListeners.get(gatewayId);

      if (listeners) {
        listeners.delete(callback);

        if (listeners.size === 0) {
          this.stateChangeListeners.delete(gatewayId);
        }
      }
    };
  }

  /**
   * Notify state change listeners
   * @param gatewayId Gateway ID
   * @param state New state
   * @private
   */
  private notifyStateChange(gatewayId: string, state: GatewayConnectionState): void {
    const listeners = this.stateChangeListeners.get(gatewayId);

    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(state);
        } catch (error) {
          console.error(`Error in state change listener for gateway ${gatewayId}:`, error);
        }
      });
    }
  }
}

// Create singleton instance
export const gatewayService = new GatewayServiceImpl();
