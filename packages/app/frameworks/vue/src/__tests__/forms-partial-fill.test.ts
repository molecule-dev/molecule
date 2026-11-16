// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'

import { createVueBindingAdapter } from '@molecule/app-framework-conformance/adapters/vue-bindings'
import type { MountedHook } from '@molecule/app-framework-conformance/bindings'

import * as Binding from '../index.js'

interface Fields {
  name: string
  email: string
  bio: string
}
const adapter = createVueBindingAdapter({ exports: Binding, binding: Binding })
let mounted: MountedHook | undefined
afterEach(async () => {
  await mounted?.unmount()
  mounted = undefined
})
async function open() {
  mounted = await adapter.mount(
    'useForm',
    [{ defaultValues: { name: '', email: '', bio: '' } }],
    {},
  )
  return mounted.result() as ReturnType<typeof Binding.useForm<Fields>>
}

describe('independent loaded form fields', () => {
  it('keeps earlier pristine fields when later fields arrive', async () => {
    const form = await open()
    form.asState('name')[2]('Saved name')
    form.asState('email')[2]('saved@example.test')
    form.asState('bio')[2]('Loaded biography')
    await mounted!.flush()
    expect(form.getValue('name')).toBe('Saved name')
    expect(form.getValue('email')).toBe('saved@example.test')
    expect(form.getValue('bio')).toBe('Loaded biography')
  })
  it('preserves edits and restores all loaded fields on reset', async () => {
    const form = await open()
    form.asState('name')[2]('Saved name')
    form.asState('name')[1]('Typed name')
    form.asState('email')[2]('saved@example.test')
    form.asState('bio')[2]('Loaded biography')
    expect(form.getValue('name')).toBe('Typed name')
    expect(form.getValue('email')).toBe('saved@example.test')
    form.reset()
    expect(form.getValue('name')).toBe('Saved name')
    expect(form.getValue('email')).toBe('saved@example.test')
    expect(form.getValue('bio')).toBe('Loaded biography')
  })
  it('whole-record fill still resets omitted pristine fields', async () => {
    const form = await open()
    form.asState()[2]({ name: 'First', email: 'first@example.test' })
    form.asState()[2]({ name: 'Second' })
    expect(form.getValue('name')).toBe('Second')
    expect(form.getValue('email')).toBe('')
  })
})
