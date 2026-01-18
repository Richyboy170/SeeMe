import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

/**
 * PositivityCoins attributes interface
 */
export interface PositivityCoinsAttributes {
  userId: string;
  totalCoins: number;
  lifetimeEarned: number;
  lifetimeGiven: number;
  cooldownCoinsAvailable: number;
  lastCooldownClaim: Date | null;
  nextCooldownAvailableAt: Date | null;
  coinsFromPosts: number;
  coinsFromComments: number;
  coinsFromAds: number;
  coinsFromCooldown: number;
  coinsFromOther: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Optional attributes for PositivityCoins creation
 */
interface PositivityCoinsCreationAttributes extends Optional<
  PositivityCoinsAttributes,
  | 'totalCoins'
  | 'lifetimeEarned'
  | 'lifetimeGiven'
  | 'cooldownCoinsAvailable'
  | 'lastCooldownClaim'
  | 'nextCooldownAvailableAt'
  | 'coinsFromPosts'
  | 'coinsFromComments'
  | 'coinsFromAds'
  | 'coinsFromCooldown'
  | 'coinsFromOther'
  | 'createdAt'
  | 'updatedAt'
> {}

/**
 * PositivityCoins model representing user coin balances and statistics
 */
export class PositivityCoins extends Model<PositivityCoinsAttributes, PositivityCoinsCreationAttributes>
  implements PositivityCoinsAttributes {
  public userId!: string;
  public totalCoins!: number;
  public lifetimeEarned!: number;
  public lifetimeGiven!: number;
  public cooldownCoinsAvailable!: number;
  public lastCooldownClaim!: Date | null;
  public nextCooldownAvailableAt!: Date | null;
  public coinsFromPosts!: number;
  public coinsFromComments!: number;
  public coinsFromAds!: number;
  public coinsFromCooldown!: number;
  public coinsFromOther!: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

PositivityCoins.init(
  {
    userId: {
      type: DataTypes.UUID,
      primaryKey: true,
      references: {
        model: 'users',
        key: 'id'
      },
      onDelete: 'CASCADE',
      comment: 'Reference to user'
    },
    totalCoins: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
      validate: {
        min: {
          args: [0],
          msg: 'Total coins cannot be negative'
        }
      },
      comment: 'Total coins user currently has'
    },
    lifetimeEarned: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
      validate: {
        min: {
          args: [0],
          msg: 'Lifetime earned cannot be negative'
        }
      },
      comment: 'Total coins ever earned'
    },
    lifetimeGiven: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
      validate: {
        min: {
          args: [0],
          msg: 'Lifetime given cannot be negative'
        }
      },
      comment: 'Total coins ever given (for Give Counter)'
    },
    cooldownCoinsAvailable: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
      validate: {
        min: {
          args: [0],
          msg: 'Cooldown coins cannot be negative'
        },
        max: {
          args: [3],
          msg: 'Maximum 3 cooldown coins allowed'
        }
      },
      comment: '0-3 available cooldown coins'
    },
    lastCooldownClaim: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'When user last claimed cooldown coin'
    },
    nextCooldownAvailableAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'When next cooldown coin will be ready'
    },
    coinsFromPosts: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
      comment: 'Coins earned from posts'
    },
    coinsFromComments: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
      comment: 'Coins earned from comments'
    },
    coinsFromAds: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
      comment: 'Coins earned from watching ads'
    },
    coinsFromCooldown: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
      comment: 'Coins claimed from cooldown system'
    },
    coinsFromOther: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
      comment: 'Coins from other sources'
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
    tableName: 'positivity_coins',
    timestamps: true,
    // Temporarily disable indexes for SQLite compatibility
    // indexes: [
    //   {
    //     fields: ['user_id']
    //   },
    //   {
    //     name: 'idx_positivity_coins_give_counter',
    //     fields: [{ name: 'lifetime_given', order: 'DESC' }]
    //   }
    // ]
  }
);

export default PositivityCoins;
