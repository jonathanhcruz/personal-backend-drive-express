'use strict';

require('dotenv/config');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const BCRYPT_ROUNDS = 12;

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const databaseUrl = process.env.DATABASE_URL;

  if (!email || !password || !databaseUrl) {
    console.error('Missing required env vars: ADMIN_EMAIL, ADMIN_PASSWORD, DATABASE_URL');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: databaseUrl });

  try {
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);

    if (existing.rows.length > 0) {
      console.log(`Admin already exists (${email}), skipping.`);
      return;
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, role) VALUES ($1, $2, 'admin') RETURNING id`,
      [email, passwordHash],
    );
    const userId = result.rows[0].id;
    console.log(`Admin user created: ${email}`);

    const folderExists = await pool.query(
      'SELECT id FROM folders WHERE owner_id = $1 AND parent_id IS NULL',
      [userId],
    );

    if (folderExists.rows.length === 0) {
      await pool.query(
        `INSERT INTO folders (name, parent_id, owner_id) VALUES ('root', NULL, $1)`,
        [userId],
      );
      console.log('Root folder created for admin.');
    }
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
