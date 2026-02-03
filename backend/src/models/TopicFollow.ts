import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export interface TopicFollowAttributes {
    id: string;
    userId: string;
    topicId: string;
    notificationsEnabled: boolean;
    createdAt: Date;
}

export interface TopicFollowCreationAttributes extends Optional<TopicFollowAttributes,
    'id' | 'notificationsEnabled' | 'createdAt'> {}

export class TopicFollow extends Model<TopicFollowAttributes, TopicFollowCreationAttributes> implements TopicFollowAttributes {
    public id!: string;
    public userId!: string;
    public topicId!: string;
    public notificationsEnabled!: boolean;
    public readonly createdAt!: Date;

    // Associations
    public readonly user?: any;
    public readonly topic?: any;
}

TopicFollow.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        userId: {
            type: DataTypes.UUID,
            allowNull: false,
        },
        topicId: {
            type: DataTypes.UUID,
            allowNull: false,
        },
        notificationsEnabled: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
        },
        createdAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
        },
    },
    {
        sequelize,
        tableName: 'topic_follows',
        modelName: 'TopicFollow',
        timestamps: false,
        underscored: true,
        indexes: [
            { unique: true, fields: ['user_id', 'topic_id'] },
            { fields: ['topic_id'] },
        ],
    }
);

export default TopicFollow;
