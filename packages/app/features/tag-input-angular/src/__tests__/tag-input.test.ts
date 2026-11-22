// @vitest-environment jsdom
/**
 * Markup tests for the Angular tag input — the port of
 * `@molecule/app-tag-input-react/src/__tests__/tag-input.test.tsx`: the same
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

vi.mock('@molecule/app-angular', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

const { TagChip } = await import('../tag-chip.component.js')
const { TagInput } = await import('../tag-input.component.js')
const { mountHost } = await import('./mount.js')

const mounted: Array<Awaited<ReturnType<typeof mountHost>>> = []

afterEach(async () => {
  for (const item of mounted.splice(0)) await item.destroy()
  document.body.innerHTML = ''
})

/**
 * Mounts a host template and returns its markup.
 *
 * @param template - The host template.
 * @param imports - The standalone components it uses.
 * @param props - The props the template binds.
 * @returns The host's innerHTML.
 */
const render = async (
  template: string,
  imports: Parameters<typeof mountHost>[1],
  props: Record<string, unknown> = {},
): Promise<string> => {
  const item = await mountHost(template, imports, props)
  mounted.push(item)
  return item.host.innerHTML
}

const chip = (body: string, props: string): string => `<span mol-tag-chip ${props}>${body}</span>`

const input = (props: string): string => `<div mol-tag-input ${props}></div>`

describe('TagChip', () => {
  it('renders its children', async () => {
    const markup = await render(chip('react', ''), [TagChip])
    expect(markup).toContain('react')
  })

  it('renders the remove button only when onRemove is supplied', async () => {
    const removable = await render(chip('x', `[onRemove]="p['onRemove']"`), [TagChip], {
      onRemove: () => {},
    })
    expect(removable).toContain('<button')
    expect(removable).toContain('aria-label="Remove"')
    expect(removable).toContain('×')
    const plain = await render(chip('x', ''), [TagChip])
    expect(plain).not.toContain('<button')
  })

  it('forwards className', async () => {
    const markup = await render(chip('x', `[className]="p['className']"`), [TagChip], {
      className: 'chip-cls',
    })
    expect(markup).toContain('chip-cls')
  })
})

describe('TagInput', () => {
  it('renders one TagChip per value', async () => {
    const markup = await render(
      input(`[value]="p['value']" [onChange]="p['onChange']"`),
      [TagInput],
      { value: ['react', 'vue'], onChange: () => {} },
    )
    expect(markup).toContain('react')
    expect(markup).toContain('vue')
  })

  it('renders a remove button on each tag chip', async () => {
    const markup = await render(
      input(`[value]="p['value']" [onChange]="p['onChange']"`),
      [TagInput],
      { value: ['a', 'b'], onChange: () => {} },
    )
    expect(markup.match(/aria-label="Remove"/g) ?? []).toHaveLength(2)
  })

  it('renders the text input with the default placeholder', async () => {
    const markup = await render(
      input(`[value]="p['value']" [onChange]="p['onChange']"`),
      [TagInput],
      { value: [], onChange: () => {} },
    )
    expect(markup).toContain('placeholder="Add a tag')
  })

  it('honours a custom placeholder', async () => {
    const markup = await render(
      input(`[value]="p['value']" [onChange]="p['onChange']" [placeholder]="p['placeholder']"`),
      [TagInput],
      { value: [], onChange: () => {}, placeholder: 'Type a label' },
    )
    expect(markup).toContain('placeholder="Type a label"')
  })

  it('forwards className onto the outer wrapper', async () => {
    const markup = await render(
      input(`[value]="p['value']" [onChange]="p['onChange']" [className]="p['className']"`),
      [TagInput],
      { value: [], onChange: () => {}, className: 'ti-cls' },
    )
    expect(markup).toContain('ti-cls')
  })
})
