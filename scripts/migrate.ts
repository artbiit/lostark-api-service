import { migrationManager } from '../packages/shared/src/db/migrations.js';
import { pgClient } from '../packages/shared/src/db/postgres.js';

await pgClient.connect();
await migrationManager.migrate();
await pgClient.disconnect();
process.exit(0);
