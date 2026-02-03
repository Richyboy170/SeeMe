import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export interface TopicAttributes {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    iconEmoji: string | null;
    coverImageUrl: string | null;
    creatorId: string | null;
    inviteCode: string;
    category: string;
    followerCount: number;
    postCount: number;
    weeklyPostCount: number;
    isOfficial: boolean;
    isActive: boolean;
    isDiscoverable: boolean;
    minAge: number;
    beginnerBoostEnabled: boolean;
    encouragementMultiplier: number;
    createdAt: Date;
    updatedAt: Date;
}

export interface TopicCreationAttributes extends Optional<TopicAttributes,
    'id' | 'description' | 'iconEmoji' | 'coverImageUrl' | 'creatorId' |
    'followerCount' | 'postCount' | 'weeklyPostCount' | 'isOfficial' |
    'isActive' | 'isDiscoverable' | 'minAge' | 'beginnerBoostEnabled' |
    'encouragementMultiplier' | 'createdAt' | 'updatedAt'> {}

export class Topic extends Model<TopicAttributes, TopicCreationAttributes> implements TopicAttributes {
    public id!: string;
    public name!: string;
    public slug!: string;
    public description!: string | null;
    public iconEmoji!: string | null;
    public coverImageUrl!: string | null;
    public creatorId!: string | null;
    public inviteCode!: string;
    public category!: string;
    public followerCount!: number;
    public postCount!: number;
    public weeklyPostCount!: number;
    public isOfficial!: boolean;
    public isActive!: boolean;
    public isDiscoverable!: boolean;
    public minAge!: number;
    public beginnerBoostEnabled!: boolean;
    public encouragementMultiplier!: number;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;

    // Associations
    public readonly creator?: any;
    public readonly followers?: any[];

    // Helper to generate slug from name
    public static generateSlug(name: string): string {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .substring(0, 50);
    }

    // Helper to generate invite code
    public static generateInviteCode(): string {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = '';
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    }
}

Topic.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        name: {
            type: DataTypes.STRING(50),
            allowNull: false,
            unique: true,
        },
        slug: {
            type: DataTypes.STRING(50),
            allowNull: false,
            unique: true,
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        iconEmoji: {
            type: DataTypes.STRING(10),
            allowNull: true,
        },
        coverImageUrl: {
            type: DataTypes.STRING(500),
            allowNull: true,
        },
        creatorId: {
            type: DataTypes.UUID,
            allowNull: true,
        },
        inviteCode: {
            type: DataTypes.STRING(10),
            allowNull: false,
            unique: true,
        },
        category: {
            type: DataTypes.STRING(50),
            allowNull: false,
        },
        followerCount: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
        },
        postCount: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
        },
        weeklyPostCount: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
        },
        isOfficial: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
        },
        isDiscoverable: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
        },
        minAge: {
            type: DataTypes.INTEGER,
            defaultValue: 13,
        },
        beginnerBoostEnabled: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
        },
        encouragementMultiplier: {
            type: DataTypes.DECIMAL(3, 2),
            defaultValue: 1.0,
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
        tableName: 'topics',
        modelName: 'Topic',
        timestamps: true,
        underscored: true,
    }
);

export default Topic;
