// @vitest-environment jsdom
/**
 * Unit tests for the Svelte `Checklist` — a port of
 * `@molecule/app-checklist-react/src/__tests__/checklist.test.tsx`: the same
 * behavioral assertions, rendered with Svelte in jsdom and asserted on the
 * markup the component produces.
 *
 * @module
 */

import { flushSync, mount, unmount } from 'svelte'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { ChecklistItem } from '../types.js'

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
vi.mock('@molecule/app-svelte', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
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

const { default: Checklist } = await import('../Checklist.svelte')

/** The props a test renders the checklist with. */
interface RenderProps {
  items: ChecklistItem[]
  onToggle?: (id: string, next: boolean) => void
  showProgress?: boolean
  title?: string
  className?: string
}

/** Mounts {@link Checklist} into jsdom and returns its markup and teardown. */
const render = (props: RenderProps): { markup: string; done: () => Promise<void> } => {
  const target = document.createElement('div')
  document.body.appendChild(target)
  const instance = mount(Checklist, {
    target,
    props: { onToggle: () => {}, ...props },
  })
  flushSync()
  return {
    markup: target.innerHTML,
    done: async () => {
      await unmount(instance)
      target.remove()
    },
  }
}

const items: ChecklistItem[] = [
  { id: 'a', label: 'Set up profile', completed: true },
  { id: 'b', label: 'Invite team', completed: false, description: 'Add at least one teammate' },
]

afterEach(() => {
  document.body.innerHTML = ''
})

describe('Checklist', () => {
  it('renders every item label', async () => {
    const view = render({ items })
    expect(view.markup).toContain('Set up profile')
    expect(view.markup).toContain('Invite team')
    await view.done()
  })

  it('renders an item description when present', async () => {
    const view = render({ items })
    expect(view.markup).toContain('Add at least one teammate')
    await view.done()
  })

  it('renders the progress summary and bar by default', async () => {
    const view = render({ items })
    expect(view.markup).toContain('1 of 2 complete')
    expect(view.markup).toContain('50%')
    expect(view.markup).toContain('width: 50%')
    await view.done()
  })

  it('omits the progress block when showProgress is false', async () => {
    const view = render({ items, showProgress: false })
    expect(view.markup).not.toContain('complete')
    expect(view.markup).not.toContain('width: 50%')
    await view.done()
  })

  it('renders the title when present and omits it otherwise', async () => {
    const titled = render({ items, title: 'Get started' })
    expect(titled.markup).toContain('Get started')
    await titled.done()
    const plain = render({ items })
    expect(plain.markup).not.toContain('<h3')
    await plain.done()
  })

  it('strikes through completed items', async () => {
    const view = render({ items })
    expect(view.markup).toContain('line-through')
    await view.done()
  })

  it('forwards className', async () => {
    const view = render({ items, className: 'cl-cls' })
    expect(view.markup).toContain('cl-cls')
    await view.done()
  })
})
