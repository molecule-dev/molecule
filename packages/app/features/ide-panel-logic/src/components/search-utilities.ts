/**
 * Search defaults the panel and its host share.
 *
 * @module
 */

/**
 * Default search-excluded directory names shown when the host supplies none —
 * VS Code's `search.exclude`/`files.exclude` defaults plus the platform's
 * vendored/build dirs. MUST stay in sync with the API-side list in
 * `@molecule/api-ai-tools` (utilities.ts) — the cross-stack import boundary
 * forces the duplication; `molecule/scripts/__tests__/search-excluded-dirs-sync.test.mjs` fails
 * when the two differ.
 */
export const DEFAULT_SEARCH_EXCLUDED_DIRS = [
  'node_modules',
  'bower_components',
  '.git',
  '.svn',
  '.hg',
  'CVS',
  'dist',
  '.next',
  '.vite',
  'molecule',
] as const
