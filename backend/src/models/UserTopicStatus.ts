import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export interface UserTopicStatusAttributes {
    id: string;
    userId: string;
    topicId: string;
    postCount: number;
    coinsReceived: number;
    firstPostAt: Date | null;
    lastPostAt: Date | null;
    isBeginner: boolean;
    graduatedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface UserTopicStatusCreationAttributes extends Optional<UserTopicStatusAttributes,
    'id' | 'postCount' | 'coinsReceived' | 'firstPostAt' | 'lastPostAt' |
    'isBeginner' | 'graduatedAt' | 'createdAt' | 'updatedAt'> {}

export class UserTopicStatus extends Model<UserTopicStatusAttributes, UserTopicStatusCreationAttributes> implements UserTopicStatusAttributes {
    public id!: string;
    public userId!: string;
    public topicId!: string;
    public postCount!: number;
    public coinsReceived!: number;
    public firstPostAt!: Date | null;
    public lastPostAt!: Date | null;
    public isBeginner!: boolean;
    public graduatedAt!: Date | null;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;

    // Associations
    public readonly user?: any;
    public readonly topic?: any;

    // Check if user should graduate from beginner status
    public shouldGraduate(): boolean {
        return this.postCount >= 5 || this.coinsReceived >= 50;
    }
}

UserTopicStatus.init(
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
        postCount: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
        },
        coinsReceived: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
        },
        firstPostAt: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        lastPostAt: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        isBeginner: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
        },
        graduatedAt: {
            type: DataTypes.DATE,
            allowNull: true,
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
        tableName: 'user_topic_status',
        modelName: 'UserTopicStatus',
        timestamps: true,
        underscored: true,
        indexes: [
            { unique: true, fields: ['user_id', 'topic_id'] },
            { fields: ['topic_id', 'is_beginner'] },
        ],
    }
);

export default UserTopicStatus;
