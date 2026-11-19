// @vitest-environment jsdom
/**
 * Render tests for the Modal close-button placement — Vue port of
 * `@molecule/app-ui-react/src/__tests__/modal-close-floating.test.tsx`: with
 * a `title` the X shares the header row (`dialogClose`); WITHOUT a title
 * there must be no full-width header band at all — the X floats over the
 * top-right corner (`dialogCloseFloating`) so it doesn't push the body
 * content down.
 *
 * @module
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { type App, createApp, h } from 'vue'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'

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
        // Modal calls `cm.modal({ size })`; every other token is read as a
        // plain string (`class: cm.dialogCloseFloating`), so return the token
        // name directly — a callable there would break the class value.
        if (prop === 'modal') {
          return (..._args: unknown[]) => 'modal'
        }
        return String(prop)
      },
    }
    return new Proxy({}, handler)
  },
}))

vi.mock('@molecule/app-icons', () => ({
  getIcon: () => ({ viewBox: '0 0 20 20', paths: [{ d: 'M0 0h20v20H0z' }] }),
}))

// Modal reads `t` through `useTranslation()` (the bonded provider), so it gets
// a REAL provider instead of a static-`t` stub. No translations are
// registered: every label falls back to its own `defaultValue`.
setProvider(createSimpleI18nProvider())

const { Modal } = await import('../components/Modal.js')

const closeButton = (): HTMLElement | null =>
  document.body.querySelector<HTMLElement>('[data-mol-id="modal-close"]')

const apps: App[] = []

/**
 * Mounts a render function into a fresh host (the Modal teleports to body).
 *
 * @param render - The component render.
 */
function mount(render: () => unknown): void {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp({ render })
  apps.push(app)
  app.mount(host)
}

afterEach(() => {
  for (const app of apps.splice(0)) app.unmount()
  document.body.innerHTML = ''
})

describe('Modal close-button placement', () => {
  it('without a title: the X floats top-right and NO header band renders', () => {
    mount(() => h(Modal, { open: true, onClose: vi.fn() }, { default: () => 'body' }))
    expect(closeButton()?.className).toContain('dialogCloseFloating')
    expect(document.body.querySelector('.dialogHeader')).toBeNull()
  })

  it('with a title: the X shares the header row, not the floating overlay', () => {
    mount(() =>
      h(Modal, { open: true, onClose: vi.fn(), title: 'Settings' }, { default: () => 'body' }),
    )
    const header = document.body.querySelector('.dialogHeader')
    expect(header).not.toBeNull()
    expect(header?.textContent).toContain('Settings')
    expect(closeButton()?.className).toBe('dialogClose')
  })

  it('without a title and showCloseButton=false: no X and no header at all', () => {
    mount(() =>
      h(Modal, { open: true, onClose: vi.fn(), showCloseButton: false }, { default: () => 'body' }),
    )
    expect(closeButton()).toBeNull()
    expect(document.body.querySelector('.dialogHeader')).toBeNull()
  })
})
