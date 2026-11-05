// Owner-run promotion of an EXISTING admin to super_admin. Run on the server (cPanel Terminal / Node.js app
// virtual environment) where the production environment variables are available:
//   node server/scripts/admin-promote.mjs --email <admin-email>            (dry run, read-only)
//   node server/scripts/admin-promote.mjs --email <admin-email> --apply    (backup, confirm, promote)
// Only role, sessions/sessionVersion and updatedAt change. Never creates accounts or sets isBootstrapAdmin.
import readline from 'node:readline';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { connectDatabase, closeDatabase, isUsingMemoryStore } from '../config/database.js';
import { env } from '../config/env.js';
import { inspectPromotion, promoteAdminToSuperAdmin } from '../services/adminPromotionService.js';

const args = process.argv.slice(2);
const option = (name) => {
  const index = args.indexOf(name);
  return index === -1 ? '' : args[index + 1] || '';
};
const allowMemory = args.includes('--allow-memory-for-tests');
const allowExistingSuperAdmin = args.includes('--allow-existing-super-admin');

const ask = (question) => new Promise((resolve) => {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  rl.question(question, (answer) => { rl.close(); resolve(answer); });
});

// Full copy (incl. password hash and sessions) in a private file outside the web root.
const backupAdmin = (admin) => {
  const dir = option('--backup-dir') || path.join(os.homedir(), 'admin-backups');
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  const file = path.join(dir, `admin-promote-${admin._id}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  fs.writeFileSync(file, JSON.stringify(admin, null, 2), { mode: 0o600, flag: 'wx' });
  if (JSON.parse(fs.readFileSync(file, 'utf8'))._id !== admin._id.toString()) throw new Error('Backup verification failed.');
  return file;
};

const main = async () => {
  if (!env.mongoUri && !allowMemory) {
    throw new Error('MONGODB_URI is not set in this shell; refusing to run against the in-memory store.');
  }
  await connectDatabase();
  try {
    if (isUsingMemoryStore() && !allowMemory) {
      throw new Error('Not connected to MongoDB (in-memory fallback); refusing to run.');
    }
    console.log(`Database: ${env.dbName} / collection: ${env.adminsCollection} (NODE_ENV=${env.nodeEnv})`);

    const email = option('--email');
    if (!email) throw new Error('Provide --email <admin email to promote>.');

    const { admin, existingSuperAdmins } = await inspectPromotion({ email, allowExistingSuperAdmin });
    console.log(`Found account ${admin._id} role=${admin.role} isActive=${admin.isActive} isBootstrapAdmin=${admin.isBootstrapAdmin}`);
    console.log(`Existing active super admins: ${existingSuperAdmins.length}`);

    if (!args.includes('--apply')) {
      console.log('Dry run only. Nothing was changed. Re-run with --apply to continue.');
      console.log('Would back up the record, set role=super_admin and revoke all sessions. Email, password, _id and data are untouched.');
      return;
    }

    if ((await ask('Type PROMOTE to make this account a super admin: ')).trim() !== 'PROMOTE') {
      throw new Error('Confirmation not given. Nothing was changed.');
    }
    console.log(`Backup written to ${backupAdmin(admin)} (contains the password hash; keep private).`);
    const result = await promoteAdminToSuperAdmin({ email, allowExistingSuperAdmin });
    console.log(`Done. Account ${result.id} role ${result.previousRole} -> ${result.role}. All sessions revoked; sign in again.`);
  } finally {
    await closeDatabase();
  }
};

main().catch((error) => {
  console.error(`Promotion failed: ${error.message}`);
  process.exitCode = 1;
});
