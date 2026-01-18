import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

/**
 * CoinTransaction attributes interface
 */
export interface CoinTransactionAttributes {
  id: string;
  fromUserId: string | null;
  toUserId: string;
  amount: number;
  transactionType: string;
  relatedPostId: string | null;
  relatedCommentId: string | null;
  message: string | null;
  createdAt: Date;
}

/**
 * Optional attributes for CoinTransaction creation
 */
interface CoinTransactionCreationAttributes extends Optional<
  CoinTransactionAttributes,
  'id' | 'fromUserId' | 'relatedPostId' | 'relatedCommentId' | 'message' | 'createdAt'
> {}

/**
 * CoinTransaction model representing coin transaction history
 *
 * Transaction types:
 * - 'welcome_bonus': Initial 3 coins on signup
 * - 'earned_post': Coins earned from creating a post
 * - 'earned_comment': Coins earned from writing a comment
 * - 'earned_ad': Coins earned from watching an ad
 * - 'earned_cooldown': Coins claimed from cooldown system
 * - 'given_to_user': Coins given to another user
 * - 'received_from_user': Coins received from another user
 */
export class CoinTransaction extends Model<CoinTransactionAttributes, CoinTransactionCreationAttributes>
  implements CoinTransactionAttributes {
  public id!: string;
  public fromUserId!: string | null;
  public toUserId!: string;
  public amount!: number;
  public transactionType!: string;
  public relatedPostId!: string | null;
  public relatedCommentId!: string | null;
  public message!: string | null;
  public readonly createdAt!: Date;
}

CoinTransaction.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      comment: 'Unique transaction identifier'
    },
    fromUserId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      },
      onDelete: 'SET NULL',
      comment: 'User who sent coins (NULL for system-generated)'
    },
    toUserId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      onDelete: 'CASCADE',
      comment: 'User who received coins'
    },
    amount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: {
          args: [1],
          msg: 'Amount must be at least 1 coin'
        }
      },
      comment: 'Number of coins'
    },
    transactionType: {
      type: DataTypes.STRING(30),
      allowNull: false,
      validate: {
        isIn: {
          args: [[
            'welcome_bonus',
            'earned_post',
            'earned_comment',
            'earned_ad',
            'earned_cooldown',
            'given_to_user',
            'received_from_user'
          ]],
          msg: 'Invalid transaction type'
        }
      },
      comment: 'Type of transaction'
    },
    relatedPostId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'posts',
        key: 'id'
      },
      onDelete: 'SET NULL',
      comment: 'Related post if applicable'
    },
    relatedCommentId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'comments',
        key: 'id'
      },
      onDelete: 'SET NULL',
      comment: 'Related comment if applicable'
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Optional message when giving coins'
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  },
  {
    sequelize,
    tableName: 'coin_transactions',
    timestamps: true,
    updatedAt: false,
    // Temporarily disable indexes for SQLite compatibility
    // indexes: [
    //   {
    //     name: 'idx_coin_transactions_from_user',
    //     fields: ['from_user_id', { name: 'created_at', order: 'DESC' }]
    //   },
    //   {
    //     name: 'idx_coin_transactions_to_user',
    //     fields: ['to_user_id', { name: 'created_at', order: 'DESC' }]
    //   },
    //   {
    //     name: 'idx_coin_transactions_type',
    //     fields: ['transaction_type']
    //   }
    // ]
  }
);

export default CoinTransaction;
