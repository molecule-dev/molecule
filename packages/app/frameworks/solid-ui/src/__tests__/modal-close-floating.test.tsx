// @vitest-environment jsdom
/**
 * Modal close-button placement: with a `title` the X shares the header row
 * (`dialogClose`); WITHOUT a title there must be no full-width header band at
 * all — the X floats over the top-right corner (`dialogCloseFloating`) so it
 * doesn't push the body content down.
 *
 * Solid counterpart of `@molecule/app-ui-react`'s `modal-close-floating`
 * test: same mocks, same assertions; the only translation is the mount
 * (`render` from `solid-js/web` instead of react-dom).
 *
 * @module
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createSimpleI18nProvider, setLocale, setProvider } from '@molecule/app-i18n'

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
        // plain string (`class={cm.dialogCloseFloating}`), so return the
        // token name directly — a callable there would break the class.
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
// registered: every label falls back to its own `defaultValue`, which is what
// these assertions check through the stub anyway.
setProvider(createSimpleI18nProvider())

import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'

const { Modal } = await import('../components/Modal.jsx')

const disposers: Array<() => void> = []

const closeButton = (): HTMLElement | null =>
  document.body.querySelector<HTMLElement>('[data-mol-id="modal-close"]')

/** Mounts JSX into a fresh container and registers its disposer. */
function mount(jsx: () => JSX.Element): void {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(render(jsx, container))
}

beforeEach(async () => {
  await setLocale('en')
})

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
  document.body.innerHTML = ''
})

describe('Modal close-button placement', () => {
  it('without a title: the X floats top-right and NO header band renders', () => {
    mount(() => (
      <Modal open onClose={vi.fn()}>
        body
      </Modal>
    ))
    expect(closeButton()?.className).toContain('dialogCloseFloating')
    expect(document.body.querySelector('.dialogHeader')).toBeNull()
  })

  it('with a title: the X shares the header row, not the floating overlay', () => {
    mount(() => (
      <Modal open onClose={vi.fn()} title="Settings">
        body
      </Modal>
    ))
    const header = document.body.querySelector('.dialogHeader')
    expect(header).not.toBeNull()
    expect(header?.textContent).toContain('Settings')
    expect(closeButton()?.className).toBe('dialogClose')
  })

  it('without a title and showCloseButton=false: no X and no header at all', () => {
    mount(() => (
      <Modal open onClose={vi.fn()} showCloseButton={false}>
        body
      </Modal>
    ))
    expect(closeButton()).toBeNull()
    expect(document.body.querySelector('.dialogHeader')).toBeNull()
  })
})
