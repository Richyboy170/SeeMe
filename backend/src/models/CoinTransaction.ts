import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

/**
 * CoinTransaction attributes interface
 */
export interface CoinTransactionAttributes {
  id: string;
  fromUserId: string | null;
  toUserId: string | null;
  amount: number;
  transactionType: string;
  relatedPostId: string | null;
  relatedCommentId: string | null;
  topicId: string | null;  // Phase 3.3: Topic-specific transactions
  message: string | null;
  collected: boolean;
  createdAt: Date;
}

/**
 * Optional attributes for CoinTransaction creation
 */
interface CoinTransactionCreationAttributes extends Optional<
  CoinTransactionAttributes,
  'id' | 'fromUserId' | 'toUserId' | 'relatedPostId' | 'relatedCommentId' | 'topicId' | 'message' | 'collected' | 'createdAt'
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
 * - 'spent_on_post': Coins spent to create a post
 */
export class CoinTransaction extends Model<CoinTransactionAttributes, CoinTransactionCreationAttributes>
  implements CoinTransactionAttributes {
  public id!: string;
  public fromUserId!: string | null;
  public toUserId!: string | null;
  public amount!: number;
  public transactionType!: string;
  public relatedPostId!: string | null;
  public relatedCommentId!: string | null;
  public topicId!: string | null;
  public message!: string | null;
  public collected!: boolean;
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
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      },
      onDelete: 'CASCADE',
      comment: 'User who received coins (NULL for system deductions like post cost)'
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
            'received_from_user',
            'spent_on_post',
            // Phase 3.3: Community encouragement types
            'encouragement',
            'gift',
            'post_reward',
            'beginner_bonus',
            // Bot reward types
            'bot_welcome',
            'bot_generosity_reward',
            // Onboarding mission rewards
            'mission_reward',
            // Friendship meetup rewards
            'earned_friendship'
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
    topicId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'topics',
        key: 'id'
      },
      onDelete: 'SET NULL',
      comment: 'Phase 3.3: Topic where coins were given'
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Optional message when giving coins'
    },
    collected: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Whether received coins have been collected by the user'
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
