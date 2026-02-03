import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export interface PostTopicAttributes {
    id: string;
    postId: string;
    topicId: string;
    createdAt: Date;
}

export interface PostTopicCreationAttributes extends Optional<PostTopicAttributes,
    'id' | 'createdAt'> {}

export class PostTopic extends Model<PostTopicAttributes, PostTopicCreationAttributes> implements PostTopicAttributes {
    public id!: string;
    public postId!: string;
    public topicId!: string;
    public readonly createdAt!: Date;

    // Associations
    public readonly post?: any;
    public readonly topic?: any;
}

PostTopic.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        postId: {
            type: DataTypes.UUID,
            allowNull: false,
        },
        topicId: {
            type: DataTypes.UUID,
            allowNull: false,
        },
        createdAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
        },
    },
    {
        sequelize,
        tableName: 'post_topics',
        modelName: 'PostTopic',
        timestamps: false,
        underscored: true,
        indexes: [
            { unique: true, fields: ['post_id', 'topic_id'] },
            { fields: ['topic_id'] },
        ],
    }
);

export default PostTopic;
