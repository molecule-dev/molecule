// @vitest-environment jsdom
/**
 * The closed form controls lay their wrappers out with the shared field layout
 * (`fieldLayout` from `@molecule/app-ui`), and keep a caller's own props on the control.
 *
 * Runs against the real `@molecule/app-ui` bonds with a ClassMap that answers each token with
 * its own name, so a wrapper's classes read as the tokens that produced them.
 *
 * @module
 */

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { IconData, IconSet } from '@molecule/app-icons'
import { setIconSet } from '@molecule/app-icons'
import type { ClassMapValue, UIClassMap } from '@molecule/app-ui'
import { fieldLayout, getClassMap, setClassMap } from '@molecule/app-ui'

import { FloatingInput, FormField, Input, Select, Textarea } from '../index.js'

/** The ClassMap members the components call; every other member is a plain token. */
const RESOLVERS = new Set(['input', 'label', 'select', 'sp', 'textarea'])

/** A ClassMap that answers each token with its own name and joins what it is given. */
const tokenClassMap = new Proxy(
  {},
  {
    get: (_target, prop) => {
      if (typeof prop !== 'string') return undefined
      if (prop === 'cn') {
        return (...classes: ClassMapValue[]): string =>
          classes
            .filter((value): value is string => typeof value === 'string' && value.length > 0)
            .join(' ')
      }
      return RESOLVERS.has(prop) ? () => prop : prop
    },
  },
) as UIClassMap

/** One outlined glyph for each name a control draws (the select chevron, the clear button). */
const glyph: IconData = {
  paths: [{ d: 'M6 9l6 6 6-6' }],
  viewBox: '0 0 24 24',
  stroke: 'currentColor',
  strokeWidth: 2,
}
const iconSet: IconSet = { 'chevron-down': glyph, 'x-mark': glyph }

/** A class that would show on a wrapper if the caller's own class moved off the control. */
const CALLER_CLASS = 'caller-class'

/** An element's classes as a sorted list, so token order never decides a comparison. */
const classesOf = (element: Element): string[] =>
  element.className.split(/\s+/).filter(Boolean).sort()

/** A space-separated class string as a sorted list. */
const sorted = (classes: string): string[] => classes.split(/\s+/).filter(Boolean).sort()

beforeEach(() => {
  setClassMap(tokenClassMap)
  setIconSet(iconSet)
})

afterEach(cleanup)

describe('closed form controls lay their wrappers out with the shared field layout', () => {
  it('Input: the outer wrapper takes root and the control row takes inner', () => {
    render(
      <Input
        label="Email"
        className={CALLER_CLASS}
        style={{ marginTop: 4 }}
        testId="email"
        leftElement={<span>@</span>}
      />,
    )
    const field = fieldLayout(getClassMap())
    const input = screen.getByTestId('email')
    const row = input.parentElement as HTMLElement
    const root = row.parentElement as HTMLElement

    // The outer column holds the label and the control's row; the row holds the adornment
    // and the control.
    expect(root.tagName).toBe('DIV')
    expect(root.children).toHaveLength(2)
    expect(root.firstElementChild?.tagName).toBe('LABEL')
    expect(row.tagName).toBe('DIV')
    expect(row.children).toHaveLength(2)
    expect(row.firstElementChild?.tagName).toBe('DIV')
    expect(classesOf(root)).toEqual(sorted(field.root))
    expect(classesOf(row)).toEqual(sorted(field.inner))
  })

  it('Select: the outer wrapper takes root and the control row takes inner', () => {
    render(
      <Select
        label="Plan"
        options={[{ value: 'free', label: 'Free' }]}
        className={CALLER_CLASS}
        testId="plan"
      />,
    )
    const field = fieldLayout(getClassMap())
    const select = screen.getByTestId('plan')
    const row = select.parentElement as HTMLElement
    const root = row.parentElement as HTMLElement

    expect(root.tagName).toBe('DIV')
    expect(root.firstElementChild?.tagName).toBe('LABEL')
    expect(row.tagName).toBe('DIV')
    // The row holds the control and its chevron.
    expect(row.children).toHaveLength(2)
    expect(classesOf(root)).toEqual(sorted(field.root))
    expect(classesOf(row)).toEqual(sorted(field.inner))
  })

  it('Textarea: the outer wrapper takes root and there is no control row', () => {
    render(<Textarea label="Notes" className={CALLER_CLASS} testId="notes" />)
    const field = fieldLayout(getClassMap())
    const textarea = screen.getByTestId('notes')
    const root = textarea.parentElement as HTMLElement

    expect(root.tagName).toBe('DIV')
    expect(root.children).toHaveLength(2)
    expect(root.firstElementChild?.tagName).toBe('LABEL')
    expect(classesOf(root)).toEqual(sorted(field.root))
  })

  it('the class, style and test id of the caller stay on the control, never on a wrapper', () => {
    render(
      <Input
        label="Email"
        className={CALLER_CLASS}
        style={{ marginTop: 4 }}
        testId="email"
        leftElement={<span>@</span>}
      />,
    )
    const input = screen.getByTestId('email')
    const row = input.parentElement as HTMLElement
    const root = row.parentElement as HTMLElement

    expect(input.classList.contains(CALLER_CLASS)).toBe(true)
    expect(row.classList.contains(CALLER_CLASS)).toBe(false)
    expect(root.classList.contains(CALLER_CLASS)).toBe(false)
    expect(input.style.marginTop).toBe('4px')
    expect(row.getAttribute('style')).toBeNull()
    expect(root.getAttribute('style')).toBeNull()
  })
})

describe('wrappers that are not closed controls keep their own token', () => {
  it('FormField keeps the plain input wrapper, which takes arbitrary children', () => {
    render(
      <FormField label="Name">
        <Input testId="name" />
      </FormField>,
    )
    const input = screen.getByTestId('name')
    const controlRow = input.parentElement as HTMLElement
    const controlRoot = controlRow.parentElement as HTMLElement
    const fieldRoot = controlRoot.parentElement as HTMLElement

    expect(classesOf(fieldRoot)).toContain('inputWrapper')
    expect(classesOf(fieldRoot)).not.toContain('formFieldWrapper')
    // The Input inside still has the layout.
    expect(classesOf(controlRoot)).toEqual(sorted(fieldLayout(getClassMap()).root))
  })

  it('FloatingInput keeps its single wrapper: its label is positioned, not stacked', () => {
    render(<FloatingInput placeholder="Search" className={CALLER_CLASS} testId="search" />)
    const input = screen.getByTestId('search')
    const wrapper = input.parentElement as HTMLElement

    expect(wrapper.tagName).toBe('SPAN')
    expect(classesOf(wrapper)).toContain('floatingInputWrapper')
    expect(classesOf(wrapper)).not.toContain('formFieldWrapper')
    expect(input.classList.contains(CALLER_CLASS)).toBe(true)
  })
})
