import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export type StoryPeriodType = 'weekly' | 'monthly' | 'yearly';

export interface StoryStats {
    postCount: number;
    totalLikes: number;
    totalComments: number;
    totalReposts: number;
    coinsEarned: number;
    coinsGiven: number;
}

export interface PostSummary {
    id: string;
    imageUrl: string | null;
    caption: string | null;
    likesCount: number;
    commentsCount: number;
    repostCount: number;
    createdAt: string;
}

export type HighlightCard =
    | { type: 'opener'; text: string }
    | { type: 'top_post'; label: string; post: PostSummary }
    | { type: 'post_gallery'; label: string; posts: PostSummary[] }
    | { type: 'stat_row'; items: { icon: string; value: number; label: string }[] }
    | { type: 'caption_quotes'; label: string; quotes: string[] }
    | { type: 'coins'; earned: number; given: number }
    | { type: 'closer'; text: string };

export interface StoryOfMeAttributes {
    id: string;
    userId: string;
    periodType: StoryPeriodType;
    periodStart: string;
    periodEnd: string;
    title: string;
    content: string;
    stats: string; // JSON string of StoryStats
    captionExcerpts: string; // JSON string array
    isPublished: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface StoryOfMeCreationAttributes extends Optional<StoryOfMeAttributes,
    'id' | 'isPublished' | 'createdAt' | 'updatedAt'> {}

export class StoryOfMe extends Model<StoryOfMeAttributes, StoryOfMeCreationAttributes> implements StoryOfMeAttributes {
    public id!: string;
    public userId!: string;
    public periodType!: StoryPeriodType;
    public periodStart!: string;
    public periodEnd!: string;
    public title!: string;
    public content!: string;
    public stats!: string;
    public captionExcerpts!: string;
    public isPublished!: boolean;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;

    // Helpers
    public getParsedStats(): StoryStats {
        try { return JSON.parse(this.stats); } catch { return { postCount: 0, totalLikes: 0, totalComments: 0, totalReposts: 0, coinsEarned: 0, coinsGiven: 0 }; }
    }

    public getParsedCaptionExcerpts(): string[] {
        try { return JSON.parse(this.captionExcerpts); } catch { return []; }
    }

    public getParsedHighlights(): HighlightCard[] {
        try {
            const parsed = JSON.parse(this.content);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }
}

StoryOfMe.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
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
        periodType: {
            type: DataTypes.STRING(10),
            allowNull: false,
        },
        periodStart: {
            type: DataTypes.DATEONLY,
            allowNull: false,
        },
        periodEnd: {
            type: DataTypes.DATEONLY,
            allowNull: false,
        },
        title: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        content: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        stats: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        captionExcerpts: {
            type: DataTypes.TEXT,
            allowNull: false,
            defaultValue: '[]',
        },
        isPublished: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
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
        tableName: 'story_of_me',
        modelName: 'StoryOfMe',
        timestamps: true,
        underscored: true,
        indexes: [
            { fields: ['user_id'] },
            {
                unique: true,
                fields: ['user_id', 'period_type', 'period_start'],
                name: 'story_of_me_user_period_unique',
            },
        ],
    }
);

export default StoryOfMe;
