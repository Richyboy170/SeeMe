import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export interface ActivityCompletionAttributes {
  id: string;
  activityId: string;
  userId: string;
  postId: string;
  createdAt: Date;
}

interface ActivityCompletionCreationAttributes extends Optional<
  ActivityCompletionAttributes,
  'id' | 'createdAt'
> {}

export class ActivityCompletion extends Model<ActivityCompletionAttributes, ActivityCompletionCreationAttributes> implements ActivityCompletionAttributes {
  public id!: string;
  public activityId!: string;
  public userId!: string;
  public postId!: string;
  public readonly createdAt!: Date;
}

ActivityCompletion.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    activityId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'community_activities', key: 'id' },
      onDelete: 'CASCADE',
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onDelete: 'CASCADE',
    },
    postId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'posts', key: 'id' },
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
    tableName: 'activity_completions',
    timestamps: false,
  }
);

export default ActivityCompletion;
