// Permanently removes Trash items older than the 30-day retention window. Intended for a daily cPanel cron job:
//   node server/scripts/trash-purge.mjs             (purge expired items)
//   node server/scripts/trash-purge.mjs --dry-run   (count only, changes nothing)
// Refuses to run against the in-memory store. Prints counts only.
import { connectDatabase, closeDatabase, isUsingMemoryStore } from '../config/database.js';
import { env } from '../config/env.js';
import { purgeExpiredTrash } from '../services/trashService.js';

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
    const result = await purgeExpiredTrash({ dryRun });
    console.log(`${dryRun ? '[dry run] ' : ''}Expired trash items: ${result.expired}, permanently deleted: ${result.purged}`);
  } finally {
    await closeDatabase();
  }
};

main().catch((error) => {
  console.error(`trash-purge failed: ${error.message}`);
  process.exitCode = 1;
});
