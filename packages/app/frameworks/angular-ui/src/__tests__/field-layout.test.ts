// @vitest-environment jsdom
/**
 * The closed form controls of this kit lay their wrappers out with the shared field layout
 * (`fieldLayout` from `@molecule/app-ui`), the way React's do: the host element and the control's
 * row are flex columns, so a control's own margin moves the control on every renderer.
 *
 * Rendered with the reference ClassMap the conformance kit bonds, so the classes are the real
 * ones and the assertion is the same `fieldLayout` call the components make.
 *
 * @module
 */

// Register Angular's JIT compiler facade before any @Component class loads.
import '@angular/compiler'
// Bond the reference ClassMap and icon set before the components load.
import '@molecule/app-framework-conformance/ui/setup'
import {
  type ApplicationRef,
  ChangeDetectionStrategy,
  Component,
  type ComponentRef,
  createComponent,
  provideZonelessChangeDetection,
  type Type,
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'
import { afterEach, describe, expect, it } from 'vitest'

import { provideDomPlacement } from '@molecule/app-angular'
import { fieldLayout, getClassMap } from '@molecule/app-ui'

import {
  FloatingInput,
  FormField,
  Input,
  MoleculeInput,
  MoleculeSelect,
  Select,
  Textarea,
} from '../index.js'

/** A class string as a sorted list of its tokens, so the DOM's own order never decides. */
const classesOf = (element: Element | null): string[] =>
  (element?.getAttribute('class') ?? '').split(/\s+/).filter(Boolean).sort()
const sorted = (classes: string): string[] => classes.split(/\s+/).filter(Boolean).sort()

/** Every application a test mounted, torn down after it. */
const applications: ApplicationRef[] = []

afterEach(() => {
  for (const app of applications.splice(0)) app.destroy()
  document.body.innerHTML = ''
})

/**
 * Mounts a host component carrying the template; the props are fields on it.
 *
 * @param template - The host template, written as an app writes the components.
 * @param imports - The standalone components the template uses.
 * @param props - Fields the template reads.
 * @returns The element the host rendered into.
 */
async function mount(
  template: string,
  imports: Type<unknown>[],
  props: Record<string, unknown> = {},
): Promise<HTMLElement> {
  const Host = Component({
    changeDetection: ChangeDetectionStrategy.Eager,
    selector: 'div[data-field-layout-host]',
    standalone: true,
    imports,
    template,
  })(class FieldLayoutHost {})
  const app = await createApplication({
    providers: [provideZonelessChangeDetection(), provideDomPlacement()],
  })
  applications.push(app)
  const ref: ComponentRef<Record<string, unknown>> = createComponent(Host, {
    environmentInjector: app.injector,
  })
  Object.assign(ref.instance, props)
  const root = ref.location.nativeElement as HTMLElement
  document.body.appendChild(root)
  app.attachView(ref.hostView)
  app.tick()
  return root
}

describe('closed form controls lay their wrappers out with the shared field layout', () => {
  it('Input: the outer wrapper takes root and the control row takes inner', async () => {
    const root = await mount('<div mol-input label="Email"></div>', [Input])
    const field = fieldLayout(getClassMap())
    const host = root.firstElementChild as HTMLElement
    const row = host.querySelector('input')?.parentElement as HTMLElement

    expect(host.matches('div[mol-input]')).toBe(true)
    // The host holds the label, the control's row and the message.
    expect(host.children).toHaveLength(2)
    expect(host.firstElementChild?.tagName).toBe('LABEL')
    expect(classesOf(host)).toEqual(sorted(field.root))
    expect(classesOf(row)).toEqual(sorted(field.inner))
  })

  it('Select: the outer wrapper takes root and the control row takes inner', async () => {
    const root = await mount('<div mol-select label="Plan" [options]="options"></div>', [Select], {
      options: [{ value: 'free', label: 'Free' }],
    })
    const field = fieldLayout(getClassMap())
    const host = root.firstElementChild as HTMLElement
    const row = host.querySelector('select')?.parentElement as HTMLElement

    expect(host.matches('div[mol-select]')).toBe(true)
    expect(host.firstElementChild?.tagName).toBe('LABEL')
    expect(classesOf(host)).toEqual(sorted(field.root))
    expect(classesOf(row)).toEqual(sorted(field.inner))
  })

  it('Textarea: the outer wrapper takes root and there is no control row', async () => {
    const root = await mount('<div mol-textarea label="Notes"></div>', [Textarea])
    const field = fieldLayout(getClassMap())
    const host = root.firstElementChild as HTMLElement

    expect(host.matches('div[mol-textarea]')).toBe(true)
    expect(host.children).toHaveLength(2)
    expect(host.firstElementChild?.tagName).toBe('LABEL')
    expect(host.children[1]?.tagName).toBe('TEXTAREA')
    expect(classesOf(host)).toEqual(sorted(field.root))
  })

  it('the class, style and test id of the caller stay on the control, never on a wrapper', async () => {
    const root = await mount(
      '<div mol-input label="Email" [className]="callerClass" [style]="style" testId="email"></div>',
      [Input],
      { callerClass: 'caller-class', style: { marginTop: '4px' } },
    )
    const input = root.querySelector('[data-testid="email"]') as HTMLInputElement
    const row = input.parentElement as HTMLElement
    const outer = row.parentElement as HTMLElement

    expect(input.classList.contains('caller-class')).toBe(true)
    expect(row.classList.contains('caller-class')).toBe(false)
    expect(outer.classList.contains('caller-class')).toBe(false)
    expect(input.style.marginTop).toBe('4px')
    expect(row.getAttribute('style')).toBeNull()
    expect(outer.getAttribute('style')).toBeNull()
  })

  it('the deprecated mol-input and mol-select take the same layout', async () => {
    const field = fieldLayout(getClassMap())
    // These hosts are the custom element itself; their template holds the two wrappers.
    const inputRoot = await mount('<mol-input label="Email"></mol-input>', [MoleculeInput])
    const inputOuter = inputRoot.querySelector('mol-input > div') as HTMLElement
    const inputRow = inputOuter.querySelector('input')?.parentElement as HTMLElement
    const selectRoot = await mount(
      '<mol-select label="Plan" [options]="options"></mol-select>',
      [MoleculeSelect],
      { options: [{ value: 'free', label: 'Free' }] },
    )
    const selectOuter = selectRoot.querySelector('mol-select > div') as HTMLElement
    const selectRow = selectOuter.querySelector('select')?.parentElement as HTMLElement

    expect(classesOf(inputOuter)).toEqual(sorted(field.root))
    expect(classesOf(inputRow)).toEqual(sorted(field.inner))
    expect(classesOf(selectOuter)).toEqual(sorted(field.root))
    expect(classesOf(selectRow)).toEqual(sorted(field.inner))
  })
})

describe('wrappers that are not closed controls keep their own classes', () => {
  it('FormField keeps the plain input wrapper, which takes arbitrary children', async () => {
    const root = await mount('<div mol-form-field label="Name"><div mol-input></div></div>', [
      FormField,
      Input,
    ])
    const cm = getClassMap()
    const fieldRoot = root.firstElementChild as HTMLElement
    const inputHost = fieldRoot.querySelector('div[mol-input]') as HTMLElement

    for (const token of sorted(cm.inputWrapper)) expect(classesOf(fieldRoot)).toContain(token)
    for (const token of sorted(cm.formFieldWrapper))
      expect(classesOf(fieldRoot)).not.toContain(token)
    // The Input inside still has the layout.
    expect(classesOf(inputHost)).toEqual(sorted(fieldLayout(cm).root))
  })

  it('FloatingInput keeps its single wrapper: its label is positioned, not stacked', async () => {
    const root = await mount('<span mol-floating-input placeholder="Search"></span>', [
      FloatingInput,
    ])
    const cm = getClassMap()
    const host = root.firstElementChild as HTMLElement

    expect(host.matches('span[mol-floating-input]')).toBe(true)
    expect(classesOf(host)).toEqual(sorted(cm.floatingInputWrapper))
    for (const token of sorted(cm.formFieldWrapper)) expect(classesOf(host)).not.toContain(token)
  })
})
