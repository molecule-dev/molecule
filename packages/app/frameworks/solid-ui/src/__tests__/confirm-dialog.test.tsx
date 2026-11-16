// @vitest-environment jsdom
/**
 * ConfirmDialog names the dialog with its visible title: `aria-labelledby`
 * points at the rendered `<h2>`, so the accessible name resolves to the
 * title text (React parity; axe `aria-dialog-name`). A port of the a11y test
 * in `@molecule/app-ui-react/src/__tests__/confirm-dialog.test.tsx`, mounted
 * with real Solid like the prompt-dialog suite mounts its component.
 *
 * @module
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => {
    const CALLABLE = new Set(['modal', 'stack', 'flex', 'sp', 'textSize', 'fontWeight', 'button'])
    const handler: ProxyHandler<Record<string, unknown>> = {
      get(_t, prop) {
        if (prop === 'cn') {
          return (...cls: unknown[]) =>
            cls
              .flat(Infinity)
              .filter((c) => typeof c === 'string' && c.length > 0)
              .join(' ')
        }
        if (typeof prop === 'string' && CALLABLE.has(prop)) {
          return () => prop
        }
        return String(prop)
      },
    }
    return new Proxy({}, handler)
  },
}))

vi.mock('@molecule/app-solid', () => ({
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

vi.mock('@molecule/app-icons', () => ({
  getIcon: () => ({ viewBox: '0 0 20 20', fill: 'currentColor', paths: [{ d: 'M0 0h20v20H0z' }] }),
}))

import { within } from '@testing-library/dom'
import { render } from 'solid-js/web'

const { ConfirmDialog } = await import('../components/ConfirmDialog.jsx')

const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
  document.body.innerHTML = ''
})

/** Mounts an open ConfirmDialog and returns its dialog element. */
function mountDialog(): HTMLElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(
    render(
      () => (
        <ConfirmDialog
          open
          onClose={() => {}}
          onConfirm={() => {}}
          title="Delete account"
          description="This cannot be undone."
        />
      ),
      container,
    ),
  )
  return document.querySelector('[role="dialog"]') as HTMLElement
}

describe('ConfirmDialog', () => {
  it('names the dialog with its visible title', () => {
    const dialog = mountDialog()
    expect(dialog).toBeTruthy()
    const heading = dialog.querySelector('h2') as HTMLHeadingElement
    expect(heading.id).not.toBe('')
    expect(dialog.getAttribute('aria-labelledby')).toBe(heading.id)
    expect(within(document.body).getByRole('dialog', { name: 'Delete account' })).toBe(dialog)
  })
})
