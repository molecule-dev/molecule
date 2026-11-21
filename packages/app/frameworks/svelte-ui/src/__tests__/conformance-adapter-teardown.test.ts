// @vitest-environment jsdom
/**
 * The conformance kit's Svelte adapter tears a case's host down when the component throws while
 * it first renders. A composition root subscribes while it initializes and releases the
 * subscription when it is destroyed; a component throwing inside the host used to leave the
 * host never mounted, so that release never ran and the subscription went on into the cases
 * after it. (The component itself never mounted, so it has nothing to release, as in React.)
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { onDestroy } from 'svelte'
import { describe, expect, it } from 'vitest'

import { createSvelteAdapter } from '@molecule/app-framework-conformance/adapters/svelte'
import * as AppSvelte from '@molecule/app-svelte'

import { subscriptions } from './teardown-log.js'
import TeardownRenders from './TeardownRenders.svelte'
import TeardownThrower from './TeardownThrower.svelte'

/** The binding, with a composition root that holds a subscription while it lives. */
const binding: typeof AppSvelte = {
  ...AppSvelte,
  setMoleculeContext: (config) => {
    subscriptions.held++
    onDestroy(() => subscriptions.held--)
    AppSvelte.setMoleculeContext(config)
  },
}

const adapter = createSvelteAdapter({
  exports: { Thrower: TeardownThrower, Renders: TeardownRenders },
  binding,
})

describe('the Svelte conformance adapter', () => {
  it("releases the host's subscriptions when the component's first render throws", async () => {
    subscriptions.held = 0
    await expect(adapter.run('Thrower', { name: 'a first render that throws' })).rejects.toThrow(
      'the first render broke',
    )
    expect(subscriptions.held).toBe(0)
  })

  it('counterexample: a component that renders is torn down at the end of its case', async () => {
    subscriptions.held = 0
    const result = await adapter.run('Renders', { name: 'a component that renders' })
    expect(result.snapshots[0]).toContain('rendered')
    expect(subscriptions.held).toBe(0)
  })
})
