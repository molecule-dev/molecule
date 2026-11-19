// @vitest-environment jsdom

/**
 * `useForm` state tuples — React's `useFormState.test.tsx` against the Angular
 * function. Every title is the React test's; only the framework-forced
 * mechanics change: a function runs in an injection context (a component field
 * initializer) instead of a hook, a signal argument replaces React's re-render
 * with new props, and `detectChanges()` replaces a render.
 *
 * @module
 */

import '@angular/compiler'
import {
  Component,
  computed,
  effect,
  provideZonelessChangeDetection,
  signal,
  type Type,
} from '@angular/core'
import { type ComponentFixture, TestBed } from '@angular/core/testing'
import { platformBrowser } from '@angular/platform-browser'
import { BrowserTestingModule } from '@angular/platform-browser/testing'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

import type { FormController, FormOptions } from '@molecule/app-forms'
import { createNativeFormProvider } from '@molecule/app-forms'

import { useForm, type UseFormOptions, type UseFormResult } from '../use-forms.js'

/** The two text fields the external-values cases drive. */
interface PairValues {
  name: string
  email: string
}

/**
 * Mounts one probe component and renders it once.
 *
 * @param component - The component class.
 * @returns The mounted fixture.
 */
function mount<T>(component: Type<T>): ComponentFixture<T> {
  TestBed.configureTestingModule({
    imports: [component],
    providers: [provideZonelessChangeDetection()],
  })
  const fixture = TestBed.createComponent(component)
  fixture.detectChanges()
  return fixture
}

/**
 * Reads one labelled control.
 *
 * @param fixture - The mounted fixture.
 * @param label - The control's aria-label.
 * @returns The input element.
 */
function input(fixture: ComponentFixture<unknown>, label: string): HTMLInputElement {
  const element = fixture.nativeElement.querySelector(
    `input[aria-label="${label}"]`,
  ) as HTMLInputElement | null
  if (!element) throw new Error(`no control labelled ${label}`)
  return element
}

/**
 * Types into a native input, the way a person does.
 *
 * @param fixture - The mounted fixture.
 * @param label - The control's aria-label.
 * @param next - The typed value.
 */
function type(fixture: ComponentFixture<unknown>, label: string, next: string): void {
  const element = input(fixture, label)
  element.value = next
  element.dispatchEvent(new Event('input', { bubbles: true }))
  fixture.detectChanges()
}

/** A pair-valued form whose options the case replaces. */
@Component({ selector: 'app-test-form-external-values-probe', template: '' })
class ExternalValuesProbeComponent {
  readonly options = signal<UseFormOptions<PairValues>>({
    defaultValues: { name: '', email: '' },
    values: { name: 'First', email: 'first@example.test' },
  })
  readonly form: UseFormResult<PairValues> = useForm(this.options)
}

/** A form that replaces its whole record from outside. */
@Component({ selector: 'app-test-form-replacement-probe', template: '' })
class ReplacementProbeComponent {
  readonly options = signal<UseFormOptions<{ name: string }>>({
    defaultValues: { name: '' },
    values: { name: 'First' },
    resetOptions: { keepDirtyValues: false },
  })
  readonly form = useForm(this.options)
}

/**
 * The preferences editor React's late-fill case drives: the mount effect
 * delivers loaded values, and typing marks the field dirty first.
 */
@Component({
  selector: 'app-test-form-preferences-probe',
  template: `
    <input aria-label="Name" [value]="form.formState().values.name" (input)="typeName($event)" />
    <input aria-label="Email" [value]="form.formState().values.email" (input)="typeEmail($event)" />
  `,
})
class PreferencesProbeComponent {
  readonly loaded = signal<PairValues | undefined>(undefined)
  readonly form = useForm<PairValues>({ defaultValues: { name: '', email: '' } })

  constructor() {
    effect(() => {
      const values = this.loaded()
      if (values) this.form.asState()[2](values)
    })
  }

  /**
   * Applies one typed name through the whole-form edit.
   *
   * @param event - The input event.
   */
  typeName(event: Event): void {
    const name = (event.target as HTMLInputElement).value
    this.form.asState()[1]((previous) => ({ ...previous, name }))
  }

  /**
   * Applies one typed email through the whole-form edit.
   *
   * @param event - The input event.
   */
  typeEmail(event: Event): void {
    const email = (event.target as HTMLInputElement).value
    this.form.asState()[1]((previous) => ({ ...previous, email }))
  }
}

/** One numeric field driven through the single-field tuple. */
@Component({ selector: 'app-test-form-quantity-probe', template: '' })
class QuantityProbeComponent {
  readonly form = useForm<{ quantity: number }>({ defaultValues: { quantity: 1 } })
}

/** The whole-form tuple over two fields. */
@Component({ selector: 'app-test-form-pair-probe', template: '' })
class PairProbeComponent {
  readonly form = useForm<PairValues>({ defaultValues: { name: '', email: '' } })
}

/** A form whose controller is replaced when the record identity changes. */
@Component({ selector: 'app-test-form-record-key-probe', template: '' })
class RecordKeyProbeComponent {
  readonly identity = signal<'first' | 'second'>('first')
  readonly options = computed<UseFormOptions<{ title: string }>>(() => ({
    defaultValues: { title: '' },
    resetKey: this.identity(),
  }))
  readonly form = useForm(this.options)
}

/**
 * A provider whose controller returns fresh clones from `getState`, the way a
 * real provider using JSON or clone-on-read does.
 *
 * @param options - The form options.
 * @returns The controller.
 */
const clonedGetterForm = (
  options: FormOptions<{ title: string }>,
): FormController<{ title: string }> => {
  const form = createNativeFormProvider().createForm(options)
  return { ...form, getState: () => structuredClone(form.getState()) }
}

/** A form over the cloned-getter provider, keyed by record identity. */
@Component({ selector: 'app-test-form-cloned-records-probe', template: '' })
class ClonedRecordsProbeComponent {
  readonly identity = signal<'first' | 'second'>('first')
  readonly options = computed<UseFormOptions<{ title: string }>>(() => ({
    createForm: (options: FormOptions<{ title: string }>) => clonedGetterForm(options),
    defaultValues: { title: '' },
    resetKey: this.identity(),
    values: { title: 'Shared title' },
  }))
  readonly form = useForm(this.options)
}

/** A form whose default is replaced by an explicit reset. */
@Component({ selector: 'app-test-form-explicit-reset-probe', template: '' })
class ExplicitResetProbeComponent {
  readonly form = useForm<{ title: string }>({ defaultValues: { title: 'Initial' } })
}

/** One field whose verbs are read before and after a notification. */
@Component({ selector: 'app-test-form-stable-actions-probe', template: '' })
class StableActionsProbeComponent {
  readonly form = useForm<{ title: string }>({ defaultValues: { title: '' } })
}

/** One whole-form tuple over a pristine and a dirty field. */
@Component({ selector: 'app-test-form-functional-fill-probe', template: '' })
class FunctionalFillProbeComponent {
  readonly form = useForm<{ name: string; quantity: number }>({
    defaultValues: { name: '', quantity: 0 },
  })
}

/** A form over a provider that clones every `getState` result. */
@Component({ selector: 'app-test-form-cloned-getters-probe', template: '' })
class ClonedGettersProbeComponent {
  readonly form = useForm<{ name: string }>({
    defaultValues: { name: '' },
    createForm: (options: FormOptions<{ name: string }>) => {
      const form = createNativeFormProvider().createForm(options)
      return { ...form, getState: () => structuredClone(form.getState()) }
    },
  })
}

beforeAll(() => {
  TestBed.initTestEnvironment(BrowserTestingModule, platformBrowser())
})

afterAll(() => {
  TestBed.resetTestEnvironment()
})

afterEach(() => {
  TestBed.resetTestingModule()
})

describe('useForm state tuples', () => {
  it('external values preserve dirty fields by default', () => {
    const fixture = mount(ExternalValuesProbeComponent)
    const form = fixture.componentInstance.form

    form.setValue('name', 'Typed')
    fixture.componentInstance.options.set({
      defaultValues: { name: '', email: '' },
      values: { name: 'Loaded', email: 'loaded@example.test' },
    })
    fixture.detectChanges()

    expect(form.getValue('name')).toBe('Typed')
    expect(form.getValue('email')).toBe('loaded@example.test')
  })

  it('an explicit external replacement remains available', () => {
    const fixture = mount(ReplacementProbeComponent)
    const form = fixture.componentInstance.form

    form.setValue('name', 'Typed')
    fixture.componentInstance.options.set({
      defaultValues: { name: '' },
      values: { name: 'Replacement' },
      resetOptions: { keepDirtyValues: false },
    })
    fixture.detectChanges()

    expect(form.getValue('name')).toBe('Replacement')
  })

  it('preserves typing before a late effect answer while pristine fields fill', () => {
    const fixture = mount(PreferencesProbeComponent)

    type(fixture, 'Name', 'Typed name')
    fixture.componentInstance.loaded.set({
      name: 'Server name',
      email: 'saved@example.test',
    })
    fixture.detectChanges()

    expect(input(fixture, 'Name').value).toBe('Typed name')
    expect(input(fixture, 'Email').value).toBe('saved@example.test')
  })

  it('single-field fill preserves an edit and accepts functional updates', () => {
    const form = mount(QuantityProbeComponent).componentInstance.form

    form.asState('quantity')[1]((previous) => previous + 2)
    form.asState('quantity')[2](10)

    expect(form.asState('quantity')[0]).toBe(3)
  })

  it('a pristine field takes a loaded value and equal edits remain pristine', () => {
    const form = mount(PairProbeComponent).componentInstance.form

    form.asState()[1]((previous) => ({ ...previous }))
    form.asState()[2]({ name: 'Loaded', email: 'saved@example.test' })

    expect(form.asState()[0]).toEqual({ name: 'Loaded', email: 'saved@example.test' })
  })

  it('a new record key drops the old dirty draft and an old fill cannot affect it', () => {
    const fixture = mount(RecordKeyProbeComponent)
    const form = fixture.componentInstance.form

    form.asState()[1]({ title: 'First draft' })
    const oldFill = form.asState()[2]
    fixture.componentInstance.identity.set('second')
    fixture.detectChanges()
    oldFill({ title: 'Late first answer' })
    form.asState()[2]({ title: 'Second record' })

    expect(form.asState()[0]).toEqual({ title: 'Second record' })
  })

  it('different records may have identical loaded field content', () => {
    const fixture = mount(ClonedRecordsProbeComponent)
    const form = fixture.componentInstance.form

    form.setValue('title', 'First draft')
    fixture.componentInstance.identity.set('second')
    fixture.detectChanges()

    expect(form.getValue('title')).toBe('Shared title')
    expect(form.isDirty()).toBe(false)
  })

  it('explicit edits and form resets remain intentional replacements', () => {
    const form = mount(ExplicitResetProbeComponent).componentInstance.form

    form.asState('title')[1]('Typed')
    form.reset({ title: 'Explicit reset' })

    expect(form.asState('title')[0]).toBe('Explicit reset')
  })

  it('keeps edit and fill callbacks stable across notifications and rerenders', () => {
    const fixture = mount(StableActionsProbeComponent)
    const form = fixture.componentInstance.form

    const edit = form.asState('title')[1]
    const fill = form.asState('title')[2]
    fill('Loaded')
    fixture.detectChanges()

    expect(form.asState('title')[1]).toBe(edit)
    expect(form.asState('title')[2]).toBe(fill)
  })

  it('functional fills read the latest baseline while preserving a dirty field', () => {
    const form = mount(FunctionalFillProbeComponent).componentInstance.form

    form.asState()[2]({ quantity: 2 })
    form.asState()[1]((previous) => ({ ...previous, name: 'Typed' }))
    form.asState()[2]((previous) => {
      const current = previous as { name: string; quantity: number }
      return { ...current, name: 'Server', quantity: current.quantity + 1 }
    })

    expect(form.asState()[0]).toEqual({ name: 'Typed', quantity: 3 })
  })

  it('a provider with cloned getters retains stable displayed values between notifications', () => {
    const fixture = mount(ClonedGettersProbeComponent)
    const form = fixture.componentInstance.form

    const method = form.asState
    const first = form.asState()[0]
    fixture.detectChanges()
    expect(form.asState()[0]).toBe(first)
    form.asState()[2]({ name: 'Loaded' })
    expect(form.asState).toBe(method)
    expect(form.asState()[0]).toEqual({ name: 'Loaded' })
  })
})
