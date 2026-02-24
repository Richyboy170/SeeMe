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
  gender: string | null;
  faceShape: string | null;
  facialHair: string | null;
  eyebrowStyle: string | null;
  mouthStyle: string | null;
  noseStyle: string | null;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

interface AvatarConfigCreationAttributes extends Optional<AvatarConfigAttributes, 'id' | 'isActive' | 'glasses' | 'hat' | 'earrings' | 'gender' | 'faceShape' | 'facialHair' | 'eyebrowStyle' | 'mouthStyle' | 'noseStyle'> {}

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
  public gender!: string | null;
  public faceShape!: string | null;
  public facialHair!: string | null;
  public eyebrowStyle!: string | null;
  public mouthStyle!: string | null;
  public noseStyle!: string | null;
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
    gender: {
      type: DataTypes.STRING(20),
      allowNull: true,
      defaultValue: null,
    },
    faceShape: {
      type: DataTypes.STRING(20),
      allowNull: true,
      defaultValue: null,
      field: 'face_shape',
    },
    facialHair: {
      type: DataTypes.STRING(20),
      allowNull: true,
      defaultValue: null,
      field: 'facial_hair',
    },
    eyebrowStyle: {
      type: DataTypes.STRING(20),
      allowNull: true,
      defaultValue: null,
      field: 'eyebrow_style',
    },
    mouthStyle: {
      type: DataTypes.STRING(20),
      allowNull: true,
      defaultValue: null,
      field: 'mouth_style',
    },
    noseStyle: {
      type: DataTypes.STRING(20),
      allowNull: true,
      defaultValue: null,
      field: 'nose_style',
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
