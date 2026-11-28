import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { delimiter, join } from 'node:path'
import process from 'node:process'

import { describe, expect, it, vi } from 'vitest'

import {
  deprecationMessage,
  deprecationsDue,
  replacedPackages,
  runNpmDeprecation,
} from '../deprecate-replaced-packages.mjs'

const registry = {
  packages: {
    '@molecule/app-new': {},
    '@molecule/app-old-b': { replacedBy: '@molecule/app-new-b' },
    '@molecule/app-old': { replacedBy: '@molecule/app-new' },
    '@molecule/app-blank': { replacedBy: '' },
  },
}

describe('deprecating renamed packages', () => {
  it('lists every registry entry marked replacedBy, in name order', () => {
    expect(replacedPackages(registry)).toEqual([
      { name: '@molecule/app-old', replacement: '@molecule/app-new' },
      { name: '@molecule/app-old-b', replacement: '@molecule/app-new-b' },
    ])
    expect(replacedPackages({})).toEqual([])
  })

  it('deprecates only versions npm does not mark yet, and skips a name npm never had', async () => {
    const docs = {
      '@molecule/app-old': {
        versions: { '1.0.0': { deprecated: 'renamed' }, '1.0.1': {}, '1.0.2': {} },
      },
      '@molecule/app-old-b': { versions: { '1.0.0': { deprecated: 'renamed' } } },
    }
    const due = await deprecationsDue(
      [...replacedPackages(registry), { name: '@molecule/app-never', replacement: 'x' }],
      async (name) => docs[name] ?? null,
    )
    expect(due).toEqual([
      {
        name: '@molecule/app-old',
        replacement: '@molecule/app-new',
        versions: ['1.0.1', '1.0.2'],
      },
    ])
  })

  it('names the new package in the message', () => {
    expect(deprecationMessage('@molecule/app-old', '@molecule/app-new')).toBe(
      '@molecule/app-old was renamed to @molecule/app-new; install @molecule/app-new instead.',
    )
  })

  it('returns the same npm refusal under a silent parent', () => {
    const bin = mkdtempSync(join(tmpdir(), 'deprecate-fake-npm-'))
    try {
      writeFileSync(
        join(bin, 'npm'),
        `#!/bin/sh
level=\${npm_config_loglevel:-notice}
for arg do case "$arg" in --loglevel=*) level=\${arg#*=};; esac; done
if [ "$level" != silent ]; then printf '%s\\n' 'npm error code E403' >&2; fi
exit 1
`,
        { mode: 0o755 },
      )
      vi.stubEnv('PATH', `${bin}${delimiter}${process.env.PATH}`)
      const run = (level) => {
        vi.stubEnv('npm_config_loglevel', level)
        const { status, stderr } = runNpmDeprecation(
          { name: '@molecule/app-old', replacement: '@molecule/app-new' },
          '000000',
          join(bin, 'npmrc'),
        )
        return { status, stderr }
      }
      const normal = run('notice')
      expect(normal).toEqual({ status: 1, stderr: 'npm error code E403\n' })
      expect(run('silent')).toEqual(normal)
    } finally {
      vi.unstubAllEnvs()
      rmSync(bin, { recursive: true, force: true })
    }
  })
})
