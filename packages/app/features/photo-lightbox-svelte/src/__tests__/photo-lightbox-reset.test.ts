// @vitest-environment jsdom
/**
 * Svelte `<PhotoLightbox>` index resets — the port of
 * `@molecule/app-photo-lightbox-react/src/__tests__/photo-lightbox-reset.test.tsx`:
 * opening the lightbox (or handing it a new `initialIndex`) rewinds to that
 * photo before the first frame the user sees, so it is never the previous
 * session's photo. Props are written through a reactive bag, which is this
 * framework's way of setting a prop again.
 *
 * @module
 */

import { flushSync, mount, unmount } from 'svelte'
import { afterEach, describe, expect, it, vi } from 'vitest'

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
        return (..._args: unknown[]) => token
      },
    }
    return new Proxy({}, handler)
  },
}))

// The i18n mock the React tests install for `@molecule/app-react`: `t`
// resolves to the inline English default.
vi.mock('@molecule/app-svelte', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

import PhotoLightbox from '../PhotoLightbox.svelte'
import type { PhotoLightboxProps } from '../types.js'
import Harness from './Harness.svelte'
import { PropBag } from './props.svelte.js'

/** The instances mounted during one test, unmounted in `afterEach`. */
const mounted: ReturnType<typeof mount>[] = []

afterEach(async () => {
  for (const instance of mounted.splice(0)) await unmount(instance)
  document.body.innerHTML = ''
})

/** A mounted lightbox: its host and a way to write its props again. */
interface Mounted {
  /** The element the harness mounted into. */
  readonly host: HTMLElement
  /** Writes props (this framework's `rerender`) and flushes the render. */
  update(patch: Partial<PhotoLightboxProps>): void
}

/** Mounts a {@link PhotoLightbox} whose props a test can change. */
const render = (initial: PhotoLightboxProps): Mounted => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const bag = new PropBag(initial)
  mounted.push(mount(Harness, { target: host, props: { component: PhotoLightbox, bag } }))
  flushSync()
  return {
    host,
    update(patch: Partial<PhotoLightboxProps>): void {
      bag.set(patch)
      flushSync()
    },
  }
}

/** The dialog's photo counter, e.g. "2 / 3". */
const counter = (host: HTMLElement): string =>
  host.querySelector('[role="dialog"]')?.textContent ?? ''

/** Sends one document-level keydown, as React's `fireEvent.keyDown(document, …)` does. */
const press = (key: string): void => {
  document.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }))
  flushSync()
}

const photos = [
  { src: '/1.jpg', alt: 'first' },
  { src: '/2.jpg', alt: 'second' },
  { src: '/3.jpg' },
]

describe('<PhotoLightbox> index reset', () => {
  it('shows initialIndex on the first open frame', () => {
    const m = render({
      photos,
      open: false,
      onClose: () => {},
      initialIndex: undefined,
      onIndexChange: undefined,
    })
    m.update({ photos, open: true, onClose: () => {}, initialIndex: 2 })
    expect(counter(m.host)).toContain('3 / 3')
  })

  it('rewinds to initialIndex when reopened after navigating', () => {
    const m = render({
      photos,
      open: true,
      onClose: () => {},
      initialIndex: 0,
      onIndexChange: undefined,
    })
    expect(counter(m.host)).toContain('1 / 3')
    press('ArrowRight')
    press('ArrowRight')
    expect(counter(m.host)).toContain('3 / 3')
    m.update({ photos, open: false, onClose: () => {}, initialIndex: 0, onIndexChange: undefined })
    m.update({ photos, open: true, onClose: () => {}, initialIndex: 1, onIndexChange: undefined })
    expect(counter(m.host)).toContain('2 / 3')
  })

  it('follows a new initialIndex while open', () => {
    const m = render({
      photos,
      open: true,
      onClose: () => {},
      initialIndex: 0,
      onIndexChange: undefined,
    })
    press('ArrowRight')
    expect(counter(m.host)).toContain('2 / 3')
    m.update({ photos, open: true, onClose: () => {}, initialIndex: 2, onIndexChange: undefined })
    expect(counter(m.host)).toContain('3 / 3')
  })
})
