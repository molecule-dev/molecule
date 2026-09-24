/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written: the REAL Tailwind ClassMap bond
 * resolves every `cm.*` call, and the component renders with
 * `react-dom/server`. (Written with `createElement` because this package's
 * vitest config collects `.ts` tests only; the element tree is the example's
 * JSX one-for-one.)
 *
 * @module
 */
import { createElement, type ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { t } from '@molecule/app-i18n'
import { classMap } from '@molecule/app-ui-tailwind'

import { getClassMap, molIdProps, setClassMap } from '../index.js'

/**
 * The example's `SaveBar`, element-for-element.
 *
 * @param props - Component props.
 * @param props.onSave - Save handler.
 * @returns The toolbar element.
 */
function SaveBar({ onSave }: { onSave: () => void }): ReactElement {
  const cm = getClassMap()
  return createElement(
    'div',
    { className: cm.cn(cm.flex({ justify: 'end', gap: 'sm' }), cm.surface) },
    createElement(
      'button',
      {
        type: 'button',
        className: cm.button({ variant: 'solid', color: 'primary', size: 'sm' }),
        onClick: onSave,
        ...molIdProps('save-button'),
      },
      t('common.save', undefined, { defaultValue: 'Save' }),
    ),
  )
}

describe('README @example', () => {
  it('renders ClassMap-resolved classes, the data-mol-id and the translated label', () => {
    setClassMap(classMap)

    const html = renderToStaticMarkup(createElement(SaveBar, { onSave: () => undefined }))

    const cm = getClassMap()
    const toolbarClass = cm.cn(cm.flex({ justify: 'end', gap: 'sm' }), cm.surface)
    const buttonClass = cm.button({ variant: 'solid', color: 'primary', size: 'sm' })
    expect(toolbarClass.length).toBeGreaterThan(0)
    expect(buttonClass.length).toBeGreaterThan(0)
    expect(html).toBe(
      `<div class="${toolbarClass}"><button type="button" class="${buttonClass}" data-mol-id="save-button">Save</button></div>`,
    )
  })
})
