// @vitest-environment jsdom
/**
 * The conformance kit's Vue adapter passes children that a `children` step stops passing (`null`)
 * the way a consumer's template does. `<X><Row v-if="shown" /></X>` still passes the default
 * slot, which renders only the comment Vue compiles a false `v-if` to. A port that branches on
 * whether the slot was passed, not on what it renders, then keeps its wrapper, while React
 * (`{shown && <Row />}`) renders none, and the kit has to see that. A named slot that a step
 * stops passing is left out, as `<template #footer v-if="shown">` leaves it.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { describe, expect, it } from 'vitest'
import { defineComponent, h } from 'vue'

import { createVueAdapter } from '@molecule/app-framework-conformance/adapters/vue'
import * as AppVue from '@molecule/app-vue'

/** Wraps its default slot whenever one is passed, whatever it renders. */
const ByDefaultSlot = defineComponent({
  setup(_props, { slots }) {
    return () =>
      slots.default ? h('section', { 'data-wrapper': '' }, slots.default()) : h('p', 'no rows')
  },
})

/** Wraps its footer slot whenever one is passed. */
const ByFooterSlot = defineComponent({
  setup(_props, { slots }) {
    return () => (slots.footer ? h('footer', slots.footer()) : h('p', 'no footer'))
  },
})

const adapter = createVueAdapter({ exports: { ByDefaultSlot, ByFooterSlot }, binding: AppVue })

describe('the Vue conformance adapter, after a step stops passing a list', () => {
  it('still passes the default slot, as a false v-if inside the tag does', async () => {
    const result = await adapter.run('ByDefaultSlot', {
      name: 'the rows are taken away',
      children: [{ tag: 'span', children: ['a row'] }],
      interactions: [{ type: 'children', children: null }],
    })
    expect(result.snapshots[0]).toContain('a row')
    expect(result.snapshots.at(-1)).toContain('data-wrapper')
    expect(result.snapshots.at(-1)).not.toContain('a row')
  })

  it('counterexample: leaves a named slot out, as <template #footer v-if> does', async () => {
    const result = await adapter.run('ByFooterSlot', {
      name: 'the footer is taken away',
      slots: { footer: [{ tag: 'span', children: ['a footer'] }] },
      interactions: [{ type: 'children', slots: { footer: null } }],
    })
    expect(result.snapshots[0]).toContain('a footer')
    expect(result.snapshots.at(-1)).toContain('no footer')
  })
})
