// @vitest-environment jsdom
/**
 * Unit tests for the Solid `CodeBlock` — a port of
 * `@molecule/app-code-block-react/src/__tests__/code-block.test.tsx`: the same
 * behavioral assertions, rendered with Solid in jsdom and asserted on the
 * markup the component produces.
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { copyTextWithFallback } from '@molecule/app-clipboard'

import type { CodeBlockProps } from '../types.js'

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
vi.mock('@molecule/app-solid', () => ({
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

// The copy-button marker the React tests mock `@molecule/app-ui-react` with:
// a `data-button` element rendering its children.
vi.mock('@molecule/app-ui-solid', () => ({
  Button: (props: {
    variant?: string
    size?: string
    onClick?: () => void
    children?: JSX.Element
  }) => (
    <button data-button="" type="button" onClick={props.onClick}>
      {props.children}
    </button>
  ),
}))

vi.mock('@molecule/app-clipboard', () => ({
  copyTextWithFallback: vi.fn(async () => true),
}))

const { CodeBlock } = await import('../CodeBlock.jsx')

const copyTextWithFallbackMock = vi.mocked(copyTextWithFallback)

const disposers: Array<() => void> = []

beforeEach(() => {
  copyTextWithFallbackMock.mockReset()
  copyTextWithFallbackMock.mockResolvedValue(true)
})

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

/** Render with Solid's browser renderer and return the container's markup. */
function renderBlock(props: CodeBlockProps): string {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(render(() => <CodeBlock {...props} />, container))
  return container.innerHTML
}

const code = 'const x = 1\nconst y = 2\nconsole.log(x + y)'

/** Mounts a {@link CodeBlock} that stays mounted (for the click tests). */
function mountLive(props: CodeBlockProps): { container: HTMLDivElement; dispose: () => void } {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const dispose = render(() => <CodeBlock {...props} />, container)
  disposers.push(dispose)
  return { container, dispose }
}

/** Helper — the copy button inside a mounted container. */
function copyButton(container: HTMLElement): HTMLButtonElement | null {
  return container.querySelector('button[data-button]')
}

/** Flushes the copy promise's microtasks (Solid applies signal writes synchronously). */
function flush(): Promise<void> {
  return new Promise<void>((resolve) => setTimeout(resolve))
}

describe('CodeBlock', () => {
  it('renders the source code', () => {
    const markup = renderBlock({ code })
    expect(markup).toContain('console.log(x + y)')
  })

  it('renders the filename and language tag in the header', () => {
    const markup = renderBlock({ code, filename: 'sum.ts', language: 'ts' })
    expect(markup).toContain('sum.ts')
    expect(markup).toContain('ts')
  })

  it('omits the header when there is no filename/language and copy is disabled', () => {
    const markup = renderBlock({ code, showCopy: false })
    expect(markup).not.toContain('<header')
  })

  it('renders the copy button by default', () => {
    const markup = renderBlock({ code })
    expect(markup).toContain('data-button=""')
    expect(markup).toContain('Copy')
  })

  it('renders line numbers by default and omits them when showLineNumbers is false', () => {
    const withNums = renderBlock({ code })
    expect(withNums).toContain('>1<')
    expect(withNums).toContain('>2<')
    expect(withNums).toContain('>3<')
    const without = renderBlock({ code, showLineNumbers: false })
    expect(without).not.toContain('>1<')
  })

  it('forwards className', () => {
    const markup = renderBlock({ code, className: 'cb-cls' })
    expect(markup).toContain('cb-cls')
  })

  it('copies the displayed code when the copy button is clicked', async () => {
    const { container } = mountLive({ code })
    const button = copyButton(container)
    expect(button).not.toBeNull()
    button?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await flush()
    expect(copyTextWithFallbackMock).toHaveBeenCalledTimes(1)
    expect(copyTextWithFallbackMock).toHaveBeenCalledWith(code)
    expect(copyButton(container)?.textContent).toBe('Copied!')
  })

  it('leaves the copied state off when the copy reports failure', async () => {
    copyTextWithFallbackMock.mockResolvedValue(false)
    const { container } = mountLive({ code })
    const button = copyButton(container)
    expect(button).not.toBeNull()
    button?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await flush()
    expect(copyTextWithFallbackMock).toHaveBeenCalledWith(code)
    expect(copyButton(container)?.textContent).toBe('Copy')
  })
})
