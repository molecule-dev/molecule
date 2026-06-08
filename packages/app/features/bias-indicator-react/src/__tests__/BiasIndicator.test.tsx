// @vitest-environment jsdom

import { render } from '@testing-library/react'
import type { ReactNode } from 'react'
import React from 'react'
import { beforeEach, describe, expect, it } from 'vitest'

import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { I18nProvider } from '@molecule/app-react'
import { setClassMap, type UIClassMap } from '@molecule/app-ui'

import {
  BiasIndicator,
  biasToBucket,
  biasToPercent,
  bucketColor,
  clamp,
  reliabilityToTier,
  tierColor,
} from '../BiasIndicator.js'

/**
 * Build a UIClassMap stub via Proxy: `cn(...)` joins truthy strings,
 * every other property/method access returns its key as a string token.
 *
 * @returns A stub UIClassMap suitable for tests.
 */
function buildStubClassMap(): UIClassMap {
  const handler: ProxyHandler<Record<string, unknown>> = {
    get(_target, prop): unknown {
      if (prop === 'cn') {
        return (...classes: unknown[]) =>
          classes.filter((c) => typeof c === 'string' && c.length > 0).join(' ')
      }
      const token = String(prop)
      const fn = (..._args: unknown[]): string => token
      return new Proxy(fn, {
        get(_t, key) {
          if (key === Symbol.toPrimitive || key === 'toString') return () => token
          return undefined
        },
      })
    },
  }
  return new Proxy({}, handler) as unknown as UIClassMap
}

/**
 * Wrap children in `I18nProvider` so `useTranslation()` works.
 *
 * @param props - Wrapper props.
 * @param props.children - Children to wrap.
 * @returns The wrapped element tree.
 */
function Wrap({ children }: { children: ReactNode }): React.ReactElement {
  return <I18nProvider provider={createSimpleI18nProvider('en')}>{children}</I18nProvider>
}

beforeEach(() => {
  setClassMap(buildStubClassMap())
})

describe('clamp', () => {
  it('returns value within range unchanged', () => {
    expect(clamp(0.3, -1, 1)).toBe(0.3)
  })
  it('clamps below min', () => {
    expect(clamp(-2, -1, 1)).toBe(-1)
  })
  it('clamps above max', () => {
    expect(clamp(2, -1, 1)).toBe(1)
  })
  it('returns min for NaN', () => {
    expect(clamp(Number.NaN, -1, 1)).toBe(-1)
  })
})

describe('biasToBucket', () => {
  it('classifies far-left at -1', () => {
    expect(biasToBucket(-1)).toBe('far-left')
  })
  it('uses far-left at the inclusive boundary -0.6', () => {
    expect(biasToBucket(-0.6)).toBe('far-left')
  })
  it('classifies left at -0.4', () => {
    expect(biasToBucket(-0.4)).toBe('left')
  })
  it('classifies center at 0', () => {
    expect(biasToBucket(0)).toBe('center')
  })
  it('classifies right at 0.4', () => {
    expect(biasToBucket(0.4)).toBe('right')
  })
  it('classifies far-right at 1', () => {
    expect(biasToBucket(1)).toBe('far-right')
  })
  it('clamps out-of-range values into the end buckets', () => {
    expect(biasToBucket(-5)).toBe('far-left')
    expect(biasToBucket(5)).toBe('far-right')
  })
})

describe('reliabilityToTier', () => {
  it('classifies high at 0.9', () => {
    expect(reliabilityToTier(0.9)).toBe('high')
  })
  it('classifies medium at 0.5', () => {
    expect(reliabilityToTier(0.5)).toBe('medium')
  })
  it('classifies low at 0.3', () => {
    expect(reliabilityToTier(0.3)).toBe('low')
  })
  it('classifies disputed at 0.1', () => {
    expect(reliabilityToTier(0.1)).toBe('disputed')
  })
})

describe('biasToPercent', () => {
  it('maps -1 to 0%', () => {
    expect(biasToPercent(-1)).toBe(0)
  })
  it('maps 0 to 50%', () => {
    expect(biasToPercent(0)).toBe(50)
  })
  it('maps 1 to 100%', () => {
    expect(biasToPercent(1)).toBe(100)
  })
})

describe('bucketColor / tierColor', () => {
  it('returns CSS var strings for every bucket', () => {
    expect(bucketColor('far-left')).toMatch(/^var\(/)
    expect(bucketColor('left')).toMatch(/^var\(/)
    expect(bucketColor('center')).toMatch(/^var\(/)
    expect(bucketColor('right')).toMatch(/^var\(/)
    expect(bucketColor('far-right')).toMatch(/^var\(/)
  })
  it('returns CSS var strings for every reliability tier', () => {
    expect(tierColor('high')).toMatch(/^var\(/)
    expect(tierColor('medium')).toMatch(/^var\(/)
    expect(tierColor('low')).toMatch(/^var\(/)
    expect(tierColor('disputed')).toMatch(/^var\(/)
  })
})

describe('<BiasIndicator>', () => {
  it('renders the scale + marker by default', () => {
    const { container } = render(
      <Wrap>
        <BiasIndicator bias={-0.4} />
      </Wrap>,
    )
    expect(container.querySelector('[data-mol-id="bias-indicator-scale"]')).not.toBeNull()
    expect(container.querySelector('[data-mol-id="bias-indicator-marker"]')).not.toBeNull()
  })

  it('positions the marker at biasToPercent(bias)%', () => {
    const { container } = render(
      <Wrap>
        <BiasIndicator bias={0.5} />
      </Wrap>,
    )
    const marker = container.querySelector('[data-mol-id="bias-indicator-marker"]') as HTMLElement
    expect(marker.style.left).toBe('75%')
  })

  it('exposes the bias bucket as a data attribute on the root', () => {
    const { container } = render(
      <Wrap>
        <BiasIndicator bias={0.7} />
      </Wrap>,
    )
    const root = container.querySelector('[data-mol-id="bias-indicator"]') as HTMLElement
    expect(root.getAttribute('data-bias-bucket')).toBe('far-right')
  })

  it('uses the English fallback "Center" for bias=0', () => {
    const { container } = render(
      <Wrap>
        <BiasIndicator bias={0} />
      </Wrap>,
    )
    expect(container.querySelector('[data-mol-id="bias-indicator-bias-label"]')?.textContent).toBe(
      'Center',
    )
  })

  it('omits the reliability indicator when reliability is undefined', () => {
    const { container } = render(
      <Wrap>
        <BiasIndicator bias={0} />
      </Wrap>,
    )
    expect(container.querySelector('[data-mol-id="bias-indicator-reliability"]')).toBeNull()
  })

  it('renders the reliability chip with the matching tier when provided', () => {
    const { container } = render(
      <Wrap>
        <BiasIndicator bias={0} reliability={0.85} />
      </Wrap>,
    )
    const chip = container.querySelector(
      '[data-mol-id="bias-indicator-reliability"]',
    ) as HTMLElement
    expect(chip).not.toBeNull()
    expect(chip.getAttribute('data-reliability-tier')).toBe('high')
    expect(chip.textContent).toContain('Reliability: high')
  })

  it('renders the source label when provided', () => {
    const { container } = render(
      <Wrap>
        <BiasIndicator bias={0} sourceLabel="Reuters" />
      </Wrap>,
    )
    expect(container.querySelector('[data-mol-id="bias-indicator-source"]')?.textContent).toBe(
      'Reuters',
    )
  })

  it('compact variant renders a single dot and no scale track', () => {
    const { container } = render(
      <Wrap>
        <BiasIndicator bias={-0.8} compact />
      </Wrap>,
    )
    expect(container.querySelector('[data-mol-id="bias-indicator-scale"]')).toBeNull()
    expect(container.querySelector('[data-mol-id="bias-indicator-marker"]')).toBeNull()
    const root = container.querySelector('[data-mol-id="bias-indicator"]') as HTMLElement
    expect(root.getAttribute('role')).toBe('img')
    expect(root.getAttribute('data-bias-bucket')).toBe('far-left')
    expect(root.getAttribute('aria-label')).toBe('Far left')
  })

  it('compact aria-label combines bias + reliability when reliability is set', () => {
    const { container } = render(
      <Wrap>
        <BiasIndicator bias={0.4} reliability={0.4} compact />
      </Wrap>,
    )
    const root = container.querySelector('[data-mol-id="bias-indicator"]') as HTMLElement
    expect(root.getAttribute('aria-label')).toBe('Right-leaning — Reliability: low')
  })

  it('honors a custom dataMolId override', () => {
    const { container } = render(
      <Wrap>
        <BiasIndicator bias={0} dataMolId="article-42-bias" />
      </Wrap>,
    )
    expect(container.querySelector('[data-mol-id="article-42-bias"]')).not.toBeNull()
  })
})
