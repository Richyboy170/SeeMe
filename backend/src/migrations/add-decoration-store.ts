import { QueryInterface, DataTypes } from 'sequelize';

/**
 * Migration to add the Decoration Store tables.
 *
 * Creates three tables:
 *   - post_decorations   – catalogue of purchasable decorations
 *   - user_decorations   – records of which decorations each user owns
 *   - user_active_decorations – which decoration each user currently has equipped per slot
 */
export async function up(queryInterface: QueryInterface): Promise<void> {
  try {
    // ── post_decorations ──────────────────────────────────────────────
    try {
      await queryInterface.describeTable('post_decorations');
      console.log('post_decorations table already exists, skipping');
    } catch {
      await queryInterface.createTable('post_decorations', {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        name: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        category: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        theme_mode: {
          type: DataTypes.STRING,
          allowNull: false,
          defaultValue: 'any',
        },
        price_sky_coins: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 10,
        },
        preview_order: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        style_data: {
          type: DataTypes.TEXT,
          allowNull: false,
        },
        is_active: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        },
        created_at: {
          type: DataTypes.DATE,
          allowNull: false,
        },
        updated_at: {
          type: DataTypes.DATE,
          allowNull: false,
        },
      });
      console.log('Created post_decorations table');
    }

    // ── user_decorations ──────────────────────────────────────────────
    try {
      await queryInterface.describeTable('user_decorations');
      console.log('user_decorations table already exists, skipping');
    } catch {
      await queryInterface.createTable('user_decorations', {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        user_id: {
          type: DataTypes.UUID,
          allowNull: false,
          references: { model: 'users', key: 'id' },
          onDelete: 'CASCADE',
        },
        decoration_id: {
          type: DataTypes.UUID,
          allowNull: false,
          references: { model: 'post_decorations', key: 'id' },
          onDelete: 'CASCADE',
        },
        purchased_at: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
        price_paid: {
          type: DataTypes.INTEGER,
          allowNull: false,
        },
        created_at: {
          type: DataTypes.DATE,
          allowNull: false,
        },
        updated_at: {
          type: DataTypes.DATE,
          allowNull: false,
        },
      });
      console.log('Created user_decorations table');
    }

    // Add unique constraint on (user_id, decoration_id)
    try {
      await queryInterface.addConstraint('user_decorations', {
        fields: ['user_id', 'decoration_id'],
        type: 'unique',
        name: 'user_decorations_user_id_decoration_id_unique',
      });
      console.log('Added unique constraint on user_decorations (user_id, decoration_id)');
    } catch {
      console.log('Unique constraint on user_decorations already exists, skipping');
    }

    // ── user_active_decorations ───────────────────────────────────────
    try {
      await queryInterface.describeTable('user_active_decorations');
      console.log('user_active_decorations table already exists, skipping');
    } catch {
      await queryInterface.createTable('user_active_decorations', {
        user_id: {
          type: DataTypes.UUID,
          primaryKey: true,
          references: { model: 'users', key: 'id' },
          onDelete: 'CASCADE',
        },
        light_background_id: {
          type: DataTypes.UUID,
          allowNull: true,
          references: { model: 'post_decorations', key: 'id' },
          onDelete: 'SET NULL',
        },
        dark_background_id: {
          type: DataTypes.UUID,
          allowNull: true,
          references: { model: 'post_decorations', key: 'id' },
          onDelete: 'SET NULL',
        },
        frame_id: {
          type: DataTypes.UUID,
          allowNull: true,
          references: { model: 'post_decorations', key: 'id' },
          onDelete: 'SET NULL',
        },
        icon_color_id: {
          type: DataTypes.UUID,
          allowNull: true,
          references: { model: 'post_decorations', key: 'id' },
          onDelete: 'SET NULL',
        },
        created_at: {
          type: DataTypes.DATE,
          allowNull: false,
        },
        updated_at: {
          type: DataTypes.DATE,
          allowNull: false,
        },
      });
      console.log('Created user_active_decorations table');
    }
  } catch (error) {
    console.error('Migration add-decoration-store failed:', error);
  }
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  try {
    // Drop tables in reverse dependency order
    await queryInterface.dropTable('user_active_decorations');
    console.log('Dropped user_active_decorations table');

    await queryInterface.dropTable('user_decorations');
    console.log('Dropped user_decorations table');

    await queryInterface.dropTable('post_decorations');
    console.log('Dropped post_decorations table');
  } catch (error) {
    console.error('Rollback add-decoration-store failed:', error);
  }
}
