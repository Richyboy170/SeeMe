import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

/**
 * Post processing status enum
 */
export enum PostStatus {
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

/**
 * Post attributes interface
 */
export interface PostAttributes {
  id: string;
  userId: string;
  originalImageUrl: string;
  processedImageUrl: string | null;
  thumbnailUrl: string | null;
  caption: string | null;
  status: PostStatus;
  processingError: string | null;
  processingStartedAt: Date | null;
  processingCompletedAt: Date | null;
  processingTimeSeconds: number | null;
  avatarId: string | null;
  likesCount: number;
  commentsCount: number;
  imageWidth: number | null;
  imageHeight: number | null;
  facesDetected: number | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Optional attributes for post creation
 */
interface PostCreationAttributes extends Optional<
  PostAttributes,
  | 'id'
  | 'processedImageUrl'
  | 'thumbnailUrl'
  | 'caption'
  | 'status'
  | 'processingError'
  | 'processingStartedAt'
  | 'processingCompletedAt'
  | 'processingTimeSeconds'
  | 'avatarId'
  | 'likesCount'
  | 'commentsCount'
  | 'imageWidth'
  | 'imageHeight'
  | 'facesDetected'
  | 'createdAt'
  | 'updatedAt'
> {}

/**
 * Post model representing user-uploaded images with AI processing
 */
export class Post extends Model<PostAttributes, PostCreationAttributes> implements PostAttributes {
  public id!: string;
  public userId!: string;
  public originalImageUrl!: string;
  public processedImageUrl!: string | null;
  public thumbnailUrl!: string | null;
  public caption!: string | null;
  public status!: PostStatus;
  public processingError!: string | null;
  public processingStartedAt!: Date | null;
  public processingCompletedAt!: Date | null;
  public processingTimeSeconds!: number | null;
  public avatarId!: string | null;
  public likesCount!: number;
  public commentsCount!: number;
  public imageWidth!: number | null;
  public imageHeight!: number | null;
  public facesDetected!: number | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Post.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      comment: 'Unique post identifier'
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      onDelete: 'CASCADE',
      comment: 'ID of the user who created this post'
    },
    originalImageUrl: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: 'URL to the original uploaded image'
    },
    processedImageUrl: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'URL to the AI-processed image'
    },
    thumbnailUrl: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'URL to the thumbnail image'
    },
    caption: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'User-provided caption for the post'
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: PostStatus.PROCESSING,
      validate: {
        isIn: {
          args: [[PostStatus.PROCESSING, PostStatus.COMPLETED, PostStatus.FAILED]],
          msg: 'Status must be processing, completed, or failed'
        }
      },
      comment: 'Current processing status of the post'
    },
    processingError: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Error message if processing failed'
    },
    processingStartedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Timestamp when processing started'
    },
    processingCompletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Timestamp when processing completed'
    },
    processingTimeSeconds: {
      type: DataTypes.FLOAT,
      allowNull: true,
      comment: 'Total processing time in seconds'
    },
    avatarId: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'ID of the avatar used for this post'
    },
    likesCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
      comment: 'Number of likes on this post'
    },
    commentsCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
      comment: 'Number of comments on this post'
    },
    imageWidth: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Width of the processed image in pixels'
    },
    imageHeight: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Height of the processed image in pixels'
    },
    facesDetected: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Number of faces detected in the image'
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  },
  {
    sequelize,
    tableName: 'posts',
    timestamps: true,
    // Temporarily disable indexes for SQLite compatibility
    // indexes: [
    //   {
    //     name: 'idx_posts_user_created',
    //     fields: ['user_id', 'created_at']
    //   },
    //   {
    //     name: 'idx_posts_status',
    //     fields: ['status']
    //   },
    //   {
    //     name: 'idx_posts_created',
    //     fields: ['created_at']
    //   }
    // ]
  }
);

export default Post;
