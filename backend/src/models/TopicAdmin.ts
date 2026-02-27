import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export interface TopicAdminAttributes {
    id: string;
    topicId: string;
    userId: string;
    role: 'creator' | 'admin' | 'broadcaster';
    createdAt: Date;
    updatedAt: Date;
}

export interface TopicAdminCreationAttributes extends Optional<TopicAdminAttributes,
    'id' | 'role' | 'createdAt' | 'updatedAt'> {}

export class TopicAdmin extends Model<TopicAdminAttributes, TopicAdminCreationAttributes> implements TopicAdminAttributes {
    public id!: string;
    public topicId!: string;
    public userId!: string;
    public role!: 'creator' | 'admin';
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;

    // Associations
    public readonly user?: any;
    public readonly topic?: any;
}

TopicAdmin.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        topicId: {
            type: DataTypes.UUID,
            allowNull: false,
        },
        userId: {
            type: DataTypes.UUID,
            allowNull: false,
        },
        role: {
            type: DataTypes.STRING(20),
            allowNull: false,
            defaultValue: 'admin',
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
        tableName: 'topic_admins',
        modelName: 'TopicAdmin',
        timestamps: true,
        underscored: true,
        indexes: [
            { unique: true, fields: ['topic_id', 'user_id'] },
            { fields: ['topic_id'] },
        ],
    }
);

export default TopicAdmin;
