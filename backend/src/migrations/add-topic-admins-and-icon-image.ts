/**
 * Migration: Add topic_admins table and icon_image_url column to topics
 */

import { QueryInterface, DataTypes } from 'sequelize';

export async function up(queryInterface: QueryInterface): Promise<void> {
    // 1. Create topic_admins table
    await queryInterface.createTable('topic_admins', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        topic_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: { model: 'topics', key: 'id' },
            onDelete: 'CASCADE',
        },
        user_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: { model: 'users', key: 'id' },
            onDelete: 'CASCADE',
        },
        role: {
            type: DataTypes.STRING(20),
            allowNull: false,
            defaultValue: 'admin',
        },
        created_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
        },
        updated_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
        },
    }).catch(() => {
        // Table may already exist
    });

    // Add unique index on [topic_id, user_id]
    await queryInterface.addIndex('topic_admins', ['topic_id', 'user_id'], {
        unique: true,
        name: 'topic_admins_topic_user_unique',
    }).catch(() => {});

    // 2. Add icon_image_url column to topics
    await queryInterface.addColumn('topics', 'icon_image_url', {
        type: DataTypes.STRING(500),
        allowNull: true,
    }).catch(() => {});

    // 3. Widen icon_emoji column to support Ionicons names
    // NOTE: Skip changeColumn on SQLite - it recreates the table and triggers
    // CASCADE DELETE on all foreign keys, destroying related data.
    // SQLite doesn't enforce string lengths anyway, so STRING(10) can store longer values.
    const dialect = queryInterface.sequelize.getDialect();
    if (dialect !== 'sqlite') {
        await queryInterface.changeColumn('topics', 'icon_emoji', {
            type: DataTypes.STRING(50),
            allowNull: true,
        }).catch(() => {});
    }
}

export async function down(queryInterface: QueryInterface): Promise<void> {
    await queryInterface.dropTable('topic_admins').catch(() => {});
    await queryInterface.removeColumn('topics', 'icon_image_url').catch(() => {});
    const dialect = queryInterface.sequelize.getDialect();
    if (dialect !== 'sqlite') {
        await queryInterface.changeColumn('topics', 'icon_emoji', {
            type: DataTypes.STRING(10),
            allowNull: true,
        }).catch(() => {});
    }
}
