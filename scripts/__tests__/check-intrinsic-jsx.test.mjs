/**
 * `check-intrinsic-jsx.mjs` refuses a pending entry whose package no longer renders an intrinsic JSX
 * element, and a tag an element type renders that the rule's table does not name, judging the tree
 * it runs from.
 *
 * On 2026-11-25 the avatar-stack and margin-notes conversions landed with their entries still in
 * `eslint-rules/intrinsic-jsx-pending.json`, and `Disclosure`, `Rule` and `Box as="address"` landed
 * with no entry in the rule's table.
 *
 * @module
 */
import { spawnSync } from 'node:child_process'
import {
  appendFileSync,
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

const ROOT = resolve(import.meta.dirname, '..', '..')
const dirs = []
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true })
})

/**
 * A molecule-shaped tree holding the check, the rule, its config, the real element types and the
 * given files.
 *
 * @param files - Relative path to contents.
 * @returns The tree.
 */
function tree(files) {
  const dir = mkdtempSync(join(tmpdir(), 'check-intrinsic-jsx-'))
  dirs.push(dir)
  for (const path of [
    'scripts/check-intrinsic-jsx.mjs',
    'scripts/lib/is-main.mjs',
    'eslint-rules/intrinsic-jsx-config.mjs',
    'eslint-rules/no-intrinsic-jsx.mjs',
    'packages/app/core/ui/src/elements.ts',
    'packages/app/core/ui/src/types.ts',
  ]) {
    mkdirSync(dirname(join(dir, path)), { recursive: true })
    copyFileSync(join(ROOT, path), join(dir, path))
  }
  symlinkSync(join(ROOT, 'node_modules'), join(dir, 'node_modules'))
  for (const [path, contents] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, path)), { recursive: true })
    writeFileSync(join(dir, path), contents)
  }
  return dir
}

/**
 * Run the check in a tree.
 *
 * @param dir - The tree.
 * @param args - Extra arguments.
 * @returns Its exit status and output.
 */
const check = (dir, args = []) => {
  const result = spawnSync('node', ['scripts/check-intrinsic-jsx.mjs', ...args], {
    cwd: dir,
    encoding: 'utf8',
  })
  return { status: result.status, output: result.stdout + result.stderr }
}

const FILES = {
  'eslint-rules/intrinsic-jsx-pending.json': `${JSON.stringify(
    { features: ['canvas-react', 'notes-react'], kitComponents: ['Menu.tsx', 'Popover.tsx'] },
    null,
    2,
  )}\n`,
  'packages/app/features/canvas-react/src/Canvas.tsx':
    'export const Canvas = () => <canvas width={4} />\n',
  'packages/app/features/notes-react/src/Notes.tsx':
    'import { Box } from \'@molecule/app-ui-react/elements\'\nexport const Notes = () => <Box as="ul" />\n',
  'packages/app/features/notes-react/src/__tests__/Notes.test.tsx': 'export const t = <div />\n',
  'packages/app/frameworks/react-ui/src/components/Menu.tsx': 'export const Menu = () => <div />\n',
  'packages/app/frameworks/react-ui/src/components/Popover.tsx':
    "import { Box } from '../elements/index.js'\nexport const Popover = () => <Box />\n",
}

describe('check-intrinsic-jsx', () => {
  it('names each converted package and component still pending, and keeps the ones that render a tag', () => {
    const { status, output } = check(tree(FILES))

    expect(status).toBe(1)
    expect(output).toContain('packages/app/features/notes-react: "notes-react" in "features"')
    expect(output).toContain(
      'packages/app/frameworks/react-ui/src/components/Popover.tsx: "Popover.tsx" in "kitComponents"',
    )
    expect(output).not.toContain('canvas-react')
    expect(output).not.toContain('Menu.tsx')
    expect(output).toContain('`node scripts/check-intrinsic-jsx.mjs --fix` deletes them.')
  })

  // Runs the check twice (`--fix`, then the plain check), and each run loads the TypeScript compiler
  // to read the element types: about 1 s a run here, 2.5 s in all in CI run 46038970181.
  it(
    '--fix deletes only the stale entries, after which the check passes',
    { timeout: 15_000 },
    () => {
      const dir = tree(FILES)

      expect(check(dir, ['--fix']).status).toBe(0)
      expect(
        JSON.parse(readFileSync(join(dir, 'eslint-rules/intrinsic-jsx-pending.json'), 'utf8')),
      ).toEqual({ features: ['canvas-react'], kitComponents: ['Menu.tsx'] })
      expect(check(dir)).toEqual({
        status: 0,
        output:
          'Every intrinsic-jsx-pending entry still renders an intrinsic JSX element, and the tag table matches the element types.\n',
      })
    },
  )

  it('names a tag an element type renders that the rule does not map, and an element whose `as` the rule ignores', () => {
    const dir = tree({
      ...FILES,
      'eslint-rules/intrinsic-jsx-pending.json': `${JSON.stringify(
        { features: ['canvas-react'], kitComponents: ['Menu.tsx'] },
        null,
        2,
      )}\n`,
    })
    appendFileSync(
      join(dir, 'packages/app/core/ui/src/elements.ts'),
      "\n/** A fixture element. */\nexport interface DialogBoxProps extends ElementProps {\n  /** Its tag. */\n  as: 'dialog'\n}\n",
    )

    const { status, output } = check(dir)

    expect(status).toBe(1)
    expect(output).toContain(
      '✗ <dialog>: DialogBox renders it; add it to ELEMENT_FOR_TAG in eslint-rules/no-intrinsic-jsx.mjs',
    )
    expect(output).toContain(
      '1 gap(s) between the tag table in eslint-rules/no-intrinsic-jsx.mjs and packages/app/core/ui/src/elements.ts',
    )
    expect(output).not.toContain('intrinsic-jsx-pending.json keep')
  })
})
