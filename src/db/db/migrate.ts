import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { config } from '../../config.js';
import { createDbPool } from './client.js';
import { createLogger } from '../../lib/logger.js';

const log = createLogger('db-migration');

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runMigration() {
  log.info({}, 'starting database migration');

  const pool = createDbPool(config.DATABASE_URL);
  
  try {
    const schemaPath = join(__dirname, 'schema.sql');
    log.info({ schemaPath }, 'reading schema file');
    const sql = await fs.readFile(schemaPath, 'utf8');

    log.info({}, 'executing schema SQL');
    await pool.query(sql);

    log.info({}, 'database migration completed successfully');
  } catch (err) {
    log.error({ err }, 'database migration failed');
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration().catch((err) => {
  log.error({ err }, 'unhandled migration error');
  process.exit(1);
});
