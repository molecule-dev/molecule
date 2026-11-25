/** Locate the aggregate that exposes this checkout at its molecule/ entry. */
import console from 'node:console'
import { readdirSync, readFileSync, realpathSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import process from 'node:process'
import { fileURLToPath, URL } from 'node:url'

import { isMainModule } from './is-main.mjs'

const MOLECULE = fileURLToPath(new URL('../../', import.meta.url))

/**
 * Identify an aggregate by its manifest and the checkout its entry reaches.
 *
 * @param root - Candidate aggregate root.
 * @param checkout - Physical Molecule checkout.
 * @returns Whether the aggregate exposes that checkout.
 */
function ownsCheckout(root, checkout) {
  try {
    return (
      realpathSync(join(root, 'molecule')) === checkout &&
      JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).name === 'molecule-workspace'
    )
  } catch (_error) {
    // A non-aggregate directory or incomplete checkout cannot own the match.
    return false
  }
}

/**
 * Return the aggregate root, or the repository's parent for legacy standalone
 * peer lookups. The caller's existing file/dependency checks decide what can run.
 *
 * @param moleculeDir - Molecule's checkout, through either spelling.
 * @param override - Explicit aggregate when several expose this checkout.
 * @returns An absolute directory.
 */
export function aggregateRoot(moleculeDir = MOLECULE, override = process.env.MOL_AGGREGATE_ROOT) {
  const checkout = realpathSync(moleculeDir)
  if (override) {
    const root = resolve(override)
    if (!ownsCheckout(root, checkout))
      throw new Error(`MOL_AGGREGATE_ROOT does not expose this Molecule checkout: ${root}`)
    return realpathSync(root)
  }
  const parent = dirname(checkout)
  if (ownsCheckout(parent, checkout)) return parent
  let entries
  try {
    entries = readdirSync(parent, { withFileTypes: true })
  } catch (error) {
    if (error.code === 'EACCES' || error.code === 'EPERM') return parent
    throw error
  }
  const matches = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(parent, entry.name))
    .filter((root) => ownsCheckout(root, checkout))
  if (matches.length > 1)
    throw new Error(
      'Several aggregate checkouts expose this Molecule checkout. Set MOL_AGGREGATE_ROOT.',
    )
  return matches[0] ?? parent
}

if (isMainModule(import.meta.url)) console.log(aggregateRoot())
