// Owner-run administrator recovery. Run on the server (cPanel "Terminal" or the Node.js app virtual
// environment) where the production environment variables are available:
//   node server/scripts/admin-recover.mjs --list
//   node server/scripts/admin-recover.mjs --email <stored-email> [--new-email <email>]            (dry run)
//   node server/scripts/admin-recover.mjs --email <stored-email> [--new-email <email>] --apply
// The new password is typed at a hidden prompt; it is never accepted as an argument or printed.
import readline from 'node:readline';
import { connectDatabase, closeDatabase } from '../config/database.js';
import { listAdminsForRecovery, recoverAdminAccount } from '../services/adminRecoveryService.js';

const args = process.argv.slice(2);
const option = (name) => {
  const index = args.indexOf(name);
  return index === -1 ? '' : args[index + 1] || '';
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
  await connectDatabase();
  try {
    if (args.includes('--list')) {
      console.table(await listAdminsForRecovery());
      return;
    }

    const email = option('--email');
    const newEmail = option('--new-email');
    if (!email) throw new Error('Provide --email <currently stored admin email>, or use --list.');

    if (!args.includes('--apply')) {
      console.log('Dry run only. Nothing was changed. Re-run with --apply to continue.');
      console.log(`Would reset the password for the account stored as ${email}${newEmail ? ` and change its email to ${newEmail}` : ''}.`);
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
    const result = await recoverAdminAccount({ currentEmail: email, newEmail, newPassword: password });
    console.log(`Done. Account ${result.id} (${result.role}) updated${result.emailChanged ? ' including its sign-in email' : ''}. All sessions were revoked.`);
  } finally {
    await closeDatabase();
  }
};

main().catch((error) => {
  console.error(`Recovery failed: ${error.message}`);
  process.exitCode = 1;
});
