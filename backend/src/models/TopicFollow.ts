import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export type TopicFollowStatus = 'active' | 'pending' | 'rejected';

export interface TopicFollowAttributes {
    id: string;
    userId: string;
    topicId: string;
    notificationsEnabled: boolean;
    status: TopicFollowStatus;
    createdAt: Date;
    updatedAt: Date;
}

export interface TopicFollowCreationAttributes extends Optional<TopicFollowAttributes,
    'id' | 'notificationsEnabled' | 'status' | 'createdAt' | 'updatedAt'> {}

export class TopicFollow extends Model<TopicFollowAttributes, TopicFollowCreationAttributes> implements TopicFollowAttributes {
    public id!: string;
    public userId!: string;
    public topicId!: string;
    public notificationsEnabled!: boolean;
    public status!: TopicFollowStatus;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;

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
        status: {
            type: DataTypes.STRING(20),
            allowNull: false,
            defaultValue: 'active',
        },
        createdAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
        },
        updatedAt: {
            type: DataTypes.DATE,
            allowNull: true,
        },
    },
    {
        sequelize,
        tableName: 'topic_follows',
        modelName: 'TopicFollow',
        timestamps: true,
        underscored: true,
        indexes: [
            { unique: true, fields: ['user_id', 'topic_id'] },
            { fields: ['topic_id'] },
            { fields: ['topic_id', 'status'] },
        ],
    }
);

export default TopicFollow;
