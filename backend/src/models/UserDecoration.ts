import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

/**
 * UserDecoration attributes interface
 */
export interface UserDecorationAttributes {
  id: string;
  userId: string;
  decorationId: string;
  purchasedAt: Date;
  pricePaid: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Optional attributes for UserDecoration creation
 */
interface UserDecorationCreationAttributes extends Optional<
  UserDecorationAttributes,
  | 'id'
  | 'purchasedAt'
  | 'createdAt'
  | 'updatedAt'
> {}

/**
 * UserDecoration model tracking user decoration purchases
 */
export class UserDecoration extends Model<UserDecorationAttributes, UserDecorationCreationAttributes>
  implements UserDecorationAttributes {
  public id!: string;
  public userId!: string;
  public decorationId!: string;
  public purchasedAt!: Date;
  public pricePaid!: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

UserDecoration.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
      comment: 'Unique purchase record ID'
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      comment: 'Reference to user who purchased'
    },
    decorationId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'post_decorations',
        key: 'id'
      },
      comment: 'Reference to purchased decoration'
    },
    purchasedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: 'When the purchase was made'
    },
    pricePaid: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: {
          args: [0],
          msg: 'Price paid cannot be negative'
        }
      },
      comment: 'Snapshot of price at purchase time'
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
    tableName: 'user_decorations',
    timestamps: true
  }
);

export default UserDecoration;
