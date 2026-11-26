// @vitest-environment jsdom
/**
 * The Vue port of
 * `@molecule/app-admin-table-react/src/__tests__/i18n.test.tsx` (the same test
 * names): the admin table's own text goes through `t()`, and the icon-font
 * glyph is hidden from assistive technology. A provider whose `t` marks every
 * string proves a default that bypassed `t()`.
 *
 * @module
 */

import { afterEach, describe, expect, it, vi } from 'vitest'
import { createApp, defineComponent, h, nextTick, type Ref } from 'vue'

// Class tokens echo their own name (methods when called, the token itself for
// the ClassMap's string fields) — the same mock the other Vue tests use.
vi.mock('@molecule/app-ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
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
        // `iconGlyphFont` is a string field of the ClassMap, not a method.
        if (token === 'iconGlyphFont') return token
        return (..._args: unknown[]) => token
      },
    }
    return new Proxy({}, handler)
  },
}))

// Forward onClick + pass-through attrs onto a native <button>, so the
// trigger's aria-* is assertable.
vi.mock('@molecule/app-ui-vue', async (importOriginal) => {
  const { defineComponent, h } = await import('vue')
  return {
    ...(await importOriginal<Record<string, unknown>>()),
    Button: defineComponent({
      name: 'MButton',
      inheritAttrs: false,
      props: { variant: String, size: String, onClick: Function },
      setup(props, { attrs, slots }) {
        return () =>
          h(
            'button',
            {
              ...attrs,
              onClick: (event: MouseEvent) => (props.onClick as (e: MouseEvent) => void)?.(event),
            },
            slots.default?.(),
          )
      },
    }),
  }
})

// The provider's locale, switchable from the tests through the same ref the
// component reads (a real ref, so Vue re-renders on a switch).
const i18n = vi.hoisted(() => ({ locale: 'en' }))

vi.mock('@molecule/app-vue', async (importOriginal) => {
  const { ref } = await import('vue')
  const localeRef = ref(i18n.locale)
  return {
    ...(await importOriginal<Record<string, unknown>>()),
    useTranslation: (): { t: (key: string) => string } => ({
      // Reading the ref here (inside the component's render) tracks it.
      t: (key: string) => `«${localeRef.value}:${key}»`,
    }),
    __localeRef: localeRef,
  }
})

import type * as Binding from '@molecule/app-vue'

import { AdminTable } from '../AdminTable.js'
import { AdminTableRowActions } from '../AdminTableRowActions.js'

/** The mocked binding, with the locale ref the tests switch. */
type MockedBinding = typeof Binding & { __localeRef: Ref<string> }

interface Row {
  id: string
  name: string
}
const rows: Row[] = [
  { id: 'a', name: 'Alpha' },
  { id: 'b', name: 'Beta' },
]
const columns = [{ id: 'name', header: 'Name', render: (r: Row) => r.name }]
const rowKey = (r: Row): string => r.id
const rowActions = [{ label: 'Edit', onSelect: () => {}, dataMolIdFor: () => 'row-action-edit' }]

afterEach(async () => {
  document.body.innerHTML = ''
  i18n.locale = 'en'
  const binding = (await import('@molecule/app-vue')) as MockedBinding
  binding.__localeRef.value = 'en'
})

/**
 * Mounts one component with the given props, kept until the test's cleanup so
 * a locale switch re-renders in place.
 *
 * @param component - The component to mount.
 * @param props - Its props.
 * @returns The host element.
 */
async function mount(
  component: unknown,
  props: Record<string, unknown> = {},
): Promise<HTMLElement> {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(defineComponent({ render: () => h(component as never, props) }))
  app.mount(host)
  return host
}

/**
 * Switches the mock provider's locale and flushes the re-render.
 *
 * @param locale - The locale to switch to.
 */
async function switchLocale(locale: string): Promise<void> {
  const binding = (await import('@molecule/app-vue')) as MockedBinding
  binding.__localeRef.value = locale
  await nextTick()
}

describe('AdminTableRowActions i18n', () => {
  it('names the trigger through t when no aria label is given', async () => {
    const host = await mount(AdminTableRowActions, { row: rows[0], actions: rowActions })
    const trigger = host.querySelector('[data-mol-id="admin-table-row-actions-trigger"]')
    expect(trigger?.getAttribute('aria-label')).toBe('«en:adminTable.aria.rowActions»')
  })

  it('lets an explicit ariaLabel prop override the translated default', async () => {
    const host = await mount(AdminTableRowActions, {
      row: rows[0],
      actions: rowActions,
      ariaLabel: 'Row actions',
    })
    const trigger = host.querySelector('[data-mol-id="admin-table-row-actions-trigger"]')
    expect(trigger?.getAttribute('aria-label')).toBe('Row actions')
  })

  it('keeps the icon glyph out of the accessibility tree', async () => {
    const host = await mount(AdminTableRowActions, {
      row: rows[0],
      actions: rowActions,
      ariaLabel: 'Row actions',
    })
    const glyph = host.querySelector('span[data-icon="more_vert"]')
    expect(glyph).not.toBeNull()
    expect(glyph?.getAttribute('aria-hidden')).toBe('true')
  })

  it('renders the trigger label in the locale the provider switches to', async () => {
    const host = await mount(AdminTableRowActions, { row: rows[0], actions: rowActions })
    const trigger = () => host.querySelector('[data-mol-id="admin-table-row-actions-trigger"]')
    expect(trigger()?.getAttribute('aria-label')).toBe('«en:adminTable.aria.rowActions»')
    await switchLocale('de')
    expect(trigger()?.getAttribute('aria-label')).toBe('«de:adminTable.aria.rowActions»')
  })
})

describe('AdminTable i18n', () => {
  it('labels the actions-column trigger through t when no per-row label is given', async () => {
    const host = await mount(AdminTable, { rows, columns, rowKey, rowActions })
    const trigger = host.querySelector('[data-mol-id="admin-table-row-actions-trigger"]')
    expect(trigger?.getAttribute('aria-label')).toBe('«en:adminTable.aria.rowActions»')
  })

  it('keeps a per-row label over the translated default', async () => {
    const host = await mount(AdminTable, {
      rows,
      columns,
      rowKey,
      rowActions,
      rowActionsAriaLabel: (row: Row): string => `Actions for ${row.name}`,
    })
    const trigger = host.querySelector('[data-mol-id="admin-table-row-actions-trigger"]')
    expect(trigger?.getAttribute('aria-label')).toBe('Actions for Alpha')
  })

  it('renders the checkbox label and both column names in the locale the provider switches to', async () => {
    const host = await mount(AdminTable, { rows, columns, rowKey, bulkSelect: true, rowActions })
    const checkbox = () => host.querySelector('input[type="checkbox"]')
    const heads = () => Array.from(host.querySelectorAll('thead th'))
    expect(checkbox()?.getAttribute('aria-label')).toBe('«en:adminTable.aria.selectRow»')
    expect(heads()[0]?.textContent).toBe('«en:adminTable.aria.selectColumn»')
    expect(heads()[2]?.textContent).toBe('«en:adminTable.aria.actionsColumn»')
    await switchLocale('de')
    expect(checkbox()?.getAttribute('aria-label')).toBe('«de:adminTable.aria.selectRow»')
    expect(heads()[0]?.textContent).toBe('«de:adminTable.aria.selectColumn»')
    expect(heads()[2]?.textContent).toBe('«de:adminTable.aria.actionsColumn»')
  })
})
