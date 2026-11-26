// @vitest-environment jsdom
/**
 * Modal's pass-through attributes follow updates. The Svelte port derives its
 * `{...rest}` passthrough from the props, so a translated `aria-label` (a
 * locale switch) or a `data-*` state attribute changes on the inner
 * `role="dialog"` element, not only on first mount.
 *
 * @module
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  addTranslations,
  createSimpleI18nProvider,
  setLocale,
  setProvider,
} from '@molecule/app-i18n'

vi.mock('@molecule/app-ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
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
        if (prop === 'modal') return (..._args: unknown[]) => 'modal'
        return String(prop)
      },
    }
    return new Proxy({}, handler)
  },
}))

vi.mock('@molecule/app-icons', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getIcon: () => ({ viewBox: '0 0 20 20', paths: [{ d: 'M0 0h20v20H0z' }] }),
}))

setProvider(createSimpleI18nProvider())
addTranslations('en', { 'modalPassthrough.label': 'English label' })
addTranslations('fr', { 'modalPassthrough.label': 'Libellé français' })

import { flushSync, mount, tick, unmount } from 'svelte'

const { default: Host } = await import('./ModalPassthroughHost.svelte')

const mounted: Array<ReturnType<typeof mount>> = []

afterEach(() => {
  for (const instance of mounted.splice(0)) unmount(instance)
  document.body.innerHTML = ''
})

/** Mounts the host in `mode` into a fresh container. */
function mountHost(mode: 'state' | 'locale'): void {
  const target = document.createElement('div')
  document.body.appendChild(target)
  mounted.push(mount(Host, { target, props: { mode } }))
  flushSync()
}

const dialog = (): HTMLElement => document.querySelector<HTMLElement>('[role="dialog"]')!

beforeEach(async () => {
  await setLocale('en')
})

describe('Modal pass-through attributes follow updates', () => {
  it('aria-label and data-* change on the open dialog when state changes', () => {
    mountHost('state')
    expect(dialog().getAttribute('aria-label')).toBe('First label')
    expect(dialog().getAttribute('data-state')).toBe('one')

    document.querySelector<HTMLElement>('button')!.click()
    flushSync()

    expect(dialog().getAttribute('aria-label')).toBe('Second label')
    expect(dialog().getAttribute('data-state')).toBe('two')
  })

  it('a translated aria-label follows a locale switch while the dialog is open', async () => {
    mountHost('locale')
    expect(dialog().getAttribute('aria-label')).toBe('English label')

    await setLocale('fr')
    await tick()

    expect(dialog().getAttribute('aria-label')).toBe('Libellé français')
  })
})
