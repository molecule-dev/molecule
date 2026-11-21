// @vitest-environment jsdom
import { mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick, type PropType, ref, shallowRef } from 'vue'

import type { FormValuesConstraint } from '@molecule/app-forms'
import { nativeProvider } from '@molecule/app-forms'

import type { UseFormOptions, UseFormResult } from '../useForms.js'
import { useForm } from '../useForms.js'

interface InventoryValues {
  sku: string
  quantity: number
}

const defaultValues: InventoryValues = { sku: 'KIT-7', quantity: 2 }

interface ArticleValues {
  title: string
  body: string
}

const wrappers: VueWrapper[] = []

afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount()
})

/**
 * Mounts one component that creates the form in setup, Vue's counterpart of
 * `renderHook`: the composable runs once, and a re-render does not re-run it.
 *
 * @param options - The form options, or a getter so setup builds them.
 * @returns The composable result and a re-render trigger.
 */
function mountForm<T extends FormValuesConstraint<T>>(
  options: UseFormOptions<T> | (() => UseFormOptions<T>),
): { form: UseFormResult<T>; rerender: () => Promise<void> } {
  let form!: UseFormResult<T>
  const tick = ref(0)
  const Page = defineComponent({
    setup() {
      form = useForm<T>(typeof options === 'function' ? options : () => options)
      return () => h('div', String(tick.value))
    },
  })
  wrappers.push(mount(Page))
  return {
    form,
    rerender: async () => {
      tick.value++
      await nextTick()
    },
  }
}

/** The article editor React's late-value tests drive, as a Vue component. */
const ArticleEditor = defineComponent({
  props: {
    values: { type: Object as PropType<ArticleValues>, required: false },
    keepDirtyValues: { type: Boolean, required: false, default: true },
  },
  setup(props) {
    const form = useForm<ArticleValues>(() => ({
      createForm: nativeProvider.createForm,
      defaultValues: { title: '', body: '' },
      values: props.values,
      resetOptions: { keepDirtyValues: props.keepDirtyValues },
    }))
    return () =>
      h('div', [
        h('input', {
          'aria-label': 'Title',
          value: form.formState.value.values.title,
          onInput: (event: Event) => {
            form.setValue('title', (event.target as HTMLInputElement).value)
          },
        }),
        h('textarea', {
          'aria-label': 'Body',
          value: form.formState.value.values.body,
          onInput: (event: Event) => {
            form.setValue('body', (event.target as HTMLTextAreaElement).value)
          },
        }),
        h('button', { type: 'button', onClick: () => form.reset() }, 'Reset'),
      ])
  },
})

/**
 * Mounts the article editor.
 *
 * @param values - The external record to load, if any.
 * @param keepDirtyValues - Whether edits survive an external record change.
 * @returns The mounted wrapper.
 */
function mountEditor(
  values?: ArticleValues,
  keepDirtyValues = true,
): VueWrapper<InstanceType<typeof ArticleEditor>> {
  const wrapper = mount(ArticleEditor, { props: { values, keepDirtyValues } })
  wrappers.push(wrapper)
  return wrapper
}

/** Reads a rendered input's value. */
function valueOf(wrapper: VueWrapper, label: 'Title' | 'Body'): string {
  const selector = label === 'Title' ? 'input[aria-label="Title"]' : 'textarea[aria-label="Body"]'
  return (wrapper.get(selector).element as HTMLInputElement | HTMLTextAreaElement).value
}

describe('useForm late values', () => {
  it('keeps an edited article field and fills pristine fields when its record loads', async () => {
    const wrapper = mountEditor({ title: '', body: '' })

    await wrapper.get('input[aria-label="Title"]').setValue('Draft title')
    await wrapper.setProps({ values: { title: 'Loaded title', body: 'Loaded body' } })

    expect(valueOf(wrapper, 'Title')).toBe('Draft title')
    expect(valueOf(wrapper, 'Body')).toBe('Loaded body')
  })

  it('replaces edits for a new record when keepDirtyValues is false', async () => {
    const wrapper = mountEditor({ title: 'First', body: 'First body' }, false)
    await wrapper.get('input[aria-label="Title"]').setValue('Draft title')

    await wrapper.setProps({ values: { title: 'Second', body: 'Second body' } })

    expect(valueOf(wrapper, 'Title')).toBe('Second')
    expect(valueOf(wrapper, 'Body')).toBe('Second body')
  })

  it('uses the latest values as the baseline for reset()', async () => {
    const wrapper = mountEditor({ title: '', body: '' })
    await wrapper.setProps({ values: { title: 'Loaded title', body: 'Loaded body' } })
    await wrapper.get('input[aria-label="Title"]').setValue('Draft title')

    await wrapper.get('button').trigger('click')

    expect(valueOf(wrapper, 'Title')).toBe('Loaded title')
    expect(valueOf(wrapper, 'Body')).toBe('Loaded body')
  })

  it('does not reset for a new values reference with equal content', async () => {
    const wrapper = mountEditor({ title: 'Loaded', body: 'Body' })
    await wrapper.get('input[aria-label="Title"]').setValue('Draft title')

    await wrapper.setProps({ values: { title: 'Loaded', body: 'Body' } })

    expect(valueOf(wrapper, 'Title')).toBe('Draft title')
  })

  it('leaves a form without values unchanged across rerenders', async () => {
    const wrapper = mountEditor()
    await wrapper.get('input[aria-label="Title"]').setValue('Draft title')

    wrapper.vm.$forceUpdate()
    await nextTick()

    expect(valueOf(wrapper, 'Title')).toBe('Draft title')
    expect(valueOf(wrapper, 'Body')).toBe('')
  })
})

describe('useForm late-value regressions', () => {
  it('delivers a changed nested record behind a new outer reference', async () => {
    interface NestedValues {
      details: { title: string }
    }
    const record: NestedValues = { details: { title: 'A' } }
    const values = shallowRef<NestedValues>(record)
    const { form } = mountForm<NestedValues>(() => ({
      createForm: nativeProvider.createForm,
      defaultValues: record,
      values: values.value,
    }))

    record.details.title = 'B'
    values.value = { ...record }
    await nextTick()

    expect(form.getValue('details')).toEqual({ title: 'B' })
  })

  it('preserves an in-flight submission when late values arrive', async () => {
    let release!: () => void
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    const values = shallowRef<ArticleValues>({ title: '', body: '' })
    const { form } = mountForm<ArticleValues>(() => ({
      createForm: nativeProvider.createForm,
      defaultValues: { title: '', body: '' },
      values: values.value,
      resetOptions: { keepDirtyValues: true },
      validate: async () => {
        await gate
        return {}
      },
    }))
    const onSubmit = vi.fn()
    const submission = form.handleSubmit(onSubmit)()

    await vi.waitFor(() => expect(form.isSubmitting.value).toBe(true))
    expect(form.formState.value.submitCount).toBe(1)

    values.value = { title: 'Loaded title', body: 'Loaded body' }
    await nextTick()

    expect(form.isSubmitting.value).toBe(true)
    expect(form.formState.value.submitCount).toBe(1)

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
    const initial = { id: 'same-account', bio: 'Initial', name: 'Before' }
    const values = shallowRef<AccountValues>(initial)
    const { form } = mountForm<AccountValues>(() => ({
      createForm: nativeProvider.createForm,
      defaultValues: initial,
      values: values.value,
      resetOptions: { keepDirtyValues: true },
      validate: () => gate,
    }))
    const onSubmit = vi.fn()

    form.setValue('bio', 'Typed biography')
    const submission = form.handleSubmit(onSubmit)()
    values.value = { ...initial, name: 'Background refresh' }
    await nextTick()
    expect(form.getValue('bio')).toBe('Typed biography')
    expect(form.isSubmitting.value).toBe(true)

    release({})
    await submission

    expect(onSubmit).toHaveBeenCalledWith({ ...initial, bio: 'Typed biography' })
    expect(form.isSubmitting.value).toBe(false)
  })

  it('drops fields removed by a replacement record', async () => {
    interface ReplacementValues {
      title: string
      subtitle?: string
    }
    const initialValues: Partial<ReplacementValues> = { title: 'A', subtitle: 'Old' }
    const values = shallowRef<Partial<ReplacementValues>>(initialValues)
    const { form } = mountForm<ReplacementValues>(() => ({
      createForm: nativeProvider.createForm,
      defaultValues: { title: '' },
      values: values.value,
      resetOptions: { keepDirtyValues: false },
    }))

    values.value = { title: 'B' }
    await nextTick()

    expect(form.getValue('title')).toBe('B')
    expect(form.getValue('subtitle')).toBeUndefined()
  })

  it('takes late composites after edited arrays and nested objects revert by content', async () => {
    interface CompositeValues {
      tags: string[]
      metadata: { category: string }
    }
    const initial: CompositeValues = { tags: [], metadata: { category: 'none' } }
    const values = shallowRef<CompositeValues>(initial)
    const { form } = mountForm<CompositeValues>(() => ({
      createForm: nativeProvider.createForm,
      defaultValues: initial,
      values: values.value,
      resetOptions: { keepDirtyValues: true },
    }))

    form.setValue('tags', ['draft'])
    form.setValue('metadata', { category: 'draft' })
    form.setValue('tags', [])
    form.setValue('metadata', { category: 'none' })
    expect(form.isDirty.value).toBe(false)

    values.value = { tags: ['loaded'], metadata: { category: 'loaded' } }
    await nextTick()

    expect(form.getValue('tags')).toEqual(['loaded'])
    expect(form.getValue('metadata')).toEqual({ category: 'loaded' })
  })

  it('replaces a pristine file with a different file by identity', async () => {
    interface AttachmentValues {
      attachment: File
    }
    const first = new File(['first'], 'first.txt')
    const second = new File(['second'], 'second.txt')
    const values = shallowRef<AttachmentValues>({ attachment: first })
    const { form } = mountForm<AttachmentValues>(() => ({
      createForm: nativeProvider.createForm,
      defaultValues: { attachment: first },
      values: values.value,
      resetOptions: { keepDirtyValues: true },
    }))

    values.value = { attachment: second }
    await nextTick()

    expect(form.getValue('attachment')).toBe(second)
  })
})

describe('useForm handleSubmit', () => {
  it('submits inventory values through a synchronous callback', async () => {
    const { form } = mountForm<InventoryValues>(() => ({
      createForm: nativeProvider.createForm,
      defaultValues,
    }))
    const onSubmit = vi.fn()

    await form.handleSubmit(onSubmit)()

    expect(onSubmit).toHaveBeenCalledWith(defaultValues)
    expect(form.isSubmitting.value).toBe(false)
  })

  it('returns a promise that awaits asynchronous submission', async () => {
    const { form } = mountForm<InventoryValues>(() => ({
      createForm: nativeProvider.createForm,
      defaultValues,
    }))
    let release!: () => void
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    let started = false
    let completed = false

    const submission = form.handleSubmit(async () => {
      started = true
      await gate
      completed = true
    })()
    await vi.waitFor(() => expect(started).toBe(true))
    expect(completed).toBe(false)

    release()
    await submission

    expect(completed).toBe(true)
    expect(form.isSubmitting.value).toBe(false)
  })

  it('preserves controller rejection and submission cleanup semantics', async () => {
    const { form } = mountForm<InventoryValues>(() => ({
      createForm: nativeProvider.createForm,
      defaultValues,
    }))
    const failure = new Error('Inventory unavailable')

    await expect(
      form.handleSubmit(() => {
        throw failure
      })(),
    ).rejects.toBe(failure)

    expect(form.isSubmitting.value).toBe(false)
  })
})

describe('useForm asynchronous disposal', () => {
  it('does not invoke onSubmit after unmount while validation is pending', async () => {
    let release!: (errors: Record<string, string>) => void
    const gate = new Promise<Record<string, string>>((resolve) => {
      release = resolve
    })
    let form!: UseFormResult<{ title: string }>
    const Page = defineComponent({
      setup() {
        form = useForm<{ title: string }>({
          createForm: nativeProvider.createForm,
          defaultValues: { title: 'Article' },
          validate: () => gate,
        })
        return () => h('div')
      },
    })
    const wrapper = mount(Page)
    const onSubmit = vi.fn()
    const submission = form.handleSubmit(onSubmit)()

    wrapper.unmount()
    release({})
    await submission

    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('still submits after StrictMode replays the mounted effect', async () => {
    // Vue has no StrictMode double-invocation: what a caller observes under
    // React's replayed mount effect is a submit that still reaches the handler.
    const { form } = mountForm(() => ({
      createForm: nativeProvider.createForm,
      defaultValues: { title: 'Article' },
    }))
    const onSubmit = vi.fn()

    await form.handleSubmit(onSubmit)()

    expect(onSubmit).toHaveBeenCalledWith({ title: 'Article' })
  })
})

describe('useForm external values versus reset baselines', () => {
  it.each([true, false])(
    'does not undo reset values with unchanged inline values (keepDirtyValues=%s)',
    async (keepDirtyValues) => {
      const { form, rerender } = mountForm<ArticleValues>(() => ({
        createForm: nativeProvider.createForm,
        defaultValues: { title: '', body: '' },
        values: { title: 'Server', body: 'Server body' },
        resetOptions: { keepDirtyValues },
      }))

      form.reset({ title: 'Saved', body: 'Saved body' })
      await rerender()

      expect(form.getValue('title')).toBe('Saved')
      expect(form.getValue('body')).toBe('Saved body')
    },
  )

  it.each([true, false])(
    'does not erase async defaults delivered through reset (keepDirtyValues=%s)',
    async (keepDirtyValues) => {
      const { form, rerender } = mountForm<ArticleValues>(() => ({
        createForm: nativeProvider.createForm,
        defaultValues: { title: '', body: '' },
        values: { title: 'Server', body: 'Server body' },
        resetOptions: { keepDirtyValues },
      }))

      const record = await Promise.resolve({ title: 'Async', body: 'Async body' })
      form.reset(record)
      await rerender()

      expect(form.getValue('title')).toBe('Async')
      expect(form.getValue('body')).toBe('Async body')
    },
  )
})
