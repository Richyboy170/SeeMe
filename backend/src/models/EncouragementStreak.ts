import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export interface EncouragementStreakAttributes {
    id: string;
    userId: string;
    topicId: string;
    currentStreak: number;
    longestStreak: number;
    lastEncouragementDate: Date | null;
    badgesEarned: string[];
    createdAt: Date;
    updatedAt: Date;
}

export interface EncouragementStreakCreationAttributes extends Optional<EncouragementStreakAttributes,
    'id' | 'currentStreak' | 'longestStreak' | 'lastEncouragementDate' |
    'badgesEarned' | 'createdAt' | 'updatedAt'> {}

export class EncouragementStreak extends Model<EncouragementStreakAttributes, EncouragementStreakCreationAttributes> implements EncouragementStreakAttributes {
    public id!: string;
    public userId!: string;
    public topicId!: string;
    public currentStreak!: number;
    public longestStreak!: number;
    public lastEncouragementDate!: Date | null;
    public badgesEarned!: string[];
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;

    // Associations
    public readonly user?: any;
    public readonly topic?: any;

    // Update streak when user encourages someone
    public async recordEncouragement(): Promise<void> {
        const today = new Date().toISOString().split('T')[0];
        const lastDate = this.lastEncouragementDate?.toISOString().split('T')[0];

        if (lastDate === today) {
            return;
        }

        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        if (lastDate === yesterdayStr) {
            this.currentStreak += 1;
        } else {
            this.currentStreak = 1;
        }

        if (this.currentStreak > this.longestStreak) {
            this.longestStreak = this.currentStreak;
        }

        this.checkAndAwardBadges();
        this.lastEncouragementDate = new Date();
        await this.save();
    }

    private checkAndAwardBadges(): void {
        const badges = this.badgesEarned || [];

        if (this.currentStreak >= 7 && !badges.includes('streak_7')) {
            badges.push('streak_7');
        }
        if (this.currentStreak >= 30 && !badges.includes('streak_30')) {
            badges.push('streak_30');
        }
        if (this.currentStreak >= 100 && !badges.includes('streak_100')) {
            badges.push('streak_100');
        }

        this.badgesEarned = badges;
    }
}

EncouragementStreak.init(
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
        currentStreak: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
        },
        longestStreak: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
        },
        lastEncouragementDate: {
            type: DataTypes.DATEONLY,
            allowNull: true,
        },
        badgesEarned: {
            type: DataTypes.JSON,
            defaultValue: [],
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
        tableName: 'encouragement_streaks',
        modelName: 'EncouragementStreak',
        timestamps: true,
        underscored: true,
        indexes: [
            { unique: true, fields: ['user_id', 'topic_id'] },
            { fields: ['topic_id', 'current_streak'] },
        ],
    }
);

export default EncouragementStreak;
