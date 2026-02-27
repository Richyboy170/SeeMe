import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export interface FriendshipSessionAttributes {
  id: string;
  hostUserId: string;
  guestUserId: string | null;
  inviteCode: string;
  status: 'pending' | 'active' | 'capturing' | 'completed' | 'expired' | 'cancelled';
  hostLat: number | null;
  hostLng: number | null;
  guestLat: number | null;
  guestLng: number | null;
  assignedPoses: string; // JSON array of pose names
  currentPoseIndex: number;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface FriendshipSessionCreationAttributes extends Optional<
  FriendshipSessionAttributes,
  'id' | 'guestUserId' | 'hostLat' | 'hostLng' | 'guestLat' | 'guestLng' | 'currentPoseIndex' | 'createdAt' | 'updatedAt'
> {}

export class FriendshipSession extends Model<FriendshipSessionAttributes, FriendshipSessionCreationAttributes>
  implements FriendshipSessionAttributes {
  public id!: string;
  public hostUserId!: string;
  public guestUserId!: string | null;
  public inviteCode!: string;
  public status!: 'pending' | 'active' | 'capturing' | 'completed' | 'expired' | 'cancelled';
  public hostLat!: number | null;
  public hostLng!: number | null;
  public guestLat!: number | null;
  public guestLng!: number | null;
  public assignedPoses!: string;
  public currentPoseIndex!: number;
  public expiresAt!: Date;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

FriendshipSession.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    hostUserId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onDelete: 'CASCADE'
    },
    guestUserId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'users', key: 'id' },
      onDelete: 'SET NULL'
    },
    inviteCode: {
      type: DataTypes.STRING(6),
      allowNull: false,
      unique: true
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'pending',
      validate: {
        isIn: [['pending', 'active', 'capturing', 'completed', 'expired', 'cancelled']]
      }
    },
    hostLat: { type: DataTypes.FLOAT, allowNull: true },
    hostLng: { type: DataTypes.FLOAT, allowNull: true },
    guestLat: { type: DataTypes.FLOAT, allowNull: true },
    guestLng: { type: DataTypes.FLOAT, allowNull: true },
    assignedPoses: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: 'JSON array of 4 pose names'
    },
    currentPoseIndex: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false
    },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  },
  {
    sequelize,
    tableName: 'friendship_sessions',
    timestamps: true,
    underscored: true
  }
);

export default FriendshipSession;
