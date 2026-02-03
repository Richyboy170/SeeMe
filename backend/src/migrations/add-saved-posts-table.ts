import { QueryInterface, DataTypes } from 'sequelize';

export async function up(queryInterface: QueryInterface) {
  // Check if table already exists
  const tables = await queryInterface.showAllTables();
  if (tables.includes('saved_posts')) {
    console.log('saved_posts table already exists, skipping migration');
    return;
  }

  // Create saved_posts table
  await queryInterface.createTable('saved_posts', {
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
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    post_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'posts',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  });

  // Add unique constraint
  try {
    await queryInterface.addIndex('saved_posts', ['user_id', 'post_id'], {
      unique: true,
      name: 'saved_posts_user_post_unique',
    });
  } catch (e) {
    console.log('saved_posts_user_post_unique index already exists');
  }

  // Add index for querying by post
  try {
    await queryInterface.addIndex('saved_posts', ['post_id'], {
      name: 'saved_posts_post_id_idx',
    });
  } catch (e) {
    console.log('saved_posts_post_id_idx index already exists');
  }

  // Add index for querying user's saved posts ordered by date
  try {
    await queryInterface.addIndex('saved_posts', ['user_id', 'created_at'], {
      name: 'saved_posts_user_created_at_idx',
    });
  } catch (e) {
    console.log('saved_posts_user_created_at_idx index already exists');
  }

  console.log('Created saved_posts table with indexes');
}

export async function down(queryInterface: QueryInterface) {
  await queryInterface.dropTable('saved_posts');
  console.log('Dropped saved_posts table');
}
