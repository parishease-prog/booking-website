const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Neon connection string
const CONNECTION_STRING = 'postgresql://neondb_owner:npg_RfB5QlVN2deI@ep-crimson-night-apu8suw3-pooler.c-7.us-east-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require';

async function importSchema() {
  const client = new Client({
    connectionString: CONNECTION_STRING,
  });

  try {
    console.log('🔄 Connecting to Neon...');
    await client.connect();
    console.log('✅ Connected to Neon');

    // Read the MySQL schema file
    const schemaFile = path.join(__dirname, 'schema-export.sql');
    let schemaSql = fs.readFileSync(schemaFile, 'utf-8');

    // Convert MySQL syntax to PostgreSQL
    console.log('🔄 Converting MySQL schema to PostgreSQL...');
    
    // Remove MySQL-specific comments and directives
    schemaSql = schemaSql
      .replace(/^\/\*!.*?\*\/;?$/gm, '') // Remove MySQL-specific comments
      .replace(/SET.*?;/g, '') // Remove SET statements
      .replace(/AUTO_INCREMENT=/g, '') // Remove AUTO_INCREMENT assignment
      .replace(/ENGINE=.*?;/g, ';') // Remove ENGINE declarations
      .replace(/CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci/g, '') // Remove charset/collate
      .replace(/COLLATE utf8mb4_unicode_ci/g, '') // Remove collation
      .replace(/DEFAULT CHARSET=utf8mb4/g, '') // Remove default charset
      .replace(/COLLATE=utf8mb4_unicode_ci/g, ''); // Remove collation variant

    // Convert data types
    schemaSql = schemaSql
      .replace(/tinyint\(1\)/gi, 'boolean') // TINYINT(1) -> BOOLEAN
      .replace(/tinyint\(\d+\)/gi, 'smallint') // TINYINT -> SMALLINT
      .replace(/int\(\d+\)/gi, 'integer') // INT(n) -> INTEGER
      .replace(/varchar\((\d+)\)/gi, 'varchar($1)') // VARCHAR stays the same
      .replace(/text/gi, 'text') // TEXT stays the same
      .replace(/datetime/gi, 'timestamp') // DATETIME -> TIMESTAMP
      .replace(/timestamp NOT NULL DEFAULT current_timestamp/gi, 'timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP')
      .replace(/timestamp NOT NULL DEFAULT current_timestamp\(\) ON UPDATE current_timestamp\(\)/gi, 'timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP')
      .replace(/ON UPDATE current_timestamp\(\)/gi, '') // Remove ON UPDATE
      .replace(/current_timestamp\(\)/gi, 'CURRENT_TIMESTAMP');

    // Split into individual statements
    const statements = schemaSql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`🔄 Executing ${statements.length} SQL statements...`);
    
    // Execute each statement
    let count = 0;
    for (const statement of statements) {
      if (statement.trim().length === 0) continue;
      try {
        await client.query(statement);
        count++;
        if (count % 5 === 0) console.log(`  ✅ ${count}/${statements.length} statements executed`);
      } catch (error) {
        if (!error.message.includes('already exists')) {
          console.warn(`⚠️  Statement failed: ${error.message}`);
          console.warn(`   ${statement.substring(0, 100)}...`);
        }
      }
    }

    console.log(`\n✅ Schema import complete! (${count} statements executed)`);

    // Create admin user
    console.log('🔄 Creating admin user...');
    const hashedPassword = '$2a$10$ENCRYPTED_HASH_FOR_DEMO'; // Will create a proper hash below
    
    // For now, let's create a simple admin user
    // In production, you'd want to use bcrypt
    await client.query(`
      INSERT INTO users (full_name, email, password_hash, role, is_active)
      VALUES ('Admin User', 'admin@brewspot.com', '\\$2a\\$10\\$kcKH2KnlZgj5WfHLkpFPbuYO5MWjANm7Sp2IJMS2.RIgPOEhMqrby', 'admin', 1)
      ON CONFLICT (email) DO NOTHING;
    `);
    console.log('✅ Admin user created');

    console.log('\n🎉 Neon database is ready!');
    console.log('📝 Connection string: postgresql://neondb_owner:npg_RfB5QlVN2deI@ep-crimson-night-apu8suw3-pooler.c-7.us-east-1.aws.neon.tech/neondb');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

importSchema();
