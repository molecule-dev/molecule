// @vitest-environment jsdom

/**
 * `useForm` — the controller's late values, submission lifecycle and disposal,
 * in Angular's idiom: options arrive as a signal and the hook follows it the
 * way React's hook follows a re-render with new props.
 *
 * @module
 */

import '@angular/compiler'
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  provideZonelessChangeDetection,
  signal,
  type WritableSignal,
} from '@angular/core'
import { type ComponentFixture, TestBed } from '@angular/core/testing'
import { platformBrowser } from '@angular/platform-browser'
import { BrowserTestingModule } from '@angular/platform-browser/testing'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import type { FormValuesConstraint } from '@molecule/app-forms'

import type { UseFormOptions, UseFormResult } from '../use-forms.js'
import { useForm } from '../use-forms.js'

interface InventoryValues {
  sku: string
  quantity: number
}

const defaultValues: InventoryValues = { sku: 'KIT-7', quantity: 2 }

interface ArticleValues {
  title: string
  body: string
}

interface NestedValues {
  details: { title: string }
}

interface AccountValues {
  id: string
  bio: string
  name: string
}

interface EditorValues {
  title: string
  tags: string[]
  body: string
}

interface ReplacementValues {
  title: string
  subtitle?: string
}

interface CompositeValues {
  tags: string[]
  metadata: { category: string }
}

interface AttachmentValues {
  attachment: File
}

/** The validator the currently mounted probe stands in for, if any. */
let validation: (() => Promise<Record<string, string>>) | null = null

/** Resolves the current probe's pending validation with the given errors. */
const validateThroughGate = (): Promise<Record<string, string>> =>
  validation ? validation() : Promise.resolve({})

/** The article editor's first-render `values` prop. */
let articleInitialValues: ArticleValues | undefined

/** The article editor's first-render `keepDirtyValues` prop. */
let articleInitialKeepDirtyValues = true

/**
 * The article editor React's tests drive: default values, late `values`, and
 * the `keepDirtyValues` switch.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'app-test-article-editor',
  template: '',
})
class ArticleEditorComponent {
  readonly values = signal<ArticleValues | undefined>(articleInitialValues)
  readonly keepDirtyValues = signal(articleInitialKeepDirtyValues)
  readonly revision = signal(0)
  readonly options = computed<UseFormOptions<ArticleValues>>(() => {
    this.revision()
    return {
      defaultValues: { title: '', body: '' },
      values: this.values(),
      resetOptions: { keepDirtyValues: this.keepDirtyValues() },
    }
  })
  readonly form: UseFormResult<ArticleValues> = useForm<ArticleValues>(this.options)
}

/** A form whose `values` is either a record or `undefined`, as an editor's. */
@Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'app-test-inventory-form',
  template: '',
})
class InventoryFormComponent {
  readonly form: UseFormResult<InventoryValues> = useForm<InventoryValues>({ defaultValues })
}

/** The nested-record probe. */
@Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'app-test-nested-form',
  template: '',
})
class NestedFormComponent {
  readonly values = signal<NestedValues>({ details: { title: 'A' } })
  readonly revision = signal(0)
  readonly options = computed<UseFormOptions<NestedValues>>(() => {
    this.revision()
    return { defaultValues: { details: { title: 'A' } }, values: this.values() }
  })
  readonly form: UseFormResult<NestedValues> = useForm<NestedValues>(this.options)
}

/** The in-flight-submission probe: late values with a gated validator. */
@Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'app-test-late-submission-form',
  template: '',
})
class LateSubmissionFormComponent {
  readonly values = signal<ArticleValues>({ title: '', body: '' })
  readonly revision = signal(0)
  readonly options = computed<UseFormOptions<ArticleValues>>(() => {
    this.revision()
    return {
      defaultValues: { title: '', body: '' },
      values: this.values(),
      resetOptions: { keepDirtyValues: true },
      validate: validateThroughGate,
    }
  })
  readonly form: UseFormResult<ArticleValues> = useForm<ArticleValues>(this.options)
}

/** The same-account refresh probe: a typed field validated through a gate. */
@Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'app-test-account-form',
  template: '',
})
class AccountFormComponent {
  readonly values = signal<AccountValues>({ id: 'same-account', bio: 'Initial', name: 'Before' })
  readonly revision = signal(0)
  readonly options = computed<UseFormOptions<AccountValues>>(() => {
    this.revision()
    return {
      defaultValues: { id: 'same-account', bio: 'Initial', name: 'Before' },
      values: this.values(),
      resetOptions: { keepDirtyValues: true },
      validate: validateThroughGate,
    }
  })
  readonly form: UseFormResult<AccountValues> = useForm<AccountValues>(this.options)
}

/** The editor probe whose tags and text are both edited. */
@Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'app-test-editor-form',
  template: '',
})
class EditorFormComponent {
  readonly values = signal<EditorValues>({ title: 'Server title', tags: ['old'], body: '' })
  readonly revision = signal(0)
  readonly options = computed<UseFormOptions<EditorValues>>(() => {
    this.revision()
    return {
      defaultValues: { title: '', tags: [], body: '' },
      values: this.values(),
      resetOptions: { keepDirtyValues: true },
    }
  })
  readonly form: UseFormResult<EditorValues> = useForm<EditorValues>(this.options)
}

/** The replacement-record probe: a record may omit fields. */
@Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'app-test-replacement-form',
  template: '',
})
class ReplacementFormComponent {
  readonly values = signal<Partial<ReplacementValues>>({ title: 'A', subtitle: 'Old' })
  readonly revision = signal(0)
  readonly options = computed<UseFormOptions<ReplacementValues>>(() => {
    this.revision()
    return {
      defaultValues: { title: '' },
      values: this.values(),
      resetOptions: { keepDirtyValues: false },
    }
  })
  readonly form: UseFormResult<ReplacementValues> = useForm<ReplacementValues>(this.options)
}

/** The composite probe: arrays and nested objects edited then reverted. */
@Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'app-test-composite-form',
  template: '',
})
class CompositeFormComponent {
  readonly values = signal<CompositeValues>({ tags: [], metadata: { category: 'none' } })
  readonly revision = signal(0)
  readonly options = computed<UseFormOptions<CompositeValues>>(() => {
    this.revision()
    return {
      defaultValues: { tags: [], metadata: { category: 'none' } },
      values: this.values(),
      resetOptions: { keepDirtyValues: true },
    }
  })
  readonly form: UseFormResult<CompositeValues> = useForm<CompositeValues>(this.options)
}

/** The attachment probe: a pristine file field. */
@Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'app-test-attachment-form',
  template: '',
})
class AttachmentFormComponent {
  readonly values = signal<AttachmentValues>({
    attachment: new File(['first'], 'first.txt'),
  })
  readonly revision = signal(0)
  readonly options = computed<UseFormOptions<AttachmentValues>>(() => {
    this.revision()
    return { defaultValues: this.values(), values: this.values() }
  })
  readonly form: UseFormResult<AttachmentValues> = useForm<AttachmentValues>(this.options)
}

/** The disposal probe: a gated validator and a removable component. */
@Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'app-test-disposal-form',
  template: '',
})
class DisposalFormComponent {
  readonly form: UseFormResult<{ title: string }> = useForm<{ title: string }>({
    defaultValues: { title: 'Article' },
    validate: validateThroughGate,
  })
}

/**
 * Mounts a probe component.
 *
 * @param component - The component to mount.
 * @returns The mounted fixture.
 */
function mount<T>(component: new () => T): ComponentFixture<T> {
  TestBed.configureTestingModule({
    imports: [component],
    providers: [provideZonelessChangeDetection()],
  })
  const fixture = TestBed.createComponent(component)
  fixture.detectChanges()
  return fixture
}

/**
 * Commits another change-detection pass the way React's `rerender()` commits
 * another render: a new options object for the same component.
 *
 * @param fixture - The mounted probe.
 */
function rerender(fixture: ComponentFixture<{ revision: WritableSignal<number> }>): void {
  fixture.componentInstance.revision.update((count) => count + 1)
  fixture.detectChanges()
}

/**
 * Types into a field through its registration, as a DOM change event does.
 *
 * @param form - The form whose field is edited.
 * @param name - The field's name.
 * @param value - The typed value.
 */
function typeInto<T extends FormValuesConstraint<T>>(
  form: UseFormResult<T>,
  name: Extract<keyof T, string>,
  value: T[Extract<keyof T, string>],
): void {
  form.register(name).onChange({ target: { value, name } })
}

beforeAll(() => {
  TestBed.initTestEnvironment(BrowserTestingModule, platformBrowser())
})

afterAll(() => {
  TestBed.resetTestEnvironment()
})

beforeEach(() => {
  validation = null
  articleInitialValues = undefined
  articleInitialKeepDirtyValues = true
})

afterEach(() => {
  TestBed.resetTestingModule()
})

describe('useForm late values', () => {
  it('keeps an edited article field and fills pristine fields when its record loads', () => {
    articleInitialValues = { title: '', body: '' }
    const fixture = mount(ArticleEditorComponent)
    const form = fixture.componentInstance.form

    typeInto(form, 'title', 'Draft title')
    fixture.componentInstance.values.set({ title: 'Loaded title', body: 'Loaded body' })
    fixture.detectChanges()

    expect(form.getValue('title')).toBe('Draft title')
    expect(form.getValue('body')).toBe('Loaded body')
  })

  it('replaces edits for a new record when keepDirtyValues is false', () => {
    articleInitialValues = { title: 'First', body: 'First body' }
    articleInitialKeepDirtyValues = false
    const fixture = mount(ArticleEditorComponent)
    const form = fixture.componentInstance.form

    typeInto(form, 'title', 'Draft title')

    fixture.componentInstance.values.set({ title: 'Second', body: 'Second body' })
    fixture.detectChanges()

    expect(form.getValue('title')).toBe('Second')
    expect(form.getValue('body')).toBe('Second body')
  })

  it('uses the latest values as the baseline for reset()', () => {
    articleInitialValues = { title: '', body: '' }
    const fixture = mount(ArticleEditorComponent)
    const form = fixture.componentInstance.form

    fixture.componentInstance.values.set({ title: 'Loaded title', body: 'Loaded body' })
    fixture.detectChanges()
    typeInto(form, 'title', 'Draft title')

    form.reset()

    expect(form.getValue('title')).toBe('Loaded title')
    expect(form.getValue('body')).toBe('Loaded body')
  })

  it('does not reset for a new values reference with equal content', () => {
    articleInitialValues = { title: 'Loaded', body: 'Body' }
    const fixture = mount(ArticleEditorComponent)
    const form = fixture.componentInstance.form

    typeInto(form, 'title', 'Draft title')

    fixture.componentInstance.values.set({ title: 'Loaded', body: 'Body' })
    fixture.detectChanges()

    expect(form.getValue('title')).toBe('Draft title')
  })

  it('leaves a form without values unchanged across rerenders', () => {
    const fixture = mount(ArticleEditorComponent)
    const form = fixture.componentInstance.form

    typeInto(form, 'title', 'Draft title')

    rerender(fixture)

    expect(form.getValue('title')).toBe('Draft title')
    expect(form.getValue('body')).toBe('')
  })
})

describe('useForm late-value regressions', () => {
  it('delivers a changed nested record behind a new outer reference', () => {
    const fixture = mount(NestedFormComponent)
    const form = fixture.componentInstance.form
    const record = fixture.componentInstance.values()

    record.details.title = 'B'
    fixture.componentInstance.values.set({ ...record })
    fixture.detectChanges()

    expect(form.getValue('details')).toEqual({ title: 'B' })
  })

  it('preserves an in-flight submission when late values arrive', async () => {
    let release!: () => void
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    validation = async () => {
      await gate
      return {}
    }
    const fixture = mount(LateSubmissionFormComponent)
    const form = fixture.componentInstance.form
    const onSubmit = vi.fn()

    const submission = form.handleSubmit(onSubmit)()
    await vi.waitFor(() => expect(form.isSubmitting()).toBe(true))
    expect(form.formState().submitCount).toBe(1)

    fixture.componentInstance.values.set({ title: 'Loaded title', body: 'Loaded body' })
    fixture.detectChanges()

    expect(form.isSubmitting()).toBe(true)
    expect(form.formState().submitCount).toBe(1)

    release()
    await submission
    expect(onSubmit).toHaveBeenCalledWith({ title: '', body: '' })
  })

  it('keeps a typed validated save through a same-account refresh', async () => {
    let release!: (errors: Record<string, string>) => void
    const gate = new Promise<Record<string, string>>((resolve) => {
      release = resolve
    })
    validation = () => gate
    const initial: AccountValues = { id: 'same-account', bio: 'Initial', name: 'Before' }
    const fixture = mount(AccountFormComponent)
    const form = fixture.componentInstance.form
    const onSubmit = vi.fn()

    form.setValue('bio', 'Typed biography')
    const submission = form.handleSubmit(onSubmit)()

    fixture.componentInstance.values.set({ ...initial, name: 'Background refresh' })
    fixture.detectChanges()
    expect(form.getValue('bio')).toBe('Typed biography')
    expect(form.isSubmitting()).toBe(true)

    release({})
    await submission

    expect(onSubmit).toHaveBeenCalledWith({ ...initial, bio: 'Typed biography' })
    expect(form.isSubmitting()).toBe(false)
  })

  it('preserves cleared populated tags and typed text on refresh', () => {
    const fixture = mount(EditorFormComponent)
    const form = fixture.componentInstance.form

    form.setValue('tags', [])
    form.setValue('title', 'Typed title')

    fixture.componentInstance.values.set({
      title: 'Refreshed title',
      tags: ['restored'],
      body: 'Loaded body',
    })
    fixture.detectChanges()

    expect(form.formState().values).toEqual({
      title: 'Typed title',
      tags: [],
      body: 'Loaded body',
    })
  })

  it('drops fields removed by a replacement record', () => {
    const fixture = mount(ReplacementFormComponent)
    const form = fixture.componentInstance.form

    fixture.componentInstance.values.set({ title: 'B' })
    fixture.detectChanges()

    expect(form.getValue('title')).toBe('B')
    expect(form.getValue('subtitle')).toBeUndefined()
  })

  it('takes late composites after edited arrays and nested objects revert by content', () => {
    const fixture = mount(CompositeFormComponent)
    const form = fixture.componentInstance.form

    form.setValue('tags', ['draft'])
    form.setValue('metadata', { category: 'draft' })
    form.setValue('tags', [])
    form.setValue('metadata', { category: 'none' })
    expect(form.isDirty()).toBe(false)

    fixture.componentInstance.values.set({ tags: ['loaded'], metadata: { category: 'loaded' } })
    fixture.detectChanges()

    expect(form.getValue('tags')).toEqual(['loaded'])
    expect(form.getValue('metadata')).toEqual({ category: 'loaded' })
  })

  it('replaces a pristine file with a different file by identity', () => {
    const fixture = mount(AttachmentFormComponent)
    const form = fixture.componentInstance.form
    const second = new File(['second'], 'second.txt')

    fixture.componentInstance.values.set({ attachment: second })
    fixture.detectChanges()

    expect(form.getValue('attachment')).toBe(second)
  })
})

describe('useForm handleSubmit', () => {
  it('submits inventory values through a synchronous callback', async () => {
    const form = mount(InventoryFormComponent).componentInstance.form
    const onSubmit = vi.fn()

    await form.handleSubmit(onSubmit)()

    expect(onSubmit).toHaveBeenCalledWith(defaultValues)
    expect(form.isSubmitting()).toBe(false)
  })

  it('returns a promise that awaits asynchronous submission', async () => {
    const form = mount(InventoryFormComponent).componentInstance.form
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
    const form = mount(InventoryFormComponent).componentInstance.form
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
    validation = () => gate
    const fixture = mount(DisposalFormComponent)
    const form = fixture.componentInstance.form
    const onSubmit = vi.fn()

    const submission = form.handleSubmit(onSubmit)()

    fixture.destroy()
    release({})
    await submission

    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('still submits after StrictMode replays the mounted effect', async () => {
    const fixture = mount(DisposalFormComponent)
    const form = fixture.componentInstance.form
    // Angular has no StrictMode replay; what a caller observes under it is a
    // form whose effects ran more than once and still submits.
    fixture.detectChanges()
    const onSubmit = vi.fn()

    await form.handleSubmit(onSubmit)()

    expect(onSubmit).toHaveBeenCalledWith({ title: 'Article' })
  })
})

describe('useForm external values versus reset baselines', () => {
  it.each([true, false])(
    'does not undo reset values with unchanged inline values (keepDirtyValues=%s)',
    (keepDirtyValues) => {
      articleInitialValues = { title: 'Server', body: 'Server body' }
      articleInitialKeepDirtyValues = keepDirtyValues
      const fixture = mount(ArticleEditorComponent)
      const form = fixture.componentInstance.form

      form.reset({ title: 'Saved', body: 'Saved body' })
      rerender(fixture)

      expect(form.getValue('title')).toBe('Saved')
      expect(form.getValue('body')).toBe('Saved body')
    },
  )

  it.each([true, false])(
    'does not erase async defaults delivered through reset (keepDirtyValues=%s)',
    async (keepDirtyValues) => {
      articleInitialValues = { title: 'Server', body: 'Server body' }
      articleInitialKeepDirtyValues = keepDirtyValues
      const fixture = mount(ArticleEditorComponent)
      const form = fixture.componentInstance.form

      const record = await Promise.resolve({ title: 'Async', body: 'Async body' })
      form.reset(record)
      rerender(fixture)

      expect(form.getValue('title')).toBe('Async')
      expect(form.getValue('body')).toBe('Async body')
    },
  )
})
