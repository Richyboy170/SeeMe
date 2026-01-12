import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

/**
 * Like attributes interface
 */
export interface LikeAttributes {
  id: string;
  userId: string;
  postId: string;
  createdAt: Date;
}

/**
 * Optional attributes for like creation
 */
interface LikeCreationAttributes extends Optional<LikeAttributes, 'id' | 'createdAt'> {}

/**
 * Like model representing post likes
 */
export class Like extends Model<LikeAttributes, LikeCreationAttributes> implements LikeAttributes {
  public id!: string;
  public userId!: string;
  public postId!: string;
  public readonly createdAt!: Date;
}

Like.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      comment: 'Unique like identifier'
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      onDelete: 'CASCADE',
      comment: 'ID of the user who liked the post'
    },
    postId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'posts',
        key: 'id'
      },
      onDelete: 'CASCADE',
      comment: 'ID of the post that was liked'
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  },
  {
    sequelize,
    tableName: 'likes',
    timestamps: true,
    updatedAt: false, // No need for updatedAt on likes
    indexes: [
      {
        unique: true,
        name: 'unique_user_post_like',
        fields: ['user_id', 'post_id']
      },
      {
        name: 'idx_likes_post',
        fields: ['post_id']
      },
      {
        name: 'idx_likes_user',
        fields: ['user_id']
      },
      {
        name: 'idx_likes_created',
        fields: ['created_at']
      }
    ]
  }
);

export default Like;
