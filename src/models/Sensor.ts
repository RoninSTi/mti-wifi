import mongoose, { Schema, Document } from 'mongoose';
import { IEquipment } from './Equipment';
import { IGateway } from './Gateway';

// Interface that matches the CTC API SensorData properties
export interface ICTCSensorData {
  serial: number;
  connected: number; // 0 or 1
  accessPoint: number;
  partNum: string;
  readRate: number;
  gMode: string;
  freqMode: string;
  readPeriod: number;
  samples: number;
  hwVer: string;
  fmVer: string;
}

export interface ISensor extends Document {
  name: string;
  description?: string;
  equipment: IEquipment['_id'];
  gateway?: IGateway['_id']; // Reference to the gateway this sensor is connected to
  // CTC API specific fields
  serial: number; // Unique identifier from CTC API
  partNumber: string;
  hardwareVersion?: string;
  firmwareVersion?: string;
  position?: {
    x?: number;
    y?: number;
    z?: number;
  };
  // Connection settings
  accessPoint?: number;
  connected: boolean;
  lastConnectedAt?: Date;
  // Reading configuration
  readRate?: number; // in Hz
  readPeriod?: number; // in seconds
  samples?: number;
  gMode?: string;
  freqMode?: string;
  // Status
  status: 'active' | 'inactive' | 'warning' | 'error';
  // API specific configuration
  wsEndpoint?: string; // WebSocket endpoint for this sensor
  createdAt: Date;
  updatedAt: Date;
}

const SensorSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    equipment: {
      type: Schema.Types.ObjectId,
      ref: 'Equipment',
      required: true,
      index: true,
    },
    gateway: {
      type: Schema.Types.ObjectId,
      ref: 'Gateway',
      index: true,
    },
    // CTC API specific fields
    serial: {
      type: Number,
      required: false,
      index: false, // No index, no uniqueness constraints
    },
    partNumber: {
      type: String,
      required: false,
      trim: true,
    },
    hardwareVersion: {
      type: String,
      trim: true,
    },
    firmwareVersion: {
      type: String,
      trim: true,
    },
    position: {
      x: Number,
      y: Number,
      z: Number,
    },
    // Connection settings
    accessPoint: {
      type: Number,
    },
    connected: {
      type: Boolean,
      default: false,
    },
    lastConnectedAt: {
      type: Date,
    },
    // Reading configuration
    readRate: {
      type: Number,
    },
    readPeriod: {
      type: Number,
    },
    samples: {
      type: Number,
    },
    gMode: {
      type: String,
      trim: true,
    },
    freqMode: {
      type: String,
      trim: true,
    },
    // Status
    status: {
      type: String,
      enum: ['active', 'inactive', 'warning', 'error'],
      default: 'inactive',
    },
    // API specific configuration
    wsEndpoint: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// No need for explicit index definitions since they're already defined in the schema fields
// Both equipment and gateway are indexed in their field definitions above

// Method to update sensor data from CTC API
SensorSchema.methods.updateFromCTCData = function (ctcData: ICTCSensorData) {
  this.serial = ctcData.serial;
  this.connected = ctcData.connected === 1;
  this.accessPoint = ctcData.accessPoint;
  this.partNumber = ctcData.partNum;
  this.readRate = ctcData.readRate;
  this.gMode = ctcData.gMode;
  this.freqMode = ctcData.freqMode;
  this.readPeriod = ctcData.readPeriod;
  this.samples = ctcData.samples;
  this.hardwareVersion = ctcData.hwVer;
  this.firmwareVersion = ctcData.fmVer;

  if (ctcData.connected === 1) {
    this.lastConnectedAt = new Date();
    this.status = 'active';
  } else {
    this.status = 'inactive';
  }
};

export default mongoose.models.Sensor || mongoose.model<ISensor>('Sensor', SensorSchema);
