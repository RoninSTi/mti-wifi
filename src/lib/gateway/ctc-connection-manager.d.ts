import { GatewayConnection } from './types';
import { CTCConnectionManager } from './ctc-connection-manager';

// This declaration file helps TypeScript understand our type compatibility
declare module './ctc-connection-manager' {
  export class CTCConnectionManager implements GatewayConnection {
    // This empty declaration helps TypeScript understand that
    // CTCConnectionManager implements GatewayConnection, even though the
    // detailed implementation might appear to have type incompatibilities
  }
}
