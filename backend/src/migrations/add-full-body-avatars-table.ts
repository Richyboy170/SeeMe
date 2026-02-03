/**
 * Migration: Create full_body_avatars table
 * Phase 3.1: Full-Body 3D Avatar System
 */

import { QueryInterface, DataTypes, QueryTypes } from 'sequelize';

export async function up(queryInterface: QueryInterface): Promise<void> {
  const dialect = queryInterface.sequelize.getDialect();

  // Check if table already exists
  let tableExists = false;
  if (dialect === 'sqlite') {
    const tables = await queryInterface.sequelize.query(
      "SELECT name FROM sqlite_master WHERE type='table' and name='full_body_avatars';",
      { type: QueryTypes.SELECT }
    ) as any[];
    tableExists = tables.length > 0;
  } else {
    const tables = await queryInterface.sequelize.query(
      "SELECT table_name FROM information_schema.tables WHERE table_name = 'full_body_avatars';",
      { type: QueryTypes.SELECT }
    ) as any[];
    tableExists = tables.length > 0;
  }

  if (tableExists) {
    console.log('full_body_avatars table already exists, skipping migration');
    return;
  }

  // Create ENUM type for style (PostgreSQL specific)
  // For SQLite, this will be handled as TEXT with validation

  if (dialect === 'postgres') {
    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE full_body_avatar_style AS ENUM ('cartoon', 'anime', 'minimalist');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
  }

  await queryInterface.createTable('full_body_avatars', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      onDelete: 'CASCADE',
    },
    rig_transforms: {
      type: dialect === 'postgres' ? DataTypes.JSONB : DataTypes.JSON,
      allowNull: false,
    },
    pose_type: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'standing',
    },
    facing_direction: {
      type: DataTypes.STRING(10),
      allowNull: false,
      defaultValue: 'front',
    },
    confidence: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
    },
    style: {
      type: dialect === 'postgres'
        ? 'full_body_avatar_style'
        : DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'cartoon',
    },
    skin_tone: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 2,
    },
    hair_color: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    eye_color: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    source_image_key: {
      type: DataTypes.STRING(255),
      allowNull: true,
      defaultValue: null,
    },
    preset_pose_id: {
      type: DataTypes.STRING(50),
      allowNull: true,
      defaultValue: null,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
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
  });

  // Create indexes (with IF NOT EXISTS via try-catch)
  try {
    await queryInterface.addIndex('full_body_avatars', ['user_id'], {
      name: 'full_body_avatars_user_id_idx'
    });
  } catch (e: any) {
    // Ignore "already exists" errors for both PostgreSQL and SQLite
    const isAlreadyExists = e.original?.code === '42P07' ||
      (e.original?.code === 'SQLITE_ERROR' && e.message?.includes('already exists'));
    if (!isAlreadyExists) throw e;
  }

  try {
    await queryInterface.addIndex('full_body_avatars', ['user_id', 'is_active'], {
      name: 'full_body_avatars_user_active_idx'
    });
  } catch (e: any) {
    const isAlreadyExists = e.original?.code === '42P07' ||
      (e.original?.code === 'SQLITE_ERROR' && e.message?.includes('already exists'));
    if (!isAlreadyExists) throw e;
  }

  console.log('Created full_body_avatars table with indexes');
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.dropTable('full_body_avatars');

  // Drop ENUM type (PostgreSQL)
  const dialect = queryInterface.sequelize.getDialect();
  if (dialect === 'postgres') {
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS full_body_avatar_style;');
  }

  console.log('Dropped full_body_avatars table');
}
