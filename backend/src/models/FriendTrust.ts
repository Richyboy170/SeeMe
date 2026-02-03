import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

/**
 * FriendTrust attributes interface
 * Stores trust relationship between user pairs (canonical ordering: userIdA < userIdB)
 */
export interface FriendTrustAttributes {
  id: string;
  userIdA: string;                    // Lexicographically smaller user ID
  userIdB: string;                    // Lexicographically larger user ID
  currentStreak: number;              // Consecutive days with any exchange
  longestStreak: number;              // Best streak ever achieved
  lastExchangeDate: string | null;    // Last day coins were exchanged (DATEONLY)
  totalExchangeDays: number;          // Total unique days with exchanges
  totalCoinsAToB: number;             // Cumulative coins A sent to B
  totalCoinsBToA: number;             // Cumulative coins B sent to A
  exchangeCountAToB: number;          // Number of transactions A to B
  exchangeCountBToA: number;          // Number of transactions B to A
  bidirectionalDays: number;          // Days where BOTH users exchanged
  trustScore: number;                 // Cached score (0-100)
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Optional attributes for creation
 */
interface FriendTrustCreationAttributes extends Optional<
  FriendTrustAttributes,
  | 'id'
  | 'currentStreak'
  | 'longestStreak'
  | 'lastExchangeDate'
  | 'totalExchangeDays'
  | 'totalCoinsAToB'
  | 'totalCoinsBToA'
  | 'exchangeCountAToB'
  | 'exchangeCountBToA'
  | 'bidirectionalDays'
  | 'trustScore'
  | 'createdAt'
  | 'updatedAt'
> {}

/**
 * FriendTrust model for tracking trust relationships between users
 */
export class FriendTrust extends Model<FriendTrustAttributes, FriendTrustCreationAttributes> implements FriendTrustAttributes {
  public id!: string;
  public userIdA!: string;
  public userIdB!: string;
  public currentStreak!: number;
  public longestStreak!: number;
  public lastExchangeDate!: string | null;
  public totalExchangeDays!: number;
  public totalCoinsAToB!: number;
  public totalCoinsBToA!: number;
  public exchangeCountAToB!: number;
  public exchangeCountBToA!: number;
  public bidirectionalDays!: number;
  public trustScore!: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  /**
   * Get canonical user ordering (A < B)
   */
  static getCanonicalOrder(userId1: string, userId2: string): { userIdA: string; userIdB: string } {
    if (userId1 < userId2) {
      return { userIdA: userId1, userIdB: userId2 };
    }
    return { userIdA: userId2, userIdB: userId1 };
  }

  /**
   * Check if a given userId is userA in this relationship
   */
  isUserA(userId: string): boolean {
    return this.userIdA === userId;
  }
}

FriendTrust.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      comment: 'Unique trust relationship identifier'
    },
    userIdA: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      onDelete: 'CASCADE',
      comment: 'Lexicographically smaller user ID'
    },
    userIdB: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      onDelete: 'CASCADE',
      comment: 'Lexicographically larger user ID'
    },
    currentStreak: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Consecutive days with any exchange'
    },
    longestStreak: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Best streak ever achieved'
    },
    lastExchangeDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      comment: 'Last day coins were exchanged'
    },
    totalExchangeDays: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Total unique days with exchanges'
    },
    totalCoinsAToB: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Cumulative coins A sent to B'
    },
    totalCoinsBToA: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Cumulative coins B sent to A'
    },
    exchangeCountAToB: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Number of transactions A to B'
    },
    exchangeCountBToA: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Number of transactions B to A'
    },
    bidirectionalDays: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Days where BOTH users exchanged'
    },
    trustScore: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Cached trust score (0-100)'
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
    tableName: 'friend_trusts',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['user_id_a', 'user_id_b'],
        name: 'idx_friend_trust_user_pair_unique'
      }
    ]
  }
);

export default FriendTrust;
