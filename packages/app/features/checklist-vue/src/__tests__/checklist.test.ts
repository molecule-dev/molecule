// @vitest-environment jsdom
/**
 * Unit tests for the Vue `Checklist` — a port of
 * `@molecule/app-checklist-react/src/__tests__/checklist.test.tsx`: the same
 * behavioral assertions, rendered with Vue in jsdom and asserted on the markup
 * the component produces.
 *
 * @module
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `stack`), so tests can assert which cm.* class was applied without a real
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

// `t(key, values, opts)` interpolates `{{name}}` into the supplied
// `defaultValue`, as the i18n core does.
vi.mock('@molecule/app-vue', () => ({
  useTranslation: () => ({
    t: (
      _key: string,
      values: Record<string, unknown> | undefined,
      opts?: { defaultValue?: string },
    ) => {
      let out = opts?.defaultValue ?? _key
      if (values)
        for (const [k, v] of Object.entries(values)) out = out.replace(`{{${k}}}`, String(v))
      return out
    },
  }),
}))

// The Checkbox marker the React tests mock `@molecule/app-ui-react` with: an
// input carrying `data-checkbox`.
vi.mock('@molecule/app-ui-vue', async () => {
  const { defineComponent, h } = await import('vue')
  return {
    Checkbox: defineComponent({
      name: 'Checkbox',
      props: {
        checked: { type: Boolean, default: undefined },
        disabled: Boolean,
      },
      emits: ['change'],
      setup(props) {
        return () =>
          h('input', {
            type: 'checkbox',
            'data-checkbox': '',
            checked: props.checked,
            disabled: props.disabled,
            readOnly: true,
          })
      },
    }),
  }
})

import { createApp, defineComponent, h, type VNodeChild } from 'vue'

import { Checklist } from '../Checklist.js'

afterEach(() => {
  document.body.innerHTML = ''
})

/** Renders a {@link Checklist} and returns the markup it produced. */
const render = (
  props: Record<string, unknown>,
  slots?: Record<string, () => VNodeChild[]>,
): string => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(defineComponent({ render: () => h(Checklist, props, slots) }))
  app.mount(host)
  const markup = host.innerHTML
  app.unmount()
  host.remove()
  return markup
}

const items = [
  { id: 'a', label: 'Set up profile', completed: true },
  { id: 'b', label: 'Invite team', completed: false, description: 'Add at least one teammate' },
]

describe('Checklist', () => {
  it('renders every item label', () => {
    const markup = render({ items, onToggle: () => {} })
    expect(markup).toContain('Set up profile')
    expect(markup).toContain('Invite team')
  })

  it('renders an item description when present', () => {
    const markup = render({ items, onToggle: () => {} })
    expect(markup).toContain('Add at least one teammate')
  })

  it('renders the progress summary and bar by default', () => {
    const markup = render({ items, onToggle: () => {} })
    expect(markup).toContain('1 of 2 complete')
    expect(markup).toContain('50%')
    expect(markup).toContain('width: 50%')
  })

  it('omits the progress block when showProgress is false', () => {
    const markup = render({ items, onToggle: () => {}, showProgress: false })
    expect(markup).not.toContain('complete')
    expect(markup).not.toContain('width: 50%')
  })

  it('renders the title when present and omits it otherwise', () => {
    expect(render({ items, onToggle: () => {}, title: 'Get started' })).toContain('Get started')
    expect(render({ items, onToggle: () => {} })).not.toContain('<h3')
  })

  it('strikes through completed items', () => {
    const markup = render({ items, onToggle: () => {} })
    expect(markup).toContain('line-through')
  })

  it('forwards className', () => {
    const markup = render({ items, onToggle: () => {}, className: 'cl-cls' })
    expect(markup).toContain('cl-cls')
  })
})
