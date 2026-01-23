import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

interface AvatarConfigAttributes {
  id: string;
  userId: string;
  name: string;
  style: 'cartoon' | 'anime' | 'minimalist';
  skinTone: string;
  eyeColor: string;
  eyeSize: number;
  hairColor: string;
  hairStyle: string;
  glasses: string | null;
  hat: string | null;
  earrings: string | null;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

interface AvatarConfigCreationAttributes extends Optional<AvatarConfigAttributes, 'id' | 'isActive' | 'glasses' | 'hat' | 'earrings'> {}

export class AvatarConfigSQL extends Model<AvatarConfigAttributes, AvatarConfigCreationAttributes> implements AvatarConfigAttributes {
  public id!: string;
  public userId!: string;
  public name!: string;
  public style!: 'cartoon' | 'anime' | 'minimalist';
  public skinTone!: string;
  public eyeColor!: string;
  public eyeSize!: number;
  public hairColor!: string;
  public hairStyle!: string;
  public glasses!: string | null;
  public hat!: string | null;
  public earrings!: string | null;
  public isActive!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

AvatarConfigSQL.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'user_id',
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    style: {
      type: DataTypes.ENUM('cartoon', 'anime', 'minimalist'),
      allowNull: false,
      defaultValue: 'cartoon',
    },
    skinTone: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: '#FFDBAC',
      field: 'skin_tone',
    },
    eyeColor: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: '#8B4513',
      field: 'eye_color',
    },
    eyeSize: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 1.0,
      field: 'eye_size',
    },
    hairColor: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: '#000000',
      field: 'hair_color',
    },
    hairStyle: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'short',
      field: 'hair_style',
    },
    glasses: {
      type: DataTypes.STRING(50),
      allowNull: true,
      defaultValue: null,
    },
    hat: {
      type: DataTypes.STRING(50),
      allowNull: true,
      defaultValue: null,
    },
    earrings: {
      type: DataTypes.STRING(50),
      allowNull: true,
      defaultValue: null,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_active',
    },
  },
  {
    sequelize,
    tableName: 'avatar_configs',
    underscored: true,
    indexes: [
      { fields: ['user_id'] },
      { fields: ['user_id', 'is_active'] },
    ],
  }
);

export default AvatarConfigSQL;
