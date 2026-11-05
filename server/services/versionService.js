import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

const readCommit = () => {
  const explicit = String(process.env.APP_COMMIT || '').trim();
  if (/^[0-9a-f]{7,40}$/i.test(explicit)) return explicit.slice(0, 12);

  try {
    const stamped = fs.readFileSync(path.join(appRoot, 'server', 'BUILD_COMMIT'), 'utf8').trim();
    if (/^[0-9a-f]{7,40}$/i.test(stamped)) return stamped.slice(0, 12);
  } catch {
    // No stamp file; fall back to git metadata.
  }

  try {
    return execFileSync('git', ['rev-parse', '--short=12', 'HEAD'], {
      cwd: appRoot, encoding: 'utf8', timeout: 3000, stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return 'unknown';
  }
};

// Resolved once at process start, so it reports the code this process actually loaded, not what is on disk later.
export const buildInfo = Object.freeze({
  commit: readCommit(),
  startedAt: new Date().toISOString(),
});
