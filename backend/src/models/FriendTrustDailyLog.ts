import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

/**
 * FriendTrustDailyLog attributes interface
 * Tracks daily activity for accurate streak calculation
 */
export interface FriendTrustDailyLogAttributes {
  id: string;
  friendTrustId: string;       // FK to friend_trusts
  logDate: string;             // The date (DATEONLY)
  coinsAToB: number;           // Coins A sent to B that day
  coinsBToA: number;           // Coins B sent to A that day
  isBidirectional: boolean;    // Both directions had activity
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Optional attributes for creation
 */
interface FriendTrustDailyLogCreationAttributes extends Optional<
  FriendTrustDailyLogAttributes,
  'id' | 'coinsAToB' | 'coinsBToA' | 'isBidirectional' | 'createdAt' | 'updatedAt'
> {}

/**
 * FriendTrustDailyLog model for tracking daily coin exchange activity
 */
export class FriendTrustDailyLog extends Model<
  FriendTrustDailyLogAttributes,
  FriendTrustDailyLogCreationAttributes
> implements FriendTrustDailyLogAttributes {
  public id!: string;
  public friendTrustId!: string;
  public logDate!: string;
  public coinsAToB!: number;
  public coinsBToA!: number;
  public isBidirectional!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

FriendTrustDailyLog.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      comment: 'Unique daily log identifier'
    },
    friendTrustId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'friend_trusts',
        key: 'id'
      },
      onDelete: 'CASCADE',
      comment: 'FK to friend_trusts'
    },
    logDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      comment: 'The date of this log entry'
    },
    coinsAToB: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Coins A sent to B that day'
    },
    coinsBToA: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Coins B sent to A that day'
    },
    isBidirectional: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Both directions had activity'
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
    tableName: 'friend_trust_daily_logs',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['friend_trust_id', 'log_date'],
        name: 'idx_friend_trust_daily_log_unique'
      }
    ]
  }
);

export default FriendTrustDailyLog;
