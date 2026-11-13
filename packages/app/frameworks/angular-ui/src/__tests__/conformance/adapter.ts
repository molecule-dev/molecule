/**
 * Angular conformance adapter.
 *
 * Each case is rendered through a JIT-compiled host template, written exactly
 * the way an Angular app would write it, e.g.
 * `<button mol-button [variant]="p['variant']" (click)="cb('onClick', $event)">Save</button>`.
 *
 * Mapping (the contract this package follows; see the conformance kit README):
 * - Every component is standalone and exported under its React name (`Button`).
 *   Its selector names the native element React renders at its root, as an
 *   attribute selector (`button[mol-button]`), so the host IS that element and no
 *   wrapper exists. A component whose React root is a fragment or a portal uses
 *   an element selector (`mol-modal`) whose host is `display: contents`.
 * - Every React data prop is an input with the same name, including `className`,
 *   `style` (camelCase object) and `testId`. Without such an input, `className`
 *   and `style` bind the host's `class` / `style`.
 * - Other props React spreads with `...rest` (`aria-*`, `data-*`, `id`) are host
 *   attributes; a component whose React spread target is not its root moves them.
 * - `children` is the default `<ng-content>`; a node-valued prop `foo` is projected
 *   content selected by `[slot=foo]`.
 * - A node value inside a data prop (`items[0].icon`) is a `TemplateRef`; a render
 *   function (`columns[0].render`) is a `TemplateRef` whose context holds the
 *   function's arguments (`$implicit` = the first, `args` = all of them).
 * - A DOM-event callback (`onClick`, `onKeyDown`, …) is the native event on the
 *   host. Any other callback `onFooBar` is an output `fooBar`.
 * - A UI-package hook (`useToast`) is a function called in an injection context
 *   (a field initializer of a component).
 *
 * @module
 */

import '@angular/compiler'
import {
  type ApplicationRef,
  ChangeDetectionStrategy,
  Component,
  type ComponentRef,
  createComponent,
  type DoCheck,
  ElementRef,
  inject,
  isSignal,
  provideZonelessChangeDetection,
  reflectComponentType,
  type TemplateRef,
  type Type,
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'

import {
  provideAuth,
  provideI18n,
  provideRouter,
  provideTheme,
  useAuth,
} from '@molecule/app-angular'
import {
  buildServices,
  callProbe,
  CallRecorder,
  type FnValue,
  type FrameworkAdapter,
  interpolate,
  isComponentSpec,
  isProbeSpec,
  materializeProps,
  type NodeSpec,
  type ProbeSpec,
  probeValue,
  runSteps,
  settle,
  type UICase,
} from '@molecule/app-framework-conformance/ui'

import * as AngularUI from '../../index.js'

/** React callback names that are DOM events, with the native event Angular binds. */
const DOM_EVENTS: Record<string, string> = {
  onClick: 'click',
  onDoubleClick: 'dblclick',
  onMouseDown: 'mousedown',
  onMouseUp: 'mouseup',
  onMouseEnter: 'mouseenter',
  onMouseLeave: 'mouseleave',
  onPointerDown: 'pointerdown',
  onKeyDown: 'keydown',
  onKeyUp: 'keyup',
  onFocus: 'focusin',
  onBlur: 'focusout',
  onInput: 'input',
  onSubmit: 'submit',
}

/** HTML void elements: Angular's parser rejects an end tag for these. */
const VOID_ELEMENTS = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'source',
  'track',
  'wbr',
])

/** Most arguments a render function template exposes (`a0`…`a2`). */
const RENDER_ARGS = 3

/** Hosts mounted so far: each gets its own id (see the host's `data-parity-host`). */
let hostCount = 0

const exportsOf = AngularUI as unknown as Record<string, unknown>

const isComponent = (value: unknown): value is Type<unknown> => {
  if (typeof value !== 'function') return false
  try {
    return reflectComponentType(value as Type<unknown>) !== null
  } catch (_error) {
    // reflectComponentType throws for classes that are not Angular types; such an export is not a component.
    return false
  }
}

/** Escapes text for an Angular template (`{`, `}` and `@` are template syntax). */
const text = (s: string): string =>
  s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('{', '&#123;')
    .replaceAll('}', '&#125;')
    .replaceAll('@', '&#64;')

const attr = (s: string): string => s.replaceAll('&', '&amp;').replaceAll('"', '&quot;')

const PLACEHOLDER = /\{\d+(?:\.[\w$]+)*\}/

/** `button[mol-button]` → `{ tag: 'button', attrs: ['mol-button'] }`. */
const parseSelector = (selector: string): { tag: string; attrs: string[] } => {
  const first = selector.split(',')[0].trim()
  const tag = /^[a-z][\w-]*/i.exec(first)?.[0] ?? 'div'
  const attrs = [...first.matchAll(/\[([\w-]+)(?:=["']?([^"'\]]*)["']?)?\]/g)].map((m) =>
    m[2] ? `${m[1]}="${m[2]}"` : m[1],
  )
  return { tag, attrs }
}

/** A `{ $nodes }` or render-function marker, swapped for template `tpl[id]`. */
interface TemplatePlaceholder {
  $tpl: number
}

const isPlaceholder = (value: unknown): value is TemplatePlaceholder =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as TemplatePlaceholder).$tpl === 'number'

interface Built {
  used: Set<string>
  /** Probe components, by label. */
  probes: Map<string, Type<unknown>>
  /** Props of nested component nodes, referenced as `np[i]` (markers already replaced). */
  nested: Record<string, unknown>[]
  /** Strings with `{0}` placeholders inside render templates, referenced as `s[i]`. */
  strings: string[]
  /** `<ng-template>` definitions, by marker key. */
  templates: Map<string, { id: number; markup: string }>
}

/** Whether nodes are rendered inside a render-function template (so `a0`… are in scope). */
type Scope = 'static' | 'render'

const argsExpr = `[${Array.from({ length: RENDER_ARGS }, (_v, i) => `a${i}`).join(', ')}]`

const renderNodes = (nodes: NodeSpec[] | undefined, built: Built, scope: Scope): string =>
  (nodes ?? []).map((node) => renderNode(node, built, scope)).join('')

const textNode = (s: string, built: Built, scope: Scope): string => {
  if (scope === 'render' && PLACEHOLDER.test(s))
    return `{{ ip(s[${built.strings.push(s) - 1}], ${argsExpr}) }}`
  return text(s)
}

const renderNode = (node: NodeSpec, built: Built, scope: Scope): string => {
  if (typeof node === 'string') return textNode(node, built, scope)
  if (isProbeSpec(node)) {
    built.probes.set(node.label, probeComponent(node))
    return `<button type="button" data-parity-probe="${attr(node.label)}">${text(node.label)}</button>`
  }
  if (isComponentSpec(node)) {
    const props = materialize(node.props ?? {}, built)
    const index = built.nested.push(props) - 1
    return renderComponent(
      node.component,
      props,
      `np[${index}]`,
      [],
      node.children,
      node.slots ?? {},
      built,
      scope,
    )
  }
  const attrs = Object.entries(node.attrs ?? {})
    .map(([k, v]) =>
      scope === 'render' && PLACEHOLDER.test(v)
        ? ` [attr.${k}]="ip(s[${built.strings.push(v) - 1}], ${argsExpr})"`
        : ` ${k}="${attr(v)}"`,
    )
    .join('')
  if (VOID_ELEMENTS.has(node.tag)) return `<${node.tag}${attrs} />`
  return `<${node.tag}${attrs}>${renderNodes(node.children, built, scope)}</${node.tag}>`
}

/** Registers (once) the `<ng-template>` for a marker and returns its placeholder. */
const templateFor = (
  key: string,
  built: Built,
  markup: (id: number) => string,
): TemplatePlaceholder => {
  const existing = built.templates.get(key)
  if (existing) return { $tpl: existing.id }
  // Reserve the id first: the markup may register nested templates.
  const id = built.templates.size
  built.templates.set(key, { id, markup: '' })
  built.templates.set(key, { id, markup: markup(id) })
  return { $tpl: id }
}

/**
 * Replaces markers in props with template placeholders (registering the
 * templates); plain functions stay functions.
 *
 * @param props - Neutral props.
 * @param built - The template under construction.
 * @returns Props whose node values are `{ $tpl }` placeholders.
 */
const materialize = (props: Record<string, unknown>, built: Built): Record<string, unknown> =>
  materializeProps(props, {
    nodes: (list) =>
      templateFor(
        JSON.stringify({ nodes: list }),
        built,
        (id) => `<ng-template #tpl${id}>${renderNodes(list, built, 'static')}</ng-template>`,
      ),
    renderFn: (spec: FnValue & { nodes: NodeSpec[] }) =>
      templateFor(JSON.stringify({ fn: spec }), built, (id) => {
        const lets = Array.from({ length: RENDER_ARGS }, (_v, i) => ` let-a${i}="a${i}"`).join('')
        return `<ng-template #tpl${id}${lets}>${renderNodes(spec.nodes, built, 'render')}</ng-template>`
      }),
  })

const renderComponent = (
  name: string,
  props: Record<string, unknown>,
  propsExpr: string,
  callbacks: string[],
  children: NodeSpec[] | undefined,
  slots: Record<string, NodeSpec[]>,
  built: Built,
  scope: Scope,
  /** Props later `props` steps will merge in (their node values must swap too). */
  laterProps: Record<string, unknown>[] = [],
): string => {
  const Comp = exportsOf[name]
  if (!isComponent(Comp))
    throw new Error(`angular: ${name} is not an exported standalone component`)
  built.used.add(name)
  const mirror = reflectComponentType(Comp)!
  const inputs = new Set(mirror.inputs.map((i) => i.templateName))
  const outputs = new Set(mirror.outputs.map((o) => o.templateName))
  const { tag, attrs } = parseSelector(mirror.selector)
  const bindings: string[] = [...attrs]
  for (const key of Object.keys(props)) {
    const raw = `${propsExpr}['${key}']`
    // A node value may arrive in the initial props OR in a later `props` step;
    // when either carries one, the binding must swap placeholders for templates.
    const templated =
      hasTemplates(props[key]) || laterProps.some((lp) => key in lp && hasTemplates(lp[key]))
    const value = templated ? `r(${raw}, tpls)` : raw
    if (inputs.has(key)) bindings.push(`[${key}]="${value}"`)
    else if (key === 'className') bindings.push(`[class]="${value}"`)
    else if (key === 'style') bindings.push(`[style]="${value}"`)
    else if (props[key] !== null && typeof props[key] === 'object') {
      throw new Error(`angular: ${name} has no input "${key}" for an object value`)
    } else
      bindings.push(`[attr.${key}]="${value} === false ? null : ${value} === true ? '' : ${value}"`)
  }
  for (const cb of callbacks) {
    // An input named exactly like the React callback receives the recording
    // spy itself — React calls the function (so `await onConfirm()` sees the
    // case's promise and the call records its real arity). Components that
    // await a callback declare it as an input; everything else uses outputs.
    if (inputs.has(cb)) {
      bindings.push(`[${cb}]="cbFns['${cb}']"`)
      continue
    }
    const output = cb.replace(/^on([A-Z])/, (_m, c: string) => c.toLowerCase())
    if (outputs.has(output)) bindings.push(`(${output})="cb('${cb}', $event)"`)
    else if (DOM_EVENTS[cb]) bindings.push(`(${DOM_EVENTS[cb]})="cb('${cb}', $event)"`)
    else throw new Error(`angular: ${name} has no output ${output} for ${cb}`)
  }
  const projected = [
    renderNodes(children, built, scope),
    ...Object.entries(slots).map(([slot, list]) => {
      if (!mirror.ngContentSelectors.some((s) => s.includes(slot))) {
        throw new Error(`angular: ${name} has no <ng-content select="[slot=${slot}]">`)
      }
      return `<ng-container ngProjectAs="[slot=${slot}]">${renderNodes(list, built, scope)}</ng-container>`
    }),
  ].join('')
  return `<${tag} ${bindings.join(' ')}>${projected}</${tag}>`
}

const hasTemplates = (value: unknown): boolean => {
  if (isPlaceholder(value)) return true
  if (Array.isArray(value)) return value.some(hasTemplates)
  if (value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
    return Object.values(value).some(hasTemplates)
  }
  return false
}

/**
 * Builds a standalone component for a probe button. Its selector matches the
 * exact button every framework renders, so the host is that button.
 *
 * @param spec - The probe.
 * @returns The component type.
 */
const probeComponent = (spec: ProbeSpec): Type<unknown> =>
  Component({
    selector: `button[data-parity-probe="${spec.label}"]`,
    standalone: true,
    template: text(spec.label),
    host: { '(click)': 'call()', '[attr.data-parity-value]': 'value()' },
  })(
    class ConformanceProbe {
      // A field initializer runs in the component's injection context.
      readonly result = (exportsOf[spec.probe] as () => unknown)()
      /** A value hook returns a signal. */
      value(): string | null {
        return probeValue(spec, isSignal(this.result) ? this.result() : this.result) ?? null
      }
      call(): void {
        callProbe(spec, this.result)
      }
    },
  ) as Type<unknown>

/**
 * The mount wrapper for cases with an auth context: holds its content until
 * the auth client has decided the session, exactly like React's reference
 * mount inside `AuthProvider` (default `awaitSession`). Its host is unwrapped
 * by the DOM normalizer (`data-parity-unwrap`), so it adds nothing to the
 * snapshot.
 */
const SessionGate = Component({
  selector: 'mol-session-gate',
  standalone: true,
  host: { 'data-parity-unwrap': '', style: 'display: contents' },
  template: `@if (decided()) {<ng-content></ng-content>}`,
})(
  class MolSessionGate implements DoCheck {
    /** The auth status this gate holds on (`'loading'` renders nothing). */
    readonly status = useAuth().status
    private readonly host: ElementRef<HTMLElement> = inject(ElementRef)
    /**
     * Whether the session is decided.
     * @returns True once the status has left `'loading'`.
     */
    decided(): boolean {
      return this.status() !== 'loading'
    }
    /**
     * Adopts the decided content beside the gate, so the gate element never
     * appears in a `@focus` path (React's AuthProvider renders no DOM).
     */
    ngDoCheck(): void {
      const host = this.host.nativeElement
      const parent = host.parentNode
      if (!parent) return
      for (const node of Array.from(host.childNodes)) parent.insertBefore(node, host)
    }
  },
)

/** The Angular adapter. */
export const angularAdapter: FrameworkAdapter = {
  name: 'angular',
  has: (component) => isComponent(exportsOf[component]),
  exportNames: Object.keys(exportsOf),
  async run(component, testCase: UICase) {
    const recorder = new CallRecorder(testCase.callbackResults)
    const services = buildServices(testCase, recorder)
    const spies = new Map((testCase.callbacks ?? []).map((name) => [name, recorder.spy(name)]))
    const built: Built = {
      used: new Set(),
      probes: new Map(),
      nested: [],
      strings: [],
      templates: new Map(),
    }
    // Props a later `props` step adds must be bound from the start (undefined until set);
    // their markers' templates are registered now too.
    const initialProps: Record<string, unknown> = materialize(testCase.props ?? {}, built)
    const laterProps: Record<string, unknown>[] = []
    for (const step of testCase.interactions ?? []) {
      if (step.type !== 'props') continue
      const next = materialize(step.props, built)
      laterProps.push(next)
      for (const k of Object.keys(next)) if (!(k in initialProps)) initialProps[k] = undefined
    }
    const main = renderComponent(
      component,
      initialProps,
      'p',
      testCase.callbacks ?? [],
      testCase.children,
      testCase.slots ?? {},
      built,
      'static',
      laterProps,
    )
    const templates = [...built.templates.values()].sort((a, b) => a.id - b.id)
    // Template refs are visible across the whole view, so `tpls` may name templates defined after it.
    const refs = `@let tpls = [${templates.map((t) => `tpl${t.id}`).join(', ')}];`
    // React's reference adapter wraps the tree in `AuthProvider`, whose default
    // `awaitSession` renders nothing while the auth status is `'loading'` — the
    // components themselves never see the undecided state. The gate below
    // reproduces that mount wrapper (as the Vue adapter's `SessionReady` does);
    // it renders nothing until the client has decided the session.
    const gateOpen = services.auth ? `<mol-session-gate>` : ''
    const gateClose = services.auth ? `</mol-session-gate>` : ''
    const template = `${templates.length ? refs : ''}${gateOpen}${main}${gateClose}${templates
      .map((t) => t.markup)
      .join('')}`

    const cache = new WeakMap<object, unknown>()
    const host = Component({
      selector: 'div[data-parity-unwrap]',
      // Angular derives a component id from the definition, so two cases with the
      // same template collide (NG0912); the normalizer drops this wrapper anyway.
      host: { 'data-parity-host': String(++hostCount) },
      standalone: true,
      imports: [
        ...(services.auth ? [SessionGate] : []),
        ...[...built.used].map((n) => exportsOf[n] as Type<unknown>),
        ...built.probes.values(),
      ],
      changeDetection: ChangeDetectionStrategy.Default,
      template,
    })(
      class ConformanceHost {
        p: Record<string, unknown> = initialProps
        np = built.nested
        s = built.strings
        /** Recording spies bound as function inputs (`callbacks` inputs). */
        cbFns: Record<string, (...args: unknown[]) => unknown> = {}
        cb = (name: string, value: unknown): void => {
          const spy = spies.get(name)
          if (!spy) return
          // An output emitted without a value records zero arguments (React's
          // no-argument callbacks, e.g. onConfirm); Angular cannot distinguish
          // emit() from emit(undefined), so undefined means "no args".
          if (value === undefined) spy()
          else spy(value)
        }
        /** Swaps template placeholders for the templates (memoized, so inputs keep their identity). */
        r = (value: unknown, refs: TemplateRef<unknown>[]): unknown => {
          if (isPlaceholder(value)) return refs[value.$tpl]
          if (!value || typeof value !== 'object') return value
          const hit = cache.get(value)
          if (hit !== undefined) return hit
          const out = Array.isArray(value)
            ? value.map((v) => this.r(v, refs))
            : Object.getPrototypeOf(value) === Object.prototype
              ? Object.fromEntries(Object.entries(value).map(([k, v]) => [k, this.r(v, refs)]))
              : value
          cache.set(value, out)
          return out
        }
        /** Interpolates `{0.field}` placeholders with a render template's arguments. */
        ip = (value: string, args: unknown[]): string => interpolate(value, args)
      },
    ) as Type<{
      p: Record<string, unknown>
      cbFns: Record<string, (...args: unknown[]) => unknown>
    }>

    let stepProps = 0
    return runSteps(
      testCase,
      async (container) => {
        const appRef: ApplicationRef = await createApplication({
          providers: [
            provideZonelessChangeDetection(),
            provideI18n(services.i18n),
            provideRouter(services.router),
            provideTheme(services.theme),
            ...(services.auth ? [provideAuth(services.auth)] : []),
          ],
        })
        const ref: ComponentRef<{
          p: Record<string, unknown>
          cbFns: Record<string, (...args: unknown[]) => unknown>
        }> = createComponent(host, {
          environmentInjector: appRef.injector,
        })
        container.appendChild(ref.location.nativeElement as HTMLElement)
        ref.instance.cbFns = Object.fromEntries(spies)
        appRef.attachView(ref.hostView)
        appRef.tick()
        return {
          flush: async () => {
            appRef.tick()
            await settle()
            await appRef.whenStable()
            appRef.tick()
          },
          setProps: async () => {
            // Steps run in order, so the next materialized `props` step is this one.
            ref.instance.p = { ...ref.instance.p, ...laterProps[stepProps++] }
            // Zoneless: tick() only refreshes views marked dirty, and nothing marks
            // the host after a plain field write, so mark it before ticking.
            ref.changeDetectorRef.markForCheck()
            appRef.tick()
          },
          location: () => {
            const l = services.router.getLocation()
            return `${l.pathname}${l.search}`
          },
          locationState: () => services.router.getLocation().state,
          navigate: (to) => {
            services.router.navigate(to)
          },
          unmount: async () => {
            appRef.destroy()
          },
        }
      },
      recorder,
    )
  },
}
