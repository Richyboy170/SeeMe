import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export interface CornerIconPurchaseAttributes {
  id: string;
  userId: string;
  iconFamily: string;
  iconName: string;
  pricePaid: number;
  purchasedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface CornerIconPurchaseCreationAttributes extends Optional<
  CornerIconPurchaseAttributes,
  'id' | 'purchasedAt' | 'createdAt' | 'updatedAt'
> {}

export class CornerIconPurchase extends Model<CornerIconPurchaseAttributes, CornerIconPurchaseCreationAttributes>
  implements CornerIconPurchaseAttributes {
  public id!: string;
  public userId!: string;
  public iconFamily!: string;
  public iconName!: string;
  public pricePaid!: number;
  public purchasedAt!: Date;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

CornerIconPurchase.init(
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
    iconFamily: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    iconName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    pricePaid: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    purchasedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
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
    tableName: 'corner_icon_purchases',
    timestamps: true,
  }
);

export default CornerIconPurchase;
