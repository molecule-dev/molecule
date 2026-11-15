/**
 * `featureCasesName`: the cases and goldens file of a React feature package, for
 * `-react` packages and for React packages named without a framework suffix.
 *
 * @module
 */

import { describe, expect, it } from 'vitest'

import { featureCasesName, featureGoldensFile } from '../features/run.js'

describe('featureCasesName', () => {
  it('drops the -react suffix', () => {
    expect(featureCasesName('@molecule/app-tag-input-react')).toBe('tag-input')
  })

  it('keeps the whole name of a React package without a framework suffix', () => {
    expect(featureCasesName('@molecule/app-embeddable-chat-widget')).toBe('embeddable-chat-widget')
    expect(featureGoldensFile('@molecule/app-embeddable-chat-widget')).toMatch(
      /goldens\/embeddable-chat-widget\.json$/,
    )
  })

  it('refuses a counterpart or a non-app package', () => {
    for (const name of [
      '@molecule/app-tag-input-vue',
      '@molecule/app-tag-input-angular',
      '@molecule/api-foo',
      'tag-input',
    ])
      expect(() => featureCasesName(name)).toThrow('is not a React feature package')
  })
})
