// @vitest-environment jsdom
/**
 * The Solid `InlineEdit`'s editor field label goes through i18n — a port of
 * `@molecule/app-inline-edit-react`'s `inline-edit-i18n.test.tsx`: the same
 * test names and behavioral assertions, rendered with Solid in jsdom.
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

import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { InlineEditProps } from '../types.js'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `cursorPointer`), so tests can assert which cm.* class was applied without a
// real bond — the same mock the React tests use.
vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => {
    const handler: ProxyHandler<Record<string, unknown>> = {
      get(_t, prop) {
        if (prop === 'cn') {
          return (...cls: unknown[]) =>
            cls
              .flat(Infinity)
              .map((c) => (typeof c === 'function' ? c() : c))
              .filter((c) => typeof c === 'string' && c.length > 0)
              .join(' ')
        }
        const token = String(prop)
        return (..._args: unknown[]) => token
      },
    }
    return new Proxy({}, handler)
  },
}))

// Translations the bonded i18n provider would supply: each key maps to a marked string, so a
// default that bypassed t() would show up as plain English.
vi.mock('@molecule/app-solid', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({ t: (key: string) => `«${key}»` }),
}))

// The same markers the React suite's UI mocks render.
vi.mock('@molecule/app-ui-solid', () => ({
  Button: (props: { children?: JSX.Element }) => <button data-button="">{props.children}</button>,
  Input: (props: { 'aria-label'?: string }) => (
    <input data-input="" aria-label={props['aria-label']} />
  ),
  Textarea: (props: { 'aria-label'?: string }) => (
    <textarea data-textarea="" aria-label={props['aria-label']} />
  ),
}))

const { InlineEdit } = await import('../InlineEdit.jsx')

const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
  document.body.innerHTML = ''
})

/**
 * Mounts an {@link InlineEdit}, opens the editor the way a user does (a click
 * on the read state), and returns the host markup once the editor is open.
 *
 * @param props - Props over the component.
 * @returns The container's markup with the editor open.
 */
const openEditor = (props: InlineEditProps): string => {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(render(() => <InlineEdit {...props} />, container))
  const trigger = container.querySelector('[role="button"]')
  if (!trigger) throw new Error('no read-state trigger rendered')
  trigger.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  // Solid applies the signal update synchronously inside the dispatched event.
  return container.innerHTML
}

describe('InlineEdit i18n label', () => {
  it('labels the editor field through i18n by default', () => {
    const markup = openEditor({ value: 'Hello world', onSubmit: () => {} })
    expect(markup).toContain('aria-label="«inlineEdit.aria.edit»"')
  })

  it('labels the textarea editor through i18n by default', () => {
    const markup = openEditor({ value: 'Some text', variant: 'textarea', onSubmit: () => {} })
    expect(markup).toContain('aria-label="«inlineEdit.aria.edit»"')
  })

  it('keeps an explicit placeholder as the field label', () => {
    const markup = openEditor({
      value: 'Hello world',
      placeholder: 'Add a title',
      onSubmit: () => {},
    })
    expect(markup).toContain('aria-label="Add a title"')
    expect(markup).not.toContain('«inlineEdit.aria.edit»')
  })
})
