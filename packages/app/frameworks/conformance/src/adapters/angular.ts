/**
 * Angular conformance adapter: `createAngularAdapter({ exports, binding })`
 * renders the kit's cases with Angular. `@molecule/app-ui-angular` passes its
 * own exports; an Angular feature package passes the UI package's exports plus
 * its own, so its cases can nest UI components and call its composables.
 *
 * A test entry must `import '@angular/compiler'` BEFORE the binding module:
 * the binding pulls in partially compiled Angular libraries whose decorators
 * need the JIT compiler at module-evaluation time.
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
 * - A list a `children` step replaces (the children or a slot) is a keyed `@for` over the ids
 *   the host holds now, whose body is a `@switch` of every node the list ever holds (projected
 *   content is compiled with the host, so the template holds them all from the start).
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
  ElementRef,
  type EnvironmentProviders,
  inject,
  isSignal,
  provideZonelessChangeDetection,
  reflectComponentType,
  type Signal,
  type TemplateRef,
  type Type,
  ViewChild,
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'

import type { AuthClient, AuthStatus } from '@molecule/app-auth'
import type { I18nProvider } from '@molecule/app-i18n'
import type { Router } from '@molecule/app-routing'
import type { ThemeProvider } from '@molecule/app-theme'

import type { BindingServices } from '../bindings/spec.js'
import {
  type BindingCaseResets,
  buildAppServices,
  buildServices,
  callProbe,
  CallRecorder,
  changingLists,
  type ChildLists,
  childListStates,
  type FnValue,
  type FrameworkAdapter,
  hasChildSteps,
  interpolate,
  isComponentSpec,
  isProbeSpec,
  materializeProps,
  nodeIdentity,
  type NodeSpec,
  type ProbeSpec,
  probeValue,
  resetBindingForCase,
  type RunOptions,
  runSteps,
  settle,
  type UICase,
} from '../ui/index.js'

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

/**
 * The element a component instance hands a caller's ref: its `element()` signal (see `BaseProps` in
 * `@molecule/app-ui`), or null.
 *
 * @param instance - The component instance a template variable names.
 * @returns The element, or null.
 */
const refElementOf = (instance: unknown): Element | null => {
  if (!instance || typeof instance !== 'object' || !('element' in instance)) return null
  const read = instance.element
  if (!isSignal(read)) return null
  const element: unknown = read()
  return element instanceof Element ? element : null
}

/** Hosts mounted so far: each gets its own id (see the host's `data-parity-host`). */
let hostCount = 0

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

/**
 * One list of a case with a `children` step (its children, or one slot): every node the list ever
 * holds, by id, and the host expression that holds the list's ids now.
 */
interface ListBlock {
  /** The host expression of the list's current ids (`c.children`, `c.slots['footer']`). */
  ids: string
  /** Every node the list holds at mount or after a step, by id. */
  nodes: Map<string, NodeSpec>
}

/** The lists a case's `children` steps replace, which the host renders as `@for` blocks. */
interface ListBlocks {
  /** The children, when a step replaces them. */
  children?: ListBlock
  /** Every slot a step replaces. */
  slots: Record<string, ListBlock>
}

/** The node ids each list holds at one moment of the case (the host's `c`). */
interface ListIds {
  children: string[]
  slots: Record<string, string[]>
}

/** A node's root element as content projection matches it: its tag and static attributes. */
interface ProjectedRoot {
  tag: string
  attrs: Record<string, string>
}

/**
 * Whether an `<ng-content select>` selector matches a projected node's root, as Angular matches
 * static attributes: a tag, and `[attr]` / `[attr=value]` parts.
 *
 * @param selector - One of the component's `ngContentSelectors` (not `*`).
 * @param root - The node's root.
 * @returns Whether the node would be projected there.
 * @throws {Error} For selector syntax this matcher does not read (a class, `:not()`).
 */
const projectionMatches = (selector: string, root: ProjectedRoot): boolean =>
  selector.split(',').some((part) => {
    const simple = part.trim()
    const tag = /^[a-z][\w-]*/i.exec(simple)?.[0]
    const rest = tag ? simple.slice(tag.length) : simple
    if (rest.replace(/\[[^\]]*\]/g, '').trim())
      throw new Error(
        `angular: cannot match the content selector "${selector}" for a children step`,
      )
    if (tag && tag.toLowerCase() !== root.tag.toLowerCase()) return false
    return [...rest.matchAll(/\[([\w-]+)(?:=["']?([^"'\]]*)["']?)?\]/g)].every(
      ([, name, value]) =>
        name! in root.attrs && (value === undefined || root.attrs[name!] === value),
    )
  })

const argsExpr = `[${Array.from({ length: RENDER_ARGS }, (_v, i) => `a${i}`).join(', ')}]`

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

const hasTemplates = (value: unknown): boolean => {
  if (isPlaceholder(value)) return true
  if (Array.isArray(value)) return value.some(hasTemplates)
  if (value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
    return Object.values(value).some(hasTemplates)
  }
  return false
}

/**
 * The lists a case's `children` steps replace, as `@for` blocks, and the ids each list holds at
 * mount and after each step. A node keeps its id while its identity (`nodeIdentity`: its key, or its
 * position, with its content) stays in the list. A list a step stopped passing (`null`) holds no
 * ids: in Angular a slot not passed and a slot whose `@for` is empty are the same template state
 * (no node), as a false `@if` around it is.
 *
 * @param testCase - The case.
 * @returns No blocks for a case without such a step; otherwise the blocks and one `ListIds` per
 *   moment (mount, then each `children` step).
 */
function listBlocksOf(testCase: UICase): { blocks?: ListBlocks; ids: ListIds[] } {
  if (!hasChildSteps(testCase)) return { ids: [] }
  const states = childListStates(testCase)
  const field = (
    read: (lists: ChildLists) => NodeSpec[] | null | undefined,
    expr: string,
  ): { block: ListBlock; ids: string[][] } => {
    const byIdentity = new Map<string, string>()
    const nodes = new Map<string, NodeSpec>()
    const ids = states.map((lists) =>
      (read(lists) ?? []).map((node, index) => {
        const identity = nodeIdentity(node, index)
        let id = byIdentity.get(identity)
        if (id === undefined) {
          id = `n${byIdentity.size}`
          byIdentity.set(identity, id)
          nodes.set(id, node)
        }
        return id
      }),
    )
    return { block: { ids: expr, nodes }, ids }
  }
  const changing = changingLists(testCase)
  const children = changing.children ? field((lists) => lists.children, 'c.children') : undefined
  const slots = [...changing.slots].map(
    (slot) => [slot, field((lists) => lists.slots[slot], `c.slots['${slot}']`)] as const,
  )
  return {
    blocks: {
      ...(children ? { children: children.block } : {}),
      slots: Object.fromEntries(slots.map(([slot, list]) => [slot, list.block])),
    },
    ids: states.map((_lists, index) => ({
      children: children?.ids[index] ?? [],
      slots: Object.fromEntries(slots.map(([slot, list]) => [slot, list.ids[index]!])),
    })),
  }
}

/** What the adapter needs from `@molecule/app-angular` (the package under test passes the module). */
export interface AngularBinding extends BindingCaseResets {
  provideAuth(client: AuthClient<Record<string, unknown>>): EnvironmentProviders
  provideI18n(provider: I18nProvider): EnvironmentProviders
  /** The router, with the routing bond's routed view (`mol-routed-view` renders it). */
  provideRouter(router: Router, options?: { routedView?: Type<unknown> }): EnvironmentProviders
  provideTheme(provider: ThemeProvider): EnvironmentProviders
  /** The renderer rules the ports' components need (`provideMolecule` includes them). */
  provideDomPlacement(): EnvironmentProviders
  /** Gives `usePlacement` the gate's own moments (the gate lists it in `hostDirectives`). */
  MolPlacement: Type<unknown>
  /** Runs the gate's placement function. */
  usePlacement(place: () => void): void
  /** Renders the gate's content in front of the gate. */
  placeContentBefore(capture: Element, sibling: Node): void
  /** Takes the gate's own element out of the DOM. */
  setElementPresent(element: Node, present: boolean): void
  /** Auth state; the session gate holds its content until `status` leaves `'loading'`. */
  useAuth(): { status: Signal<AuthStatus> }
  /** The full composition root, for feature cases that mount with every service (`RunOptions.app`). */
  provideMolecule(
    services: Partial<BindingServices> & { awaitSession?: boolean },
  ): EnvironmentProviders
}

/** Options for {@link createAngularAdapter}. */
export interface AngularAdapterOptions {
  /** Every component and composable the cases may render or call. */
  exports: Record<string, unknown>
  /** `@molecule/app-angular`. */
  binding: AngularBinding
}

/**
 * An Angular adapter over one export map.
 *
 * @param options - The exports to render and the Angular binding.
 * @returns The adapter.
 */
export function createAngularAdapter({
  exports: exportsOf,
  binding,
}: AngularAdapterOptions): FrameworkAdapter {
  const {
    provideAuth,
    MolPlacement,
    placeContentBefore,
    provideDomPlacement,
    provideI18n,
    provideMolecule,
    provideRouter,
    provideTheme,
    setElementPresent,
    useAuth,
    usePlacement,
  } = binding

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

  /** The recording spy for a nested `{ $callback }` in the running case. */
  let callbackSpy: ((name: string) => (...args: unknown[]) => unknown) | undefined

  /**
   * Replaces `{ $nodes }` / `{ $fn }` / `{ $callback }` markers in props with
   * template placeholders (registering the templates); plain functions and
   * recording spies stay functions.
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
      callback: callbackSpy,
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
    /** A template variable on the component, for the host's ref query (a ref case). */
    templateVariable?: string,
    /**
     * A case with a `children` step: the lists its steps replace, as `@for` blocks over the ids
     * the host holds now, in place of those in `children` and `slots`.
     */
    lists?: ListBlocks,
  ): string => {
    const Comp = exportsOf[name]
    if (!isComponent(Comp))
      throw new Error(`angular: ${name} is not an exported standalone component`)
    built.used.add(name)
    const mirror = reflectComponentType(Comp)!
    const inputs = new Set(mirror.inputs.map((i) => i.templateName))
    const outputs = new Set(mirror.outputs.map((o) => o.templateName))
    const { tag, attrs } = parseSelector(mirror.selector)
    const bindings: string[] = [...attrs, ...(templateVariable ? [`#${templateVariable}`] : [])]
    for (const key of Object.keys(props)) {
      const raw = `${propsExpr}['${key}']`
      // A node value may arrive in the initial props OR in a later `props` step;
      // when either carries one, the binding must swap placeholders for templates.
      const templated =
        hasTemplates(props[key]) || laterProps.some((lp) => key in lp && hasTemplates(lp[key]))
      const value = templated ? `r(${raw}, tpls)` : raw
      const handlerOutput = key.replace(/^on([A-Z])/, (_m, c: string) => c.toLowerCase())
      if (inputs.has(key)) bindings.push(`[${key}]="${value}"`)
      else if (typeof props[key] === 'function' && /^on[A-Z]/.test(key)) {
        // A nested component's handler prop (`{ $callback }`) is wired the way a case's own
        // `callbacks` are: the component's output of that name, else the DOM event.
        if (outputs.has(handlerOutput)) bindings.push(`(${handlerOutput})="${raw}($event)"`)
        else if (DOM_EVENTS[key]) bindings.push(`(${DOM_EVENTS[key]})="${raw}($event)"`)
        else throw new Error(`angular: ${name} has no output ${handlerOutput} for ${key}`)
      } else if (key === 'className') bindings.push(`[class]="${value}"`)
      else if (key === 'style') bindings.push(`[style]="${value}"`)
      else if (props[key] !== null && typeof props[key] === 'object') {
        throw new Error(`angular: ${name} has no input "${key}" for an object value`)
      } else
        bindings.push(
          `[attr.${key}]="${value} === false ? null : ${value} === true ? '' : ${value}"`,
        )
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
    const slotContent = (slot: string, content: string): string => {
      if (!mirror.ngContentSelectors.some((s) => s.includes(slot))) {
        throw new Error(`angular: ${name} has no <ng-content select="[slot=${slot}]">`)
      }
      return `<ng-container ngProjectAs="[slot=${slot}]">${content}</ng-container>`
    }
    const changing = lists ?? { slots: {} }
    const projected = [
      changing.children
        ? childrenBlock(name, mirror.ngContentSelectors, changing.children, built)
        : renderNodes(children, built, scope),
      ...Object.entries(slots)
        .filter(([slot]) => !(slot in changing.slots))
        .map(([slot, list]) => slotContent(slot, renderNodes(list, built, scope))),
      ...Object.entries(changing.slots).map(([slot, list]) =>
        slotContent(slot, forBlock(list, built)),
      ),
    ].join('')
    return `<${tag} ${bindings.join(' ')}>${projected}</${tag}>`
  }

  /**
   * A list that changes, as a template whose list changes writes it: a keyed `@for` over the ids
   * the host holds now, whose body is a `@switch` of every node the list ever holds. Nothing when
   * the list never holds a node.
   *
   * @param list - The list's nodes and ids.
   * @param built - The template under construction.
   * @returns The `@for` block.
   */
  const forBlock = (list: ListBlock, built: Built): string =>
    list.nodes.size === 0
      ? ''
      : `@for (k of ${list.ids}; track k) {@switch (k) {${[...list.nodes]
          .map(([id, node]) => `@case ('${id}') {${renderNode(node, built, 'static')}}`)
          .join('')}}}`

  /**
   * The root element content projection matches for a node, or null for text (which goes to the
   * catch-all `<ng-content>`).
   *
   * @param node - A node of the case.
   * @returns Its tag and static attributes.
   */
  const projectedRoot = (node: NodeSpec): ProjectedRoot | null => {
    if (typeof node === 'string') return null
    if (isProbeSpec(node))
      return { tag: 'button', attrs: { type: 'button', 'data-parity-probe': node.label } }
    if (isComponentSpec(node)) {
      const Comp = exportsOf[node.component]
      if (!isComponent(Comp)) return null
      const { tag, attrs } = parseSelector(reflectComponentType(Comp)!.selector)
      return {
        tag,
        attrs: Object.fromEntries(
          attrs.map((a) => {
            const [key, value] = a.split('=')
            return [key!, value === undefined ? '' : value.replace(/^"|"$/g, '')]
          }),
        ),
      }
    }
    return { tag: node.tag, attrs: node.attrs ?? {} }
  }

  /**
   * The children's `@for` block, projected where its nodes would be. A control-flow block whose
   * body is not one element is projected into the catch-all `<ng-content>`, so a list whose nodes
   * a narrower `<ng-content select>` takes is wrapped in `<ng-container ngProjectAs>` with that
   * selector.
   *
   * @param name - The component, for the error.
   * @param selectors - Its `ngContentSelectors`.
   * @param list - The children's nodes and ids.
   * @param built - The template under construction.
   * @returns The projected block.
   * @throws {Error} When the nodes would go to more than one place.
   */
  const childrenBlock = (
    name: string,
    selectors: readonly string[],
    list: ListBlock,
    built: Built,
  ): string => {
    const block = forBlock(list, built)
    const narrow = selectors.filter((s) => s !== '*')
    const places = new Set(
      [...list.nodes.values()].map((node) => {
        const root = projectedRoot(node)
        return (root && narrow.find((s) => projectionMatches(s, root))) ?? '*'
      }),
    )
    if (places.size > 1)
      throw new Error(
        `angular: ${name}'s children in a children step would be projected into more than one <ng-content> (${[...places].join(', ')})`,
      )
    const [place] = places
    return place === undefined || place === '*'
      ? block
      : `<ng-container ngProjectAs="${attr(place)}">${block}</ng-container>`
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
      // A hook can return a plain value that changes outside Angular: re-read it on every check.
      changeDetection: ChangeDetectionStrategy.Eager,
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
        /** Performs the probe's click: calls the hook (or its method). */
        call(): void {
          callProbe(spec, this.result)
        }
      },
    ) as Type<unknown>

  /**
   * The mount wrapper for cases with an auth context: holds its content until
   * the auth client has decided the session, exactly like React's reference
   * mount inside `AuthProvider` (default `awaitSession`). React's AuthProvider
   * renders no DOM, so the gate renders its content in its own place and takes
   * its element out of the DOM: it appears in no snapshot and no `@focus` path.
   */
  const SessionGate = Component({
    changeDetection: ChangeDetectionStrategy.Eager,
    selector: 'mol-session-gate',
    standalone: true,
    hostDirectives: [MolPlacement],
    template: `@if (decided()) {<ng-content></ng-content>}`,
  })(
    class MolSessionGate {
      /** The auth status this gate holds on (`'loading'` renders nothing). */
      readonly status = useAuth().status

      constructor() {
        const host = (inject(ElementRef) as ElementRef<HTMLElement>).nativeElement
        usePlacement(() => {
          placeContentBefore(host, host)
          setElementPresent(host, false)
        })
      }

      /**
       * Whether the session is decided.
       * @returns True once the status has left `'loading'`.
       */
      decided(): boolean {
        return this.status() !== 'loading'
      }
    },
  )

  return {
    name: 'angular',
    has: (component) => isComponent(exportsOf[component]),
    exportNames: Object.keys(exportsOf),
    async run(component, testCase: UICase, options: RunOptions = {}) {
      resetBindingForCase(binding)
      const recorder = new CallRecorder(testCase.callbackResults)
      callbackSpy = (name) => recorder.spy(name)
      const services = buildServices(testCase, recorder)
      // A feature case that reads HTTP, push, device …: the full composition root.
      const full = options.app ? buildAppServices(testCase, recorder, options.app) : null
      const router = full ? full.services.router : services.router
      // React's MoleculeProvider (the full composition root) renders with
      // `awaitSession: false`: no session gate.
      const gated = Boolean(services.auth) && !full
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
      // A case with a `children` step: the template holds every node each list ever holds
      // (projected content is compiled with the host), and the host's `c` holds each list's ids
      // at mount and after each step.
      const { blocks, ids: listIds } = listBlocksOf(testCase)
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
        testCase.ref ? 'parityRef' : undefined,
        blocks,
      )
      const templates = [...built.templates.values()].sort((a, b) => a.id - b.id)
      // Template refs are visible across the whole view, so `tpls` may name templates defined after it.
      const refs = `@let tpls = [${templates.map((t) => `tpl${t.id}`).join(', ')}];`
      // React's reference adapter wraps the tree in `AuthProvider`, whose default
      // `awaitSession` renders nothing while the auth status is `'loading'` — the
      // components themselves never see the undecided state. The gate below
      // reproduces that mount wrapper (as the Vue adapter's `SessionReady` does);
      // it renders nothing until the client has decided the session.
      const gateOpen = gated ? `<mol-session-gate>` : ''
      const gateClose = gated ? `</mol-session-gate>` : ''
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
          ...(gated ? [SessionGate] : []),
          ...[...built.used].map((n) => exportsOf[n] as Type<unknown>),
          ...built.probes.values(),
        ],
        changeDetection: ChangeDetectionStrategy.Eager,
        template,
      })(
        class ConformanceHost {
          p: Record<string, unknown> = initialProps
          /** The node ids each list of a case with a `children` step holds now. */
          c: ListIds = listIds[0] ?? { children: [], slots: {} }
          /** The case component's instance, for a ref case. */
          parityRef: unknown = undefined
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
        c: ListIds
        cbFns: Record<string, (...args: unknown[]) => unknown>
        parityRef: unknown
      }>

      // The routing bond's routed view, as an app's router provider gives it: the case's
      // `routedPage` text, or nothing. Its host is unwrapped like the case's own host, and named
      // after it so no two cases share a definition.
      const routedPage = Component({
        changeDetection: ChangeDetectionStrategy.Eager,
        selector: 'div[data-parity-routed-page]',
        host: { 'data-parity-unwrap': '', 'data-parity-routed-page': String(hostCount) },
        standalone: true,
        template: text(testCase.context?.routedPage ?? ''),
      })(class ConformanceRoutedPage {})

      // A ref case reads the component instance its template variable names (a caller's `#ref` or
      // `viewChild`), then that instance's `element()`. The query is registered the way the decorator
      // registers it, before the host is first compiled: JIT ignores `queries` in `Component()` metadata.
      if (testCase.ref) ViewChild('parityRef')(host.prototype, 'parityRef')
      let stepProps = 0
      let stepChildren = 0
      try {
        return await runSteps(
          testCase,
          async (container) => {
            const appRef: ApplicationRef = await createApplication({
              providers: full
                ? [
                    provideZonelessChangeDetection(),
                    // React's MoleculeProvider renders with `awaitSession: false` here too.
                    provideMolecule({ ...full.services, awaitSession: false }),
                    provideRouter(full.services.router, { routedView: routedPage }),
                  ]
                : [
                    provideZonelessChangeDetection(),
                    provideDomPlacement(),
                    provideI18n(services.i18n),
                    provideRouter(services.router, { routedView: routedPage }),
                    provideTheme(services.theme),
                    ...(services.auth ? [provideAuth(services.auth)] : []),
                  ],
            })
            /**
             * Creates the host component in the app and attaches it to the container.
             *
             * @param props - The props it starts with (the case's, or on a remount the last ones).
             * @returns The host's component ref.
             */
            const show = (
              props: Record<string, unknown>,
              lists?: ListIds,
            ): ComponentRef<{
              p: Record<string, unknown>
              c: ListIds
              cbFns: Record<string, (...args: unknown[]) => unknown>
              parityRef: unknown
            }> => {
              const created = createComponent(host, {
                environmentInjector: appRef.injector,
              })
              created.instance.p = props
              if (lists) created.instance.c = lists
              container.appendChild(created.location.nativeElement as HTMLElement)
              created.instance.cbFns = Object.fromEntries(spies)
              appRef.attachView(created.hostView)
              appRef.tick()
              return created
            }
            let ref: ReturnType<typeof show>
            try {
              ref = show(initialProps)
            } catch (error) {
              // A first render that throws hands the runner no case to tear down: destroy the
              // application here, or its effects and listeners run on into the cases after it.
              appRef.destroy()
              throw error
            }
            /**
             * Change detection after each interaction and each timer callback of an advance, as
             * the app's scheduler runs it after each task in a browser.
             *
             * @param step - The work to run.
             */
            const tickAfter = async (step: () => unknown): Promise<void> => {
              await step()
              appRef.tick()
            }
            return {
              flush: async () => {
                appRef.tick()
                // Through the same scope as every later step: a timer callback the mount runs
                // (a session restoring its queue) writes a signal outside change detection, and
                // zoneless Angular's own render for it waits on a fake timer nothing advances,
                // so whenStable() would never resolve.
                await settle(tickAfter)
                await appRef.whenStable()
                appRef.tick()
              },
              wrap: tickAfter,
              setProps: async () => {
                // Steps run in order, so the next materialized `props` step is this one.
                ref.instance.p = { ...ref.instance.p, ...laterProps[stepProps++] }
                // Zoneless: tick() only refreshes views marked dirty, and nothing marks
                // the host after a plain field write, so mark it before ticking.
                ref.changeDetectorRef.markForCheck()
                appRef.tick()
              },
              setChildren: async () => {
                // Steps run in order, so the next ids are this step's; written as `setProps` writes `p`.
                const next = listIds[++stepChildren]
                if (!next)
                  throw new Error('angular: a children step the template was not built for')
                ref.instance.c = next
                ref.changeDetectorRef.markForCheck()
                appRef.tick()
              },
              location: () => {
                const l = router.getLocation()
                return `${l.pathname}${l.search}`
              },
              locationState: () => router.getLocation().state,
              navigate: (to) => {
                router.navigate(to)
              },
              refElement: () => refElementOf(ref.instance.parityRef),
              // A page leaving destroys its component; the application and its
              // environment injector live on, so a hook bound to them (instead of
              // the component's own injector) still runs after an `unmount` step.
              unmount: async () => {
                const element = ref.location.nativeElement as HTMLElement
                ref.destroy()
                element.remove()
              },
              // The same application, with the props and lists the destroyed host last had.
              remount: async () => {
                ref = show(ref.instance.p, ref.instance.c)
              },
              dispose: async () => {
                appRef.destroy()
              },
            }
          },
          recorder,
          full,
        )
      } finally {
        await full?.dispose()
      }
    },
  }
}
