// @vitest-environment jsdom
/**
 * Unit tests for the Vue `DangerZoneSection` — a port of
 * `@molecule/app-danger-zone-react/src/__tests__/danger-zone.test.tsx`:
 * the same behavioral assertions, rendered with Vue in jsdom and asserted on
 * the markup the component produces.
 *
 * @module
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

// `getClassMap()` → a Proxy: `cn(...)` joins tokens, calling function-valued
// args first — the same mock the React tests use.
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
        return (..._args: unknown[]) => token
      },
    }
    return new Proxy({}, handler)
  },
}))

// app-ui-vue stubs: Button forwards disabled + color, Card forwards
// data-mol-id + className — the same markers the React suite's
// `@molecule/app-ui-react` stubs render. The stub ConfirmDialog is the
// sentinel for the re-export identity test.
vi.mock('@molecule/app-ui-vue', async (importOriginal) => {
  const { defineComponent, h } = await import('vue')
  const Button = defineComponent({
    name: 'Button',
    props: {
      variant: String,
      disabled: { type: Boolean, default: false },
      color: String,
    },
    emits: ['click'],
    setup(props, { slots, emit }) {
      return () =>
        h(
          'button',
          {
            'data-button': '',
            disabled: props.disabled,
            'data-color': props.color,
            onClick: (event: MouseEvent) => emit('click', event),
          },
          slots.default?.(),
        )
    },
  })
  const Card = defineComponent({
    name: 'Card',
    props: { className: String },
    setup(props, { attrs, slots }) {
      return () =>
        h(
          'div',
          {
            'data-card': '',
            'data-mol-id': attrs['data-mol-id'] as string | undefined,
            class: props.className,
          },
          slots.default?.(),
        )
    },
  })
  const ConfirmDialog = defineComponent({
    name: 'ConfirmDialog',
    setup() {
      return () => null
    },
  })
  return { ...(await importOriginal<Record<string, unknown>>()), Button, Card, ConfirmDialog }
})

const { createApp, defineComponent, h } = await import('vue')

const { ConfirmDialog } = await import('../ConfirmDialog.js')
const { DangerZoneSection } = await import('../DangerZoneSection.js')

afterEach(() => {
  document.body.innerHTML = ''
})

/** Renders a {@link DangerZoneSection} and returns the markup it produced. */
const render = (props: Record<string, unknown>, children?: unknown[]): string => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const slots = children ? { default: () => children } : undefined
  const app = createApp(defineComponent({ render: () => h(DangerZoneSection, props, slots) }))
  app.mount(host)
  const markup = host.innerHTML
  app.unmount()
  host.remove()
  return markup
}

const noop = (): void => {}

describe('ConfirmDialog re-export', () => {
  it('re-exports the framework bundle component unchanged', async () => {
    const framework = (await import('@molecule/app-ui-vue')) as Record<string, unknown>
    expect(ConfirmDialog).toBe(framework.ConfirmDialog)
  })
})

describe('DangerZoneSection', () => {
  const base = {
    title: 'Delete account',
    description: 'Permanently remove this account.',
    actionLabel: 'Delete account',
    onAction: noop,
  }

  it('renders the title in an <h3> and the description', () => {
    const markup = render(base)
    expect(markup).toContain('<h3')
    expect(markup).toContain('Delete account')
    expect(markup).toContain('Permanently remove this account.')
  })

  it('renders the actionLabel on the button', () => {
    const markup = render(base)
    expect(markup).toContain('data-button=""')
    expect(markup).toContain('data-color="error"')
  })

  it('shows the loading glyph and disables the button while loading', () => {
    const markup = render({ ...base, loading: true })
    expect(markup).toContain('…')
    expect(markup).toMatch(/<button[^>]*disabled/)
  })

  it('disables the button when disabled is set', () => {
    const markup = render({ ...base, disabled: true })
    expect(markup).toMatch(/<button[^>]*disabled/)
  })

  it('renders extra children between description and the action button', () => {
    const markup = render(base, [h('input', { 'data-confirm': '' })])
    expect(markup).toContain('data-confirm=""')
  })

  it('sets data-mol-id and forwards className onto the Card', () => {
    const markup = render({ ...base, dataMolId: 'danger-x', className: 'dz-cls' })
    expect(markup).toContain('data-mol-id="danger-x"')
    expect(markup).toContain('dz-cls')
  })
})
