import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

/**
 * BlockedUser attributes interface
 */
export interface BlockedUserAttributes {
  id: string;
  blockerId: string;
  blockedId: string;
  reason: string | null;
  createdAt: Date;
}

/**
 * Optional attributes for blocked user creation
 */
interface BlockedUserCreationAttributes extends Optional<BlockedUserAttributes, 'id' | 'reason' | 'createdAt'> {}

/**
 * BlockedUser model representing a user blocking relationship
 */
export class BlockedUser extends Model<BlockedUserAttributes, BlockedUserCreationAttributes> implements BlockedUserAttributes {
  public id!: string;
  public blockerId!: string;
  public blockedId!: string;
  public reason!: string | null;
  public readonly createdAt!: Date;
}

BlockedUser.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      comment: 'Unique block record identifier'
    },
    blockerId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      onDelete: 'CASCADE',
      comment: 'ID of the user who blocked'
    },
    blockedId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      onDelete: 'CASCADE',
      comment: 'ID of the user who was blocked'
    },
    reason: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
      comment: 'Optional reason for blocking'
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  },
  {
    sequelize,
    tableName: 'blocked_users',
    timestamps: true,
    updatedAt: false,
    // Temporarily disable indexes for SQLite compatibility
    // indexes: [
    //   {
    //     fields: ['blocker_id']
    //   },
    //   {
    //     fields: ['blocked_id']
    //   },
    //   {
    //     unique: true,
    //     fields: ['blocker_id', 'blocked_id'],
    //     name: 'blocked_users_unique'
    //   }
    // ]
  }
);

export default BlockedUser;
