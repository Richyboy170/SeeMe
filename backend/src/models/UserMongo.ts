import mongoose, { Document, Schema } from 'mongoose';

/**
 * User interface for MongoDB
 */
export interface IUser extends Document {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  ageVerified: boolean;
  activeAvatarId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * User schema for MongoDB
 */
const UserSchema = new Schema<IUser>(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    username: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
      minlength: 3,
      maxlength: 30
    },
    email: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
      lowercase: true
    },
    passwordHash: {
      type: String,
      required: true
    },
    ageVerified: {
      type: Boolean,
      default: false
    },
    activeAvatarId: {
      type: String,
      default: null
    }
  },
  {
    timestamps: true,
    collection: 'users'
  }
);

// Create indexes
UserSchema.index({ email: 1 });
UserSchema.index({ username: 1 });

// Export model
export const UserMongo = mongoose.model<IUser>('User', UserSchema);

export default UserMongo;
