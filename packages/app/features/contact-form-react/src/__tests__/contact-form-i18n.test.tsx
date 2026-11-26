// @vitest-environment jsdom
/**
 * Every string ContactForm writes itself goes through i18n. The bonded
 * provider's `t` is mocked to a marker (`«key»`), so a label that bypassed
 * `t()` would show up as plain English (the same probe the conformance kit
 * runs against the recorded goldens after a switch to `en-XA`).
 *
 * @module
 */

import { cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { createElement } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

// Class tokens echo their own name; `cn` joins the strings it is given.
vi.mock('@molecule/app-ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
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
// Translations the bonded i18n provider would supply: each key maps to a marked
// string, so a default that bypassed t() would show up as plain English.
vi.mock('@molecule/app-react', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({ t: (key: string) => `«${key}»` }),
}))
vi.mock('@molecule/app-ui-react', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  Button: ({ children, disabled }: { children?: ReactNode; disabled?: boolean }) =>
    createElement('button', { type: 'submit', disabled }, children),
  Input: (props: Record<string, unknown>) => createElement('input', { ...props }),
  Textarea: (props: Record<string, unknown>) => createElement('textarea', { ...props }),
}))

const { ContactForm } = await import('../ContactForm.js')

afterEach(() => {
  cleanup()
})

describe('ContactForm i18n', () => {
  it('takes the field labels through i18n by default', () => {
    const { container } = render(createElement(ContactForm, { onSubmit: () => {} }))
    expect(container.querySelector('input[type="text"]')?.getAttribute('aria-label')).toBe(
      '«contactForm.label.name»',
    )
    expect(container.querySelector('input[type="email"]')?.getAttribute('aria-label')).toBe(
      '«contactForm.label.email»',
    )
    expect(container.querySelector('textarea')?.getAttribute('aria-label')).toBe(
      '«contactForm.label.message»',
    )
  })

  it('takes the non-Error submit fallback through i18n by default', async () => {
    // The fallback renders only when `onSubmit` throws something that is not an
    // `Error` (a rejected `Error` shows its own `.message` verbatim).
    const { container } = render(
      createElement(ContactForm, { onSubmit: () => Promise.reject('boom') }),
    )
    fireEvent.submit(container.querySelector('form')!)
    await waitFor(() => {
      expect(container.querySelector('form')?.textContent).toContain(
        '«contactForm.error.submissionFailed»',
      )
    })
  })
})
