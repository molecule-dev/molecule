// @vitest-environment jsdom
/**
 * ConfirmDialog names the dialog with its visible title: `aria-labelledby`
 * points at the rendered `<h2>`, so the accessible name resolves to the
 * title text (React parity; axe `aria-dialog-name`). A port of the a11y test
 * in `@molecule/app-ui-react/src/__tests__/confirm-dialog.test.tsx`, mounted
 * with real Vue like the prompt-dialog suites mount their components.
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

vi.mock('@molecule/app-vue', () => ({
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

vi.mock('@molecule/app-icons', () => ({
  getIcon: () => ({ viewBox: '0 0 20 20', fill: 'currentColor', paths: [{ d: 'M0 0h20v20H0z' }] }),
}))

import { within } from '@testing-library/dom'
import { type App, createApp, defineComponent, h } from 'vue'

const { ConfirmDialog } = await import('../components/ConfirmDialog.js')

const apps: App[] = []
const hosts: HTMLElement[] = []

afterEach(() => {
  for (const app of apps.splice(0)) app.unmount()
  for (const host of hosts.splice(0)) host.remove()
})

/** Mounts an open ConfirmDialog with the standard title/description. */
function mountDialog(): void {
  const host = document.createElement('div')
  document.body.appendChild(host)
  hosts.push(host)
  const app = createApp(
    defineComponent({
      render: () =>
        h(ConfirmDialog, {
          open: true,
          onClose: () => {},
          onConfirm: () => {},
          title: 'Delete account',
          description: 'This cannot be undone.',
        }),
    }),
  )
  apps.push(app)
  app.mount(host)
}

describe('ConfirmDialog', () => {
  it('names the dialog with its visible title', () => {
    mountDialog()
    // Modal teleports to document.body.
    const dialog = document.querySelector('[role="dialog"]') as HTMLElement
    expect(dialog).toBeTruthy()
    const heading = dialog.querySelector('h2') as HTMLHeadingElement
    expect(heading.id).not.toBe('')
    expect(dialog.getAttribute('aria-labelledby')).toBe(heading.id)
    expect(within(document.body).getByRole('dialog', { name: 'Delete account' })).toBe(dialog)
  })
})
