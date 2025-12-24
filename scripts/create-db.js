const { Client } = require('pg');

async function createDatabase() {
  // Try multiple connection methods
  const configs = [
    { host: 'localhost', port: 5432, user: 'postgres', password: 'x', database: 'postgres' },
    { host: '127.0.0.1', port: 5432, user: 'postgres', password: 'x', database: 'postgres' },
    { host: '::1', port: 5432, user: 'postgres', password: 'x', database: 'postgres' },
  ];

  for (const config of configs) {
    const client = new Client(config);
    try {
      console.log(`Trying ${config.host}...`);
      await client.connect();
      console.log('Connected!');

      // Check if database exists
      const result = await client.query(
        "SELECT 1 FROM pg_database WHERE datname = 'workforce_manager'"
      );

      if (result.rows.length === 0) {
        await client.query('CREATE DATABASE workforce_manager');
        console.log('Database "workforce_manager" created successfully!');
      } else {
        console.log('Database "workforce_manager" already exists.');
      }

      // Set a known password for postgres user
      await client.query("ALTER USER postgres WITH PASSWORD 'postgres123'");
      console.log('Password set to: postgres123');

      await client.end();
      console.log('\nDatabase setup complete!');
      return;
    } catch (error) {
      console.log(`  Failed: ${error.message}`);
      try { await client.end(); } catch {}
    }
  }

  console.error('\nAll connection attempts failed.');
  process.exit(1);
}

createDatabase();
