import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export interface FriendshipPhotoAttributes {
  id: string;
  meetupId: string;
  poseIndex: number;
  poseName: string;
  photoUrl: string;
  poseValidated: boolean;
  validationScore: number;
  createdAt: Date;
}

interface FriendshipPhotoCreationAttributes extends Optional<
  FriendshipPhotoAttributes,
  'id' | 'poseValidated' | 'validationScore' | 'createdAt'
> {}

export class FriendshipPhoto extends Model<FriendshipPhotoAttributes, FriendshipPhotoCreationAttributes>
  implements FriendshipPhotoAttributes {
  public id!: string;
  public meetupId!: string;
  public poseIndex!: number;
  public poseName!: string;
  public photoUrl!: string;
  public poseValidated!: boolean;
  public validationScore!: number;
  public readonly createdAt!: Date;
}

FriendshipPhoto.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    meetupId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'friendship_meetups', key: 'id' },
      onDelete: 'CASCADE'
    },
    poseIndex: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: '0-3 for each of the 4 poses'
    },
    poseName: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    photoUrl: {
      type: DataTypes.STRING(500),
      allowNull: false
    },
    poseValidated: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    validationScore: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  },
  {
    sequelize,
    tableName: 'friendship_photos',
    timestamps: true,
    updatedAt: false,
    underscored: true
  }
);

export default FriendshipPhoto;
