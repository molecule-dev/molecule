// @vitest-environment jsdom
/**
 * Modal's pass-through attributes follow updates. Solid's `{...passthrough()}`
 * spread must re-run when a rest prop changes, so a translated `aria-label`
 * (a locale switch) or a `data-*` state attribute changes on the inner
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

import { createSignal, type JSX } from 'solid-js'
import { render } from 'solid-js/web'

const { useTranslation } = await import('@molecule/app-solid')
const { Modal } = await import('../components/Modal.jsx')

const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
  document.body.innerHTML = ''
})

/** Mounts JSX into a fresh container and registers its disposer. */
function mount(jsx: () => JSX.Element): void {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(render(jsx, container))
}

const dialog = (): HTMLElement => document.querySelector<HTMLElement>('[role="dialog"]')!

beforeEach(async () => {
  await setLocale('en')
})

describe('Modal pass-through attributes follow updates', () => {
  it('aria-label and data-* change on the open dialog when state changes', () => {
    mount(() => {
      const [label, setLabel] = createSignal('First label')
      const [state, setState] = createSignal('one')
      // Getter props keep the reads reactive inside the JSX spread, so a
      // signal change re-applies them the way React's next render does.
      const modalProps = {
        open: true,
        onClose: () => {},
        title: 'State',
        get 'aria-label'(): string {
          return label()
        },
        get 'data-state'(): string {
          return state()
        },
      }
      return (
        <>
          <button
            type="button"
            onClick={() => {
              setLabel('Second label')
              setState('two')
            }}
          >
            change
          </button>
          <Modal {...modalProps}>body</Modal>
        </>
      )
    })

    expect(dialog().getAttribute('aria-label')).toBe('First label')
    expect(dialog().getAttribute('data-state')).toBe('one')

    document.querySelector<HTMLElement>('button')!.click()

    expect(dialog().getAttribute('aria-label')).toBe('Second label')
    expect(dialog().getAttribute('data-state')).toBe('two')
  })

  it('a translated aria-label follows a locale switch while the dialog is open', async () => {
    mount(() => {
      const { t } = useTranslation()
      const modalProps = {
        open: true,
        onClose: () => {},
        title: 'Locale',
        get 'aria-label'(): string {
          return t('modalPassthrough.label', undefined, { defaultValue: 'fallback' })
        },
      }
      return <Modal {...modalProps}>body</Modal>
    })

    expect(dialog().getAttribute('aria-label')).toBe('English label')

    await setLocale('fr')

    expect(dialog().getAttribute('aria-label')).toBe('Libellé français')
  })
})
