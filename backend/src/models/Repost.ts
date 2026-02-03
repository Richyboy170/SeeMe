import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

/**
 * Repost type enum
 */
export enum RepostType {
  REPOST = 'repost',       // Simple repost without comment
  QUOTE = 'quote'          // Quote repost with user's comment
}

/**
 * Repost attributes interface
 */
export interface RepostAttributes {
  id: string;
  userId: string;           // User who reposted
  originalPostId: string;   // The post being reposted
  type: RepostType;
  comment: string | null;   // Comment for quote reposts
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Optional attributes for repost creation
 */
interface RepostCreationAttributes extends Optional<
  RepostAttributes,
  'id' | 'comment' | 'createdAt' | 'updatedAt'
> {}

/**
 * Repost model for tracking reposts and quote posts
 */
export class Repost extends Model<RepostAttributes, RepostCreationAttributes> implements RepostAttributes {
  public id!: string;
  public userId!: string;
  public originalPostId!: string;
  public type!: RepostType;
  public comment!: string | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Repost.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      comment: 'Unique repost identifier'
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      onDelete: 'CASCADE',
      comment: 'ID of the user who reposted'
    },
    originalPostId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'posts',
        key: 'id'
      },
      onDelete: 'CASCADE',
      comment: 'ID of the original post being reposted'
    },
    type: {
      type: DataTypes.STRING(10),
      allowNull: false,
      defaultValue: RepostType.REPOST,
      validate: {
        isIn: {
          args: [[RepostType.REPOST, RepostType.QUOTE]],
          msg: 'Type must be repost or quote'
        }
      },
      comment: 'Type of repost: simple repost or quote with comment'
    },
    comment: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'User comment for quote reposts'
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
    tableName: 'reposts',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['user_id', 'original_post_id'],
        name: 'idx_repost_user_post_unique'
      }
    ]
  }
);

export default Repost;
