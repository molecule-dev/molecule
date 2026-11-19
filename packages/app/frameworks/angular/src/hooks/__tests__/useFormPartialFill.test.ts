// @vitest-environment jsdom

/**
 * `useForm` incremental fills — independent loaded fields via `asState`'s fill,
 * in Angular's idiom: the component's mount hook delivers the fields the way
 * React's mount effect does.
 *
 * @module
 */

import '@angular/compiler'
import { Component, provideZonelessChangeDetection } from '@angular/core'
import { type ComponentFixture, TestBed } from '@angular/core/testing'
import { platformBrowser } from '@angular/platform-browser'
import { BrowserTestingModule } from '@angular/platform-browser/testing'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

import type { UseFormResult } from '../use-forms.js'
import { useForm } from '../use-forms.js'

/** The three-field editor React's partial-fill tests drive. */
interface EditorValues {
  name: string
  description: string
  notes: string
}

/** The account editor whose fields load one at a time. */
interface AccountValues {
  name: string
  email: string
  bio: string
}

/**
 * The multi-field editor: a field is filled once per load, in the mount hook,
 * the way React's mount effect fills them.
 */
@Component({
  selector: 'app-test-inventory-editor',
  template: `
    <output data-testid="name">{{ form.getValue('name') }}</output>
    <output data-testid="description">{{ form.getValue('description') }}</output>
    <output data-testid="notes">{{ form.getValue('notes') }}</output>
  `,
})
class InventoryEditorComponent {
  readonly form: UseFormResult<EditorValues> = useForm<EditorValues>({
    defaultValues: { name: '', description: '', notes: '' },
  })

  /** Delivers the loaded fields once, after the form exists. */
  ngOnInit(): void {
    this.form.asState('name')[2]('Loaded item')
    this.form.asState('description')[2]('Loaded description')
    this.form.asState('notes')[2]('Loaded notes')
  }
}

/** The account editor driven through the hook directly. */
@Component({ selector: 'app-test-account-editor', template: '' })
class AccountEditorComponent {
  readonly form: UseFormResult<AccountValues> = useForm<AccountValues>({
    defaultValues: { name: '', email: '', bio: '' },
  })
}

/** The two-field editor whose whole record is replaced. */
@Component({ selector: 'app-test-record-editor', template: '' })
class RecordEditorComponent {
  readonly form: UseFormResult<{ name: string; email: string }> = useForm<{
    name: string
    email: string
  }>({ defaultValues: { name: '', email: '' } })
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
 * One element's text content.
 *
 * @param fixture - The mounted probe.
 * @param testId - The element's `data-testid`.
 * @returns The text, or `null` when the element is absent.
 */
function textOf(fixture: ComponentFixture<unknown>, testId: string): string | null {
  const element = fixture.nativeElement.querySelector(
    `[data-testid="${testId}"]`,
  ) as HTMLElement | null
  return element ? element.textContent : null
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

describe('independent loaded form fields', () => {
  it('fills a multi-field editor without clearing earlier pristine fields', () => {
    const fixture = mount(InventoryEditorComponent)

    expect(textOf(fixture, 'name')).toBe('Loaded item')
    expect(textOf(fixture, 'description')).toBe('Loaded description')
    expect(textOf(fixture, 'notes')).toBe('Loaded notes')
  })

  it('preserves edits as other fields arrive and reset restores every loaded baseline', () => {
    const form = mount(AccountEditorComponent).componentInstance.form

    form.asState('name')[2]('Saved name')
    form.asState('name')[1]('Typed name')
    form.asState('email')[2]('saved@example.test')
    form.asState('bio')[2]('Loaded biography')
    expect(form.formState().values).toEqual({
      name: 'Typed name',
      email: 'saved@example.test',
      bio: 'Loaded biography',
    })

    form.reset()

    expect(form.formState().values).toEqual({
      name: 'Saved name',
      email: 'saved@example.test',
      bio: 'Loaded biography',
    })
    expect(form.isDirty()).toBe(false)
  })

  it('whole-record replacements still reset omitted pristine fields', () => {
    const form = mount(RecordEditorComponent).componentInstance.form

    form.asState()[2]({ name: 'First', email: 'first@example.test' })
    form.asState()[2]({ name: 'Second' })

    expect(form.formState().values).toEqual({ name: 'Second', email: '' })
  })
})
