// @vitest-environment jsdom

/**
 * The form functions over the bonded provider: rendered controls, field
 * selection on a live component, and the submit lifecycle.
 *
 * This is React's `useForm.integration.test.tsx` against the Angular
 * functions; each title is React's. Only the framework-forced mechanics change:
 * a function runs in an injection context (a component field initializer)
 * instead of a hook, signals replace the returned values, a mounted component
 * replaces a render, and a signal argument replaces React's re-render with new
 * arguments.
 *
 * @module
 */

import '@angular/compiler'
import {
  Component,
  type EnvironmentProviders,
  type Provider,
  provideZonelessChangeDetection,
  type Signal,
  signal,
  type Type,
  type WritableSignal,
} from '@angular/core'
import { type ComponentFixture, TestBed } from '@angular/core/testing'
import { platformBrowser } from '@angular/platform-browser'
import { BrowserTestingModule } from '@angular/platform-browser/testing'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import type {
  FieldState,
  FormController,
  FormOptions,
  FormProvider,
  FormValuesConstraint,
} from '@molecule/app-forms'
import { createNativeFormProvider, setProvider } from '@molecule/app-forms'

import { useFieldState, useForm, type UseFormOptions, useWatch } from '../hooks/use-forms.js'

/** A valid provider may return fresh objects at every level of a snapshot. */
function providerWithClonedSnapshots(): FormProvider {
  const native = createNativeFormProvider()
  return {
    createForm<T extends FormValuesConstraint<T>>(options: FormOptions<T>): FormController<T> {
      const form = native.createForm(options)
      return {
        ...form,
        getState: () => structuredClone(form.getState()),
        getFieldState: (name) => structuredClone(form.getFieldState(name)),
        getValue: <K extends keyof T>(name: K): T[K] => structuredClone(form.getValue(name)),
      }
    },
  }
}

/** The values both provider cases drive the contact form with. */
type EmailValues = { email: string }
/** The values the field-selection and subscription cases drive. */
type PairValues = { email: string; backup: string }
/** The cloned object values the watched-field case switches between. */
type ObjectPair = { left: { value: number }; right: { value: number } }

/** The options the contact-form component creates its form with. */
let activeContactOptions: UseFormOptions<EmailValues> = { defaultValues: { email: '' } }
/** The submit callback the contact-form component runs. */
let activeContactSubmit: (values: EmailValues) => void | Promise<void> = () => {}
/** The options a probe component creates its form with. */
let activeFormOptions: UseFormOptions<EmailValues> = { defaultValues: { email: '' } }
/** The submit callback the bonded profile-form component runs. */
let activeProfileSubmit: (values: { name: string }) => void = () => {}
/** The switchable controller/name sources the field-state probe follows. */
let activeFieldSources: {
  form: WritableSignal<FormController<PairValues>>
  name: WritableSignal<'email' | 'backup'>
} | null = null
/** The controller the late-update field probe reads. */
let activeLateController: FormController<EmailValues> | null = null
/** The switchable controller/name sources the watch probe follows. */
let activeWatchSources: {
  form: WritableSignal<FormController<ObjectPair>>
  name: WritableSignal<'left' | 'right'>
} | null = null

/** Mounted roots appended by the mount helper, removed after each case. */
const mountedRoots: HTMLElement[] = []

/**
 * Mounts one component under the given providers and renders it once.
 *
 * @param component - The component class.
 * @param providers - Extra providers (usually `provideMolecule`).
 * @returns The mounted fixture.
 */
function mount<P>(
  component: Type<P>,
  ...providers: (Provider | EnvironmentProviders)[]
): ComponentFixture<P> {
  TestBed.configureTestingModule({
    imports: [component],
    providers: [provideZonelessChangeDetection(), ...providers],
  })
  const fixture = TestBed.createComponent(component)
  const root = fixture.nativeElement as HTMLElement
  if (!root.isConnected) {
    document.body.appendChild(root)
    mountedRoots.push(root)
  }
  fixture.detectChanges()
  return fixture
}

/**
 * Reads one element from the fixture's DOM.
 *
 * @param fixture - The mounted fixture.
 * @param selector - The CSS selector.
 * @returns The element, or `null`.
 */
function query<T extends HTMLElement>(
  fixture: ComponentFixture<unknown>,
  selector: string,
): T | null {
  return fixture.nativeElement.querySelector(selector) as T | null
}

/**
 * Types into a native input, the way a person does.
 *
 * @param fixture - The mounted fixture.
 * @param label - The control's aria-label.
 * @param next - The typed value.
 */
function type(fixture: ComponentFixture<unknown>, label: string, next: string): void {
  const input = query<HTMLInputElement>(fixture, `[aria-label="${label}"]`)
  if (!input) throw new Error(`no control labelled ${label}`)
  input.value = next
  input.dispatchEvent(new Event('input', { bubbles: true }))
  fixture.detectChanges()
}

/**
 * Dispatches a native submit on a labelled form and renders the synchronous
 * result.
 *
 * @param fixture - The mounted fixture.
 * @param label - The form's aria-label.
 */
async function submit(fixture: ComponentFixture<unknown>, label: string): Promise<void> {
  const form = query<HTMLFormElement>(fixture, `form[aria-label="${label}"]`)
  if (!form) throw new Error(`no form labelled ${label}`)
  form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
  await new Promise((resolve) => setTimeout(resolve, 0))
  fixture.detectChanges()
}

/**
 * Polls until the predicate holds, rendering between attempts.
 *
 * @param fixture - The mounted fixture.
 * @param predicate - The condition to reach.
 */
async function waitFor(
  fixture: ComponentFixture<unknown>,
  predicate: () => boolean,
): Promise<void> {
  const deadline = Date.now() + 2000
  while (!predicate()) {
    if (Date.now() > deadline) throw new Error('waitFor: condition was not met')
    await new Promise((resolve) => setTimeout(resolve, 0))
    fixture.detectChanges()
  }
}

/** The contact form: one required email field and a submit status. */
@Component({
  selector: 'app-test-form-contact',
  template: `
    <form aria-label="Contact" (submit)="onSubmit($event)">
      <input
        aria-label="Email"
        [value]="form.formState().values.email"
        (input)="form.register('email', { required: 'Email required' }).onChange($event)"
      />
      <button [disabled]="form.isSubmitting()">Submit</button>
      @if (form.formState().errors.email) {
        <p role="alert">{{ form.formState().errors.email }}</p>
      }
      <p role="status">{{ form.isSubmitting() ? 'Submitting' : 'Idle' }}</p>
    </form>
  `,
})
class ContactFormComponent {
  readonly form = useForm<EmailValues>(activeContactOptions)

  /**
   * Runs the form's submit runner.
   *
   * @param event - The native submit event.
   */
  onSubmit(event: Event): void {
    void this.form.handleSubmit(activeContactSubmit)(event)
  }
}

/** A probe that creates a form in an injection context and exposes it. */
@Component({ selector: 'app-test-form-probe', template: '' })
class FormProbeComponent {
  readonly form = useForm<EmailValues>(activeFormOptions)
}

/** The bonded profile form: one required name field and a dirty status. */
@Component({
  selector: 'app-test-form-profile',
  template: `
    <form aria-label="Profile" (submit)="onSubmit($event)">
      <input
        aria-label="Name"
        [value]="form.formState().values.name"
        (input)="form.register('name', { required: 'Name required' }).onChange($event)"
      />
      <p role="status">{{ form.isDirty() ? 'Dirty' : 'Clean' }}</p>
    </form>
  `,
})
class ProfileFormComponent {
  readonly form = useForm<{ name: string }>({ defaultValues: { name: '' } })

  /**
   * Runs the form's submit runner.
   *
   * @param event - The native submit event.
   */
  onSubmit(event: Event): void {
    void this.form.handleSubmit(activeProfileSubmit)(event)
  }
}

/** A probe that follows switchable controller/name signals with `useFieldState`. */
@Component({ selector: 'app-test-field-state-probe', template: '' })
class FieldStateProbeComponent {
  private readonly sources = requireFieldSources()
  readonly field = useFieldState(this.sources.form, this.sources.name)
}

/**
 * Reads the field-state sources the probe was mounted with.
 *
 * @returns The switchable sources.
 */
function requireFieldSources(): NonNullable<typeof activeFieldSources> {
  if (activeFieldSources === null) throw new Error('field sources not set')
  return activeFieldSources
}

/** A probe that reads a field updated during its own construction. */
@Component({
  selector: 'app-test-late-field',
  template: '<p role="status">{{ state().value }}</p>',
})
class LateFieldComponent {
  readonly state: Signal<FieldState<string>> = this.readState()

  /**
   * Subscribes to the field, then updates the controller before the first
   * render — React's update between render and subscription.
   *
   * @returns The subscribed field state.
   */
  private readState(): Signal<FieldState<string>> {
    if (activeLateController === null) throw new Error('late controller not set')
    const state = useFieldState(activeLateController, 'email')
    activeLateController.setValue('email', 'after')
    return state
  }
}

/** A probe that follows switchable controller/name signals with `useWatch`. */
@Component({ selector: 'app-test-watch-probe', template: '' })
class WatchProbeComponent {
  private readonly sources = requireWatchSources()
  readonly watched = useWatch(this.sources.form, this.sources.name)
}

/**
 * Reads the watch sources the probe was mounted with.
 *
 * @returns The switchable sources.
 */
function requireWatchSources(): NonNullable<typeof activeWatchSources> {
  if (activeWatchSources === null) throw new Error('watch sources not set')
  return activeWatchSources
}

beforeAll(() => {
  TestBed.initTestEnvironment(BrowserTestingModule, platformBrowser())
})

afterAll(() => {
  TestBed.resetTestEnvironment()
})

afterEach(() => {
  for (const root of mountedRoots.splice(0)) root.remove()
  TestBed.resetTestingModule()
  vi.restoreAllMocks()
  activeContactOptions = { defaultValues: { email: '' } }
  activeContactSubmit = () => {}
  activeFormOptions = { defaultValues: { email: '' } }
  activeProfileSubmit = () => {}
  activeFieldSources = null
  activeLateController = null
  activeWatchSources = null
  setProvider(createNativeFormProvider())
})

describe.each([
  ['native', createNativeFormProvider],
  ['cloned snapshots', providerWithClonedSnapshots],
] as const)('Angular form integration: %s provider', (_name, createProvider) => {
  it('mounts, validates and submits the latest typed values while keeping the input mounted', async () => {
    const provider = createProvider()
    let finishSubmit!: () => void
    const onSubmit = vi.fn<(values: EmailValues) => Promise<void>>(
      () =>
        new Promise<void>((resolve) => {
          finishSubmit = resolve
        }),
    )
    activeContactOptions = { createForm: provider.createForm, defaultValues: { email: '' } }
    activeContactSubmit = onSubmit
    const fixture = mount(ContactFormComponent)
    const input = query<HTMLInputElement>(fixture, 'input[aria-label="Email"]')
    if (!input) throw new Error('no email input')
    fixture.componentInstance.form.register('email', { required: 'Email required' }).ref?.(input)

    await submit(fixture, 'Contact')
    expect(onSubmit).not.toHaveBeenCalled()
    expect(query(fixture, '[role="alert"]')?.textContent).toBe('Email required')
    expect(document.activeElement).toBe(input)

    type(fixture, 'Email', 'reader@example.test')
    await submit(fixture, 'Contact')
    expect(onSubmit).toHaveBeenCalledExactlyOnceWith({ email: 'reader@example.test' })
    expect(query(fixture, 'input[aria-label="Email"]')).toBe(input)
    expect(query(fixture, '[role="status"]')?.textContent).toBe('Submitting')
    expect(query<HTMLButtonElement>(fixture, 'button')?.disabled).toBe(true)

    finishSubmit()
    await waitFor(fixture, () => query(fixture, '[role="status"]')?.textContent === 'Idle')
    expect(query(fixture, 'input[aria-label="Email"]')).toBe(input)
    expect(input.value).toBe('reader@example.test')
    expect(query(fixture, '[role="alert"]')).toBeNull()
    expect(query<HTMLButtonElement>(fixture, 'button')?.disabled).toBe(false)
  })

  it('uses provider field semantics through edits, reset, field selection and controller switches', () => {
    const first = createProvider().createForm<PairValues>({
      defaultValues: { email: 'first', backup: 'backup' },
    })
    const second = createProvider().createForm<PairValues>({
      defaultValues: { email: 'second', backup: 'other' },
    })
    const readSecond = vi.spyOn(second, 'getFieldState')
    activeFieldSources = { form: signal(first), name: signal<'email' | 'backup'>('email') }
    const fixture = mount(FieldStateProbeComponent)
    const field = fixture.componentInstance.field
    const sources = requireFieldSources()

    expect(field()).toEqual(first.getFieldState('email'))
    expect(field().dirty).toBe(false)
    first.setValue('email', 'edited')
    expect(field()).toMatchObject({ value: 'edited', dirty: true, touched: true })
    first.setError('email', 'Invalid')
    expect(field()).toMatchObject({ error: 'Invalid', valid: false })
    first.reset()
    expect(field()).toEqual(first.getFieldState('email'))
    expect(field().dirty).toBe(false)
    sources.name.set('backup')
    fixture.detectChanges()
    expect(field().value).toBe('backup')
    first.setValue('email', 'unselected')
    expect(field().value).toBe('backup')
    sources.form.set(second)
    fixture.detectChanges()
    expect(field().value).toBe('other')
    const selected = field()
    first.setValue('backup', 'old controller')
    expect(field()).toBe(selected)
    second.setValue('backup', 'new controller')
    expect(field().value).toBe('new controller')
    fixture.destroy()
    readSecond.mockClear()
    second.setValue('backup', 'after unmount')
    expect(readSecond).not.toHaveBeenCalled()
  })

  it('clears submitting state when the real submit callback rejects', async () => {
    const provider = createProvider()
    activeFormOptions = { createForm: provider.createForm, defaultValues: { email: 'reader' } }
    const fixture = mount(FormProbeComponent)
    const form = fixture.componentInstance.form
    const failure = new Error('Submission failed')
    await expect(
      form.handleSubmit(async () => {
        throw failure
      })(),
    ).rejects.toBe(failure)
    expect(form.isSubmitting()).toBe(false)
    expect(form.formState().submitCount).toBe(1)
  })
})

describe('useForm bonded provider default', () => {
  it('creates the controller from the bonded forms provider without forwarding the factory', () => {
    const native = createNativeFormProvider()
    let bondedCalls = 0
    let receivedKeys: string[] = []
    setProvider({
      createForm<T extends FormValuesConstraint<T>>(options: FormOptions<T>): FormController<T> {
        bondedCalls++
        receivedKeys = Object.keys(options)
        return native.createForm(options)
      },
    })
    activeFormOptions = { defaultValues: { email: 'reader@example.test' } }
    const fixture = mount(FormProbeComponent)

    expect(bondedCalls).toBe(1)
    expect(receivedKeys).toEqual(['defaultValues'])
    expect(fixture.componentInstance.form.getValue('email')).toBe('reader@example.test')
  })

  it('prefers an explicit createForm override over the bonded provider', () => {
    let bondedCalls = 0
    setProvider({
      createForm<T extends FormValuesConstraint<T>>(options: FormOptions<T>): FormController<T> {
        bondedCalls++
        return createNativeFormProvider().createForm(options)
      },
    })
    const native = createNativeFormProvider()
    let overrideCalls = 0
    const override = <T extends FormValuesConstraint<T>>(
      options: FormOptions<T>,
    ): FormController<T> => {
      overrideCalls++
      return native.createForm(options)
    }
    activeFormOptions = {
      createForm: override,
      defaultValues: { email: 'override@example.test' },
    }
    const fixture = mount(FormProbeComponent)

    expect(overrideCalls).toBe(1)
    expect(bondedCalls).toBe(0)
    expect(fixture.componentInstance.form.getValue('email')).toBe('override@example.test')
  })

  it('mounts, validates and submits through the bonded default', async () => {
    const onSubmit = vi.fn<(values: { name: string }) => void>()
    activeProfileSubmit = onSubmit
    const fixture = mount(ProfileFormComponent)
    const input = query<HTMLInputElement>(fixture, 'input[aria-label="Name"]')
    if (!input) throw new Error('no name input')
    fixture.componentInstance.form.register('name', { required: 'Name required' }).ref?.(input)

    expect(input.value).toBe('')
    expect(query(fixture, '[role="status"]')?.textContent).toBe('Clean')

    await submit(fixture, 'Profile')
    expect(onSubmit).not.toHaveBeenCalled()
    expect(document.activeElement).toBe(input)

    type(fixture, 'Name', 'Ada')
    expect(query(fixture, '[role="status"]')?.textContent).toBe('Dirty')
    await submit(fixture, 'Profile')
    expect(onSubmit).toHaveBeenCalledExactlyOnceWith({ name: 'Ada' })
    expect(input.value).toBe('Ada')
  })
})

describe('form subscription boundaries', () => {
  it('preserves provider validation flags instead of reconstructing them from form errors', () => {
    const form = createNativeFormProvider().createForm<PairValues>({
      defaultValues: { email: 'initial' },
    })
    const getFieldState = form.getFieldState.bind(form)
    const providerForm: FormController<PairValues> = {
      ...form,
      getFieldState: (name) => ({ ...getFieldState(name), validating: true }),
    }
    activeFieldSources = { form: signal(providerForm), name: signal<'email' | 'backup'>('email') }
    const fixture = mount(FieldStateProbeComponent)

    expect(fixture.componentInstance.field().validating).toBe(true)
    expect(fixture.componentInstance.field().dirty).toBe(false)
  })

  it('sees a controller update between render and subscription', () => {
    activeLateController = createNativeFormProvider().createForm<EmailValues>({
      defaultValues: { email: 'before' },
    })
    const fixture = mount(LateFieldComponent)

    expect(query(fixture, '[role="status"]')?.textContent).toBe('after')
  })

  it('watches cloned object values and switches field and controller without stale data', () => {
    const provider = providerWithClonedSnapshots()
    const first = provider.createForm<ObjectPair>({
      defaultValues: { left: { value: 1 }, right: { value: 2 } },
    })
    const second = provider.createForm<ObjectPair>({
      defaultValues: { left: { value: 3 }, right: { value: 4 } },
    })
    activeWatchSources = {
      form: signal(first),
      name: signal<'left' | 'right'>('left'),
    }
    const fixture = mount(WatchProbeComponent)
    const watched = fixture.componentInstance.watched
    const sources = requireWatchSources()

    expect(watched()).toEqual({ value: 1 })
    first.setValue('left', { value: 5 })
    expect(watched()).toEqual({ value: 5 })
    sources.name.set('right')
    fixture.detectChanges()
    expect(watched()).toEqual({ value: 2 })
    sources.form.set(second)
    fixture.detectChanges()
    expect(watched()).toEqual({ value: 4 })
    const selected = watched()
    first.setValue('right', { value: 6 })
    expect(watched()).toBe(selected)
  })
})
