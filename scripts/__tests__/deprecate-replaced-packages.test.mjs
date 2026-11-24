import { describe, expect, it } from 'vitest'

import {
  deprecationMessage,
  deprecationsDue,
  replacedPackages,
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
})
