/**
 * Migration: Create full_body_avatars table
 * Phase 3.1: Full-Body 3D Avatar System
 */

import { QueryInterface, DataTypes } from 'sequelize';

export async function up(queryInterface: QueryInterface): Promise<void> {
  // Create ENUM type for style (PostgreSQL specific)
  // For SQLite, this will be handled as TEXT with validation
  const dialect = queryInterface.sequelize.getDialect();

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
    if (e.original?.code !== '42P07') throw e; // Ignore "already exists" error
  }

  try {
    await queryInterface.addIndex('full_body_avatars', ['user_id', 'is_active'], {
      name: 'full_body_avatars_user_active_idx'
    });
  } catch (e: any) {
    if (e.original?.code !== '42P07') throw e;
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
