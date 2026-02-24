import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

/**
 * User attributes interface
 */
export interface UserAttributes {
  id: string;
  username: string;
  email: string;
  passwordHash: string | null;
  googleId: string | null;
  authProvider: 'email' | 'google' | 'both';
  ageVerified: boolean;
  avatarUrl: string | null;
  activeAvatarId: string | null;
  positivityGiveCounter: number;
  positivityRank: string;
  fcmToken: string | null;
  chatNotificationsEnabled: boolean;
  isPrivate: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Optional attributes for user creation
 */
interface UserCreationAttributes extends Optional<UserAttributes, 'id' | 'ageVerified' | 'avatarUrl' | 'activeAvatarId' | 'positivityGiveCounter' | 'positivityRank' | 'fcmToken' | 'chatNotificationsEnabled' | 'isPrivate' | 'createdAt' | 'updatedAt' | 'passwordHash' | 'googleId' | 'authProvider'> {}

/**
 * User model representing registered users in the platform
 */
export class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  public id!: string;
  public username!: string;
  public email!: string;
  public passwordHash!: string | null;
  public googleId!: string | null;
  public authProvider!: 'email' | 'google' | 'both';
  public ageVerified!: boolean;
  public avatarUrl!: string | null;
  public activeAvatarId!: string | null;
  public positivityGiveCounter!: number;
  public positivityRank!: string;
  public fcmToken!: string | null;
  public chatNotificationsEnabled!: boolean;
  public isPrivate!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Override toJSON to exclude passwordHash
  toJSON(): any {
    const values: any = Object.assign({}, this.get());
    delete values.passwordHash;
    return values;
  }
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
      allowNull: true,
      defaultValue: null,
      comment: 'Bcrypt hashed password (null for Google-only accounts)'
    },
    googleId: {
      type: DataTypes.STRING(255),
      allowNull: true,
      defaultValue: null,
      unique: true,
      comment: 'Google user ID for OAuth authentication'
    },
    authProvider: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'email',
      validate: {
        isIn: {
          args: [['email', 'google', 'both']],
          msg: 'Invalid auth provider'
        }
      },
      comment: 'Authentication provider: email, google, or both'
    },
    ageVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
      comment: 'Whether the user has verified their age'
    },
    avatarUrl: {
      type: DataTypes.STRING(500),
      allowNull: true,
      defaultValue: null,
      comment: 'URL to the user profile image'
    },
    activeAvatarId: {
      type: DataTypes.STRING(50),
      allowNull: true,
      defaultValue: null,
      comment: 'ID of the currently active avatar'
    },
    positivityGiveCounter: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
      comment: 'Total number of coins given to others'
    },
    positivityRank: {
      type: DataTypes.STRING(20),
      defaultValue: 'beginner',
      allowNull: false,
      validate: {
        isIn: {
          args: [['beginner', 'kind', 'generous', 'inspirational', 'legend']],
          msg: 'Invalid positivity rank'
        }
      },
      comment: 'Positivity rank based on coins given'
    },
    fcmToken: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
      comment: 'Firebase Cloud Messaging token for push notifications'
    },
    chatNotificationsEnabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false,
      comment: 'Whether user wants to receive chat push notifications'
    },
    isPrivate: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
      comment: 'Whether the user account is private (requires follow approval)'
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
    timestamps: true
  }
);

export default User;
