import { QueryInterface, DataTypes } from 'sequelize';

/**
 * Migration to add per-corner icon decoration tables.
 *
 * Creates two tables:
 *   - corner_icon_purchases  – tracks which icons a user has bought
 *   - corner_icon_placements – tracks which corner has which icon
 */
export async function up(queryInterface: QueryInterface): Promise<void> {
  try {
    // ── corner_icon_purchases ────────────────────────────────────────
    try {
      await queryInterface.describeTable('corner_icon_purchases');
      console.log('corner_icon_purchases table already exists, skipping');
    } catch {
      await queryInterface.createTable('corner_icon_purchases', {
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
        icon_family: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        icon_name: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        price_paid: {
          type: DataTypes.INTEGER,
          allowNull: false,
        },
        purchased_at: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
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
      console.log('Created corner_icon_purchases table');
    }

    // Unique constraint: one purchase per user+icon combo
    try {
      await queryInterface.addConstraint('corner_icon_purchases', {
        fields: ['user_id', 'icon_family', 'icon_name'],
        type: 'unique',
        name: 'corner_icon_purchases_user_icon_unique',
      });
      console.log('Added unique constraint on corner_icon_purchases (user_id, icon_family, icon_name)');
    } catch {
      console.log('Unique constraint on corner_icon_purchases already exists, skipping');
    }

    // ── corner_icon_placements ───────────────────────────────────────
    try {
      await queryInterface.describeTable('corner_icon_placements');
      console.log('corner_icon_placements table already exists, skipping');
    } catch {
      await queryInterface.createTable('corner_icon_placements', {
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
        position: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        icon_family: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        icon_name: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        color: {
          type: DataTypes.STRING,
          allowNull: false,
          defaultValue: '#FFFFFF',
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
      console.log('Created corner_icon_placements table');
    }

    // Unique constraint: one icon per corner per user
    try {
      await queryInterface.addConstraint('corner_icon_placements', {
        fields: ['user_id', 'position'],
        type: 'unique',
        name: 'corner_icon_placements_user_position_unique',
      });
      console.log('Added unique constraint on corner_icon_placements (user_id, position)');
    } catch {
      console.log('Unique constraint on corner_icon_placements (user_id, position) already exists, skipping');
    }

    // Unique constraint: one icon can only be at one corner per user
    try {
      await queryInterface.addConstraint('corner_icon_placements', {
        fields: ['user_id', 'icon_family', 'icon_name'],
        type: 'unique',
        name: 'corner_icon_placements_user_icon_unique',
      });
      console.log('Added unique constraint on corner_icon_placements (user_id, icon_family, icon_name)');
    } catch {
      console.log('Unique constraint on corner_icon_placements (user_id, icon_family, icon_name) already exists, skipping');
    }
  } catch (error) {
    console.error('Migration add-corner-icons failed:', error);
  }
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  try {
    await queryInterface.dropTable('corner_icon_placements');
    console.log('Dropped corner_icon_placements table');

    await queryInterface.dropTable('corner_icon_purchases');
    console.log('Dropped corner_icon_purchases table');
  } catch (error) {
    console.error('Rollback add-corner-icons failed:', error);
  }
}
