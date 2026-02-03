import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export interface SavedPostAttributes {
    id: string;
    userId: string;
    postId: string;
    createdAt: Date;
}

export interface SavedPostCreationAttributes extends Optional<SavedPostAttributes,
    'id' | 'createdAt'> {}

export class SavedPost extends Model<SavedPostAttributes, SavedPostCreationAttributes> implements SavedPostAttributes {
    public id!: string;
    public userId!: string;
    public postId!: string;
    public readonly createdAt!: Date;

    // Associations
    public readonly user?: any;
    public readonly post?: any;
}

SavedPost.init(
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
        postId: {
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
        tableName: 'saved_posts',
        modelName: 'SavedPost',
        timestamps: false,
        underscored: true,
        indexes: [
            { unique: true, fields: ['user_id', 'post_id'] },
            { fields: ['post_id'] },
            { fields: ['user_id', 'created_at'] },
        ],
    }
);

export default SavedPost;
