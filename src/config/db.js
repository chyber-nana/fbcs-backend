import knex from 'knex';
import knexConfig from '../../knexfile.js';
import env from './env.js';

const config = knexConfig[env.nodeEnv] || knexConfig.development;
const db = knex(config);

export default db;
