const { Client } = require('pg');

async function ensureDatabase() {
  const dbUrl = process.env.DATABASE_URL;

  // Extract db name without parsing URL (password may contain special chars like @)
  const dbName = dbUrl.split('/').pop().split('?')[0];
  const adminUrl = dbUrl.replace(/\/[^/]*$/, '/postgres');

  const client = new Client({ connectionString: adminUrl });
  await client.connect();

  const { rowCount } = await client.query(
    'SELECT 1 FROM pg_database WHERE datname = $1',
    [dbName]
  );

  if (rowCount === 0) {
    console.log(`Database "${dbName}" not found, creating...`);
    await client.query(`CREATE DATABASE "${dbName}"`);
    console.log(`Database "${dbName}" created.`);
  } else {
    console.log(`Database "${dbName}" already exists.`);
  }

  await client.end();
}

ensureDatabase().catch((err) => {
  console.error('Failed to ensure database:', err.message);
  process.exit(1);
});
