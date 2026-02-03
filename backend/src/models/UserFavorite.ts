import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export interface UserFavoriteAttributes {
    id: string;
    userId: string;
    favoriteUserId: string;
    createdAt: Date;
}

export interface UserFavoriteCreationAttributes extends Optional<UserFavoriteAttributes,
    'id' | 'createdAt'> {}

export class UserFavorite extends Model<UserFavoriteAttributes, UserFavoriteCreationAttributes> implements UserFavoriteAttributes {
    public id!: string;
    public userId!: string;
    public favoriteUserId!: string;
    public readonly createdAt!: Date;

    // Associations
    public readonly user?: any;
    public readonly favoriteUser?: any;
}

UserFavorite.init(
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
        favoriteUserId: {
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
        tableName: 'user_favorites',
        modelName: 'UserFavorite',
        timestamps: false,
        underscored: true,
        indexes: [
            { unique: true, fields: ['user_id', 'favorite_user_id'] },
            { fields: ['favorite_user_id'] },
        ],
    }
);

export default UserFavorite;
