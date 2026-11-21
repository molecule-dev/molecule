// @vitest-environment jsdom
/**
 * The conformance kit's Solid adapter disposes a component's root when the component throws
 * while it first renders. Solid's `render` hands the disposer back only on success, so the
 * adapter used to leave such a root (its effects, its listeners) running into the cases after
 * it, which then recorded its work as their own.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { onCleanup } from 'solid-js'
import { describe, expect, it } from 'vitest'

import { createSolidAdapter } from '@molecule/app-framework-conformance/adapters/solid'
import * as AppSolid from '@molecule/app-solid'

/** What each component's cleanup reported. */
const cleaned: string[] = []

/** Registers its cleanup, as a component with a listener or a timer does, then throws. */
const Thrower = (): never => {
  onCleanup(() => cleaned.push('Thrower'))
  throw new Error('the first render broke')
}

/** The counterexample: registers its cleanup and renders. */
const Renders = (): Text => {
  onCleanup(() => cleaned.push('Renders'))
  return document.createTextNode('rendered')
}

/**
 * The binding, with a composition root that registers a cleanup of its own, as the real one
 * does for its subscriptions: that cleanup sits on the render's root, which only the root's
 * disposer reaches.
 */
const binding: typeof AppSolid = {
  ...AppSolid,
  MoleculeProvider: (props) => {
    onCleanup(() => cleaned.push('MoleculeProvider'))
    return AppSolid.MoleculeProvider(props)
  },
}

const adapter = createSolidAdapter({ exports: { Thrower, Renders }, binding })

describe('the Solid conformance adapter', () => {
  it('disposes the root of a component whose first render throws', async () => {
    cleaned.length = 0
    await expect(adapter.run('Thrower', { name: 'a first render that throws' })).rejects.toThrow(
      'the first render broke',
    )
    expect(cleaned.sort()).toEqual(['MoleculeProvider', 'Thrower'])
  })

  it('counterexample: a component that renders is disposed once, at the end of its case', async () => {
    cleaned.length = 0
    const result = await adapter.run('Renders', { name: 'a component that renders' })
    expect(result.snapshots[0]).toContain('rendered')
    expect(cleaned.sort()).toEqual(['MoleculeProvider', 'Renders'])
  })
})
