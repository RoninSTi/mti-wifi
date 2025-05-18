/**
 * Type definitions for the Gateway service
 * This file contains interfaces for working with gateway connections,
 * authentication, message subscriptions, and context providers.
 */
import { IGateway } from '@/models/Gateway';
import { z } from 'zod';

// ======== Gateway Connection Types ========

/**
 * Parameters needed to connect to a gateway
 */
export interface GatewayConnectionParams {
  id: string; // Gateway ID
  url: string; // WebSocket URL
  username: string; // Authentication username
  password: string; // Authentication password
  serialNumber: string; // Gateway serial number
  autoReconnect?: boolean; // Whether to automatically reconnect (default: true)
  reconnectInterval?: number; // Reconnect interval in ms (default: 5000)
  maxReconnectAttempts?: number; // Max reconnect attempts (default: 5)
}

/**
 * Connection states for a gateway
 */
export type GatewayConnectionState =
  | 'disconnected' // Not connected
  | 'connecting' // Connection in progress
  | 'connected' // Connected but not authenticated
  | 'authenticating' // Authentication in progress
  | 'authenticated' // Fully connected and authenticated
  | 'error' // Connection error
  | 'reconnecting' // Attempting to reconnect
  | 'closed'; // Connection closed

/**
 * Connection statistics
 */
export interface GatewayConnectionStats {
  connectedAt?: Date; // Time of successful connection
  authenticatedAt?: Date; // Time of successful authentication
  lastMessageAt?: Date; // Time of last message received
  messagesSent: number; // Number of messages sent
  messagesReceived: number; // Number of messages received
  reconnectAttempts: number; // Number of reconnect attempts
  errors: number; // Number of errors
}

// ======== Gateway Message Types ========

/**
 * Base interface for all gateway messages
 */
export interface GatewayMessage {
  type: string; // Message type
  timestamp: number; // Message timestamp
}

/**
 * Authentication message
 */
export interface AuthMessage extends GatewayMessage {
  type: 'auth';
  username: string;
  password: string;
}

/**
 * Authentication response
 */
export interface AuthResponseMessage extends GatewayMessage {
  type: 'auth_response';
  success: boolean;
  error?: string;
  token?: string; // JWT token if authentication was successful
}

/**
 * Subscription message
 */
export interface SubscribeMessage extends GatewayMessage {
  type: 'subscribe';
  topics: string[]; // Topics to subscribe to
}

/**
 * Subscription response
 */
export interface SubscribeResponseMessage extends GatewayMessage {
  type: 'subscribe_response';
  success: boolean;
  topics: string[]; // Successfully subscribed topics
  errors?: Record<string, string>; // Errors by topic
}

/**
 * Unsubscribe message
 */
export interface UnsubscribeMessage extends GatewayMessage {
  type: 'unsubscribe';
  topics: string[]; // Topics to unsubscribe from
}

/**
 * Unsubscribe response
 */
export interface UnsubscribeResponseMessage extends GatewayMessage {
  type: 'unsubscribe_response';
  success: boolean;
  topics: string[]; // Successfully unsubscribed topics
}

/**
 * Data message from a topic
 */
export interface TopicDataMessage extends GatewayMessage {
  type: 'topic_data';
  topic: string;
  data: unknown; // Topic-specific data
}

/**
 * Error message
 */
export interface ErrorMessage extends GatewayMessage {
  type: 'error';
  code: string;
  message: string;
  details?: unknown;
}

/**
 * Heartbeat message to keep connection alive
 */
export interface HeartbeatMessage extends GatewayMessage {
  type: 'heartbeat';
}

/**
 * Heartbeat response
 */
export interface HeartbeatResponseMessage extends GatewayMessage {
  type: 'heartbeat_response';
  uptime: number; // Gateway uptime in seconds
  load?: number; // Gateway load (0-100)
}

/**
 * Command message to perform an action on the gateway
 */
export interface CommandMessage extends GatewayMessage {
  type: 'command';
  command: string; // Command name
  params?: Record<string, unknown>; // Command parameters
  id: string; // Command ID for response tracking
}

/**
 * Command response
 */
export interface CommandResponseMessage extends GatewayMessage {
  type: 'command_response';
  command: string; // Original command name
  success: boolean;
  data?: unknown; // Command-specific response data
  error?: string; // Error message if command failed
  id: string; // Original command ID
}

/**
 * State change message
 */
export interface StateChangeMessage extends GatewayMessage {
  type: 'state_change';
  state: GatewayConnectionState;
  previousState: GatewayConnectionState;
}

/**
 * Union type of all possible gateway messages
 */
export type GatewayMessageTypes =
  | AuthMessage
  | AuthResponseMessage
  | SubscribeMessage
  | SubscribeResponseMessage
  | UnsubscribeMessage
  | UnsubscribeResponseMessage
  | TopicDataMessage
  | ErrorMessage
  | HeartbeatMessage
  | HeartbeatResponseMessage
  | CommandMessage
  | CommandResponseMessage
  | StateChangeMessage;

// ======== Subscription Management ========

/**
 * Represents a subscription to gateway messages
 */
export interface GatewaySubscription {
  id: string; // Unique subscription ID
  topic: string; // Topic pattern (can include wildcards)
  callback: (message: TopicDataMessage) => void; // Callback function
}

// ======== Gateway Service Interfaces ========

/**
 * Represents an active gateway connection
 */
export interface GatewayConnection {
  id: string; // Gateway ID
  state: GatewayConnectionState; // Current connection state
  params: GatewayConnectionParams; // Connection parameters
  stats: GatewayConnectionStats; // Connection statistics

  // Connection methods
  connect(): Promise<void>; // Establish connection
  disconnect(): Promise<void>; // Disconnect
  reconnect(): Promise<void>; // Force reconnection

  // Authentication
  authenticate(): Promise<void>; // Authenticate with the gateway

  // Subscription management
  subscribe(topics: string[]): Promise<string[]>; // Subscribe to topics, returns successful topics
  unsubscribe(topics: string[]): Promise<string[]>; // Unsubscribe from topics

  // Message handling
  send<T extends GatewayMessage>(message: T): Promise<void>; // Send a message

  // Command handling (with response)
  sendCommand<T = unknown>(command: string, params?: Record<string, unknown>): Promise<T>; // Send a command and receive response

  // Event listeners
  on<T extends GatewayMessage>(event: T['type'], callback: (message: T) => void): () => void; // Add event listener, returns unsubscribe function

  // Data listeners
  onData(topic: string, callback: (data: unknown) => void): () => void; // Listen for data on a topic
}

/**
 * Main service interface for the Gateway service
 */
export interface GatewayService {
  // Connection management
  connect(gatewayId: string): Promise<GatewayConnection>; // Connect to a gateway
  disconnect(gatewayId: string): Promise<void>; // Disconnect from a gateway
  getConnection(gatewayId: string): GatewayConnection | null; // Get active connection
  getAllConnections(): GatewayConnection[]; // Get all active connections

  // Status
  isConnected(gatewayId: string): boolean; // Check if connected
  isAuthenticated(gatewayId: string): boolean; // Check if authenticated

  // Event listeners
  onConnectionStateChange(
    gatewayId: string,
    callback: (state: GatewayConnectionState) => void
  ): () => void; // Listen for connection state changes
}

// ======== Context Types ========

/**
 * Gateway service context for React components
 */
export interface GatewayServiceContext {
  service: GatewayService; // The gateway service instance

  // Helper methods
  connectToGateway(gatewayId: string): Promise<GatewayConnection>; // Connect to a gateway
  disconnectFromGateway(gatewayId: string): Promise<void>; // Disconnect from a gateway

  // Status
  connectionState: Record<string, GatewayConnectionState>; // Connection state by gateway ID

  // Data subscription
  subscribeToTopic(gatewayId: string, topic: string, callback: (data: unknown) => void): () => void; // Subscribe to a topic on a gateway
}

// ======== Zod Schemas for Validation ========

/**
 * Zod schema for validating gateway connection parameters
 */
export const gatewayConnectionParamsSchema = z.object({
  id: z.string().min(1, 'Gateway ID is required'),
  url: z.string().url('Valid WebSocket URL required'),
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
  serialNumber: z.string().min(1, 'Serial number is required'),
  autoReconnect: z.boolean().optional().default(true),
  reconnectInterval: z.number().positive().optional().default(5000),
  maxReconnectAttempts: z.number().positive().optional().default(5),
});

/**
 * Topic pattern validation
 */
export const topicPatternSchema = z.string().min(1, 'Topic pattern is required');

/**
 * State change message schema
 */
export const stateChangeMessageSchema = z.object({
  type: z.literal('state_change'),
  state: z.enum([
    'disconnected',
    'connecting',
    'connected',
    'authenticating',
    'authenticated',
    'error',
    'reconnecting',
    'closed',
  ]),
  previousState: z.enum([
    'disconnected',
    'connecting',
    'connected',
    'authenticating',
    'authenticated',
    'error',
    'reconnecting',
    'closed',
  ]),
  timestamp: z.number(),
});

/**
 * Command parameters schema (extensible base)
 */
export const commandParamsBaseSchema = z.record(z.unknown());
