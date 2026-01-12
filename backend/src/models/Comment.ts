import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

/**
 * Comment attributes interface
 */
export interface CommentAttributes {
  id: string;
  postId: string;
  userId: string;
  content: string;
  parentCommentId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Optional attributes for comment creation
 */
interface CommentCreationAttributes extends Optional<
  CommentAttributes,
  'id' | 'parentCommentId' | 'createdAt' | 'updatedAt'
> {}

/**
 * Comment model representing post comments with nested reply support
 */
export class Comment extends Model<CommentAttributes, CommentCreationAttributes> implements CommentAttributes {
  public id!: string;
  public postId!: string;
  public userId!: string;
  public content!: string;
  public parentCommentId!: string | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Virtual fields for associations
  public readonly user?: any;
  public readonly replies?: Comment[];
}

Comment.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      comment: 'Unique comment identifier'
    },
    postId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'posts',
        key: 'id'
      },
      onDelete: 'CASCADE',
      comment: 'ID of the post this comment belongs to'
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      onDelete: 'CASCADE',
      comment: 'ID of the user who wrote the comment'
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'Comment content cannot be empty'
        },
        len: {
          args: [1, 500],
          msg: 'Comment must be between 1 and 500 characters'
        }
      },
      comment: 'Comment text content'
    },
    parentCommentId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'comments',
        key: 'id'
      },
      onDelete: 'CASCADE',
      comment: 'ID of parent comment (for nested replies)'
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
    tableName: 'comments',
    timestamps: true,
    indexes: [
      {
        name: 'idx_comments_post_created',
        fields: ['post_id', 'created_at']
      },
      {
        name: 'idx_comments_user',
        fields: ['user_id']
      },
      {
        name: 'idx_comments_parent',
        fields: ['parent_comment_id']
      },
      {
        name: 'idx_comments_created',
        fields: ['created_at']
      }
    ]
  }
);

export default Comment;
