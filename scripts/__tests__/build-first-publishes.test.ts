/**
 * buildFirstPublishes: trust:new builds every package it is about to publish for the first
 * time in one build.js call, and isolates a broken package only when that call fails.
 */
import { describe, expect, it } from 'vitest'

import { buildFirstPublishes } from '../lib/build-first-publishes.mjs'

const quiet = { error: () => {} }

/** A build.js stand-in that records each call and fails any call naming a package in `broken`. */
function fakeBuild(broken: string[] = []) {
  const calls: string[][] = []
  const build = (names: string[]) => {
    calls.push([...names])
    const bad = names.filter((name) => broken.includes(name))
    if (bad.length) throw new Error(`Command failed: build ${bad.join(',')}`)
  }
  return { calls, build }
}

describe('buildFirstPublishes', () => {
  it('builds every package in one call (OLD MUSTFAIL: one call per package)', () => {
    const { calls, build } = fakeBuild()
    const names = ['@molecule/app-a-vue', '@molecule/app-a-svelte', '@molecule/app-b-vue']
    expect(buildFirstPublishes(names, { build, log: quiet })).toEqual({ built: names, failed: [] })
    expect(calls).toEqual([names])
  })

  it('when the joint build fails, splits it in halves so only the broken package is held back', () => {
    const { calls, build } = fakeBuild(['@molecule/app-b-vue'])
    const names = ['@molecule/app-a-vue', '@molecule/app-b-vue', '@molecule/app-c-vue']
    expect(buildFirstPublishes(names, { build, log: quiet })).toEqual({
      built: ['@molecule/app-a-vue', '@molecule/app-c-vue'],
      failed: ['@molecule/app-b-vue'],
    })
    expect(calls).toEqual([
      names,
      ['@molecule/app-a-vue', '@molecule/app-b-vue'],
      ['@molecule/app-a-vue'],
      ['@molecule/app-b-vue'],
      ['@molecule/app-c-vue'],
    ])
  })

  it('one broken package among 277 costs about two calls per halving, not one per package (OLD MUSTFAIL: 278 calls)', () => {
    const names = Array.from({ length: 277 }, (_, i) => `@molecule/app-p${i}-svelte`)
    const { calls, build } = fakeBuild(['@molecule/app-p200-svelte'])
    const result = buildFirstPublishes(names, { build, log: quiet })
    expect(result.failed).toEqual(['@molecule/app-p200-svelte'])
    expect(result.built).toEqual(names.filter((name) => name !== '@molecule/app-p200-svelte'))
    expect(calls.length).toBeLessThanOrEqual(1 + 2 * Math.ceil(Math.log2(277)))
  })

  it('reports every broken package, in the order given', () => {
    const names = Array.from({ length: 10 }, (_, i) => `@molecule/app-p${i}-vue`)
    const broken = ['@molecule/app-p7-vue', '@molecule/app-p1-vue', '@molecule/app-p8-vue']
    const { build } = fakeBuild(broken)
    const result = buildFirstPublishes(names, { build, log: quiet })
    expect(result.failed).toEqual([
      '@molecule/app-p1-vue',
      '@molecule/app-p7-vue',
      '@molecule/app-p8-vue',
    ])
    expect(result.built).toHaveLength(7)
  })

  it('a lone package that fails is not built a second time', () => {
    const { calls, build } = fakeBuild(['@molecule/app-a-vue'])
    expect(buildFirstPublishes(['@molecule/app-a-vue'], { build, log: quiet })).toEqual({
      built: [],
      failed: ['@molecule/app-a-vue'],
    })
    expect(calls).toHaveLength(1)
  })

  it('makes no build call when nothing is new', () => {
    const { calls, build } = fakeBuild()
    expect(buildFirstPublishes([], { build, log: quiet })).toEqual({ built: [], failed: [] })
    expect(calls).toHaveLength(0)
  })
})
