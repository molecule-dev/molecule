// @vitest-environment jsdom
/** Verifies the portable callbacks alongside the genuine web events. */
import '@molecule/app-framework-conformance/ui/setup'
import { expect, it } from 'vitest'

import * as AppAngular from '@molecule/app-angular'
import { createAngularAdapter } from '@molecule/app-framework-conformance/adapters/angular'

import * as AngularUI from '../index.js'

const adapter = createAngularAdapter({ exports: AngularUI, binding: AppAngular })

it.each([
  { name: 'Input', selector: 'input' },
  { name: 'Textarea', selector: 'textarea' },
])('$name delivers text alongside a genuine web change event', async ({ name, selector }) => {
  const { calls } = await adapter.run(name, {
    name: 'text change',
    props: { label: 'Name', value: 'previous' },
    callbacks: ['onChange', 'onValueChange'],
    callbackResults: { onChange: { effects: ['preventDefault'], read: ['currentTarget'] } },
    interactions: [{ type: 'input', selector, value: 'typed' }],
  })

  expect(calls).toEqual([
    { name: 'onChange', args: [{ event: 'input', target: selector }] },
    { name: 'onChange read', args: [{ currentTarget: `[node ${selector}]` }] },
    { name: 'onValueChange', args: ['typed'] },
  ])
})

it('delivers an empty value and the web click when clearing Input', async () => {
  const { calls } = await adapter.run('Input', {
    name: 'clear',
    props: { label: 'Name', value: 'typed', clearable: true },
    callbacks: ['onChange', 'onClear', 'onValueChange'],
    interactions: [{ type: 'click', selector: 'button[aria-label="Clear"]' }],
  })

  expect(calls).toEqual([
    { name: 'onClear', args: [{ event: 'click', target: 'button' }] },
    { name: 'onValueChange', args: [''] },
  ])
})

it.each([
  { name: 'Checkbox', selector: 'input[type=checkbox]', event: 'click' },
  { name: 'Switch', selector: 'button[role=switch]', event: 'change' },
])('$name delivers checked state alongside the web event', async ({ name, selector, event }) => {
  const { calls } = await adapter.run(name, {
    name: 'toggle',
    props: { label: 'Notify', checked: false },
    callbacks: ['onChange', 'onCheckedChange'],
    callbackResults: { onChange: { effects: ['stopPropagation'], read: ['currentTarget'] } },
    interactions: [{ type: 'click', selector }],
  })

  expect(calls).toEqual([
    { name: 'onChange', args: [{ event, target: 'input' }] },
    { name: 'onChange read', args: [{ currentTarget: '[node input]' }] },
    { name: 'onCheckedChange', args: [true] },
  ])
})
