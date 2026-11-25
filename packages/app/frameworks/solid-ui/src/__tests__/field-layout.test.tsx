// @vitest-environment jsdom
/**
 * The Solid closed form controls use the shared field layout, and caller-owned props stay on the
 * native control. These titles mirror the React suite so the framework-conformance gate checks
 * the same behavioral contract in every kit.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it } from 'vitest'

import { fieldLayout, getClassMap } from '@molecule/app-ui'

import { FloatingInput, FormField, Input, Select, Textarea } from '../index.js'

/** A DOM element's classes as a sorted list, so token order never decides a comparison. */
const classesOf = (element: Element | null): string[] =>
  (element?.getAttribute('class') ?? '').split(/\s+/).filter(Boolean).sort()
const sorted = (classes: string): string[] => classes.split(/\s+/).filter(Boolean).sort()

const disposers: Array<() => void> = []

/** Mounts Solid JSX in a fresh host and records its disposer. */
function mount(view: () => JSX.Element): HTMLElement {
  const host = document.createElement('div')
  document.body.appendChild(host)
  disposers.push(render(view, host))
  return host
}

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
  document.body.innerHTML = ''
})

describe('closed form controls lay their wrappers out with the shared field layout', () => {
  it('Input: the outer wrapper takes root and the control row takes inner', () => {
    const host = mount(() => <Input label="Email" testId="email" />)
    const field = fieldLayout(getClassMap())
    const input = host.querySelector('[data-testid="email"]') as HTMLInputElement
    const row = input.parentElement as HTMLElement
    const root = row.parentElement as HTMLElement

    expect(classesOf(root)).toEqual(sorted(field.root))
    expect(classesOf(row)).toEqual(sorted(field.inner))
  })

  it('Select: the outer wrapper takes root and the control row takes inner', () => {
    const host = mount(() => (
      <Select label="Plan" options={[{ value: 'free', label: 'Free' }]} testId="plan" />
    ))
    const field = fieldLayout(getClassMap())
    const select = host.querySelector('[data-testid="plan"]') as HTMLSelectElement
    const row = select.parentElement as HTMLElement
    const root = row.parentElement as HTMLElement

    expect(classesOf(root)).toEqual(sorted(field.root))
    expect(classesOf(row)).toEqual(sorted(field.inner))
  })

  it('Textarea: the outer wrapper takes root and there is no control row', () => {
    const host = mount(() => <Textarea label="Notes" testId="notes" />)
    const field = fieldLayout(getClassMap())
    const textarea = host.querySelector('[data-testid="notes"]') as HTMLTextAreaElement
    const root = textarea.parentElement as HTMLElement

    expect(classesOf(root)).toEqual(sorted(field.root))
    expect(root.children).toHaveLength(2)
  })

  it('the class, style and test id of the caller stay on the control, never on a wrapper', () => {
    const host = mount(() => (
      <Input label="Email" className="caller-class" style={{ marginTop: '4px' }} testId="email" />
    ))
    const input = host.querySelector('[data-testid="email"]') as HTMLInputElement
    const row = input.parentElement as HTMLElement
    const root = row.parentElement as HTMLElement

    expect(input.classList.contains('caller-class')).toBe(true)
    expect(row.classList.contains('caller-class')).toBe(false)
    expect(root.classList.contains('caller-class')).toBe(false)
    expect(input.style.marginTop).toBe('4px')
    expect(row.getAttribute('style')).toBeNull()
    expect(root.getAttribute('style')).toBeNull()
  })
})

describe('wrappers that are not closed controls keep their own token', () => {
  it('FormField keeps the plain input wrapper, which takes arbitrary children', () => {
    const host = mount(() => (
      <FormField label="Name">
        <span>content</span>
      </FormField>
    ))
    const root = host.firstElementChild as HTMLElement
    const cm = getClassMap()

    expect(classesOf(root)).toContain(sorted(cm.inputWrapper)[0])
    expect(classesOf(root)).not.toContain('formFieldWrapper')
  })

  it('FloatingInput keeps its single wrapper: its label is positioned, not stacked', () => {
    const host = mount(() => <FloatingInput placeholder="Search" />)
    const input = host.querySelector('input') as HTMLInputElement
    const wrapper = input.parentElement as HTMLElement
    const cm = getClassMap()

    expect(classesOf(wrapper)).toEqual(sorted(cm.floatingInputWrapper))
    expect(classesOf(wrapper)).not.toContain('formFieldWrapper')
  })
})
