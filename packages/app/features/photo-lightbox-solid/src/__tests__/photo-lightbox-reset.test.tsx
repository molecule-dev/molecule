// @vitest-environment jsdom
/**
 * Solid `<PhotoLightbox>` index resets — the port of
 * `@molecule/app-photo-lightbox-react/src/__tests__/photo-lightbox-reset.test.tsx`:
 * opening the lightbox (or handing it a new `initialIndex`) rewinds to that
 * photo before the first frame the user sees, so it is never the previous
 * session's photo.
 *
 * @module
 */

import { createSignal } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { setIconSet } from '@molecule/app-icons'

beforeEach(() => setIconSet({ 'x-mark': { paths: [] } }))

import type { PhotoLightboxProps } from '../types.js'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `position`), so tests can assert which cm.* class was applied without a real
// bond — the same mock the React tests use.
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
        return token === 'modal' || token === 'position' || token === 'button' ? () => token : token
      },
    }
    return new Proxy({}, handler)
  },
}))

// The i18n mock the React tests install for `@molecule/app-react`: `t`
// resolves to the inline English default.
vi.mock('@molecule/app-solid', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

const { PhotoLightbox } = await import('../PhotoLightbox.jsx')

const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
  document.body.innerHTML = ''
})

/** A mounted lightbox: its container and a way to write its props again. */
interface Mounted {
  /** The element the component rendered into. */
  readonly container: HTMLElement
  /** Writes props (this framework's `rerender`); the update is synchronous. */
  update(patch: Partial<PhotoLightboxProps>): void
}

/** Mounts a {@link PhotoLightbox} whose props a test can change. */
function mountLightbox(initial: PhotoLightboxProps): Mounted {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const [props, setProps] = createSignal(initial)
  disposers.push(render(() => <PhotoLightbox {...props()} />, container))
  return {
    container,
    update(patch: Partial<PhotoLightboxProps>): void {
      setProps({ ...props(), ...patch })
    },
  }
}

/** The dialog's photo counter, e.g. "2 / 3". */
function counter(container: HTMLElement): string {
  const dialog = container.ownerDocument.querySelector('[role="dialog"]')
  return dialog?.textContent ?? ''
}

/** Sends one keydown from the lightbox. */
function press(key: string): void {
  const dialog = document.querySelector('[role="dialog"]')
  if (!dialog) throw new Error('Expected a lightbox')
  dialog.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }))
}

const photos = [
  { src: '/1.jpg', alt: 'first' },
  { src: '/2.jpg', alt: 'second' },
  { src: '/3.jpg' },
]

describe('<PhotoLightbox> index reset', () => {
  it('shows initialIndex on the first open frame', () => {
    const m = mountLightbox({
      photos,
      open: false,
      onClose: () => {},
      initialIndex: undefined,
      onIndexChange: undefined,
    })
    m.update({ photos, open: true, onClose: () => {}, initialIndex: 2 })
    expect(counter(m.container)).toContain('3 / 3')
  })

  it('rewinds to initialIndex when reopened after navigating', () => {
    const m = mountLightbox({
      photos,
      open: true,
      onClose: () => {},
      initialIndex: 0,
      onIndexChange: undefined,
    })
    expect(counter(m.container)).toContain('1 / 3')
    press('ArrowRight')
    press('ArrowRight')
    expect(counter(m.container)).toContain('3 / 3')
    m.update({ photos, open: false, onClose: () => {}, initialIndex: 0, onIndexChange: undefined })
    m.update({ photos, open: true, onClose: () => {}, initialIndex: 1, onIndexChange: undefined })
    expect(counter(m.container)).toContain('2 / 3')
  })

  it('follows a new initialIndex while open', () => {
    const m = mountLightbox({
      photos,
      open: true,
      onClose: () => {},
      initialIndex: 0,
      onIndexChange: undefined,
    })
    press('ArrowRight')
    expect(counter(m.container)).toContain('2 / 3')
    m.update({ photos, open: true, onClose: () => {}, initialIndex: 2, onIndexChange: undefined })
    expect(counter(m.container)).toContain('3 / 3')
  })
})
