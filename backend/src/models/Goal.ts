import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export interface GoalAttributes {
  id: string;
  userId: string;
  title: string;
  isVisible: boolean;
  isActive: boolean;
  isCompleted: boolean;
  showOnProfile: boolean;
  completedAt: Date | null;
  postsCount: number;
  createdAt: Date;
  updatedAt: Date;
}

interface GoalCreationAttributes extends Optional<
  GoalAttributes,
  'id' | 'isVisible' | 'isActive' | 'isCompleted' | 'showOnProfile' | 'completedAt' | 'postsCount' | 'createdAt' | 'updatedAt'
> {}

export class Goal extends Model<GoalAttributes, GoalCreationAttributes> implements GoalAttributes {
  public id!: string;
  public userId!: string;
  public title!: string;
  public isVisible!: boolean;
  public isActive!: boolean;
  public isCompleted!: boolean;
  public showOnProfile!: boolean;
  public completedAt!: Date | null;
  public postsCount!: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Goal.init(
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
    title: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    isVisible: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    isCompleted: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
    },
    showOnProfile: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    postsCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'goals',
    timestamps: true,
  }
);

export default Goal;
