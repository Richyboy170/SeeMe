import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

/**
 * Follow attributes interface
 */
export interface FollowAttributes {
  id: string;
  followerId: string;
  followingId: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Optional attributes for follow creation
 */
interface FollowCreationAttributes extends Optional<FollowAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

/**
 * Follow model representing user following relationships
 */
export class Follow extends Model<FollowAttributes, FollowCreationAttributes> implements FollowAttributes {
  public id!: string;
  public followerId!: string;
  public followingId!: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Follow.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      comment: 'Unique follow relationship identifier'
    },
    followerId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      onDelete: 'CASCADE',
      comment: 'ID of the user who is following'
    },
    followingId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      onDelete: 'CASCADE',
      comment: 'ID of the user being followed'
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
    tableName: 'follows',
    timestamps: true,
    indexes: [
      {
        unique: true,
        name: 'unique_follow_relationship',
        fields: ['followerId', 'followingId']
      },
      {
        name: 'idx_follows_follower',
        fields: ['followerId']
      },
      {
        name: 'idx_follows_following',
        fields: ['followingId']
      },
      {
        name: 'idx_follows_created',
        fields: ['createdAt']
      }
    ],
    validate: {
      cannotFollowSelf() {
        if (this.followerId === this.followingId) {
          throw new Error('Users cannot follow themselves');
        }
      }
    }
  }
);

export default Follow;
