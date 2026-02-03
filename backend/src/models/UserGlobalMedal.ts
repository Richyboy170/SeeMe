import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export type MedalType = 'gold' | 'silver' | 'bronze';
export type LeaderboardType = 'givers' | 'receivers';
export type PeriodType = 'weekly' | 'monthly' | 'all_time';

export interface UserGlobalMedalAttributes {
    id: string;
    userId: string;
    medalType: MedalType;
    leaderboardType: LeaderboardType;
    periodType: PeriodType;
    periodStart: Date | null;
    periodEnd: Date | null;
    rankPosition: number;
    coinsAmount: number;
    awardedAt: Date;
}

export interface UserGlobalMedalCreationAttributes extends Optional<UserGlobalMedalAttributes,
    'id' | 'periodStart' | 'periodEnd' | 'awardedAt'> {}

export class UserGlobalMedal extends Model<UserGlobalMedalAttributes, UserGlobalMedalCreationAttributes> implements UserGlobalMedalAttributes {
    public id!: string;
    public userId!: string;
    public medalType!: MedalType;
    public leaderboardType!: LeaderboardType;
    public periodType!: PeriodType;
    public periodStart!: Date | null;
    public periodEnd!: Date | null;
    public rankPosition!: number;
    public coinsAmount!: number;
    public readonly awardedAt!: Date;

    // Associations
    public readonly user?: any;

    public static getMedalEmoji(medalType: MedalType): string {
        switch (medalType) {
            case 'gold': return '🥇';
            case 'silver': return '🥈';
            case 'bronze': return '🥉';
        }
    }
}

UserGlobalMedal.init(
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
        awardedAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
        },
    },
    {
        sequelize,
        tableName: 'user_global_medals',
        modelName: 'UserGlobalMedal',
        timestamps: false,
        underscored: true,
        indexes: [
            { fields: ['user_id'] },
        ],
    }
);

export default UserGlobalMedal;
