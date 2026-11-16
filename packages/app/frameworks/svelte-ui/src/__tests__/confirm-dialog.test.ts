// @vitest-environment jsdom
/**
 * ConfirmDialog names the dialog with its visible title: `aria-labelledby`
 * points at the rendered `<h2>`, so the accessible name resolves to the
 * title text (React parity; axe `aria-dialog-name`). A port of the a11y test
 * in `@molecule/app-ui-react/src/__tests__/confirm-dialog.test.tsx`, mounted
 * with real Svelte like the prompt-dialog suite mounts its component.
 *
 * @module
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

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
        const fn = (..._args: unknown[]) => token
        fn.toString = () => token
        return fn
      },
    }
    return new Proxy({}, handler)
  },
}))

vi.mock('@molecule/app-svelte', () => ({
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

vi.mock('@molecule/app-icons', () => ({
  getIcon: () => ({ viewBox: '0 0 20 20', fill: 'currentColor', paths: [{ d: 'M0 0h20v20H0z' }] }),
}))

import { within } from '@testing-library/dom'
import { type Component, mount, unmount } from 'svelte'

const { default: ConfirmDialog } = await import('../components/ConfirmDialog.svelte')

const mounted: Array<ReturnType<typeof mount>> = []
const hosts: HTMLElement[] = []

afterEach(() => {
  for (const instance of mounted.splice(0)) unmount(instance)
  for (const host of hosts.splice(0)) host.remove()
})

/** Mounts an open ConfirmDialog and returns its dialog element. */
function mountDialog(): HTMLElement {
  const host = document.createElement('div')
  document.body.appendChild(host)
  hosts.push(host)
  mounted.push(
    mount(
      ConfirmDialog as Component<{
        open: boolean
        onClose: () => void
        onConfirm: () => void
        title: string
        description: string
      }>,
      {
        target: host,
        props: {
          open: true,
          onClose: () => {},
          onConfirm: () => {},
          title: 'Delete account',
          description: 'This cannot be undone.',
        },
      },
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
