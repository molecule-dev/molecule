import { describe, expect, it, vi } from 'vitest'

import { nativeProvider } from '../controller.js'
import { formValuesEqual } from '../utilities.js'

describe('native late form values', () => {
  it('preserves submission state while rebasing values', async () => {
    const form = nativeProvider.createForm({
      defaultValues: { title: '', body: '' },
      values: { title: '', body: '' },
    })
    let release!: () => void
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    const submission = form.handleSubmit(() => gate)()
    expect(form.getState().isSubmitting).toBe(true)
    expect(form.getState().submitCount).toBe(1)

    form.updateValues({ title: 'Loaded', body: 'Body' })

    expect(form.getState().isSubmitting).toBe(true)
    expect(form.getState().submitCount).toBe(1)
    release()
    await submission
  })

  it('uses original defaults plus only the latest replacement record', () => {
    const form = nativeProvider.createForm<{ title: string; body: string; subtitle?: string }>({
      defaultValues: { title: '', body: 'Default body' },
      values: { title: 'A', subtitle: 'Old' },
    })

    form.updateValues({ title: 'B' })

    expect(form.getValues()).toEqual({ title: 'B', body: 'Default body' })
    expect(form.getValues()).not.toHaveProperty('subtitle')
  })

  it('uses content dirtiness for arrays and nested objects', () => {
    const form = nativeProvider.createForm({
      defaultValues: { tags: [] as string[], metadata: { category: 'none' } },
    })
    form.setValue('tags', ['draft'])
    form.setValue('metadata', { category: 'draft' })
    form.setValue('tags', [])
    form.setValue('metadata', { category: 'none' })

    expect(form.getFieldState('tags').dirty).toBe(false)
    expect(form.getFieldState('metadata').dirty).toBe(false)
    expect(form.getState().isDirty).toBe(false)

    form.updateValues(
      { tags: ['loaded'], metadata: { category: 'loaded' } },
      { keepDirtyValues: true },
    )
    expect(form.getValues()).toEqual({ tags: ['loaded'], metadata: { category: 'loaded' } })
  })

  it('does not reset edits for an equal-content baseline', () => {
    const form = nativeProvider.createForm({
      defaultValues: { title: '', body: '' },
      values: { title: 'Loaded', body: 'Body' },
    })
    form.setValue('title', 'Draft')
    const listener = vi.fn()
    form.subscribe(listener)

    form.updateValues({ title: 'Loaded', body: 'Body' }, { keepDirtyValues: true })

    expect(form.getValue('title')).toBe('Draft')
    expect(listener).not.toHaveBeenCalled()
  })

  it('reset restores the latest external baseline', () => {
    const form = nativeProvider.createForm({ defaultValues: { title: '', body: '' } })
    form.updateValues({ title: 'Loaded', body: 'Body' })
    form.setValue('title', 'Draft')

    form.reset()

    expect(form.getValues()).toEqual({ title: 'Loaded', body: 'Body' })
    expect(form.getState().isDirty).toBe(false)
  })
})

describe('formValuesEqual', () => {
  it('compares plain composites and dates by content', () => {
    expect(
      formValuesEqual({ tags: ['a'], date: new Date(0) }, { tags: ['a'], date: new Date(0) }),
    ).toBe(true)
  })

  it('compares opaque objects by identity', () => {
    class Attachment {}
    const pairs: [unknown, unknown][] = [
      [new File(['first'], 'first.txt'), new File(['second'], 'second.txt')],
      [new Blob(['first']), new Blob(['second'])],
      [new Map([['key', 'value']]), new Map([['key', 'value']])],
      [new Attachment(), new Attachment()],
    ]

    for (const [left, right] of pairs) {
      expect(formValuesEqual(left, right)).toBe(false)
      expect(formValuesEqual(left, left)).toBe(true)
    }
  })
})
