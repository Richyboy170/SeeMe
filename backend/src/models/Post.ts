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
 * Post visibility enum (Phase 3.3)
 */
export enum PostVisibility {
  FRIENDS_ONLY = 'friends_only',
  TOPICS_ONLY = 'topics_only',
  TOPICS_AND_FRIENDS = 'topics_and_friends'
}

/**
 * Post type enum - distinguishes regular posts from activity posts
 */
export enum PostType {
  REGULAR = 'regular',
  ACTIVITY = 'activity'
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
  visibility: PostVisibility;  // Phase 3.3: Post visibility
  postType: PostType;
  activityId: string | null;
  goalId: string | null;
  goalVisible: boolean | null;
  processingError: string | null;
  processingStartedAt: Date | null;
  processingCompletedAt: Date | null;
  processingTimeSeconds: number | null;
  avatarId: string | null;
  likesCount: number;
  commentsCount: number;
  repostCount: number;
  isArchived: boolean;
  imageWidth: number | null;
  imageHeight: number | null;
  facesDetected: number | null;
  locationName: string | null;
  locationLat: number | null;
  locationLng: number | null;
  photoTakenAt: Date | null;
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
  | 'visibility'
  | 'postType'
  | 'activityId'
  | 'goalId'
  | 'goalVisible'
  | 'processingError'
  | 'processingStartedAt'
  | 'processingCompletedAt'
  | 'processingTimeSeconds'
  | 'avatarId'
  | 'likesCount'
  | 'commentsCount'
  | 'repostCount'
  | 'isArchived'
  | 'imageWidth'
  | 'imageHeight'
  | 'facesDetected'
  | 'locationName'
  | 'locationLat'
  | 'locationLng'
  | 'photoTakenAt'
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
  public visibility!: PostVisibility;
  public postType!: PostType;
  public activityId!: string | null;
  public goalId!: string | null;
  public goalVisible!: boolean | null;
  public processingError!: string | null;
  public processingStartedAt!: Date | null;
  public processingCompletedAt!: Date | null;
  public processingTimeSeconds!: number | null;
  public avatarId!: string | null;
  public likesCount!: number;
  public commentsCount!: number;
  public repostCount!: number;
  public isArchived!: boolean;
  public imageWidth!: number | null;
  public imageHeight!: number | null;
  public facesDetected!: number | null;
  public locationName!: string | null;
  public locationLat!: number | null;
  public locationLng!: number | null;
  public photoTakenAt!: Date | null;
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
    visibility: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: PostVisibility.FRIENDS_ONLY,
      validate: {
        isIn: {
          args: [[PostVisibility.FRIENDS_ONLY, PostVisibility.TOPICS_ONLY, PostVisibility.TOPICS_AND_FRIENDS]],
          msg: 'Visibility must be friends_only, topics_only, or topics_and_friends'
        }
      },
      comment: 'Phase 3.3: Who can see this post in their feed'
    },
    postType: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: PostType.REGULAR,
      validate: {
        isIn: {
          args: [[PostType.REGULAR, PostType.ACTIVITY]],
          msg: 'Post type must be regular or activity'
        }
      },
      comment: 'Type of post - regular or activity wheel completion'
    },
    activityId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'community_activities',
        key: 'id'
      },
      onDelete: 'SET NULL',
      comment: 'ID of the community activity this post completes'
    },
    goalId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'goals',
        key: 'id'
      },
      onDelete: 'SET NULL',
      comment: 'ID of the goal this post is tagged with'
    },
    goalVisible: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: null,
      comment: 'Whether the goal tag on this post is visible to others (per-post override)'
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
    repostCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
      comment: 'Number of reposts on this post'
    },
    isArchived: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Whether the post is archived (hidden from feeds)'
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
    locationName: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Human-readable location name (e.g. "Brooklyn, NY")'
    },
    locationLat: {
      type: DataTypes.FLOAT,
      allowNull: true,
      comment: 'GPS latitude'
    },
    locationLng: {
      type: DataTypes.FLOAT,
      allowNull: true,
      comment: 'GPS longitude'
    },
    photoTakenAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'When the photo was taken (from EXIF or capture time)'
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
