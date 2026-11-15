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

  it('when the joint build fails, builds each alone so only the broken package is held back', () => {
    const { calls, build } = fakeBuild(['@molecule/app-b-vue'])
    const names = ['@molecule/app-a-vue', '@molecule/app-b-vue', '@molecule/app-c-vue']
    expect(buildFirstPublishes(names, { build, log: quiet })).toEqual({
      built: ['@molecule/app-a-vue', '@molecule/app-c-vue'],
      failed: ['@molecule/app-b-vue'],
    })
    expect(calls).toEqual([
      names,
      ['@molecule/app-a-vue'],
      ['@molecule/app-b-vue'],
      ['@molecule/app-c-vue'],
    ])
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
