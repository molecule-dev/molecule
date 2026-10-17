/**
 * The installed-package guard decides from what is INSTALLED, not from the
 * spelling of the path (X0 xr-molecule-flash-m106, +07:58 → +08:09).
 *
 * The run copied the supplied e2e suite into its own scratch directory and ran
 * `ln -sf /workspace/my-app/app/node_modules node_modules` to borrow the tree.
 * Everything was hoisted to `/workspace/node_modules`, so the link dangled — and
 * the next three commands (`rm -f`, `rm -rf`, `unlink` on that link) were each
 * refused as "inside an installed package", ending in the "3rd time this turn …
 * ask the user" escalation, in an unattended run. The guard was a pure path
 * test: nothing was ever installed under the path it protected.
 *
 * These cases run against a real filesystem, so the removal is real too: the
 * property that makes a link safe to remove is that `unlink` takes the LINK and
 * leaves its target alone.
 */
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { createLocalBackend } from '../backends/local.js'
import { buildTools, installedPackageWriteRefusal } from '../tools.js'

let root = ''
/** The real install: `<root>/real/node_modules/@molecule/x/…`. */
let install = ''
/** The run's own dir, with `node_modules` linked INTO the real install. */
let linked = ''
/** A second such dir, kept for the through-the-link refusal (the first is deleted). */
let through = ''
/** The run's own dir, with a node_modules that points at a path that never existed. */
let dangling = ''
/** A node_modules directory with nothing installed under it. */
let empty = ''

const write = (path: string, content = 'export const x = 1\n'): void => {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, content)
}

const tool = (name: string) => {
  const found = buildTools(createLocalBackend(root)).find((t) => t.name === name)
  if (!found) throw new Error(`${name} not built`)
  return found
}
beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), 'mol-installed-'))
  install = join(root, 'real', 'node_modules')
  write(join(install, '@molecule', 'x', 'package.json'), '{"name":"@molecule/x"}\n')
  write(join(install, '@molecule', 'x', 'dist', 'index.js'))

  linked = join(root, 'linked')
  mkdirSync(linked, { recursive: true })
  symlinkSync(install, join(linked, 'node_modules'))

  through = join(root, 'through')
  mkdirSync(through, { recursive: true })
  symlinkSync(install, join(through, 'node_modules'))

  dangling = join(root, 'dangling')
  mkdirSync(dangling, { recursive: true })
  // A path that does not exist: the m106 shape (the app has no node_modules of its own).
  symlinkSync(join(root, 'my-app', 'app', 'node_modules'), join(dangling, 'node_modules'))

  empty = join(root, 'empty')
  mkdirSync(join(empty, 'node_modules'), { recursive: true })
})

afterAll(() => {
  if (root) rmSync(root, { recursive: true, force: true })
})

describe('installedPackageWriteRefusal — the decision, without the filesystem', () => {
  it('refuses a path inside a package when the probe cannot answer', async () => {
    // No probe means no facts: the conservative reading, unchanged for any caller
    // that cannot look at the filesystem.
    expect(await installedPackageWriteRefusal('/w/node_modules/@m/p/f.js')).toMatch(/read-only/)
    expect(await installedPackageWriteRefusal('/w/node_modules')).toMatch(/read-only/)
    expect(await installedPackageWriteRefusal('/w/src/f.js')).toBeNull()
  })

  it('lets the entry go when it is a link, and refuses a path through a real one', async () => {
    const facts = (symlink: boolean, installed: boolean) => async () => ({ symlink, installed })
    // The entry itself: a link is removable, whether or not its target exists.
    expect(await installedPackageWriteRefusal('/w/e2e/node_modules', facts(true, true))).toBeNull()
    expect(await installedPackageWriteRefusal('/w/e2e/node_modules', facts(true, false))).toBeNull()
    expect(await installedPackageWriteRefusal('/w/e2e/node_modules', facts(false, true))).toMatch(
      /read-only/,
    )
    // A path under the entry: the facts resolved THROUGH the link, so a real
    // install there is still refused — removing through the link reaches it.
    expect(
      await installedPackageWriteRefusal('/w/e2e/node_modules/@m/p/f.js', facts(true, true)),
    ).toMatch(/read-only/)
  })

  it('lets the run clean its own scratch directory, and an entry with nothing installed', async () => {
    const facts = (symlink: boolean, installed: boolean) => async () => ({ symlink, installed })
    expect(
      await installedPackageWriteRefusal(
        '/w/.mol-scratch/rw-e2e/node_modules',
        facts(false, false),
      ),
    ).toBeNull()
    expect(
      await installedPackageWriteRefusal(
        '/w/.mol-scratch/rw-e2e/node_modules/@m/p/f.js',
        facts(false, true),
      ),
    ).toBeNull()
    expect(
      await installedPackageWriteRefusal('/w/e2e/node_modules/@m/p', facts(false, false)),
    ).toBeNull()
  })
})

describe('installedPackageWriteRefusal — against a real filesystem', () => {
  it('removes the link the run made, and leaves the tree it points at alone', async () => {
    // The m106 commands, through the file tool that does the same thing.
    const result = (await tool('delete_file').execute({
      path: join(linked, 'node_modules'),
    })) as { ok?: boolean; error?: string }
    expect(result.error).toBeUndefined()
    expect(result.ok).toBe(true)
    // `unlink` removed the LINK; the install behind it is untouched.
    expect(
      (await tool('read_file').execute({
        path: join(install, '@molecule', 'x', 'dist', 'index.js'),
      })) as { content?: string },
    ).toMatchObject({ content: 'export const x = 1\n' })
  })

  it('removes a DANGLING link — the m106 case — and a node_modules with nothing installed', async () => {
    const deleted = (await tool('delete_file').execute({
      path: join(dangling, 'node_modules'),
    })) as { ok?: boolean; error?: string }
    expect(deleted.error).toBeUndefined()

    const written = (await tool('write_file').execute({
      path: join(empty, 'node_modules', 'keep.txt'),
      content: 'x\n',
    })) as { ok?: boolean; error?: string }
    expect(written.error).toBeUndefined()
    expect(written.ok).toBe(true)
  })

  it('still refuses the real install, and a path THROUGH the link into it', async () => {
    for (const path of [
      join(install, '@molecule', 'x', 'dist', 'index.js'),
      join(root, 'through', 'node_modules', '@molecule', 'x', 'dist', 'index.js'),
    ]) {
      const result = (await tool('write_file').execute({
        path,
        content: 'module.exports = {}\n',
      })) as {
        error?: string
      }
      expect(result.error, path).toMatch(/read-only/)
      expect(result.error).toMatch(/@molecule\/x/)
    }
  })
})
