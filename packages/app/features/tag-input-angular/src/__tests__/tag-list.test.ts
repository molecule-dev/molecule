// @vitest-environment jsdom
/**
 * Markup tests for the Angular tag list — the port of
 * `@molecule/app-tag-input-react/src/__tests__/tag-list.test.tsx`: the same
 * test names and the same behavioral assertions, mounted through Angular's
 * real renderer in jsdom.
 *
 * @module
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `roundedFull`), so tests can assert which cm.* class was applied without a
// real bond — the same mock the React tests use.
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

vi.mock('@molecule/app-angular', () => ({
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

// The compiler first: TagList imports `@angular/common`, whose partially
// compiled injectables need the JIT compiler at module-evaluation time.
const { mountHost } = await import('./mount.js')
const { TagList } = await import('../tag-list.component.js')

const mounted: Array<Awaited<ReturnType<typeof mountHost>>> = []

afterEach(async () => {
  for (const item of mounted.splice(0)) await item.destroy()
  document.body.innerHTML = ''
})

/**
 * Mounts a host template and returns its markup.
 *
 * @param template - The host template.
 * @param props - The props the template binds.
 * @returns The host's innerHTML.
 */
const render = async (template: string, props: Record<string, unknown> = {}): Promise<string> => {
  const item = await mountHost(template, [TagList], props)
  mounted.push(item)
  return item.host.innerHTML
}

const list = (props: string): string => `<ul mol-tag-list ${props}></ul>`

describe('saved tags on a destination screen', () => {
  it('renders every saved tag in its original order without requiring an editor', async () => {
    const markup = await render(list(`[value]="p['value']"`), { value: ['typescript', 'testing'] })
    expect(markup.match(/<li\b/g)).toHaveLength(2)
    expect(markup.indexOf('typescript')).toBeLessThan(markup.indexOf('testing'))
    expect(markup).not.toMatch(/<input\b|<button\b/)
  })

  it('supports a non-blog inventory detail with app-owned tag presentation', async () => {
    const markup = await render(
      `<ng-template #label let-tag><strong>{{ tag }}</strong></ng-template>
        <ul mol-tag-list [value]="p['value']" [className]="p['className']" [itemClassName]="p['itemClassName']" [renderTag]="label"></ul>`,
      {
        value: ['fragile', 'cold storage'],
        className: 'inventory-labels',
        itemClassName: 'inventory-label',
      },
    )
    expect(markup).toContain('<strong>fragile</strong>')
    expect(markup).toContain('<strong>cold storage</strong>')
    expect(markup.match(/<li\b/g)).toHaveLength(2)
    expect(markup).toContain('class="inventory-label"')
  })

  it('counterexample: removing every saved tag leaves no stale tag items', async () => {
    const item = await mountHost(list(`[value]="p['value']"`), [TagList], { value: ['removed'] })
    mounted.push(item)
    expect(item.host.innerHTML).toContain('removed')
    await item.setProps({ value: [] })
    const empty = item.host.innerHTML
    expect(empty).not.toContain('<li')
    expect(empty).not.toContain('removed')
  })

  it('escapes tag text and preserves repeated labels', async () => {
    const markup = await render(list(`[value]="p['value']"`), {
      value: ['<script>bad</script>', 'same', 'same'],
    })
    expect(markup).not.toContain('<script>')
    expect(markup.match(/<li\b/g)).toHaveLength(3)
    expect(markup.match(/>same</g)).toHaveLength(2)
  })
})
