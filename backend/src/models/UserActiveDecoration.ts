import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

/**
 * UserActiveDecoration attributes interface
 */
export interface UserActiveDecorationAttributes {
  userId: string;
  lightBackgroundId: string | null;
  darkBackgroundId: string | null;
  frameId: string | null;
  iconColorId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Optional attributes for UserActiveDecoration creation
 */
interface UserActiveDecorationCreationAttributes extends Optional<
  UserActiveDecorationAttributes,
  | 'lightBackgroundId'
  | 'darkBackgroundId'
  | 'frameId'
  | 'iconColorId'
  | 'createdAt'
  | 'updatedAt'
> {}

/**
 * UserActiveDecoration model representing a user's currently active decoration config.
 * One row per user, with userId as primary key.
 */
export class UserActiveDecoration extends Model<UserActiveDecorationAttributes, UserActiveDecorationCreationAttributes>
  implements UserActiveDecorationAttributes {
  public userId!: string;
  public lightBackgroundId!: string | null;
  public darkBackgroundId!: string | null;
  public frameId!: string | null;
  public iconColorId!: string | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

UserActiveDecoration.init(
  {
    userId: {
      type: DataTypes.UUID,
      primaryKey: true,
      references: {
        model: 'users',
        key: 'id'
      },
      onDelete: 'CASCADE',
      comment: 'Reference to user - one active decoration config per user'
    },
    lightBackgroundId: {
      type: DataTypes.UUID,
      allowNull: true,
      defaultValue: null,
      references: {
        model: 'post_decorations',
        key: 'id'
      },
      comment: 'Active background decoration for light theme'
    },
    darkBackgroundId: {
      type: DataTypes.UUID,
      allowNull: true,
      defaultValue: null,
      references: {
        model: 'post_decorations',
        key: 'id'
      },
      comment: 'Active background decoration for dark theme'
    },
    frameId: {
      type: DataTypes.UUID,
      allowNull: true,
      defaultValue: null,
      references: {
        model: 'post_decorations',
        key: 'id'
      },
      comment: 'Active frame decoration'
    },
    iconColorId: {
      type: DataTypes.UUID,
      allowNull: true,
      defaultValue: null,
      references: {
        model: 'post_decorations',
        key: 'id'
      },
      comment: 'Active icon color decoration'
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
    tableName: 'user_active_decorations',
    timestamps: true
  }
);

export default UserActiveDecoration;
