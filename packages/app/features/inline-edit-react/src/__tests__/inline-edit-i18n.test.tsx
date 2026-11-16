// @vitest-environment jsdom

/**
 * The editor field's accessible label goes through i18n.
 *
 * The label used to be a plain-English fallback (`placeholder ?? 'Edit'`) on a
 * string the read state never renders, so the pseudo-locale check — which
 * records a family's first case only — could not see it. This suite mocks the
 * i18n binding the way the bonded provider behaves (every key maps to a marked
 * string) and asserts the label is the marked key, not English, and that an
 * explicit `placeholder` still wins.
 *
 * @module
 */

import { act, createElement, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { InlineEditProps } from '../InlineEdit.js'

// Class tokens echo their own name, so a class assertion names the token.
vi.mock('@molecule/app-ui', () => ({
  getClassMap: () =>
    new Proxy(
      {},
      {
        get: (_t, prop) =>
          prop === 'cn'
            ? (...cls: unknown[]) =>
                cls
                  .flat(Infinity)
                  .map((c) => (typeof c === 'function' ? c() : c))
                  .filter((c) => typeof c === 'string' && c.length > 0)
                  .join(' ')
            : () => String(prop),
      },
    ),
}))
// Translations the bonded i18n provider would supply: each key maps to a marked string, so a
// default that bypassed t() would show up as plain English.
vi.mock('@molecule/app-react', () => ({
  useTranslation: () => ({ t: (key: string) => `«${key}»` }),
}))
vi.mock('@molecule/app-ui-react', () => ({
  Button: ({ children }: { children?: ReactNode }) =>
    createElement('button', { 'data-button': '' }, children),
  Input: ({ 'aria-label': label }: { 'aria-label'?: string }) =>
    createElement('input', { 'data-input': '', 'aria-label': label }),
  Textarea: ({ 'aria-label': label }: { 'aria-label'?: string }) =>
    createElement('textarea', { 'data-textarea': '', 'aria-label': label }),
}))

const { InlineEdit } = await import('../InlineEdit.js')

let root: Root | null = null
let host: HTMLElement | null = null

afterEach(async () => {
  if (root) await act(async () => root?.unmount())
  host?.remove()
  root = null
  host = null
})

/**
 * Mounts the editor in jsdom.
 *
 * @param props - Props over the component.
 * @returns The container the component rendered into.
 */
async function mount(props: Omit<InlineEditProps, 'onSubmit'>): Promise<HTMLElement> {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  await act(async () => {
    root?.render(createElement(InlineEdit, { onSubmit: () => {}, ...props }))
  })
  return host
}

/**
 * Opens the editor the way a user does: a click on the read state.
 *
 * @param container - The container the component rendered into.
 */
async function openEditor(container: HTMLElement): Promise<void> {
  const trigger = container.querySelector('[role="button"]')
  if (!trigger) throw new Error('no read-state trigger rendered')
  await act(async () => {
    trigger.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
}

describe('InlineEdit i18n label', () => {
  it('labels the editor field through i18n by default', async () => {
    const container = await mount({ value: 'Hello world' })
    await openEditor(container)
    expect(container.querySelector('input')?.getAttribute('aria-label')).toBe(
      '«inlineEdit.aria.edit»',
    )
  })

  it('labels the textarea editor through i18n by default', async () => {
    const container = await mount({ value: 'Some text', variant: 'textarea' })
    await openEditor(container)
    expect(container.querySelector('textarea')?.getAttribute('aria-label')).toBe(
      '«inlineEdit.aria.edit»',
    )
  })

  it('keeps an explicit placeholder as the field label', async () => {
    const container = await mount({ value: 'Hello world', placeholder: 'Add a title' })
    await openEditor(container)
    expect(container.querySelector('input')?.getAttribute('aria-label')).toBe('Add a title')
  })
})
