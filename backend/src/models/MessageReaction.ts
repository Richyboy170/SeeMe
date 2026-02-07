import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export interface MessageReactionAttributes {
  id: string;
  messageId: string;
  userId: string;
  emoji: 'heart' | 'laugh' | 'wow' | 'sad' | 'angry' | 'thumbsup';
  createdAt: Date;
  updatedAt: Date;
}

interface MessageReactionCreationAttributes extends Optional<MessageReactionAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

export class MessageReaction extends Model<MessageReactionAttributes, MessageReactionCreationAttributes> implements MessageReactionAttributes {
  public id!: string;
  public messageId!: string;
  public userId!: string;
  public emoji!: 'heart' | 'laugh' | 'wow' | 'sad' | 'angry' | 'thumbsup';
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

MessageReaction.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    messageId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'messages',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    emoji: {
      type: DataTypes.STRING(20),
      allowNull: false,
      validate: {
        isIn: {
          args: [['heart', 'laugh', 'wow', 'sad', 'angry', 'thumbsup']],
          msg: 'Invalid reaction emoji',
        },
      },
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'message_reactions',
    timestamps: true,
  }
);

export default MessageReaction;
