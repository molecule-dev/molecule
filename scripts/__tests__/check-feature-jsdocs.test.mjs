/**
 * check-feature-jsdocs refuses a framework feature package whose module example imports the
 * static `t` from `@molecule/app-i18n`: a component that renders with it keeps the old language
 * after a locale switch, and apps copy the example. The script runs from a scratch tree (it finds
 * packages relative to its own location).
 */
import { spawnSync } from 'node:child_process'
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import process from 'node:process'

import { afterEach, describe, expect, it } from 'vitest'

const SCRIPT = join(import.meta.dirname, '../check-feature-jsdocs.mjs')
const roots = []
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
})

/**
 * Runs the check over feature packages written to a scratch tree.
 *
 * @param packages - `src/index.ts` text by feature directory name.
 * @returns The exit status and the combined output.
 */
function check(packages) {
  const root = mkdtempSync(join(tmpdir(), 'feature-jsdocs-'))
  roots.push(root)
  mkdirSync(join(root, 'scripts'))
  copyFileSync(SCRIPT, join(root, 'scripts', 'check-feature-jsdocs.mjs'))
  for (const [name, index] of Object.entries(packages)) {
    const dir = join(root, 'packages', 'app', 'features', name)
    mkdirSync(join(dir, 'src'), { recursive: true })
    writeFileSync(join(dir, 'package.json'), '{}')
    writeFileSync(join(dir, 'src', 'index.ts'), index)
  }
  const run = spawnSync(
    process.execPath,
    [join(root, 'scripts', 'check-feature-jsdocs.mjs'), '--check'],
    {
      encoding: 'utf8',
    },
  )
  return { status: run.status, output: `${run.stdout}${run.stderr}` }
}

/** A module JSDoc whose example imports `importLine`. */
const example = (importLine) =>
  [
    '/**',
    ' * A widget.',
    ' *',
    ' * @example',
    ' * ```typescript',
    ` * ${importLine}`,
    ' * ```',
    ' *',
    ' * @module',
    ' */',
    "export * from './widget.js'",
    '',
  ].join('\n')

describe('check-feature-jsdocs static t', () => {
  it('refuses a framework package whose example imports the static t, naming the line and the binding', () => {
    const { status, output } = check({
      'widget-vue': example("import { t } from '@molecule/app-i18n'"),
    })
    expect(status).toBe(1)
    expect(output).toContain('packages/app/features/widget-vue/src/index.ts:6 (@molecule/app-vue)')
  })

  it('passes the same package once its example translates through the binding', () => {
    const { status, output } = check({
      'widget-vue': example("import { useTranslation } from '@molecule/app-vue'"),
    })
    expect(status).toBe(0)
    expect(output).not.toContain('static `t`')
  })

  it('leaves a framework-neutral package and the static t outside a doc comment alone', () => {
    const { status } = check({
      // Outside components the static t is the right call, and the neutral package has none.
      widget: example("import { t } from '@molecule/app-i18n'"),
      // Source code (not an example) is eslint's to judge.
      'widget-react': `${example("import { useTranslation } from '@molecule/app-react'")}import { t } from '@molecule/app-i18n'\nexport const label = (): string => t('widget.label')\n`,
    })
    expect(status).toBe(0)
  })

  it('still refuses a package without an example', () => {
    const { status, output } = check({ 'widget-solid': "export * from './widget.js'\n" })
    expect(status).toBe(1)
    expect(output).toContain('packages/app/features/widget-solid')
  })
})
