// Permanently removes hidden Activity Logs older than 90 days. Intended for a daily cPanel cron job:
//   node server/scripts/activity-logs-purge.mjs             (purge expired hidden logs)
//   node server/scripts/activity-logs-purge.mjs --dry-run   (count only, changes nothing)
// Refuses to run against the in-memory store. Prints counts only. Never touches visible or protected logs.
import { connectDatabase, closeDatabase, isUsingMemoryStore } from '../config/database.js';
import { env } from '../config/env.js';
import { purgeExpiredActivityLogs } from '../services/activityLogRetentionService.js';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const allowMemory = args.includes('--allow-memory-for-tests');

const main = async () => {
  if (!env.mongoUri && !allowMemory) {
    throw new Error('MONGODB_URI is not set in this shell; refusing to run against the in-memory store.');
  }
  await connectDatabase();
  try {
    if (isUsingMemoryStore() && !allowMemory) {
      throw new Error('Not connected to MongoDB (in-memory fallback); refusing to run.');
    }
    const result = await purgeExpiredActivityLogs({ dryRun });
    console.log(`${dryRun ? '[dry run] ' : ''}Expired hidden activity logs: ${result.expired}, permanently deleted: ${result.purged}`);
  } finally {
    await closeDatabase();
  }
};

main().catch((error) => {
  console.error(`activity-logs-purge failed: ${error.message}`);
  process.exitCode = 1;
});
