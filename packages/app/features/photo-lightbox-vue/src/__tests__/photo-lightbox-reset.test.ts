// @vitest-environment jsdom
/**
 * Vue `<PhotoLightbox>` index resets — the port of
 * `@molecule/app-photo-lightbox-react/src/__tests__/photo-lightbox-reset.test.tsx`:
 * opening the lightbox (or handing it a new `initialIndex`) rewinds to that
 * photo before the first frame the user sees, so it is never the previous
 * session's photo.
 *
 * @module
 */

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
vi.mock('@molecule/app-vue', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

import { createApp, defineComponent, h, nextTick, shallowRef } from 'vue'

import type { PhotoLightboxProps } from '../types.js'

const { PhotoLightbox } = await import('../PhotoLightbox.js')

/** The apps mounted during one test, unmounted in `afterEach`. */
const apps: ReturnType<typeof createApp>[] = []

afterEach(() => {
  for (const app of apps.splice(0)) app.unmount()
  document.body.innerHTML = ''
})

/** A mounted lightbox: its host and a way to write its props again. */
interface Mounted {
  /** The element the app mounted into. */
  readonly host: HTMLElement
  /** Writes props (this framework's `rerender`) and awaits the re-render. */
  update(patch: Partial<PhotoLightboxProps>): Promise<void>
}

/** Mounts a {@link PhotoLightbox} whose props a test can change. */
const mountLightbox = (initial: PhotoLightboxProps): Mounted => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  // A ref of the whole props object: a write is the next render's props,
  // exactly as React's `rerender` hands them over.
  const props = shallowRef<PhotoLightboxProps>(initial)
  const app = createApp(defineComponent({ render: () => h(PhotoLightbox, props.value) }))
  apps.push(app)
  app.mount(host)
  return {
    host,
    async update(patch: Partial<PhotoLightboxProps>): Promise<void> {
      props.value = { ...props.value, ...patch }
      await nextTick()
    },
  }
}

/** The dialog's photo counter, e.g. "2 / 3". */
const counter = (host: HTMLElement): string => {
  const dialog = host.querySelector('[role="dialog"]')
  return dialog?.textContent ?? ''
}

/** Sends one document-level keydown, as React's `fireEvent.keyDown(document, …)` does. */
const press = async (key: string): Promise<void> => {
  document.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }))
  await nextTick()
}

const photos = [
  { src: '/1.jpg', alt: 'first' },
  { src: '/2.jpg', alt: 'second' },
  { src: '/3.jpg' },
]

describe('<PhotoLightbox> index reset', () => {
  it('shows initialIndex on the first open frame', async () => {
    const m = mountLightbox({ photos, open: false, onClose: () => {} })
    await m.update({ photos, open: true, onClose: () => {}, initialIndex: 2 })
    expect(counter(m.host)).toContain('3 / 3')
  })

  it('rewinds to initialIndex when reopened after navigating', async () => {
    const m = mountLightbox({ photos, open: true, onClose: () => {}, initialIndex: 0 })
    expect(counter(m.host)).toContain('1 / 3')
    await press('ArrowRight')
    await press('ArrowRight')
    expect(counter(m.host)).toContain('3 / 3')
    await m.update({ photos, open: false, onClose: () => {} })
    await m.update({ photos, open: true, onClose: () => {}, initialIndex: 1 })
    expect(counter(m.host)).toContain('2 / 3')
  })

  it('follows a new initialIndex while open', async () => {
    const m = mountLightbox({ photos, open: true, onClose: () => {}, initialIndex: 0 })
    await press('ArrowRight')
    expect(counter(m.host)).toContain('2 / 3')
    await m.update({ photos, open: true, onClose: () => {}, initialIndex: 2 })
    expect(counter(m.host)).toContain('3 / 3')
  })
})
