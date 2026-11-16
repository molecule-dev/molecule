// @vitest-environment jsdom
/**
 * Modal's pass-through attributes follow updates. The Vue port rebuilds its
 * `{...rest}` from the fallthrough `attrs` inside the render function, so a
 * translated `aria-label` (a locale switch) or a `data-*` state attribute
 * changes on the inner `role="dialog"` element, not only on first mount.
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
        if (prop === 'modal') return (..._args: unknown[]) => 'modal'
        return String(prop)
      },
    }
    return new Proxy({}, handler)
  },
}))

vi.mock('@molecule/app-icons', () => ({
  getIcon: () => ({ viewBox: '0 0 20 20', paths: [{ d: 'M0 0h20v20H0z' }] }),
}))

setProvider(createSimpleI18nProvider())
addTranslations('en', { 'modalPassthrough.label': 'English label' })
addTranslations('fr', { 'modalPassthrough.label': 'Libellé français' })

import { createApp, defineComponent, h, nextTick, ref, type RenderFunction } from 'vue'

const { useTranslation } = await import('@molecule/app-vue')
const { Modal } = await import('../components/Modal.js')

/** Mounts a render function into a fresh host, runs the assertions, unmounts. */
async function withMount(
  render: RenderFunction,
  assert: () => void | Promise<void>,
): Promise<void> {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp({ render })
  app.mount(host)
  try {
    await assert()
  } finally {
    app.unmount()
  }
}

const dialog = (): HTMLElement => document.querySelector<HTMLElement>('[role="dialog"]')!

beforeEach(async () => {
  await setLocale('en')
})

afterEach(() => {
  document.body.innerHTML = ''
})

describe('Modal pass-through attributes follow updates', () => {
  it('aria-label and data-* change on the open dialog when state changes', async () => {
    const Host = defineComponent({
      setup() {
        const label = ref('First label')
        const state = ref('one')
        return () =>
          h('div', [
            h(
              'button',
              {
                type: 'button',
                onClick: () => {
                  label.value = 'Second label'
                  state.value = 'two'
                },
              },
              'change',
            ),
            h(
              Modal,
              {
                open: true,
                onClose: () => {},
                title: 'State',
                'aria-label': label.value,
                'data-state': state.value,
              },
              () => 'body',
            ),
          ])
      },
    })

    await withMount(
      () => h(Host),
      async () => {
        expect(dialog().getAttribute('aria-label')).toBe('First label')
        expect(dialog().getAttribute('data-state')).toBe('one')

        document.querySelector<HTMLElement>('button')!.click()
        await nextTick()

        expect(dialog().getAttribute('aria-label')).toBe('Second label')
        expect(dialog().getAttribute('data-state')).toBe('two')
      },
    )
  })

  it('a translated aria-label follows a locale switch while the dialog is open', async () => {
    const Host = defineComponent({
      setup() {
        const { t } = useTranslation()
        return () =>
          h(
            Modal,
            {
              open: true,
              onClose: () => {},
              title: 'Locale',
              'aria-label': t('modalPassthrough.label', undefined, { defaultValue: 'fallback' }),
            },
            () => 'body',
          )
      },
    })

    await withMount(
      () => h(Host),
      async () => {
        expect(dialog().getAttribute('aria-label')).toBe('English label')

        await setLocale('fr')
        await nextTick()

        expect(dialog().getAttribute('aria-label')).toBe('Libellé français')
      },
    )
  })
})
