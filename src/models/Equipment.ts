import mongoose, { Schema, Document } from 'mongoose';
import { IArea } from './Area';

// Import models to ensure they are registered
import './Area';

export interface IEquipment extends Document {
  name: string;
  description?: string;
  area: IArea['_id'];
  equipmentType: string;
  manufacturer?: string;
  modelNumber?: string; // Changed 'model' to 'modelNumber' to avoid conflict with mongoose Document
  serialNumber?: string;
  installationDate?: Date;
  lastMaintenanceDate?: Date;
  maintenanceInterval?: number;
  criticalityLevel?: 'low' | 'medium' | 'high' | 'critical';
  status: 'active' | 'inactive' | 'maintenance' | 'failed';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  nextMaintenanceDate?: Date | null;
  maintenanceDue?: boolean;
}

const EquipmentSchema: Schema = new Schema(
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
    area: {
      type: Schema.Types.ObjectId,
      ref: 'Area',
      required: true,
      index: true,
    },
    equipmentType: {
      type: String,
      required: true,
      trim: true,
    },
    manufacturer: {
      type: String,
      trim: true,
    },
    modelNumber: {
      // Changed 'model' to 'modelNumber' to avoid conflict
      type: String,
      trim: true,
    },
    serialNumber: {
      type: String,
      trim: true,
    },
    installationDate: {
      type: Date,
    },
    lastMaintenanceDate: {
      type: Date,
    },
    maintenanceInterval: {
      type: Number, // In days
    },
    criticalityLevel: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'maintenance', 'failed'],
      default: 'active',
      required: true,
    },
    notes: {
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

// Compound index for uniqueness within an area
EquipmentSchema.index({ name: 1, area: 1 }, { unique: true });

// Virtual for sensors attached to this equipment
EquipmentSchema.virtual('sensors', {
  ref: 'Sensor',
  localField: '_id',
  foreignField: 'equipment',
});

// Virtual for next maintenance date using a properly typed function
EquipmentSchema.virtual('nextMaintenanceDate').get(function () {
  // Using proper type checking to avoid empty object errors
  if (!this.lastMaintenanceDate || !this.maintenanceInterval) {
    return null;
  }

  // Create a new Date object using the lastMaintenanceDate
  // Use type assertion to ensure TypeScript knows this is a valid Date object
  const lastDate = this.lastMaintenanceDate as Date;
  const nextDate = new Date(lastDate.getTime());

  // Calculate next maintenance date by adding the interval in days
  nextDate.setDate(nextDate.getDate() + Number(this.maintenanceInterval));
  return nextDate;
});

// Virtual for maintenance due status
EquipmentSchema.virtual('maintenanceDue').get(function () {
  const nextDate = this.get('nextMaintenanceDate');
  if (!nextDate) {
    return false;
  }
  return nextDate <= new Date();
});

export default mongoose.models.Equipment ||
  mongoose.model<IEquipment>('Equipment', EquipmentSchema);
