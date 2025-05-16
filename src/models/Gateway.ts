import mongoose, { Schema, Document } from 'mongoose';
import { ILocation } from './Location';

export interface IGateway extends Document {
  name: string;
  description?: string;
  url: string; // Connection URL for the gateway
  username: string;
  password: string;
  serialNumber: string;
  location: ILocation['_id'];
  status: 'disconnected' | 'connected' | 'authenticated';
  lastConnectedAt?: Date;
  lastAuthenticatedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const GatewaySchema: Schema = new Schema(
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
    url: {
      type: String,
      required: true,
      trim: true,
    },
    username: {
      type: String,
      required: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      trim: true,
      // Note: In a production system, you would want to ensure this is securely stored
      // with proper encryption and not returned by default in API responses
    },
    serialNumber: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    location: {
      type: Schema.Types.ObjectId,
      ref: 'Location',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['disconnected', 'connected', 'authenticated'],
      default: 'disconnected',
    },
    lastConnectedAt: {
      type: Date,
    },
    lastAuthenticatedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound index for uniqueness of serialNumber within an organization
GatewaySchema.index({ serialNumber: 1, location: 1 }, { unique: true });

// Virtual for sensors associated with this gateway
GatewaySchema.virtual('sensors', {
  ref: 'Sensor',
  localField: '_id',
  foreignField: 'gateway',
});

export default mongoose.models.Gateway || mongoose.model<IGateway>('Gateway', GatewaySchema);
