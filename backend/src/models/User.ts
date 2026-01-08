import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

/**
 * User attributes interface
 */
export interface UserAttributes {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  ageVerified: boolean;
  activeAvatarId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Optional attributes for user creation
 */
interface UserCreationAttributes extends Optional<UserAttributes, 'id' | 'ageVerified' | 'activeAvatarId' | 'createdAt' | 'updatedAt'> {}

/**
 * User model representing registered users in the platform
 */
export class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  public id!: string;
  public username!: string;
  public email!: string;
  public passwordHash!: string;
  public ageVerified!: boolean;
  public activeAvatarId!: string | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

User.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      comment: 'Unique user identifier'
    },
    username: {
      type: DataTypes.STRING(30),
      allowNull: false,
      unique: true,
      validate: {
        len: {
          args: [3, 30],
          msg: 'Username must be between 3 and 30 characters'
        },
        isAlphanumeric: {
          msg: 'Username must contain only letters and numbers'
        }
      },
      comment: 'Unique username for the user'
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: {
          msg: 'Must be a valid email address'
        }
      },
      comment: 'User email address'
    },
    passwordHash: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: 'Bcrypt hashed password'
    },
    ageVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
      comment: 'Whether the user has verified their age'
    },
    activeAvatarId: {
      type: DataTypes.STRING(50),
      allowNull: true,
      defaultValue: null,
      comment: 'ID of the currently active avatar'
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
    tableName: 'users',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['email']
      },
      {
        unique: true,
        fields: ['username']
      }
    ]
  }
);

export default User;
