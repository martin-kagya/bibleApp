const { pool } = require('../config/database')

// Database schema migration
const migrations = [
  {
    name: 'create_scriptures_table',
    up: `
      CREATE TABLE IF NOT EXISTS scriptures (
        id SERIAL PRIMARY KEY,
        reference VARCHAR(100) UNIQUE NOT NULL,
        book VARCHAR(50) NOT NULL,
        chapter INTEGER NOT NULL,
        verse_start INTEGER NOT NULL,
        verse_end INTEGER,
        text TEXT NOT NULL,
        translation VARCHAR(50) NOT NULL DEFAULT 'KJV',
        embedding VECTOR(1536),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
      
      CREATE INDEX IF NOT EXISTS idx_scriptures_reference ON scriptures(reference);
      CREATE INDEX IF NOT EXISTS idx_scriptures_book_chapter ON scriptures(book, chapter);
      CREATE INDEX IF NOT EXISTS idx_scriptures_translation ON scriptures(translation);
    `,
    down: `DROP TABLE IF EXISTS scriptures CASCADE;`
  },
  {
    name: 'create_sermons_table',
    up: `
      CREATE TABLE IF NOT EXISTS sermons (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255),
        preacher VARCHAR(255),
        transcript TEXT,
        themes JSONB,
        detected_scriptures JSONB,
        suggested_scriptures JSONB,
        duration INTEGER,
        date DATE DEFAULT CURRENT_DATE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
      
      CREATE INDEX IF NOT EXISTS idx_sermons_date ON sermons(date);
      CREATE INDEX IF NOT EXISTS idx_sermons_themes ON sermons USING GIN(themes);
    `,
    down: `DROP TABLE IF EXISTS sermons CASCADE;`
  },
  {
    name: 'create_themes_table',
    up: `
      CREATE TABLE IF NOT EXISTS themes (
        id SERIAL PRIMARY KEY,
        sermon_id INTEGER REFERENCES sermons(id) ON DELETE CASCADE,
        theme_name VARCHAR(255) NOT NULL,
        confidence FLOAT NOT NULL,
        keywords JSONB,
        context TEXT,
        timestamp TIMESTAMP DEFAULT NOW()
      );
      
      CREATE INDEX IF NOT EXISTS idx_themes_sermon_id ON themes(sermon_id);
      CREATE INDEX IF NOT EXISTS idx_themes_name ON themes(theme_name);
    `,
    down: `DROP TABLE IF EXISTS themes CASCADE;`
  },
  {
    name: 'create_user_preferences_table',
    up: `
      CREATE TABLE IF NOT EXISTS user_preferences (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) UNIQUE NOT NULL,
        preferred_translation VARCHAR(50) DEFAULT 'KJV',
        theme_preferences JSONB,
        display_settings JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
      
      CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);
    `,
    down: `DROP TABLE IF EXISTS user_preferences CASCADE;`
  },
  {
    name: 'create_cache_metadata_table',
    up: `
      CREATE TABLE IF NOT EXISTS cache_metadata (
        id SERIAL PRIMARY KEY,
        cache_key VARCHAR(255) UNIQUE NOT NULL,
        cache_type VARCHAR(50) NOT NULL,
        hit_count INTEGER DEFAULT 0,
        last_accessed TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW()
      );
      
      CREATE INDEX IF NOT EXISTS idx_cache_metadata_key ON cache_metadata(cache_key);
      CREATE INDEX IF NOT EXISTS idx_cache_metadata_type ON cache_metadata(cache_type);
    `,
    down: `DROP TABLE IF EXISTS cache_metadata CASCADE;`
  },
  {
    name: 'create_migrations_table',
    up: `
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP DEFAULT NOW()
      );
    `,
    down: `DROP TABLE IF EXISTS migrations CASCADE;`
  }
]

async function runMigrations() {
  console.log('🚀 Starting database migrations...\n')
  
  const client = await pool.connect()
  
  try {
    // Create migrations table first
    await client.query(migrations[migrations.length - 1].up)
    console.log('✓ Migrations table created')
    
    // Check which migrations have been run
    const { rows: executedMigrations } = await client.query(
      'SELECT name FROM migrations'
    )
    const executedNames = executedMigrations.map(row => row.name)
    
    // Run pending migrations
    for (const migration of migrations.slice(0, -1)) {
      if (executedNames.includes(migration.name)) {
        console.log(`⊘ Skipping ${migration.name} (already executed)`)
        continue
      }
      
      console.log(`→ Running migration: ${migration.name}`)
      await client.query('BEGIN')
      
      try {
        await client.query(migration.up)
        await client.query(
          'INSERT INTO migrations (name) VALUES ($1)',
          [migration.name]
        )
        await client.query('COMMIT')
        console.log(`✓ ${migration.name} completed`)
      } catch (error) {
        await client.query('ROLLBACK')
        console.error(`✗ ${migration.name} failed:`, error.message)
        throw error
      }
    }
    
    console.log('\n✓ All migrations completed successfully!')
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error)
    throw error
  } finally {
    client.release()
    await pool.end()
  }
}

// Run migrations if called directly
if (require.main === module) {
  runMigrations()
    .then(() => process.exit(0))
    .catch(() => process.exit(1))
}

module.exports = { runMigrations, migrations }


