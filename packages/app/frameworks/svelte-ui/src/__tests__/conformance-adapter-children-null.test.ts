// @vitest-environment jsdom
/**
 * The conformance kit's Svelte adapter passes children that a `children` step stops passing
 * (`null`) the way a consumer's markup does. `<X>{#if shown}<Row />{/if}</X>` still passes the
 * `children` snippet, which renders nothing. A port that branches on whether the snippet was
 * passed, not on what it renders, then keeps its wrapper, while React (`{shown && <Row />}`)
 * renders none, and the kit has to see that. A snippet prop that a step stops passing is
 * `undefined`, as `footer={shown ? footer : undefined}` leaves it.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { describe, expect, it } from 'vitest'

import { createSvelteAdapter } from '@molecule/app-framework-conformance/adapters/svelte'
import * as AppSvelte from '@molecule/app-svelte'

import ChildrenPresenceProbe from './ChildrenPresenceProbe.svelte'

const adapter = createSvelteAdapter({ exports: { ChildrenPresenceProbe }, binding: AppSvelte })

describe('the Svelte conformance adapter, after a step stops passing a list', () => {
  it('still passes the children snippet, as an {#if} inside the tag does', async () => {
    const result = await adapter.run('ChildrenPresenceProbe', {
      name: 'the rows are taken away',
      children: [{ tag: 'span', children: ['a row'] }],
      interactions: [{ type: 'children', children: null }],
    })
    expect(result.snapshots[0]).toContain('a row')
    expect(result.snapshots.at(-1)).toContain('data-wrapper')
    expect(result.snapshots.at(-1)).not.toContain('a row')
  })

  it('counterexample: a snippet prop a step stops passing is undefined', async () => {
    const result = await adapter.run('ChildrenPresenceProbe', {
      name: 'the footer is taken away',
      slots: { footer: [{ tag: 'span', children: ['a footer'] }] },
      interactions: [{ type: 'children', slots: { footer: null } }],
    })
    expect(result.snapshots[0]).toContain('a footer')
    expect(result.snapshots.at(-1)).toContain('no footer')
  })
})
