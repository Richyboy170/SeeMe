import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export interface FriendshipMeetupAttributes {
  id: string;
  sessionId: string;
  userAId: string;
  userBId: string;
  locationName: string | null;
  lat: number | null;
  lng: number | null;
  photoStripUrl: string | null;
  decoratedStripUrl: string | null;
  coinsAwarded: number;
  completedAt: Date;
  createdAt: Date;
}

interface FriendshipMeetupCreationAttributes extends Optional<
  FriendshipMeetupAttributes,
  'id' | 'locationName' | 'lat' | 'lng' | 'photoStripUrl' | 'decoratedStripUrl' | 'coinsAwarded' | 'completedAt' | 'createdAt'
> {}

export class FriendshipMeetup extends Model<FriendshipMeetupAttributes, FriendshipMeetupCreationAttributes>
  implements FriendshipMeetupAttributes {
  public id!: string;
  public sessionId!: string;
  public userAId!: string;
  public userBId!: string;
  public locationName!: string | null;
  public lat!: number | null;
  public lng!: number | null;
  public photoStripUrl!: string | null;
  public decoratedStripUrl!: string | null;
  public coinsAwarded!: number;
  public completedAt!: Date;
  public readonly createdAt!: Date;
}

FriendshipMeetup.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    sessionId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'friendship_sessions', key: 'id' },
      onDelete: 'CASCADE'
    },
    userAId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onDelete: 'CASCADE',
      comment: 'Canonical ordering: smaller UUID'
    },
    userBId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onDelete: 'CASCADE',
      comment: 'Canonical ordering: larger UUID'
    },
    locationName: { type: DataTypes.STRING(255), allowNull: true },
    lat: { type: DataTypes.FLOAT, allowNull: true },
    lng: { type: DataTypes.FLOAT, allowNull: true },
    photoStripUrl: { type: DataTypes.STRING(500), allowNull: true },
    decoratedStripUrl: { type: DataTypes.STRING(500), allowNull: true },
    coinsAwarded: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 20
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  },
  {
    sequelize,
    tableName: 'friendship_meetups',
    timestamps: true,
    updatedAt: false,
    underscored: true
  }
);

export default FriendshipMeetup;
