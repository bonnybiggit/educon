// Owner-run administrator recovery. Run on the server (cPanel "Terminal" or the Node.js app virtual
// environment) where the production environment variables are available:
//   node server/scripts/admin-recover.mjs --list
//   node server/scripts/admin-recover.mjs --email <stored-email> [--new-email <email>]            (dry run)
//   node server/scripts/admin-recover.mjs --email <stored-email> [--new-email <email>] --apply
// The new password is typed at a hidden prompt; it is never accepted as an argument or printed.
import readline from 'node:readline';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { connectDatabase, closeDatabase, isUsingMemoryStore } from '../config/database.js';
import { env } from '../config/env.js';
import { findAdminByEmail } from '../models/adminModel.js';
import { normalizeEmail } from '../middleware/http.js';
import { listAdminsForRecovery, recoverAdminAccount } from '../services/adminRecoveryService.js';

const args = process.argv.slice(2);
const option = (name) => {
  const index = args.indexOf(name);
  return index === -1 ? '' : args[index + 1] || '';
};

// Full copy of the record (incl. password hash and sessions) in a private file outside the web root.
const backupAdmin = (admin) => {
  const dir = option('--backup-dir') || path.join(os.homedir(), 'admin-backups');
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  const file = path.join(dir, `admin-${admin._id}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  fs.writeFileSync(file, JSON.stringify(admin, null, 2), { mode: 0o600, flag: 'wx' });
  if (JSON.parse(fs.readFileSync(file, 'utf8'))._id !== admin._id.toString()) throw new Error('Backup verification failed.');
  return file;
};

const ask = (question, { hidden = false } = {}) => new Promise((resolve) => {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  if (hidden) {
    rl._writeToOutput = (text) => { if (text.includes(question)) process.stdout.write(question); };
  }
  rl.question(question, (answer) => {
    rl.close();
    if (hidden) process.stdout.write('\n');
    resolve(answer);
  });
});

const main = async () => {
  if (!env.mongoUri && !args.includes('--allow-memory-for-tests')) {
    throw new Error('MONGODB_URI is not set in this shell; refusing to run against the in-memory store.');
  }
  await connectDatabase();
  try {
    if (isUsingMemoryStore() && !args.includes('--allow-memory-for-tests')) {
      throw new Error('Not connected to MongoDB (in-memory fallback); refusing to run.');
    }
    console.log(`Database: ${env.dbName} / collection: ${env.adminsCollection} (NODE_ENV=${env.nodeEnv})`);
    if (args.includes('--list')) {
      console.table(await listAdminsForRecovery());
      return;
    }

    const email = option('--email');
    const newEmail = option('--new-email');
    if (!email) throw new Error('Provide --email <currently stored admin email>, or use --list.');

    const admin = await findAdminByEmail(normalizeEmail(email));
    if (!admin) throw new Error('No administrator account matches that stored email.');
    if (newEmail && normalizeEmail(newEmail) !== admin.email && await findAdminByEmail(normalizeEmail(newEmail))) {
      throw new Error('The new email already belongs to another account. Nothing was changed.');
    }

    if (!args.includes('--apply')) {
      console.log(`Found account ${admin._id} role=${admin.role} isActive=${admin.isActive} isBootstrapAdmin=${admin.isBootstrapAdmin} passwordChangeRequired=${admin.passwordChangeRequired}`);
      console.log('Dry run only. Nothing was changed. Re-run with --apply to continue.');
      console.log(`Would back up the record, reset the password for the account stored as ${email}${newEmail ? ` and change its email to ${newEmail}` : ''}.`);
      console.log('Existing _id, role, permissions and data are preserved; all sessions are revoked.');
      return;
    }

    if ((await ask('Type RECOVER to confirm you own this site and this account: ')).trim() !== 'RECOVER') {
      throw new Error('Confirmation not given. Nothing was changed.');
    }
    const password = await ask('New password: ', { hidden: true });
    if (password !== await ask('Repeat new password: ', { hidden: true })) {
      throw new Error('Passwords do not match. Nothing was changed.');
    }
    console.log(`Backup written to ${backupAdmin(admin)} (contains the password hash; keep private).`);
    const result = await recoverAdminAccount({ currentEmail: email, newEmail, newPassword: password });
    console.log(`Done. Account ${result.id} (${result.role}) updated${result.emailChanged ? ' including its sign-in email' : ''}. Password verified, passwordChangeRequired cleared, all sessions revoked.`);
  } finally {
    await closeDatabase();
  }
};

main().catch((error) => {
  console.error(`Recovery failed: ${error.message}`);
  process.exitCode = 1;
});
