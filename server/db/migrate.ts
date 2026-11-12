import { migrate, pool } from './index';
migrate().then(() => { console.log('Database is up to date.'); return pool.end(); }).catch((e) => { console.error('Migration failed:', e.message); process.exit(1); });
