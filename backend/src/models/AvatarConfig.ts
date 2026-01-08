import mongoose, { Schema, Document } from 'mongoose';

/**
 * Avatar style types
 */
export type AvatarStyle = 'cartoon' | 'anime' | 'minimalist';

/**
 * Avatar customization options interface
 */
export interface IAvatarCustomizations {
  skinTone: string;
  eyeColor: string;
  eyeSize: number;
  hairColor: string;
  hairStyle: string;
  accessories: {
    glasses: string | null;
    hat: string | null;
    earrings: string | null;
  };
}

/**
 * AvatarConfig document interface
 */
export interface IAvatarConfig extends Document {
  userId: string;
  avatarId: string;
  name: string;
  style: AvatarStyle;
  customizations: IAvatarCustomizations;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Mongoose schema for avatar configurations
 */
const AvatarConfigSchema = new Schema<IAvatarConfig>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
      ref: 'User'
    },
    avatarId: {
      type: String,
      required: true,
      unique: true
    },
    name: {
      type: String,
      required: true,
      maxlength: 50,
      trim: true
    },
    style: {
      type: String,
      required: true,
      enum: ['cartoon', 'anime', 'minimalist'],
      default: 'cartoon'
    },
    customizations: {
      skinTone: {
        type: String,
        required: true,
        default: '#FFDBAC'
      },
      eyeColor: {
        type: String,
        required: true,
        default: '#8B4513'
      },
      eyeSize: {
        type: Number,
        required: true,
        min: 0.5,
        max: 2.0,
        default: 1.0
      },
      hairColor: {
        type: String,
        required: true,
        default: '#000000'
      },
      hairStyle: {
        type: String,
        required: true,
        default: 'short'
      },
      accessories: {
        glasses: {
          type: String,
          default: null
        },
        hat: {
          type: String,
          default: null
        },
        earrings: {
          type: String,
          default: null
        }
      }
    },
    isActive: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true,
    collection: 'avatar_configs'
  }
);

// Indexes for performance
AvatarConfigSchema.index({ userId: 1, createdAt: -1 });
AvatarConfigSchema.index({ avatarId: 1 }, { unique: true });
AvatarConfigSchema.index({ userId: 1, isActive: 1 });

// Pre-save middleware to ensure only one active avatar per user
AvatarConfigSchema.pre('save', async function (next) {
  if (this.isActive && this.isModified('isActive')) {
    await AvatarConfig.updateMany(
      { userId: this.userId, _id: { $ne: this._id } },
      { $set: { isActive: false } }
    );
  }
  next();
});

/**
 * AvatarConfig model for MongoDB
 */
export const AvatarConfig = mongoose.model<IAvatarConfig>('AvatarConfig', AvatarConfigSchema);

export default AvatarConfig;
