import { config } from '../config.js';
import { createDbPool } from './client.js';

export const db = createDbPool(config.DATABASE_URL);
export type Db = typeof db;
