import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export type ActivitySource = 'ai_generated' | 'admin_assigned';

export interface CommunityActivityAttributes {
  id: string;
  topicId: string;
  title: string;
  description: string | null;
  researchBasis: string | null;
  source: ActivitySource;
  createdByUserId: string | null;
  completionCount: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface CommunityActivityCreationAttributes extends Optional<
  CommunityActivityAttributes,
  'id' | 'description' | 'researchBasis' | 'createdByUserId' | 'completionCount' | 'isActive' | 'createdAt' | 'updatedAt'
> {}

export class CommunityActivity extends Model<CommunityActivityAttributes, CommunityActivityCreationAttributes> implements CommunityActivityAttributes {
  public id!: string;
  public topicId!: string;
  public title!: string;
  public description!: string | null;
  public researchBasis!: string | null;
  public source!: ActivitySource;
  public createdByUserId!: string | null;
  public completionCount!: number;
  public isActive!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

CommunityActivity.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    topicId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'topics', key: 'id' },
      onDelete: 'CASCADE',
    },
    title: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    researchBasis: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Research/science behind why this activity is beneficial',
    },
    source: {
      type: DataTypes.STRING(20),
      allowNull: false,
      validate: {
        isIn: [['ai_generated', 'admin_assigned']],
      },
    },
    createdByUserId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'users', key: 'id' },
      onDelete: 'SET NULL',
    },
    completionCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
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
    tableName: 'community_activities',
    timestamps: true,
  }
);

export default CommunityActivity;
