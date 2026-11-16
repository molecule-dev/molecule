// @vitest-environment jsdom
/**
 * Modal's pass-through attributes follow updates. React spreads its `aria-*`
 * and `data-*` rest props onto the inner `role="dialog"` element on EVERY
 * render, so a translated `aria-label` (a locale switch) or a `data-*` state
 * attribute changes on the dialog itself, not only on the first mount.
 *
 * @module
 */
import { act, cleanup, fireEvent, render } from '@testing-library/react'
import { createElement, useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  addTranslations,
  createSimpleI18nProvider,
  setLocale,
  setProvider,
} from '@molecule/app-i18n'
import { useTranslation } from '@molecule/app-react'
import type { ModalProps } from '@molecule/app-ui'

import { Modal } from '../components/Modal.js'

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
        // `cm.modal({ size })` is called; every other token is read as a plain
        // string by Modal's JSX.
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

/** Modal props plus the pass-through `data-*` attribute under test. */
type ModalPassthroughProps = ModalProps & { 'data-state'?: string }

const dialog = (): HTMLElement => document.body.querySelector<HTMLElement>('[role="dialog"]')!

/** A Modal whose `aria-label` and `data-state` come from component state. */
function StateModal(): React.ReactElement {
  const [label, setLabel] = useState('First label')
  const [state, setState] = useState('one')
  const modalProps: ModalPassthroughProps = {
    open: true,
    onClose: () => {},
    title: 'State',
    'aria-label': label,
    'data-state': state,
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
      {createElement(Modal, modalProps, 'body')}
    </>
  )
}

/** A Modal whose `aria-label` is a translated string. */
function LocaleModal(): React.ReactElement {
  const { t } = useTranslation()
  const modalProps: ModalPassthroughProps = {
    open: true,
    onClose: () => {},
    title: 'Locale',
    'aria-label': t('modalPassthrough.label', undefined, { defaultValue: 'fallback' }),
  }
  return createElement(Modal, modalProps, 'body')
}

beforeEach(async () => {
  await setLocale('en')
})

afterEach(cleanup)

describe('Modal pass-through attributes follow updates', () => {
  it('aria-label and data-* change on the open dialog when state changes', () => {
    render(createElement(StateModal))
    expect(dialog().getAttribute('aria-label')).toBe('First label')
    expect(dialog().getAttribute('data-state')).toBe('one')

    fireEvent.click(document.querySelector('button')!)

    expect(dialog().getAttribute('aria-label')).toBe('Second label')
    expect(dialog().getAttribute('data-state')).toBe('two')
  })

  it('a translated aria-label follows a locale switch while the dialog is open', async () => {
    render(createElement(LocaleModal))
    expect(dialog().getAttribute('aria-label')).toBe('English label')

    await act(async () => {
      await setLocale('fr')
    })

    expect(dialog().getAttribute('aria-label')).toBe('Libellé français')
  })
})
