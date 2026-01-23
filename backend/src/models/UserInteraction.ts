import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

/**
 * Interaction types for tracking user engagement
 */
export enum InteractionType {
  VIEW = 'view',           // User viewed a post
  LIKE = 'like',           // User liked a post
  COMMENT = 'comment',     // User commented on a post
  COMMENT_VIEW = 'comment_view', // User viewed comments
  SHARE = 'share',         // User shared a post
  PROFILE_VIEW = 'profile_view', // User viewed another user's profile
  FOLLOW = 'follow',       // User followed another user
  COIN_GIFT = 'coin_gift', // User gifted coins
  SAVE = 'save',           // User saved a post
}

/**
 * UserInteraction attributes interface
 */
export interface UserInteractionAttributes {
  id: string;
  userId: string;           // The user performing the interaction
  targetUserId: string | null;  // The user being interacted with (post owner, profile viewed, etc.)
  targetPostId: string | null;  // The post being interacted with (if applicable)
  interactionType: InteractionType;
  weight: number;           // Weight/score for this interaction (for algorithm)
  metadata: object | null;  // Additional metadata (e.g., view duration, scroll depth)
  createdAt: Date;
}

/**
 * Optional attributes for interaction creation
 */
interface UserInteractionCreationAttributes extends Optional<
  UserInteractionAttributes,
  'id' | 'targetUserId' | 'targetPostId' | 'weight' | 'metadata' | 'createdAt'
> {}

/**
 * UserInteraction model for tracking engagement and powering the feed algorithm
 */
export class UserInteraction extends Model<UserInteractionAttributes, UserInteractionCreationAttributes>
  implements UserInteractionAttributes {
  public id!: string;
  public userId!: string;
  public targetUserId!: string | null;
  public targetPostId!: string | null;
  public interactionType!: InteractionType;
  public weight!: number;
  public metadata!: object | null;
  public readonly createdAt!: Date;

  /**
   * Get interaction weight based on type
   */
  static getInteractionWeight(type: InteractionType): number {
    const weights: Record<InteractionType, number> = {
      [InteractionType.VIEW]: 1,
      [InteractionType.LIKE]: 5,
      [InteractionType.COMMENT]: 10,
      [InteractionType.COMMENT_VIEW]: 2,
      [InteractionType.SHARE]: 15,
      [InteractionType.PROFILE_VIEW]: 3,
      [InteractionType.FOLLOW]: 20,
      [InteractionType.COIN_GIFT]: 25,
      [InteractionType.SAVE]: 8,
    };
    return weights[type] || 1;
  }
}

UserInteraction.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      comment: 'Unique interaction identifier'
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      onDelete: 'CASCADE',
      comment: 'ID of the user performing the interaction'
    },
    targetUserId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      },
      onDelete: 'CASCADE',
      comment: 'ID of the user being interacted with'
    },
    targetPostId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'posts',
        key: 'id'
      },
      onDelete: 'CASCADE',
      comment: 'ID of the post being interacted with'
    },
    interactionType: {
      type: DataTypes.STRING(20),
      allowNull: false,
      validate: {
        isIn: {
          args: [Object.values(InteractionType)],
          msg: 'Invalid interaction type'
        }
      },
      comment: 'Type of interaction'
    },
    weight: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 1,
      comment: 'Weight/score for this interaction'
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Additional metadata for the interaction'
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  },
  {
    sequelize,
    tableName: 'user_interactions',
    timestamps: true,
    updatedAt: false, // No need for updatedAt on interactions
  }
);

export default UserInteraction;
