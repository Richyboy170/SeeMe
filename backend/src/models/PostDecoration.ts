import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

/**
 * PostDecoration attributes interface
 */
export interface PostDecorationAttributes {
  id: string;
  name: string;
  category: string;
  themeMode: string;
  priceSkyCoins: number;
  previewOrder: number;
  styleData: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Optional attributes for PostDecoration creation
 */
interface PostDecorationCreationAttributes extends Optional<
  PostDecorationAttributes,
  | 'id'
  | 'isActive'
  | 'createdAt'
  | 'updatedAt'
> {}

/**
 * PostDecoration model representing store catalog items for post decorations
 */
export class PostDecoration extends Model<PostDecorationAttributes, PostDecorationCreationAttributes>
  implements PostDecorationAttributes {
  public id!: string;
  public name!: string;
  public category!: string;
  public themeMode!: string;
  public priceSkyCoins!: number;
  public previewOrder!: number;
  public styleData!: string;
  public isActive!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

PostDecoration.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
      comment: 'Unique decoration item ID'
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Display name, e.g. "Sunset Glow"'
    },
    category: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isIn: {
          args: [['background', 'frame', 'icon_color']],
          msg: 'Category must be background, frame, or icon_color'
        }
      },
      comment: 'Decoration category: background | frame | icon_color'
    },
    themeMode: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isIn: {
          args: [['light', 'dark', 'any']],
          msg: 'Theme mode must be light, dark, or any'
        }
      },
      comment: 'Which theme this decoration is for: light | dark | any'
    },
    priceSkyCoins: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: {
          args: [0],
          msg: 'Price cannot be negative'
        }
      },
      comment: 'Cost in Sky Coins'
    },
    previewOrder: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Sort order in store display'
    },
    styleData: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: 'JSON blob parsed by frontend to render decoration'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Whether this item is available in the store'
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
    tableName: 'post_decorations',
    timestamps: true
  }
);

export default PostDecoration;
