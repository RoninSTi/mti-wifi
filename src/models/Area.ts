import mongoose, { Schema, Document } from 'mongoose';
import { ILocation } from './Location';

// Import models to ensure they are registered
import './Location';

export interface IArea extends Document {
  name: string;
  description?: string;
  location: ILocation['_id'];
  floorLevel?: number;
  buildingSection?: string;
  areaType?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AreaSchema: Schema = new Schema(
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
    location: {
      type: Schema.Types.ObjectId,
      ref: 'Location',
      required: true,
      index: true,
    },
    floorLevel: {
      type: Number,
    },
    buildingSection: {
      type: String,
      trim: true,
    },
    areaType: {
      type: String,
      trim: true,
      enum: ['production', 'storage', 'office', 'utility', 'other'],
      default: 'other',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound index for uniqueness within a location
AreaSchema.index({ name: 1, location: 1 }, { unique: true });

// Virtual for equipment in this area
AreaSchema.virtual('equipment', {
  ref: 'Equipment',
  localField: '_id',
  foreignField: 'area',
});

export default mongoose.models.Area || mongoose.model<IArea>('Area', AreaSchema);
