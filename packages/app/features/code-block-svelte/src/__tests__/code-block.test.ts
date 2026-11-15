// @vitest-environment jsdom
/**
 * Unit tests for the Svelte `CodeBlock` — a port of
 * `@molecule/app-code-block-react/src/__tests__/code-block.test.tsx`: the same
 * behavioral assertions, rendered with Svelte 5 in jsdom and asserted on the
 * markup the component produces.
 *
 * @module
 */

import { flushSync, mount, unmount } from 'svelte'
import { afterEach, describe, expect, it, vi } from 'vitest'

// Proxy ClassMap echoing each accessed member back as its token (e.g.
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

// The i18n mock the React tests install for `@molecule/app-react`: `t`
// resolves to the inline English default.
vi.mock('@molecule/app-svelte', () => ({
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

// The copy-button marker the React tests mock `@molecule/app-ui-react` with:
// a `data-button` element rendering its default slot.
vi.mock('@molecule/app-ui-svelte', async () => {
  const { default: Button } = await import('./stubs/ButtonStub.svelte')
  return { Button }
})

import CodeBlock from '../CodeBlock.svelte'

/** The instances mounted during one test, unmounted in `afterEach`. */
const mounted: ReturnType<typeof mount>[] = []

afterEach(async () => {
  for (const instance of mounted.splice(0)) await unmount(instance)
  document.body.innerHTML = ''
})

/** Mounts a {@link CodeBlock} and returns the markup it produced. */
const render = (props: Record<string, unknown>): string => {
  const target = document.createElement('div')
  document.body.appendChild(target)
  mounted.push(mount(CodeBlock, { target, props }))
  flushSync()
  return target.innerHTML
}

const code = 'const x = 1\nconst y = 2\nconsole.log(x + y)'

describe('CodeBlock', () => {
  it('renders the source code', () => {
    const markup = render({ code })
    expect(markup).toContain('console.log(x + y)')
  })

  it('renders the filename and language tag in the header', () => {
    const markup = render({ code, filename: 'sum.ts', language: 'ts' })
    expect(markup).toContain('sum.ts')
    expect(markup).toContain('ts')
  })

  it('omits the header when there is no filename/language and copy is disabled', () => {
    const markup = render({ code, showCopy: false })
    expect(markup).not.toContain('<header')
  })

  it('renders the copy button by default', () => {
    const markup = render({ code })
    expect(markup).toContain('data-button=""')
    expect(markup).toContain('Copy')
  })

  it('renders line numbers by default and omits them when showLineNumbers is false', () => {
    const withNums = render({ code })
    expect(withNums).toContain('>1<')
    expect(withNums).toContain('>2<')
    expect(withNums).toContain('>3<')
    const without = render({ code, showLineNumbers: false })
    expect(without).not.toContain('>1<')
  })

  it('forwards className', () => {
    const markup = render({ code, className: 'cb-cls' })
    expect(markup).toContain('cb-cls')
  })
})
