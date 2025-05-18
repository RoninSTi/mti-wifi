/**
 * Gateway service module - Main exports
 */

// Export types
export * from './types';
export * from './ctc-types';
export * from './ctc-adapter';
export * from './ctc-connection-factory';

// Export connection manager
export { GatewayConnectionManager } from './connection-manager';
export { CTCConnectionManager } from './ctc-connection-manager';

// Export service
export { gatewayService, GatewayServiceImpl } from './gateway-service';
export { ctcGatewayService, CTCGatewayService } from './ctc-service';

// Export context provider
export { GatewayProvider, GatewayContext } from './context';

// Export hooks
export {
  useGatewayService,
  useGatewayConnection,
  useGatewayTopic,
  useGatewayCommand,
  useGatewayTopics,
} from './hooks';

// Export CTC hooks
export {
  useCTCGatewayConnection,
  useCTCDynamicSensors,
  useCTCConnectedDynamicSensors,
  useCTCDynamicVibrationRecords,
  useCTCDynamicReadings,
} from './ctc-hooks';
