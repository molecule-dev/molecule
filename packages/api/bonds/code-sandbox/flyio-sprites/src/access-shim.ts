/**
 * The `access(2)` EACCES workaround preload, written into every sprite.
 *
 * WORKAROUND FOR A SPRITES PLATFORM BUG — remove this module (and its wiring
 * in `provider.ts`) when Fly fixes cold-restore. Reported in
 * `docs/sprites-cold-restore-bug-report.md` (molecule-workspace repo): after a
 * sprite is restored from COLD (object-storage rehydration), `access(2)` /
 * `faccessat(2)` returns EACCES for paths written before the sleep, while
 * `stat(2)`, `read(2)` and `readdir(2)` on the same paths all succeed. Node's
 * `fs.existsSync`/`fs.accessSync` are access(2)-based, so every tool that
 * gates on them breaks — Vite refuses to boot on any rehydrated sandbox.
 *
 * @module
 */

/** Where the preload lives inside a sprite; `NODE_OPTIONS=--require <path>`. */
export const SPRITES_ACCESS_SHIM_PATH = '/etc/mol/sprites-access-shim.cjs'

/**
 * CommonJS source of the preload. Rewrites an EACCES answer from the
 * access(2) family into the stat(2) answer: when stat succeeds the path
 * exists, so existence-style checks succeed. For R_OK/W_OK/X_OK requests the
 * real answer is unknowable while the platform bug stands — stat-success is
 * the lesser error, because reads DO work on the affected paths and a false
 * EACCES hard-breaks the sandbox.
 */
export const SPRITES_ACCESS_SHIM_SOURCE = `// Sprites access(2) EACCES workaround — REMOVE when Fly fixes cold-restore.
//
// Platform bug (docs/sprites-cold-restore-bug-report.md, molecule-workspace):
// after a sprite rehydrates from cold storage, access(2) returns EACCES for
// paths written before the sleep while stat/read/readdir all succeed. Node's
// fs.existsSync/fs.accessSync sit on access(2), so Vite's boot check (and any
// existsSync-gated tool) dies on every rehydrated sandbox. This preload falls
// back to stat(2) whenever access(2) says EACCES: stat-success means the path
// exists and is, in practice, readable (read(2) works on the affected paths).
// For R_OK/W_OK/X_OK the true answer is unknowable while the bug stands —
// stat-success is the lesser error than a false EACCES.
'use strict';
const fs = require('fs');

const origAccessSync = fs.accessSync;
const origAccess = fs.access;
const origPromisesAccess = fs.promises.access;
const origExistsSync = fs.existsSync;

const isBuggedEacces = (err) => !!err && err.code === 'EACCES';

fs.accessSync = function accessSync(path, mode) {
  try {
    return origAccessSync.call(fs, path, mode);
  } catch (err) {
    if (!isBuggedEacces(err)) throw err;
    fs.statSync(path); // throws (e.g. ENOENT) when the path is genuinely absent
    return undefined;
  }
};

fs.access = function access(path, mode, callback) {
  if (typeof mode === 'function') {
    callback = mode;
    mode = undefined;
  }
  origAccess.call(fs, path, mode, (err) => {
    if (!isBuggedEacces(err)) return callback(err);
    fs.stat(path, (statErr) => callback(statErr ? err : null));
  });
};

fs.promises.access = async function access(path, mode) {
  try {
    return await origPromisesAccess.call(fs.promises, path, mode);
  } catch (err) {
    if (!isBuggedEacces(err)) throw err;
    await fs.promises.stat(path); // rethrows when genuinely absent
    return undefined;
  }
};

fs.existsSync = function existsSync(path) {
  // existsSync swallows the bugged EACCES into a plain false — double-check
  // with stat before agreeing that the path is missing.
  if (origExistsSync.call(fs, path)) return true;
  try {
    fs.statSync(path);
    return true;
  } catch {
    return false;
  }
};
`
