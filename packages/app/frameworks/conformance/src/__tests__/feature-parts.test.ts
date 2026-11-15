/**
 * Feature parts: components a package renders but does not export, held to
 * React through `src/parts.ts`. `featurePartProblems` keeps the list honest and
 * `reactPartsUrl` finds React's built parts module.
 *
 * @module
 */

import { describe, expect, it } from 'vitest'

import { featurePartProblems, reactPartsUrl } from '../features/run.js'
import type { FeatureCases } from '../features/spec.js'

const feature: FeatureCases = {
  package: '@molecule/app-demo-react',
  families: [
    { component: 'Panel', cases: [{ name: 'at rest', props: {} }] },
    { component: 'MessageItem', cases: [{ name: 'one message', props: {} }] },
  ],
  parts: ['MessageItem'],
}

describe('featurePartProblems', () => {
  it('accepts a part that its module exports, that is not public and that a family renders', () => {
    expect(featurePartProblems(feature, { MessageItem: () => null }, ['Panel'])).toEqual([])
  })

  it('names a missing parts module, a missing part, a public part and an unrendered one', () => {
    expect(featurePartProblems(feature, undefined, ['Panel'])).toEqual([
      "the cases list parts (MessageItem); pass the package's parts module",
    ])
    expect(featurePartProblems(feature, {}, ['Panel'])).toEqual([
      'MessageItem: the parts module does not export it',
    ])
    expect(
      featurePartProblems(feature, { MessageItem: () => null }, ['Panel', 'MessageItem']),
    ).toEqual(['MessageItem: a public export; give it an ordinary family instead of a part'])
    expect(
      featurePartProblems({ ...feature, parts: ['Footer'] }, { Footer: () => null }, ['Panel']),
    ).toEqual(['Footer: no family renders it'])
  })

  it('has nothing to check for a feature without parts', () => {
    expect(featurePartProblems({ ...feature, parts: undefined }, undefined, [])).toEqual([])
  })
})

describe('reactPartsUrl', () => {
  it('refuses a package that is not installed', () => {
    expect(() => reactPartsUrl('@molecule/app-no-such-feature-react')).toThrow('is not installed')
  })

  it('refuses an installed package that has no built parts module', () => {
    expect(() => reactPartsUrl('@molecule/app-ui-react')).toThrow(/dist\/parts\.js is missing/)
  })
})
