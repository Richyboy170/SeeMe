import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

/**
 * CoinGivingActivity attributes interface
 */
export interface CoinGivingActivityAttributes {
  id: string;
  giverId: string;
  receiverId: string;
  coinsAmount: number;
  message: string | null;
  contextType: string | null;
  contextId: string | null;
  createdAt: Date;
}

/**
 * Optional attributes for CoinGivingActivity creation
 */
interface CoinGivingActivityCreationAttributes extends Optional<
  CoinGivingActivityAttributes,
  'id' | 'message' | 'contextType' | 'contextId' | 'createdAt'
> {}

/**
 * CoinGivingActivity model representing coin giving activity for notifications and feed
 *
 * Context types:
 * - 'post': Coins given in context of a post
 * - 'comment': Coins given in context of a comment
 * - 'profile': Coins given from user profile
 * - 'general': General coin giving
 */
export class CoinGivingActivity extends Model<CoinGivingActivityAttributes, CoinGivingActivityCreationAttributes>
  implements CoinGivingActivityAttributes {
  public id!: string;
  public giverId!: string;
  public receiverId!: string;
  public coinsAmount!: number;
  public message!: string | null;
  public contextType!: string | null;
  public contextId!: string | null;
  public readonly createdAt!: Date;
}

CoinGivingActivity.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      comment: 'Unique activity identifier'
    },
    giverId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      onDelete: 'CASCADE',
      comment: 'User who gave coins'
    },
    receiverId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      onDelete: 'CASCADE',
      comment: 'User who received coins'
    },
    coinsAmount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: {
          args: [1],
          msg: 'Coins amount must be at least 1'
        }
      },
      comment: 'Number of coins given'
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Optional message from giver'
    },
    contextType: {
      type: DataTypes.STRING(20),
      allowNull: true,
      validate: {
        isIn: {
          args: [['post', 'comment', 'profile', 'general']],
          msg: 'Invalid context type'
        }
      },
      comment: 'Context where coins were given'
    },
    contextId: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'ID of post/comment if applicable'
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  },
  {
    sequelize,
    tableName: 'coin_giving_activity',
    timestamps: true,
    updatedAt: false,
    indexes: [
      {
        name: 'idx_coin_giving_giver',
        fields: ['giverId', { name: 'createdAt', order: 'DESC' }]
      },
      {
        name: 'idx_coin_giving_receiver',
        fields: ['receiverId', { name: 'createdAt', order: 'DESC' }]
      }
    ]
  }
);

export default CoinGivingActivity;
