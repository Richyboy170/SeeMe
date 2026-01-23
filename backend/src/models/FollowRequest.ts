import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

/**
 * Follow request status types
 */
export type FollowRequestStatus = 'pending' | 'approved' | 'rejected';

/**
 * FollowRequest attributes interface
 */
export interface FollowRequestAttributes {
  id: string;
  requesterId: string;
  targetId: string;
  status: FollowRequestStatus;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Optional attributes for follow request creation
 */
interface FollowRequestCreationAttributes extends Optional<FollowRequestAttributes, 'id' | 'status' | 'createdAt' | 'updatedAt'> {}

/**
 * FollowRequest model representing follow requests for private accounts
 */
export class FollowRequest extends Model<FollowRequestAttributes, FollowRequestCreationAttributes> implements FollowRequestAttributes {
  public id!: string;
  public requesterId!: string;
  public targetId!: string;
  public status!: FollowRequestStatus;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

FollowRequest.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      comment: 'Unique follow request identifier'
    },
    requesterId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      onDelete: 'CASCADE',
      comment: 'ID of the user sending the follow request'
    },
    targetId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      onDelete: 'CASCADE',
      comment: 'ID of the user receiving the follow request'
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'pending',
      validate: {
        isIn: {
          args: [['pending', 'approved', 'rejected']],
          msg: 'Invalid follow request status'
        }
      },
      comment: 'Request status: pending, approved, rejected'
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
    tableName: 'follow_requests',
    timestamps: true,
    validate: {
      cannotRequestSelf() {
        if (this.requesterId === this.targetId) {
          throw new Error('Users cannot send follow requests to themselves');
        }
      }
    }
  }
);

export default FollowRequest;
