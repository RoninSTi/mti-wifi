import mongoose, { Schema, Document, Model } from 'mongoose';
import bcrypt from 'bcrypt';

export interface IUserMethods {
  comparePassword(candidatePassword: string): Promise<boolean>;
}

export interface IUserDocument extends Document {
  username: string;
  email: string;
  password: string;
  createdAt: Date;
  updatedAt: Date;
}

// Combined interface with both document properties and methods
export interface IUser extends IUserDocument, IUserMethods {}

const UserSchema: Schema = new Schema(
  {
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      trim: true,
      minlength: [3, 'Username must be at least 3 characters'],
      maxlength: [20, 'Username cannot exceed 20 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
UserSchema.pre('save', async function (next) {
  // Use 'this' directly without aliasing

  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) return next();

  try {
    // Generate a salt
    const salt = await bcrypt.genSalt(10);

    // Make sure password is a string
    if (typeof this.password !== 'string') {
      throw new Error('Password must be a string');
    }

    // Hash the password along with the salt
    const hashedPassword = await bcrypt.hash(this.password, salt);

    // Replace the plaintext password with the hashed one
    this.password = hashedPassword;
    next();
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    next(err);
  }
});

// Method to compare passwords
UserSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  // Ensure password is a string before comparing
  if (typeof this.password !== 'string') {
    return false;
  }
  return bcrypt.compare(candidatePassword, this.password);
};

// Create a type for the model to ensure correct typing
type UserModel = Model<IUserDocument, object, IUserMethods>;

// Check if the model already exists before creating a new one (helpful for Next.js hot reloading)
const User =
  (mongoose.models.User as UserModel) ||
  mongoose.model<IUserDocument, UserModel>('User', UserSchema);

export default User;
