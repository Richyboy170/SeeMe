/**
 * Migration: Create Phase 3.3 Community/Topic tables
 * Phase 3.3: Community Groups & Topic-Based Posts
 */

import { QueryInterface, DataTypes } from 'sequelize';

export async function up(queryInterface: QueryInterface): Promise<void> {
    const dialect = queryInterface.sequelize.getDialect();

    // Create ENUM types for PostgreSQL
    if (dialect === 'postgres') {
        await queryInterface.sequelize.query(`
            DO $$ BEGIN
                CREATE TYPE post_visibility AS ENUM ('friends_only', 'topics_only', 'topics_and_friends');
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        await queryInterface.sequelize.query(`
            DO $$ BEGIN
                CREATE TYPE medal_type AS ENUM ('gold', 'silver', 'bronze');
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        await queryInterface.sequelize.query(`
            DO $$ BEGIN
                CREATE TYPE leaderboard_type AS ENUM ('givers', 'receivers');
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        await queryInterface.sequelize.query(`
            DO $$ BEGIN
                CREATE TYPE period_type AS ENUM ('weekly', 'monthly', 'all_time');
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);
    }

    // 1. Create topics table
    await queryInterface.createTable('topics', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        name: {
            type: DataTypes.STRING(50),
            allowNull: false,
            unique: true,
        },
        slug: {
            type: DataTypes.STRING(50),
            allowNull: false,
            unique: true,
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        icon_emoji: {
            type: DataTypes.STRING(10),
            allowNull: true,
        },
        cover_image_url: {
            type: DataTypes.STRING(500),
            allowNull: true,
        },
        creator_id: {
            type: DataTypes.UUID,
            allowNull: true,
            references: {
                model: 'users',
                key: 'id'
            },
            onDelete: 'SET NULL',
        },
        invite_code: {
            type: DataTypes.STRING(10),
            allowNull: false,
            unique: true,
        },
        category: {
            type: DataTypes.STRING(50),
            allowNull: false,
        },
        follower_count: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
        },
        post_count: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
        },
        weekly_post_count: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
        },
        is_official: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
        },
        is_discoverable: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
        },
        min_age: {
            type: DataTypes.INTEGER,
            defaultValue: 13,
        },
        beginner_boost_enabled: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
        },
        encouragement_multiplier: {
            type: DataTypes.DECIMAL(3, 2),
            defaultValue: 1.0,
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

    // 2. Create topic_follows table
    await queryInterface.createTable('topic_follows', {
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
        topic_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'topics',
                key: 'id'
            },
            onDelete: 'CASCADE',
        },
        notifications_enabled: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
        },
        created_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
        },
    });

    // 3. Create post_topics table
    await queryInterface.createTable('post_topics', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        post_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'posts',
                key: 'id'
            },
            onDelete: 'CASCADE',
        },
        topic_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'topics',
                key: 'id'
            },
            onDelete: 'CASCADE',
        },
        created_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
        },
    });

    // 4. Create user_favorites table
    await queryInterface.createTable('user_favorites', {
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
        favorite_user_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'users',
                key: 'id'
            },
            onDelete: 'CASCADE',
        },
        created_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
        },
    });

    // 5. Create user_topic_status table
    await queryInterface.createTable('user_topic_status', {
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
        topic_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'topics',
                key: 'id'
            },
            onDelete: 'CASCADE',
        },
        post_count: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
        },
        coins_received: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
        },
        first_post_at: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        last_post_at: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        is_beginner: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
        },
        graduated_at: {
            type: DataTypes.DATE,
            allowNull: true,
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

    // 6. Create encouragement_streaks table
    await queryInterface.createTable('encouragement_streaks', {
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
        topic_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'topics',
                key: 'id'
            },
            onDelete: 'CASCADE',
        },
        current_streak: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
        },
        longest_streak: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
        },
        last_encouragement_date: {
            type: DataTypes.DATEONLY,
            allowNull: true,
        },
        badges_earned: {
            type: dialect === 'postgres' ? DataTypes.JSONB : DataTypes.JSON,
            defaultValue: [],
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

    // 7. Create user_community_medals table
    await queryInterface.createTable('user_community_medals', {
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
        topic_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'topics',
                key: 'id'
            },
            onDelete: 'CASCADE',
        },
        medal_type: {
            type: dialect === 'postgres' ? 'medal_type' : DataTypes.STRING(10),
            allowNull: false,
        },
        leaderboard_type: {
            type: dialect === 'postgres' ? 'leaderboard_type' : DataTypes.STRING(20),
            allowNull: false,
        },
        period_type: {
            type: dialect === 'postgres' ? 'period_type' : DataTypes.STRING(20),
            allowNull: false,
        },
        period_start: {
            type: DataTypes.DATEONLY,
            allowNull: true,
        },
        period_end: {
            type: DataTypes.DATEONLY,
            allowNull: true,
        },
        rank_position: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        coins_amount: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        topic_name: {
            type: DataTypes.STRING(50),
            allowNull: false,
        },
        topic_emoji: {
            type: DataTypes.STRING(10),
            allowNull: true,
        },
        awarded_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
        },
    });

    // 8. Create user_global_medals table
    await queryInterface.createTable('user_global_medals', {
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
        medal_type: {
            type: dialect === 'postgres' ? 'medal_type' : DataTypes.STRING(10),
            allowNull: false,
        },
        leaderboard_type: {
            type: dialect === 'postgres' ? 'leaderboard_type' : DataTypes.STRING(20),
            allowNull: false,
        },
        period_type: {
            type: dialect === 'postgres' ? 'period_type' : DataTypes.STRING(20),
            allowNull: false,
        },
        period_start: {
            type: DataTypes.DATEONLY,
            allowNull: true,
        },
        period_end: {
            type: DataTypes.DATEONLY,
            allowNull: true,
        },
        rank_position: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        coins_amount: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        awarded_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
        },
    });

    // 9. Add visibility column to posts table (if not exists)
    const postsColumns = await queryInterface.describeTable('posts') as Record<string, any>;
    if (!postsColumns['visibility']) {
        await queryInterface.addColumn('posts', 'visibility', {
            type: DataTypes.STRING(20),
            allowNull: false,
            defaultValue: 'friends_only',
        });
    } else {
        console.log('visibility column already exists in posts table, skipping');
    }

    // 10. Add topic_id column to coin_transactions table (if not exists)
    const coinColumns = await queryInterface.describeTable('coin_transactions') as Record<string, any>;
    if (!coinColumns['topic_id']) {
        await queryInterface.addColumn('coin_transactions', 'topic_id', {
            type: DataTypes.UUID,
            allowNull: true,
        });
    } else {
        console.log('topic_id column already exists in coin_transactions table, skipping');
    }

    // Create indexes (safely handling already exists errors)
    const addIndexSafe = async (table: string, columns: string[], name: string) => {
        try {
            await queryInterface.addIndex(table, columns, { name });
        } catch (e: any) {
            // Ignore "already exists" errors for PostgreSQL and SQLite
            const isAlreadyExists =
                e.original?.code === '42P07' ||
                e.original?.code === 'SQLITE_ERROR' ||
                e.message?.includes('already exists');
            if (!isAlreadyExists) throw e;
        }
    };

    // Topics indexes
    await addIndexSafe('topics', ['slug'], 'topics_slug_idx');
    await addIndexSafe('topics', ['invite_code'], 'topics_invite_code_idx');
    await addIndexSafe('topics', ['category'], 'topics_category_idx');
    await addIndexSafe('topics', ['is_active', 'is_discoverable'], 'topics_active_discoverable_idx');

    // Topic follows indexes
    await addIndexSafe('topic_follows', ['user_id', 'topic_id'], 'topic_follows_user_topic_idx');
    await addIndexSafe('topic_follows', ['topic_id'], 'topic_follows_topic_idx');

    // Post topics indexes
    await addIndexSafe('post_topics', ['post_id', 'topic_id'], 'post_topics_post_topic_idx');
    await addIndexSafe('post_topics', ['topic_id'], 'post_topics_topic_idx');

    // User favorites indexes
    await addIndexSafe('user_favorites', ['user_id', 'favorite_user_id'], 'user_favorites_user_favorite_idx');
    await addIndexSafe('user_favorites', ['favorite_user_id'], 'user_favorites_favorite_user_idx');

    // User topic status indexes
    await addIndexSafe('user_topic_status', ['user_id', 'topic_id'], 'user_topic_status_user_topic_idx');
    await addIndexSafe('user_topic_status', ['topic_id', 'is_beginner'], 'user_topic_status_topic_beginner_idx');

    // Encouragement streaks indexes
    await addIndexSafe('encouragement_streaks', ['user_id', 'topic_id'], 'encouragement_streaks_user_topic_idx');
    await addIndexSafe('encouragement_streaks', ['topic_id', 'current_streak'], 'encouragement_streaks_topic_streak_idx');

    // User community medals indexes
    await addIndexSafe('user_community_medals', ['user_id'], 'user_community_medals_user_idx');
    await addIndexSafe('user_community_medals', ['topic_id'], 'user_community_medals_topic_idx');

    // User global medals indexes
    await addIndexSafe('user_global_medals', ['user_id'], 'user_global_medals_user_idx');

    // Coin transactions topic index
    await addIndexSafe('coin_transactions', ['topic_id'], 'coin_transactions_topic_idx');

    console.log('Created Phase 3.3 Community tables with indexes');
}

export async function down(queryInterface: QueryInterface): Promise<void> {
    // Drop tables in reverse order
    await queryInterface.dropTable('user_global_medals');
    await queryInterface.dropTable('user_community_medals');
    await queryInterface.dropTable('encouragement_streaks');
    await queryInterface.dropTable('user_topic_status');
    await queryInterface.dropTable('user_favorites');
    await queryInterface.dropTable('post_topics');
    await queryInterface.dropTable('topic_follows');
    await queryInterface.dropTable('topics');

    // Remove added columns
    try {
        await queryInterface.removeColumn('posts', 'visibility');
    } catch (e) {
        console.log('visibility column may not exist');
    }

    try {
        await queryInterface.removeColumn('coin_transactions', 'topic_id');
    } catch (e) {
        console.log('topic_id column may not exist');
    }

    // Drop ENUM types (PostgreSQL)
    const dialect = queryInterface.sequelize.getDialect();
    if (dialect === 'postgres') {
        await queryInterface.sequelize.query('DROP TYPE IF EXISTS post_visibility;');
        await queryInterface.sequelize.query('DROP TYPE IF EXISTS medal_type;');
        await queryInterface.sequelize.query('DROP TYPE IF EXISTS leaderboard_type;');
        await queryInterface.sequelize.query('DROP TYPE IF EXISTS period_type;');
    }

    console.log('Dropped Phase 3.3 Community tables');
}
