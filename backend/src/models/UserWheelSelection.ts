import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export interface UserWheelSelectionAttributes {
  id: string;
  userId: string;
  activityId: string;
  createdAt: Date;
}

interface UserWheelSelectionCreationAttributes extends Optional<
  UserWheelSelectionAttributes,
  'id' | 'createdAt'
> {}

export class UserWheelSelection extends Model<UserWheelSelectionAttributes, UserWheelSelectionCreationAttributes> implements UserWheelSelectionAttributes {
  public id!: string;
  public userId!: string;
  public activityId!: string;
  public readonly createdAt!: Date;
}

UserWheelSelection.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onDelete: 'CASCADE',
    },
    activityId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'community_activities', key: 'id' },
      onDelete: 'CASCADE',
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'user_wheel_selections',
    timestamps: false,
  }
);

export default UserWheelSelection;
