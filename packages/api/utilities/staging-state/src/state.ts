/**
 * State file operations for staging environments.
 *
 * Manages the `.molecule/staging.json` file that tracks active
 * ephemeral environments in a project.
 *
 * @module
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

import type { StagingEnvironmentRecord, StagingState } from './types.js'

const STATE_DIR = '.molecule'
const STATE_FILE = 'staging.json'

/**
 * Returns the absolute path to the staging state file.
 *
 * @param projectPath - Absolute path to the project root.
 * @returns Absolute path to `.molecule/staging.json`.
 */
export function statePath(projectPath: string): string {
  return join(projectPath, STATE_DIR, STATE_FILE)
}

/**
 * Creates an empty state object.
 *
 * @returns A fresh `StagingState` with no environments.
 */
function emptyState(): StagingState {
  return { version: 1, environments: {} }
}

/**
 * Loads the staging state from disk.
 * Returns an empty state if the file does not exist.
 *
 * @param projectPath - Absolute path to the project root.
 * @returns The current staging state.
 */
export async function loadState(projectPath: string): Promise<StagingState> {
  try {
    const content = await readFile(statePath(projectPath), 'utf-8')
    return JSON.parse(content) as StagingState
  } catch {
    return emptyState()
  }
}

/**
 * Persists the staging state to disk, creating the `.molecule/` directory if needed.
 *
 * @param projectPath - Absolute path to the project root.
 * @param state - The state to persist.
 */
export async function saveState(projectPath: string, state: StagingState): Promise<void> {
  const filePath = statePath(projectPath)
  await mkdir(dirname(filePath), { recursive: true })
  await writeFile(filePath, JSON.stringify(state, null, 2) + '\n')
}

/**
 * Adds or updates an environment record in the state file.
 *
 * @param projectPath - Absolute path to the project root.
 * @param record - The environment record to add or update.
 */
export async function addEnvironment(
  projectPath: string,
  record: StagingEnvironmentRecord,
): Promise<void> {
  const state = await loadState(projectPath)
  state.environments[record.slug] = record
  await saveState(projectPath, state)
}

/**
 * Removes an environment record from the state file.
 *
 * @param projectPath - Absolute path to the project root.
 * @param slug - The slug of the environment to remove.
 */
export async function removeEnvironment(projectPath: string, slug: string): Promise<void> {
  const state = await loadState(projectPath)
  delete state.environments[slug]
  await saveState(projectPath, state)
}

/**
 * Retrieves a single environment record by slug.
 *
 * @param projectPath - Absolute path to the project root.
 * @param slug - The slug to look up.
 * @returns The environment record, or `undefined` if not found.
 */
export async function getEnvironment(
  projectPath: string,
  slug: string,
): Promise<StagingEnvironmentRecord | undefined> {
  const state = await loadState(projectPath)
  return state.environments[slug]
}

/**
 * Lists all active environment records.
 *
 * @param projectPath - Absolute path to the project root.
 * @returns Array of all environment records.
 */
export async function listEnvironments(projectPath: string): Promise<StagingEnvironmentRecord[]> {
  const state = await loadState(projectPath)
  return Object.values(state.environments)
}

/**
 * Allocates a set of non-colliding ports for a new staging environment.
 * Each environment needs three ports: API, App, and DB. Ports are allocated
 * sequentially from the range, skipping any already in use.
 *
 * @param projectPath - Absolute path to the project root.
 * @param portRange - The port range to allocate from.
 * @param portRange.start - First port in the range (inclusive).
 * @param portRange.end - Last port in the range (inclusive).
 * @returns An object with allocated `api`, `app`, and `db` ports.
 * @throws {Error} If no free ports are available in the range.
 */
export async function allocatePort(
  projectPath: string,
  portRange: { start: number; end: number },
): Promise<{ api: number; app: number; db: number }> {
  const state = await loadState(projectPath)

  const usedPorts = new Set<number>()
  for (const env of Object.values(state.environments)) {
    if (env.ports.api) usedPorts.add(env.ports.api)
    if (env.ports.app) usedPorts.add(env.ports.app)
    if (env.ports.db) usedPorts.add(env.ports.db)
  }

  const allocated: number[] = []
  for (let port = portRange.start; port <= portRange.end && allocated.length < 3; port++) {
    if (!usedPorts.has(port)) {
      allocated.push(port)
    }
  }

  if (allocated.length < 3) {
    throw new Error(
      `No free ports available in range ${portRange.start}-${portRange.end}. ` +
        `Tear down unused staging environments with 'mlcl stage down'.`,
    )
  }

  return { api: allocated[0], app: allocated[1], db: allocated[2] }
}
