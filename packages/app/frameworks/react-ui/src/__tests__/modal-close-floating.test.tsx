// @vitest-environment jsdom
/**
 * Render tests for the Modal close-button placement: with a `title` the X
 * shares the header row (`dialogClose`); WITHOUT a title there must be no
 * full-width header band at all — the X floats over the top-right corner
 * (`dialogCloseFloating`) so it doesn't push the body content down.
 *
 * @module
 */
import { cleanup, render } from '@testing-library/react'
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
        // Modal calls `cm.modal({ size })`; every other token is read as a
        // plain string (`className={cm.dialogCloseFloating}`), so return the
        // token name directly — a callable there would break className.
        if (prop === 'modal') {
          return (..._args: unknown[]) => 'modal'
        }
        return String(prop)
      },
    }
    return new Proxy({}, handler)
  },
}))

vi.mock('@molecule/app-i18n', () => ({
  t: (key: string, _values: unknown, opts?: { defaultValue?: string }) => opts?.defaultValue ?? key,
}))

vi.mock('@molecule/app-icons', () => ({
  getIcon: () => ({ viewBox: '0 0 20 20', paths: [{ d: 'M0 0h20v20H0z' }] }),
}))

const { Modal } = await import('../components/Modal.js')

const closeButton = (): HTMLElement | null =>
  document.body.querySelector<HTMLElement>('[data-mol-id="modal-close"]')

afterEach(() => {
  cleanup()
})

describe('Modal close-button placement', () => {
  it('without a title: the X floats top-right and NO header band renders', () => {
    render(
      <Modal open onClose={vi.fn()}>
        body
      </Modal>,
    )
    expect(closeButton()?.className).toContain('dialogCloseFloating')
    expect(document.body.querySelector('.dialogHeader')).toBeNull()
  })

  it('with a title: the X shares the header row, not the floating overlay', () => {
    render(
      <Modal open onClose={vi.fn()} title="Settings">
        body
      </Modal>,
    )
    const header = document.body.querySelector('.dialogHeader')
    expect(header).not.toBeNull()
    expect(header?.textContent).toContain('Settings')
    expect(closeButton()?.className).toBe('dialogClose')
  })

  it('without a title and showCloseButton=false: no X and no header at all', () => {
    render(
      <Modal open onClose={vi.fn()} showCloseButton={false}>
        body
      </Modal>,
    )
    expect(closeButton()).toBeNull()
    expect(document.body.querySelector('.dialogHeader')).toBeNull()
  })
})
