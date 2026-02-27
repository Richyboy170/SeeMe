import { QueryInterface, DataTypes } from 'sequelize';

/**
 * Migration to add group type support to topics.
 *
 * Adds to `topics` table:
 *   - type: 'community' | 'private' | 'broadcast'
 *   - require_approval: boolean
 *   - member_count: integer
 *
 * Adds to `topic_follows` table:
 *   - status: 'active' | 'pending' | 'rejected'
 *   - updated_at: DATE
 */
export async function up(queryInterface: QueryInterface): Promise<void> {
  try {
    // ── topics table columns ──────────────────────────────────────────

    // Add type column
    try {
      await queryInterface.addColumn('topics', 'type', {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'community',
      });
      console.log('Added type column to topics');
    } catch {
      console.log('type column already exists on topics, skipping');
    }

    // Add require_approval column
    try {
      await queryInterface.addColumn('topics', 'require_approval', {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      });
      console.log('Added require_approval column to topics');
    } catch {
      console.log('require_approval column already exists on topics, skipping');
    }

    // Add member_count column (backfilled from follower_count)
    try {
      await queryInterface.addColumn('topics', 'member_count', {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      });
      console.log('Added member_count column to topics');

      // Backfill member_count from follower_count
      await queryInterface.sequelize.query(
        'UPDATE topics SET member_count = follower_count WHERE member_count = 0'
      );
      console.log('Backfilled member_count from follower_count');
    } catch {
      console.log('member_count column already exists on topics, skipping');
    }

    // ── topic_follows table columns ───────────────────────────────────

    // Add status column
    try {
      await queryInterface.addColumn('topic_follows', 'status', {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'active',
      });
      console.log('Added status column to topic_follows');
    } catch {
      console.log('status column already exists on topic_follows, skipping');
    }

    // Add updated_at column
    try {
      await queryInterface.addColumn('topic_follows', 'updated_at', {
        type: DataTypes.DATE,
        allowNull: true,
      });
      console.log('Added updated_at column to topic_follows');
    } catch {
      console.log('updated_at column already exists on topic_follows, skipping');
    }

    // Add index on topic_follows (topic_id, status)
    try {
      await queryInterface.addIndex('topic_follows', ['topic_id', 'status'], {
        name: 'topic_follows_topic_id_status',
      });
      console.log('Added index on topic_follows (topic_id, status)');
    } catch {
      console.log('Index topic_follows_topic_id_status already exists, skipping');
    }

    console.log('Migration add-topic-group-types completed successfully');
  } catch (error) {
    console.error('Migration add-topic-group-types failed:', error);
    throw error;
  }
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  try {
    await queryInterface.removeIndex('topic_follows', 'topic_follows_topic_id_status');
  } catch { /* ignore */ }

  try {
    await queryInterface.removeColumn('topic_follows', 'updated_at');
  } catch { /* ignore */ }

  try {
    await queryInterface.removeColumn('topic_follows', 'status');
  } catch { /* ignore */ }

  try {
    await queryInterface.removeColumn('topics', 'member_count');
  } catch { /* ignore */ }

  try {
    await queryInterface.removeColumn('topics', 'require_approval');
  } catch { /* ignore */ }

  try {
    await queryInterface.removeColumn('topics', 'type');
  } catch { /* ignore */ }
}
