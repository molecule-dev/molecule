/**
 * `<InlineEdit>` draft resets: a new `value` prop replaces the draft in the same
 * commit (adjusted during render), while an unchanged prop leaves a typed draft
 * alone.
 *
 * @module
 */

// @vitest-environment jsdom

import { fireEvent, render } from '@testing-library/react'
import type { ChangeEvent, ReactNode, Ref } from 'react'
import { createElement } from 'react'
import { describe, expect, it, vi } from 'vitest'

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

vi.mock('@molecule/app-react', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

vi.mock('@molecule/app-ui-react', () => ({
  Button: ({ children }: { children?: ReactNode }) => createElement('button', {}, children),
  Input: ({
    ref,
    value,
    onChange,
  }: {
    ref?: Ref<HTMLInputElement>
    value?: string
    onChange?: (event: ChangeEvent<HTMLInputElement>) => void
  }) => createElement('input', { ref, 'data-input': '', value, onChange }),
  Textarea: ({
    ref,
    value,
    onChange,
  }: {
    ref?: Ref<HTMLTextAreaElement>
    value?: string
    onChange?: (event: ChangeEvent<HTMLTextAreaElement>) => void
  }) => createElement('textarea', { ref, 'data-textarea': '', value, onChange }),
}))

const { InlineEdit } = await import('../InlineEdit.js')

/**
 * The mounted editor input.
 *
 * @param container - Render container.
 * @returns The editor input element.
 */
function editor(container: HTMLElement): HTMLInputElement {
  return container.querySelector('[data-input]') as HTMLInputElement
}

describe('<InlineEdit> draft reset', () => {
  it('shows a new value prop in the same commit as the prop change', () => {
    const { container, rerender } = render(
      createElement(InlineEdit, { value: 'alpha', onSubmit: () => {} }),
    )
    fireEvent.click(container.querySelector('[role="button"]')!)
    expect(editor(container).value).toBe('alpha')
    fireEvent.change(editor(container), { target: { value: 'typed' } })
    expect(editor(container).value).toBe('typed')
    rerender(createElement(InlineEdit, { value: 'beta', onSubmit: () => {} }))
    expect(editor(container).value).toBe('beta')
  })

  it('keeps a typed draft when the value prop is unchanged', () => {
    const { container, rerender } = render(
      createElement(InlineEdit, { value: 'alpha', onSubmit: () => {} }),
    )
    fireEvent.click(container.querySelector('[role="button"]')!)
    fireEvent.change(editor(container), { target: { value: 'typed' } })
    rerender(createElement(InlineEdit, { value: 'alpha', onSubmit: () => {} }))
    expect(editor(container).value).toBe('typed')
  })
})
