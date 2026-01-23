import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

/**
 * Full Body Avatar attributes interface
 * Phase 3.1: Full-Body 3D Avatar System
 */
export interface FullBodyAvatarAttributes {
  id: string;
  userId: string;

  // VRM Model selection
  modelId: string;          // Reference to default VRM model (e.g., 'avatar_sakura')

  // Pose data (KalidoKit-compatible format)
  rigTransforms: object;    // JSON of bone transforms (SolvedPose format)
  poseType: string;         // standing, sitting, lying, etc.
  facingDirection: string;  // front, back, side
  confidence: number;

  // Customization (colors stored as hex strings for VRM)
  style: 'cartoon' | 'anime' | 'minimalist';
  skinColor: string;        // Hex color e.g., '#FFE0BD'
  hairColor: string;        // Hex color e.g., '#2C1810'
  eyeColor: string;         // Hex color e.g., '#4A3728'

  // Legacy index-based colors (for backward compatibility)
  skinTone: number;         // 0-4
  hairColorIndex: number;   // 0-7
  eyeColorIndex: number;    // 0-5

  // Source image (optional, for reprocessing)
  sourceImageKey: string | null;

  // Preset pose ID (if using preset instead of custom)
  presetPoseId: string | null;

  // Metadata
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Optional attributes for creation
 */
interface FullBodyAvatarCreationAttributes extends Optional<
  FullBodyAvatarAttributes,
  'id' | 'modelId' | 'poseType' | 'facingDirection' | 'confidence' | 'style' |
  'skinColor' | 'hairColor' | 'eyeColor' | 'skinTone' | 'hairColorIndex' | 'eyeColorIndex' |
  'sourceImageKey' | 'presetPoseId' | 'isActive' | 'createdAt' | 'updatedAt'
> {}

/**
 * Full Body Avatar model for storing user's 3D avatar pose and customization
 */
export class FullBodyAvatar extends Model<FullBodyAvatarAttributes, FullBodyAvatarCreationAttributes>
  implements FullBodyAvatarAttributes {

  public id!: string;
  public userId!: string;
  public modelId!: string;
  public rigTransforms!: object;
  public poseType!: string;
  public facingDirection!: string;
  public confidence!: number;
  public style!: 'cartoon' | 'anime' | 'minimalist';
  public skinColor!: string;
  public hairColor!: string;
  public eyeColor!: string;
  public skinTone!: number;
  public hairColorIndex!: number;
  public eyeColorIndex!: number;
  public sourceImageKey!: string | null;
  public presetPoseId!: string | null;
  public isActive!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

FullBodyAvatar.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      comment: 'Unique full-body avatar identifier'
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'user_id',
      references: {
        model: 'users',
        key: 'id'
      },
      onDelete: 'CASCADE',
      comment: 'Reference to the user who owns this avatar'
    },
    modelId: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'avatar_sakura',
      field: 'model_id',
      comment: 'Reference to the VRM model to use (e.g., avatar_sakura)'
    },
    rigTransforms: {
      type: DataTypes.JSONB,
      allowNull: false,
      field: 'rig_transforms',
      comment: 'JSON object containing bone transforms for 3D rig'
    },
    poseType: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'standing',
      field: 'pose_type',
      comment: 'Type of pose: standing, sitting, lying, etc.'
    },
    facingDirection: {
      type: DataTypes.STRING(10),
      allowNull: false,
      defaultValue: 'front',
      field: 'facing_direction',
      comment: 'Direction person is facing: front, back, side'
    },
    confidence: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
      comment: 'Confidence score of pose detection (0-1)'
    },
    style: {
      type: DataTypes.ENUM('cartoon', 'anime', 'minimalist'),
      allowNull: false,
      defaultValue: 'cartoon',
      comment: 'Visual style of the avatar'
    },
    skinColor: {
      type: DataTypes.STRING(10),
      allowNull: false,
      defaultValue: '#FFE0BD',
      field: 'skin_color',
      comment: 'Hex color for skin (e.g., #FFE0BD)'
    },
    hairColor: {
      type: DataTypes.STRING(10),
      allowNull: false,
      defaultValue: '#2C1810',
      field: 'hair_color',
      comment: 'Hex color for hair (e.g., #2C1810)'
    },
    eyeColor: {
      type: DataTypes.STRING(10),
      allowNull: false,
      defaultValue: '#4A3728',
      field: 'eye_color',
      comment: 'Hex color for eyes (e.g., #4A3728)'
    },
    skinTone: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 2,
      field: 'skin_tone',
      validate: {
        min: 0,
        max: 5
      },
      comment: 'Legacy skin tone index (0-5)'
    },
    hairColorIndex: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      field: 'hair_color_index',
      validate: {
        min: 0,
        max: 9
      },
      comment: 'Legacy hair color index (0-9)'
    },
    eyeColorIndex: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'eye_color_index',
      validate: {
        min: 0,
        max: 7
      },
      comment: 'Legacy eye color index (0-7)'
    },
    sourceImageKey: {
      type: DataTypes.STRING(255),
      allowNull: true,
      defaultValue: null,
      field: 'source_image_key',
      comment: 'S3 key for original source image (for reprocessing)'
    },
    presetPoseId: {
      type: DataTypes.STRING(50),
      allowNull: true,
      defaultValue: null,
      field: 'preset_pose_id',
      comment: 'ID of preset pose if using a preset instead of custom pose'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'is_active',
      comment: 'Whether this is the currently active full-body avatar'
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'created_at'
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'updated_at'
    }
  },
  {
    sequelize,
    tableName: 'full_body_avatars',
    underscored: true,
    timestamps: true,
    indexes: [
      {
        name: 'full_body_avatars_user_id_idx',
        fields: ['user_id']
      },
      {
        name: 'full_body_avatars_user_active_idx',
        fields: ['user_id', 'is_active']
      }
    ]
  }
);

export default FullBodyAvatar;
