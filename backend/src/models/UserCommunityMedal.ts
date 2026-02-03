import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export type MedalType = 'gold' | 'silver' | 'bronze';
export type LeaderboardType = 'givers' | 'receivers';
export type PeriodType = 'weekly' | 'monthly' | 'all_time';

export interface UserCommunityMedalAttributes {
    id: string;
    userId: string;
    topicId: string;
    medalType: MedalType;
    leaderboardType: LeaderboardType;
    periodType: PeriodType;
    periodStart: Date | null;
    periodEnd: Date | null;
    rankPosition: number;
    coinsAmount: number;
    topicName: string;
    topicEmoji: string | null;
    awardedAt: Date;
}

export interface UserCommunityMedalCreationAttributes extends Optional<UserCommunityMedalAttributes,
    'id' | 'periodStart' | 'periodEnd' | 'topicEmoji' | 'awardedAt'> {}

export class UserCommunityMedal extends Model<UserCommunityMedalAttributes, UserCommunityMedalCreationAttributes> implements UserCommunityMedalAttributes {
    public id!: string;
    public userId!: string;
    public topicId!: string;
    public medalType!: MedalType;
    public leaderboardType!: LeaderboardType;
    public periodType!: PeriodType;
    public periodStart!: Date | null;
    public periodEnd!: Date | null;
    public rankPosition!: number;
    public coinsAmount!: number;
    public topicName!: string;
    public topicEmoji!: string | null;
    public readonly awardedAt!: Date;

    // Associations
    public readonly user?: any;
    public readonly topic?: any;

    public static getMedalEmoji(medalType: MedalType): string {
        switch (medalType) {
            case 'gold': return '🥇';
            case 'silver': return '🥈';
            case 'bronze': return '🥉';
        }
    }
}

UserCommunityMedal.init(
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
        medalType: {
            type: DataTypes.STRING(10),
            allowNull: false,
        },
        leaderboardType: {
            type: DataTypes.STRING(20),
            allowNull: false,
        },
        periodType: {
            type: DataTypes.STRING(20),
            allowNull: false,
        },
        periodStart: {
            type: DataTypes.DATEONLY,
            allowNull: true,
        },
        periodEnd: {
            type: DataTypes.DATEONLY,
            allowNull: true,
        },
        rankPosition: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        coinsAmount: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        topicName: {
            type: DataTypes.STRING(50),
            allowNull: false,
        },
        topicEmoji: {
            type: DataTypes.STRING(10),
            allowNull: true,
        },
        awardedAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
        },
    },
    {
        sequelize,
        tableName: 'user_community_medals',
        modelName: 'UserCommunityMedal',
        timestamps: false,
        underscored: true,
        indexes: [
            { fields: ['user_id'] },
            { fields: ['topic_id'] },
        ],
    }
);

export default UserCommunityMedal;
