// @vitest-environment jsdom
/**
 * The layout components (`Container`, `Flex`, `Grid`, `Spacer`) keep
 * unhandled attributes on their root element — matching `Button`'s
 * established idiom, and React's `{...rest}` spread (a port of
 * `@molecule/app-ui-react/src/__tests__/layout-rest-props.test.tsx`). Angular
 * forces the translation: each component's host IS the root element (an
 * attribute selector such as `div[mol-flex]`), so a `data-*`/aria attribute a
 * caller writes on it lands in the DOM, while a declared input is consumed and
 * never rendered. The "clickable box" case binds the same role/tabIndex and
 * listeners a React caller spreads.
 *
 * @module
 */
// Register Angular's JIT compiler facade before any @Component class loads —
// evaluating the decorators otherwise throws "needs the JIT compiler".
import '@angular/compiler'
import { Component, provideZonelessChangeDetection, type Type } from '@angular/core'
import { type ComponentFixture, TestBed } from '@angular/core/testing'
import { platformBrowser } from '@angular/platform-browser'
import { BrowserTestingModule } from '@angular/platform-browser/testing'
import { fireEvent } from '@testing-library/dom'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { provideDomPlacement } from '@molecule/app-angular'

vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => {
    // Tokens the layout templates CALL as functions; every other token must be
    // a plain string — Angular's class binding rejects function values.
    const CALLABLE = new Set(['cn', 'container', 'flex', 'grid', 'spacer'])
    const handler: ProxyHandler<Record<string, unknown>> = {
      get(_t, prop) {
        if (prop === 'cn') {
          return (...cls: unknown[]) =>
            cls
              .flat(Infinity)
              .filter((c) => typeof c === 'string' && c.length > 0)
              .join(' ')
        }
        if (typeof prop === 'string' && CALLABLE.has(prop)) return () => prop
        return String(prop)
      },
    }
    return new Proxy({}, handler)
  },
}))

const { Container, Flex, Grid, Spacer } = await import('../components/layout.component.js')

/** Flex with rest attributes and handled props. */
const FlexAttrsHost = Component({
  selector: 'mol-spec-flex-attrs',
  standalone: true,
  imports: [Flex],
  template: `<div mol-flex [justify]="'end'" [gap]="'sm'" data-mol-id="row-actions" aria-label="Actions"><span>child</span></div>`,
})(class FlexAttrsHostComponent {})

/** Flex as a clickable box: role, tabIndex and the listeners a caller spreads. */
const FlexClickHost = Component({
  selector: 'mol-spec-flex-click',
  standalone: true,
  imports: [Flex],
  template: `<div mol-flex role="button" [tabindex]="0" (click)="onClick()" (keydown)="onKeyDown()"><span>child</span></div>`,
})(
  class FlexClickHostComponent {
    /** Clicks received. */
    clicks = 0
    /** Keydowns received. */
    keydowns = 0

    /** Counts a click. */
    onClick(): void {
      this.clicks += 1
    }

    /** Counts a keydown. */
    onKeyDown(): void {
      this.keydowns += 1
    }
  },
)

/** Container with a rest attribute. */
const ContainerHost = Component({
  selector: 'mol-spec-container',
  standalone: true,
  imports: [Container],
  template: `<div mol-container data-mol-id="page-shell">x</div>`,
})(class ContainerHostComponent {})

/** Grid with a rest attribute and a handled prop. */
const GridHost = Component({
  selector: 'mol-spec-grid',
  standalone: true,
  imports: [Grid],
  template: `<div mol-grid [columns]="2" data-mol-id="stats-grid">x</div>`,
})(class GridHostComponent {})

/** Spacer with a rest attribute and a handled prop. */
const SpacerHost = Component({
  selector: 'mol-spec-spacer',
  standalone: true,
  imports: [Spacer],
  template: `<div mol-spacer [size]="'md'" data-mol-id="section-gap"></div>`,
})(class SpacerHostComponent {})

/**
 * Mounts a spec host and returns its fixture.
 *
 * @param host - The host component to mount.
 * @returns The fixture.
 */
function render<T>(host: Type<T>): ComponentFixture<T> {
  TestBed.configureTestingModule({
    imports: [host],
    providers: [provideZonelessChangeDetection(), provideDomPlacement()],
  })
  const fixture = TestBed.createComponent(host)
  fixture.detectChanges()
  return fixture
}

/**
 * The root element a layout host rendered.
 *
 * @param fixture - The mounted fixture.
 * @returns The first element child.
 */
function root(fixture: ComponentFixture<unknown>): HTMLElement {
  return fixture.nativeElement.firstElementChild as HTMLElement
}

beforeAll(() => {
  TestBed.initTestEnvironment(BrowserTestingModule, platformBrowser())
})

afterAll(() => {
  TestBed.resetTestEnvironment()
})

describe('layout components forward rest props to the DOM', () => {
  it('Flex passes data-mol-id + aria attributes through (and does not leak handled props)', () => {
    const el = root(render(FlexAttrsHost))
    expect(el.getAttribute('data-mol-id')).toBe('row-actions')
    expect(el.getAttribute('aria-label')).toBe('Actions')
    // Handled props are consumed as inputs, never rendered as DOM attributes.
    expect(el.hasAttribute('justify')).toBe(false)
    expect(el.hasAttribute('gap')).toBe(false)
  })

  it('Flex forwards onClick together with the role, tabIndex and onKeyDown a clickable box needs', () => {
    const fixture = render(FlexClickHost)
    const el = root(fixture)
    expect(el.getAttribute('role')).toBe('button')
    expect(el.tabIndex).toBe(0)
    fireEvent.click(el)
    fireEvent.keyDown(el, { key: 'Enter' })
    expect(fixture.componentInstance.clicks).toBe(1)
    expect(fixture.componentInstance.keydowns).toBe(1)
  })

  it('Container passes data-mol-id through', () => {
    const el = root(render(ContainerHost))
    expect(el.getAttribute('data-mol-id')).toBe('page-shell')
  })

  it('Grid passes data-mol-id through (and does not leak columns)', () => {
    const el = root(render(GridHost))
    expect(el.getAttribute('data-mol-id')).toBe('stats-grid')
    expect(el.hasAttribute('columns')).toBe(false)
  })

  it('Spacer passes data-mol-id through', () => {
    const el = root(render(SpacerHost))
    expect(el.getAttribute('data-mol-id')).toBe('section-gap')
    expect(el.hasAttribute('size')).toBe(false)
  })
})
