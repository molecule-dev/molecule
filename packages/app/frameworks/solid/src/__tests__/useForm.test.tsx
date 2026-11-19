// @vitest-environment jsdom

/**
 * `useForm` over the bonded forms provider, mirroring the React package's
 * `useForm.test.tsx`: late values, late-value regressions, submit semantics and
 * asynchronous disposal. A Solid component body runs once, so a React
 * re-render is a changed reactive argument (the options accessor) or a signal
 * update.
 *
 * @module
 */

import { createComponent, createSignal, type JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { useForm, type UseFormResult } from '../primitives/react-forms.js'

const disposers: Array<() => void> = []

interface Mounted {
  container: HTMLElement
  unmount: () => void
}

/**
 * Renders a Solid tree into the document and keeps its cleanup.
 *
 * @param app - The tree to render.
 * @returns The container and an idempotent unmount.
 */
function mount(app: () => JSX.Element): Mounted {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const dispose = render(app, container)
  let cleaned = false
  const unmount = (): void => {
    if (cleaned) return
    cleaned = true
    dispose()
    container.remove()
  }
  disposers.push(unmount)
  return { container, unmount }
}

/**
 * Mounts a component that calls one setup function and renders nothing.
 *
 * @param setup - Runs in the component body.
 * @returns The mounted tree.
 */
function mountProbe(setup: () => void): Mounted {
  function Probe(): null {
    setup()
    return null
  }
  return mount(() => createComponent(Probe, {}))
}

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
  vi.restoreAllMocks()
})

/**
 * Lets queued microtasks and timers run.
 *
 * @returns A promise resolved after the pending work.
 */
async function settle(): Promise<void> {
  for (let i = 0; i < 3; i++) {
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 0)
    })
  }
}

/**
 * The labeled control or output, or a failure naming it.
 *
 * @param container - The rendered tree.
 * @param label - The control's `aria-label`.
 * @returns The element.
 */
function labeled(container: HTMLElement, label: string): HTMLElement {
  const element = container.querySelector<HTMLElement>(`[aria-label="${label}"]`)
  if (!element) throw new Error(`no element matched ${label}`)
  return element
}

/**
 * Types into a labeled input or textarea the way a person does.
 *
 * @param container - The rendered tree.
 * @param label - The control's `aria-label`.
 * @param next - The text to type.
 */
function typeInto(container: HTMLElement, label: string, next: string): void {
  const element = labeled(container, label) as HTMLInputElement | HTMLTextAreaElement
  element.value = next
  element.dispatchEvent(new Event('input', { bubbles: true }))
}

/**
 * The value of a labeled input or textarea.
 *
 * @param container - The rendered tree.
 * @param label - The control's `aria-label`.
 * @returns The control's value.
 */
function valueOf(container: HTMLElement, label: string): string {
  return (labeled(container, label) as HTMLInputElement | HTMLTextAreaElement).value
}

/**
 * Clicks the labeled button.
 *
 * @param container - The rendered tree.
 * @param name - The button's text.
 */
function clickButton(container: HTMLElement, name: string): void {
  const button = [...container.querySelectorAll('button')].find((b) => b.textContent === name)
  if (!button) throw new Error(`no button ${name}`)
  button.dispatchEvent(new MouseEvent('click', { bubbles: true }))
}

interface InventoryValues {
  sku: string
  quantity: number
}

const defaultValues: InventoryValues = { sku: 'KIT-7', quantity: 2 }

interface ArticleValues {
  title: string
  body: string
}

interface ArticleOnly {
  title: string
}

/**
 * Mounts the React test's article editor: two controlled fields and a reset
 * button, with the record arriving through a reactive accessor.
 *
 * @param values - The current external record, read reactively.
 * @param keepDirtyValues - Whether loaded values keep edits.
 * @returns The mounted tree and a reader for its form.
 */
function mountArticleEditor(
  values: () => ArticleValues | undefined,
  keepDirtyValues = true,
): Mounted & { form: () => UseFormResult<ArticleValues> } {
  let form!: UseFormResult<ArticleValues>
  const mounted = mount(() => {
    form = useForm<ArticleValues>(() => ({
      defaultValues: { title: '', body: '' },
      values: values(),
      resetOptions: { keepDirtyValues },
    }))
    return (
      <>
        <input
          aria-label="Title"
          value={String(form.formState().values.title ?? '')}
          onInput={(event) => form.setValue('title', event.currentTarget.value)}
        />
        <textarea
          aria-label="Body"
          value={String(form.formState().values.body ?? '')}
          onInput={(event) => form.setValue('body', event.currentTarget.value)}
        />
        <button type="button" onClick={() => form.reset()}>
          Reset
        </button>
      </>
    )
  })
  return { ...mounted, form: () => form }
}

describe('useForm late values', () => {
  it('keeps an edited article field and fills pristine fields when its record loads', () => {
    const [values, setValues] = createSignal<ArticleValues>({ title: '', body: '' })
    const { container } = mountArticleEditor(values)

    typeInto(container, 'Title', 'Draft title')
    setValues({ title: 'Loaded title', body: 'Loaded body' })

    expect(valueOf(container, 'Title')).toBe('Draft title')
    expect(valueOf(container, 'Body')).toBe('Loaded body')
  })

  it('replaces edits for a new record when keepDirtyValues is false', () => {
    const [values, setValues] = createSignal<ArticleValues>({ title: 'First', body: 'First body' })
    const { container } = mountArticleEditor(values, false)
    typeInto(container, 'Title', 'Draft title')

    setValues({ title: 'Second', body: 'Second body' })

    expect(valueOf(container, 'Title')).toBe('Second')
    expect(valueOf(container, 'Body')).toBe('Second body')
  })

  it('uses the latest values as the baseline for reset()', () => {
    const [values, setValues] = createSignal<ArticleValues>({ title: '', body: '' })
    const { container } = mountArticleEditor(values)
    setValues({ title: 'Loaded title', body: 'Loaded body' })
    typeInto(container, 'Title', 'Draft title')

    clickButton(container, 'Reset')

    expect(valueOf(container, 'Title')).toBe('Loaded title')
    expect(valueOf(container, 'Body')).toBe('Loaded body')
  })

  it('does not reset for a new values reference with equal content', () => {
    const [values, setValues] = createSignal<ArticleValues>({ title: 'Loaded', body: 'Body' })
    const { container } = mountArticleEditor(values)
    typeInto(container, 'Title', 'Draft title')

    setValues({ title: 'Loaded', body: 'Body' })

    expect(valueOf(container, 'Title')).toBe('Draft title')
  })

  it('leaves a form without values unchanged across rerenders', () => {
    const [values, setValues] = createSignal<ArticleValues | undefined>(undefined, {
      equals: false,
    })
    const { container } = mountArticleEditor(values)
    typeInto(container, 'Title', 'Draft title')

    setValues(undefined)

    expect(valueOf(container, 'Title')).toBe('Draft title')
    expect(valueOf(container, 'Body')).toBe('')
  })
})

describe('useForm late-value regressions', () => {
  it('delivers a changed nested record behind a new outer reference', () => {
    interface NestedValues {
      details: { title: string }
    }
    const record: NestedValues = { details: { title: 'A' } }
    const [values, setValues] = createSignal<NestedValues>(record, { equals: false })
    let form!: UseFormResult<NestedValues>
    mountProbe(() => {
      form = useForm<NestedValues>(() => ({ defaultValues: record, values: values() }))
    })

    record.details.title = 'B'
    setValues({ ...record })

    expect(form.getValue('details')).toEqual({ title: 'B' })
  })

  it('preserves an in-flight submission when late values arrive', async () => {
    let release!: () => void
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    const [values, setValues] = createSignal<ArticleValues>({ title: '', body: '' })
    let form!: UseFormResult<ArticleValues>
    mountProbe(() => {
      form = useForm<ArticleValues>(() => ({
        defaultValues: { title: '', body: '' },
        values: values(),
        resetOptions: { keepDirtyValues: true },
        validate: async () => {
          await gate
          return {}
        },
      }))
    })
    const onSubmit = vi.fn()

    const submission = form.handleSubmit(onSubmit)()
    await vi.waitFor(() => expect(form.isSubmitting()).toBe(true))
    expect(form.formState().submitCount).toBe(1)

    setValues({ title: 'Loaded title', body: 'Loaded body' })

    expect(form.isSubmitting()).toBe(true)
    expect(form.formState().submitCount).toBe(1)

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
    const [values, setValues] = createSignal<AccountValues>(initial)
    let form!: UseFormResult<AccountValues>
    mountProbe(() => {
      form = useForm<AccountValues>(() => ({
        defaultValues: initial,
        values: values(),
        resetOptions: { keepDirtyValues: true },
        validate: () => gate,
      }))
    })
    const onSubmit = vi.fn()

    form.setValue('bio', 'Typed biography')
    const submission = form.handleSubmit(onSubmit)()
    setValues({ ...initial, name: 'Background refresh' })
    expect(form.getValue('bio')).toBe('Typed biography')
    expect(form.isSubmitting()).toBe(true)

    release({})
    await submission

    expect(onSubmit).toHaveBeenCalledWith({ ...initial, bio: 'Typed biography' })
    expect(form.isSubmitting()).toBe(false)
  })

  it('preserves cleared populated tags and typed text on refresh', () => {
    interface EditorValues {
      title: string
      tags: string[]
      body: string
    }
    const initial: EditorValues = { title: 'Server title', tags: ['old'], body: '' }
    const [values, setValues] = createSignal<EditorValues>(initial)
    let form!: UseFormResult<EditorValues>
    mountProbe(() => {
      form = useForm<EditorValues>(() => ({
        defaultValues: { title: '', tags: [], body: '' },
        values: values(),
        resetOptions: { keepDirtyValues: true },
      }))
    })

    form.setValue('tags', [])
    form.setValue('title', 'Typed title')
    setValues({ title: 'Refreshed title', tags: ['restored'], body: 'Loaded body' })

    expect(form.formState().values).toEqual({
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
    const [values, setValues] = createSignal<Partial<ReplacementValues>>(initialValues)
    let form!: UseFormResult<ReplacementValues>
    mountProbe(() => {
      form = useForm<ReplacementValues>(() => ({
        defaultValues: { title: '' },
        values: values(),
        resetOptions: { keepDirtyValues: false },
      }))
    })

    setValues({ title: 'B' })

    expect(form.getValue('title')).toBe('B')
    expect(form.getValue('subtitle')).toBeUndefined()
  })

  it('takes late composites after edited arrays and nested objects revert by content', () => {
    interface CompositeValues {
      tags: string[]
      metadata: { category: string }
    }
    const initial: CompositeValues = { tags: [], metadata: { category: 'none' } }
    const [values, setValues] = createSignal<CompositeValues>(initial)
    let form!: UseFormResult<CompositeValues>
    mountProbe(() => {
      form = useForm<CompositeValues>(() => ({
        defaultValues: initial,
        values: values(),
        resetOptions: { keepDirtyValues: true },
      }))
    })

    form.setValue('tags', ['draft'])
    form.setValue('metadata', { category: 'draft' })
    form.setValue('tags', [])
    form.setValue('metadata', { category: 'none' })
    expect(form.isDirty()).toBe(false)

    setValues({ tags: ['loaded'], metadata: { category: 'loaded' } })

    expect(form.getValue('tags')).toEqual(['loaded'])
    expect(form.getValue('metadata')).toEqual({ category: 'loaded' })
  })

  it('replaces a pristine file with a different file by identity', () => {
    interface AttachmentValues {
      attachment: File
    }
    const first = new File(['first'], 'first.txt')
    const second = new File(['second'], 'second.txt')
    const [values, setValues] = createSignal<AttachmentValues>({ attachment: first })
    let form!: UseFormResult<AttachmentValues>
    mountProbe(() => {
      form = useForm<AttachmentValues>(() => ({
        defaultValues: { attachment: first },
        values: values(),
        resetOptions: { keepDirtyValues: true },
      }))
    })

    setValues({ attachment: second })

    expect(form.getValue('attachment')).toBe(second)
  })
})

describe('useForm handleSubmit', () => {
  it('submits inventory values through a synchronous callback', async () => {
    let form!: UseFormResult<InventoryValues>
    mountProbe(() => {
      form = useForm<InventoryValues>({ defaultValues })
    })
    const onSubmit = vi.fn()

    await form.handleSubmit(onSubmit)()

    expect(onSubmit).toHaveBeenCalledWith(defaultValues)
    expect(form.isSubmitting()).toBe(false)
  })

  it('returns a promise that awaits asynchronous submission', async () => {
    let form!: UseFormResult<InventoryValues>
    mountProbe(() => {
      form = useForm<InventoryValues>({ defaultValues })
    })
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
    expect(form.isSubmitting()).toBe(false)
  })

  it('preserves controller rejection and submission cleanup semantics', async () => {
    let form!: UseFormResult<InventoryValues>
    mountProbe(() => {
      form = useForm<InventoryValues>({ defaultValues })
    })
    const failure = new Error('Inventory unavailable')

    await expect(
      form.handleSubmit(() => {
        throw failure
      })(),
    ).rejects.toBe(failure)

    expect(form.isSubmitting()).toBe(false)
  })
})

describe('useForm asynchronous disposal', () => {
  it('does not invoke onSubmit after unmount while validation is pending', async () => {
    let release!: (errors: Record<string, string>) => void
    const gate = new Promise<Record<string, string>>((resolve) => {
      release = resolve
    })
    let form!: UseFormResult<ArticleOnly>
    const mounted = mountProbe(() => {
      form = useForm<ArticleOnly>({ defaultValues: { title: 'Article' }, validate: () => gate })
    })
    const onSubmit = vi.fn()

    const submission = form.handleSubmit(onSubmit)()
    mounted.unmount()
    release({})
    await submission

    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('still submits after StrictMode replays the mounted effect', async () => {
    // Solid has no StrictMode double-invocation; the observable contract is
    // that a form mounted once submits its default values.
    let form!: UseFormResult<ArticleOnly>
    mountProbe(() => {
      form = useForm<ArticleOnly>({ defaultValues: { title: 'Article' } })
    })
    const onSubmit = vi.fn()

    await form.handleSubmit(onSubmit)()

    expect(onSubmit).toHaveBeenCalledWith({ title: 'Article' })
  })
})

describe('useForm external values versus reset baselines', () => {
  it.each([true, false])(
    'does not undo reset values with unchanged inline values (keepDirtyValues=%s)',
    async (keepDirtyValues) => {
      let form!: UseFormResult<ArticleValues>
      mountProbe(() => {
        form = useForm<ArticleValues>(() => ({
          defaultValues: { title: '', body: '' },
          values: { title: 'Server', body: 'Server body' },
          resetOptions: { keepDirtyValues },
        }))
      })

      form.reset({ title: 'Saved', body: 'Saved body' })
      await settle()

      expect(form.getValue('title')).toBe('Saved')
      expect(form.getValue('body')).toBe('Saved body')
    },
  )

  it.each([true, false])(
    'does not erase async defaults delivered through reset (keepDirtyValues=%s)',
    async (keepDirtyValues) => {
      let form!: UseFormResult<ArticleValues>
      mountProbe(() => {
        form = useForm<ArticleValues>(() => ({
          defaultValues: { title: '', body: '' },
          values: { title: 'Server', body: 'Server body' },
          resetOptions: { keepDirtyValues },
        }))
      })

      const record = await Promise.resolve({ title: 'Async', body: 'Async body' })
      form.reset(record)
      await settle()

      expect(form.getValue('title')).toBe('Async')
      expect(form.getValue('body')).toBe('Async body')
    },
  )
})
