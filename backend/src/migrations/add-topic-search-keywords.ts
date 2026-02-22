/**
 * Migration: Add search_keywords column to topics for semantic search
 */

import { QueryInterface, DataTypes } from 'sequelize';

export async function up(queryInterface: QueryInterface): Promise<void> {
    await queryInterface.addColumn('topics', 'search_keywords', {
        type: DataTypes.TEXT,
        allowNull: true,
    }).catch(() => {});
}

export async function down(queryInterface: QueryInterface): Promise<void> {
    await queryInterface.removeColumn('topics', 'search_keywords').catch(() => {});
}
