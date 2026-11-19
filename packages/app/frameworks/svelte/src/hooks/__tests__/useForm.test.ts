// @vitest-environment jsdom
/**
 * `useForm`: React's `useForm` late-value, submission and disposal cases in
 * Svelte's idiom. A Svelte hook runs once during component init, so where
 * React rerenders with new props this file sets the options store the hook
 * follows on the same mount (its `values` are applied exactly as React's
 * layout effect applies them).
 *
 * @module
 */

import { flushSync, mount, unmount } from 'svelte'
import { get, writable } from 'svelte/store'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { FormValuesConstraint } from '@molecule/app-forms'
import Host from '@molecule/app-framework-conformance/adapters/svelte-bindings/Host.svelte'

import { setMoleculeContext } from '../../context.js'
import { useForm, type UseFormOptions, type UseFormResult } from '../useForm.js'

interface InventoryValues {
  sku: string
  quantity: number
}

const defaultValues: InventoryValues = { sku: 'KIT-7', quantity: 2 }

interface ArticleValues {
  title: string
  body: string
}

/** One mounted hook: its result, its reactive options, and its teardown. */
interface FormHandle<T extends FormValuesConstraint<T>> {
  /** The hook's result (field state is read through its stores). */
  result: UseFormResult<T>
  /** Gives the mounted hook new options (React's rerender with new props). */
  setOptions: (next: UseFormOptions<T>) => void
  /** Unmounts the host once. */
  stop: () => Promise<void>
}

/** The mounted hosts this file tears down after each case. */
const hosts: Array<() => Promise<void>> = []

afterEach(async () => {
  for (const stop of hosts.splice(0)) await stop()
  document.body.innerHTML = ''
})

/**
 * Mounts a host that calls `useForm` once during a child's init, following an
 * options store for the life of the mount.
 *
 * @param initialOptions - The options the hook is created with.
 * @returns The hook's result, its options setter and the host's unmount.
 */
function mountForm<T extends FormValuesConstraint<T>>(
  initialOptions: UseFormOptions<T>,
): FormHandle<T> {
  // React's `rerender` with new props: the options are a store the hook follows.
  const options = writable<UseFormOptions<T>>(initialOptions)
  const captured: { result?: UseFormResult<T> } = {}
  const container = document.createElement('div')
  document.body.appendChild(container)
  const app = mount(Host, {
    target: container,
    props: {
      config: {},
      setMoleculeContext,
      run: () => {
        captured.result = useForm<T>(options)
      },
    },
  })
  flushSync()
  const result = captured.result
  if (result === undefined) throw new Error('the host never ran the hook')
  let stopped = false
  const stop = async (): Promise<void> => {
    if (stopped) return
    stopped = true
    await unmount(app)
    container.remove()
  }
  hosts.push(stop)
  return { result, setOptions: (next) => options.set(next), stop }
}

describe('useForm late values', () => {
  it('keeps an edited article field and fills pristine fields when its record loads', () => {
    const form = mountForm<ArticleValues>({
      defaultValues: { title: '', body: '' },
      values: { title: '', body: '' },
      resetOptions: { keepDirtyValues: true },
    })
    form.result.register('title').onChange({ target: { value: 'Draft title', name: 'title' } })

    form.setOptions({
      defaultValues: { title: '', body: '' },
      values: { title: 'Loaded title', body: 'Loaded body' },
      resetOptions: { keepDirtyValues: true },
    })

    expect(form.result.getValue('title')).toBe('Draft title')
    expect(form.result.getValue('body')).toBe('Loaded body')
  })

  it('replaces edits for a new record when keepDirtyValues is false', () => {
    const form = mountForm<ArticleValues>({
      defaultValues: { title: '', body: '' },
      values: { title: 'First', body: 'First body' },
      resetOptions: { keepDirtyValues: false },
    })
    form.result.register('title').onChange({ target: { value: 'Draft title', name: 'title' } })

    form.setOptions({
      defaultValues: { title: '', body: '' },
      values: { title: 'Second', body: 'Second body' },
      resetOptions: { keepDirtyValues: false },
    })

    expect(form.result.getValue('title')).toBe('Second')
    expect(form.result.getValue('body')).toBe('Second body')
  })

  it('uses the latest values as the baseline for reset()', () => {
    const form = mountForm<ArticleValues>({
      defaultValues: { title: '', body: '' },
      values: { title: '', body: '' },
      resetOptions: { keepDirtyValues: true },
    })
    form.setOptions({
      defaultValues: { title: '', body: '' },
      values: { title: 'Loaded title', body: 'Loaded body' },
      resetOptions: { keepDirtyValues: true },
    })
    form.result.register('title').onChange({ target: { value: 'Draft title', name: 'title' } })

    form.result.reset()

    expect(form.result.getValue('title')).toBe('Loaded title')
    expect(form.result.getValue('body')).toBe('Loaded body')
  })

  it('does not reset for a new values reference with equal content', () => {
    const form = mountForm<ArticleValues>({
      defaultValues: { title: '', body: '' },
      values: { title: 'Loaded', body: 'Body' },
      resetOptions: { keepDirtyValues: true },
    })
    form.result.register('title').onChange({ target: { value: 'Draft title', name: 'title' } })

    form.setOptions({
      defaultValues: { title: '', body: '' },
      values: { title: 'Loaded', body: 'Body' },
      resetOptions: { keepDirtyValues: true },
    })

    expect(form.result.getValue('title')).toBe('Draft title')
  })

  it('leaves a form without values unchanged across rerenders', () => {
    const form = mountForm<ArticleValues>({
      defaultValues: { title: '', body: '' },
      resetOptions: { keepDirtyValues: true },
    })
    form.result.register('title').onChange({ target: { value: 'Draft title', name: 'title' } })

    form.setOptions({
      defaultValues: { title: '', body: '' },
      resetOptions: { keepDirtyValues: true },
    })

    expect(form.result.getValue('title')).toBe('Draft title')
    expect(form.result.getValue('body')).toBe('')
  })
})

describe('useForm late-value regressions', () => {
  it('delivers a changed nested record behind a new outer reference', () => {
    interface NestedValues {
      details: { title: string }
    }
    const record: NestedValues = { details: { title: 'A' } }
    const form = mountForm<NestedValues>({ defaultValues: record, values: record })

    record.details.title = 'B'
    form.setOptions({ defaultValues: record, values: { ...record } })

    expect(form.result.getValue('details')).toEqual({ title: 'B' })
  })

  it('preserves an in-flight submission when late values arrive', async () => {
    let release!: () => void
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    const form = mountForm<ArticleValues>({
      defaultValues: { title: '', body: '' },
      values: { title: '', body: '' },
      resetOptions: { keepDirtyValues: true },
      validate: async () => {
        await gate
        return {}
      },
    })
    const onSubmit = vi.fn<(values: ArticleValues) => void>()

    const submission = form.result.handleSubmit(onSubmit)()
    await vi.waitFor(() => expect(get(form.result.isSubmitting)).toBe(true))
    expect(get(form.result.formState).submitCount).toBe(1)

    form.setOptions({
      defaultValues: { title: '', body: '' },
      values: { title: 'Loaded title', body: 'Loaded body' },
      resetOptions: { keepDirtyValues: true },
      validate: async () => {
        await gate
        return {}
      },
    })

    expect(get(form.result.isSubmitting)).toBe(true)
    expect(get(form.result.formState).submitCount).toBe(1)

    release()
    await submission
    expect(onSubmit).toHaveBeenCalledWith({ title: '', body: '' })
  })

  it('keeps a typed validated save through a same-account refresh', async () => {
    interface AccountValues {
      id: string
      bio: string
      name: string
    }
    let release!: (errors: Record<string, string>) => void
    const gate = new Promise<Record<string, string>>((resolve) => {
      release = resolve
    })
    const initial: AccountValues = { id: 'same-account', bio: 'Initial', name: 'Before' }
    const form = mountForm<AccountValues>({
      defaultValues: initial,
      values: initial,
      resetOptions: { keepDirtyValues: true },
      validate: () => gate,
    })
    const onSubmit = vi.fn<(values: AccountValues) => void>()

    form.result.setValue('bio', 'Typed biography')
    const submission = form.result.handleSubmit(onSubmit)()
    form.setOptions({
      defaultValues: initial,
      values: { ...initial, name: 'Background refresh' },
      resetOptions: { keepDirtyValues: true },
      validate: () => gate,
    })
    expect(form.result.getValue('bio')).toBe('Typed biography')
    expect(get(form.result.isSubmitting)).toBe(true)

    release({})
    await submission

    expect(onSubmit).toHaveBeenCalledWith({ ...initial, bio: 'Typed biography' })
    expect(get(form.result.isSubmitting)).toBe(false)
  })

  it('preserves cleared populated tags and typed text on refresh', () => {
    interface EditorValues {
      title: string
      tags: string[]
      body: string
    }
    const initial: EditorValues = { title: 'Server title', tags: ['old'], body: '' }
    const form = mountForm<EditorValues>({
      defaultValues: { title: '', tags: [], body: '' },
      values: initial,
      resetOptions: { keepDirtyValues: true },
    })

    form.result.setValue('tags', [])
    form.result.setValue('title', 'Typed title')
    form.setOptions({
      defaultValues: { title: '', tags: [], body: '' },
      values: { title: 'Refreshed title', tags: ['restored'], body: 'Loaded body' },
      resetOptions: { keepDirtyValues: true },
    })

    expect(get(form.result.formState).values).toEqual({
      title: 'Typed title',
      tags: [],
      body: 'Loaded body',
    })
  })

  it('drops fields removed by a replacement record', () => {
    interface ReplacementValues {
      title: string
      subtitle?: string
    }
    const initialValues: Partial<ReplacementValues> = { title: 'A', subtitle: 'Old' }
    const form = mountForm<ReplacementValues>({
      defaultValues: { title: '' },
      values: initialValues,
      resetOptions: { keepDirtyValues: false },
    })

    form.setOptions({
      defaultValues: { title: '' },
      values: { title: 'B' },
      resetOptions: { keepDirtyValues: false },
    })

    expect(form.result.getValue('title')).toBe('B')
    expect(form.result.getValue('subtitle')).toBeUndefined()
  })

  it('takes late composites after edited arrays and nested objects revert by content', () => {
    interface CompositeValues {
      tags: string[]
      metadata: { category: string }
    }
    const initial: CompositeValues = { tags: [], metadata: { category: 'none' } }
    const form = mountForm<CompositeValues>({
      defaultValues: initial,
      values: initial,
      resetOptions: { keepDirtyValues: true },
    })

    form.result.setValue('tags', ['draft'])
    form.result.setValue('metadata', { category: 'draft' })
    form.result.setValue('tags', [])
    form.result.setValue('metadata', { category: 'none' })
    expect(get(form.result.isDirty)).toBe(false)

    form.setOptions({
      defaultValues: initial,
      values: { tags: ['loaded'], metadata: { category: 'loaded' } },
      resetOptions: { keepDirtyValues: true },
    })

    expect(form.result.getValue('tags')).toEqual(['loaded'])
    expect(form.result.getValue('metadata')).toEqual({ category: 'loaded' })
  })

  it('replaces a pristine file with a different file by identity', () => {
    interface AttachmentValues {
      attachment: File
    }
    const first = new File(['first'], 'first.txt')
    const second = new File(['second'], 'second.txt')
    const form = mountForm<AttachmentValues>({
      defaultValues: { attachment: first },
      values: { attachment: first },
      resetOptions: { keepDirtyValues: true },
    })

    form.setOptions({
      defaultValues: { attachment: first },
      values: { attachment: second },
      resetOptions: { keepDirtyValues: true },
    })

    expect(form.result.getValue('attachment')).toBe(second)
  })
})

describe('useForm handleSubmit', () => {
  it('submits inventory values through a synchronous callback', async () => {
    const form = mountForm<InventoryValues>({ defaultValues })
    const onSubmit = vi.fn<(values: InventoryValues) => void>()

    await form.result.handleSubmit(onSubmit)()

    expect(onSubmit).toHaveBeenCalledWith(defaultValues)
    expect(get(form.result.isSubmitting)).toBe(false)
  })

  it('returns a promise that awaits asynchronous submission', async () => {
    const form = mountForm<InventoryValues>({ defaultValues })
    let release!: () => void
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    let started = false
    let completed = false
    const submission = form.result.handleSubmit(async () => {
      started = true
      await gate
      completed = true
    })()
    await vi.waitFor(() => expect(started).toBe(true))
    expect(completed).toBe(false)

    release()
    await submission

    expect(completed).toBe(true)
    expect(get(form.result.isSubmitting)).toBe(false)
  })

  it('preserves controller rejection and submission cleanup semantics', async () => {
    const form = mountForm<InventoryValues>({ defaultValues })
    const failure = new Error('Inventory unavailable')

    await expect(
      form.result.handleSubmit(() => {
        throw failure
      })(),
    ).rejects.toBe(failure)

    expect(get(form.result.isSubmitting)).toBe(false)
  })
})

describe('useForm asynchronous disposal', () => {
  it('does not invoke onSubmit after unmount while validation is pending', async () => {
    let release!: (errors: Record<string, string>) => void
    const gate = new Promise<Record<string, string>>((resolve) => {
      release = resolve
    })
    const form = mountForm<{ title: string }>({
      defaultValues: { title: 'Article' },
      validate: () => gate,
    })
    const onSubmit = vi.fn<(values: { title: string }) => void>()
    const submission = form.result.handleSubmit(onSubmit)()

    await form.stop()
    release({})
    await submission

    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('still submits after StrictMode replays the mounted effect', async () => {
    // StrictMode replays a mount's effects on the same instance; a Svelte hook's
    // effects are its subscriptions, so the observable case is a mount torn down
    // and established again: the fresh mount must still submit its values once.
    const discarded = mountForm<ArticleValues>({ defaultValues: { title: 'Article' } })
    await discarded.stop()

    const form = mountForm<ArticleValues>({ defaultValues: { title: 'Article' } })
    const onSubmit = vi.fn<(values: ArticleValues) => void>()

    await form.result.handleSubmit(onSubmit)()

    expect(onSubmit).toHaveBeenCalledExactlyOnceWith({ title: 'Article' })
    expect(get(form.result.isSubmitting)).toBe(false)
  })
})

describe('useForm external values versus reset baselines', () => {
  it.each([true, false])(
    'does not undo reset values with unchanged inline values (keepDirtyValues=%s)',
    (keepDirtyValues) => {
      const form = mountForm<ArticleValues>({
        defaultValues: { title: '', body: '' },
        values: { title: 'Server', body: 'Server body' },
        resetOptions: { keepDirtyValues },
      })

      form.result.reset({ title: 'Saved', body: 'Saved body' })
      form.setOptions({
        defaultValues: { title: '', body: '' },
        values: { title: 'Server', body: 'Server body' },
        resetOptions: { keepDirtyValues },
      })

      expect(form.result.getValue('title')).toBe('Saved')
      expect(form.result.getValue('body')).toBe('Saved body')
    },
  )

  it.each([true, false])(
    'does not erase async defaults delivered through reset (keepDirtyValues=%s)',
    async (keepDirtyValues) => {
      const form = mountForm<ArticleValues>({
        defaultValues: { title: '', body: '' },
        values: { title: 'Server', body: 'Server body' },
        resetOptions: { keepDirtyValues },
      })

      const record = await Promise.resolve({ title: 'Async', body: 'Async body' })
      form.result.reset(record)
      form.setOptions({
        defaultValues: { title: '', body: '' },
        values: { title: 'Server', body: 'Server body' },
        resetOptions: { keepDirtyValues },
      })

      expect(form.result.getValue('title')).toBe('Async')
      expect(form.result.getValue('body')).toBe('Async body')
    },
  )
})
