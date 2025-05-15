import mongoose, { Schema, Document } from 'mongoose';
import { IOrganization } from './Organization';

export interface ILocation extends Document {
  name: string;
  description?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  organization: IOrganization['_id'];
  latitude?: number;
  longitude?: number;
  createdAt: Date;
  updatedAt: Date;
}

const LocationSchema: Schema = new Schema(
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
    address: {
      type: String,
      trim: true,
    },
    city: {
      type: String,
      trim: true,
    },
    state: {
      type: String,
      trim: true,
    },
    zipCode: {
      type: String,
      trim: true,
    },
    country: {
      type: String,
      trim: true,
      default: 'USA',
    },
    organization: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    latitude: {
      type: Number,
    },
    longitude: {
      type: Number,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound index for uniqueness within an organization
LocationSchema.index({ name: 1, organization: 1 }, { unique: true });

// Virtual for areas in this location
LocationSchema.virtual('areas', {
  ref: 'Area',
  localField: '_id',
  foreignField: 'location',
});

export default mongoose.models.Location || mongoose.model<ILocation>('Location', LocationSchema);
