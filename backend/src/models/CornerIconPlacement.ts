import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export type CornerPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export interface CornerIconPlacementAttributes {
  id: string;
  userId: string;
  position: CornerPosition;
  iconFamily: string;
  iconName: string;
  color: string;
  createdAt: Date;
  updatedAt: Date;
}

interface CornerIconPlacementCreationAttributes extends Optional<
  CornerIconPlacementAttributes,
  'id' | 'createdAt' | 'updatedAt'
> {}

export class CornerIconPlacement extends Model<CornerIconPlacementAttributes, CornerIconPlacementCreationAttributes>
  implements CornerIconPlacementAttributes {
  public id!: string;
  public userId!: string;
  public position!: CornerPosition;
  public iconFamily!: string;
  public iconName!: string;
  public color!: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

CornerIconPlacement.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'users', key: 'id' },
    },
    position: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isIn: [['top-left', 'top-right', 'bottom-left', 'bottom-right']],
      },
    },
    iconFamily: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    iconName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    color: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: '#FFFFFF',
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
    tableName: 'corner_icon_placements',
    timestamps: true,
  }
);

export default CornerIconPlacement;
