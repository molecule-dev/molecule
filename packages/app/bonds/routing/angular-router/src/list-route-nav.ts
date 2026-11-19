/**
 * Navigation between URL-backed list views, using the same declaration for labels and
 * destinations: `<nav mol-list-route-nav>` for Angular, the counterpart of react-router's
 * `ListRouteNav`.
 *
 * @module
 */

import { NgTemplateOutlet } from '@angular/common'
import {
  Component,
  computed,
  DestroyRef,
  effect,
  type EmbeddedViewRef,
  inject,
  Input,
  type Signal,
  signal,
  TemplateRef,
  ViewContainerRef,
} from '@angular/core'
import { Router as AngularRouter } from '@angular/router'

import { followRouterLink, generatePath } from '@molecule/app-routing'

import { useMoleculeRouter } from './hooks.js'
import type {
  ListRouteAuth,
  ListRouteOptions,
  ListRouteResult,
  ListRouteSelection,
} from './list-types.js'
import type { RouteParams } from './types.js'
import { useListRoute, type UseListRouteResult } from './use-list-route.js'

/**
 * A choice's label: text, or a template when the app renders an icon beside the name.
 *
 * React's `label` is a `ReactNode`; Angular's counterpart of a node is a `TemplateRef`
 * (the node-value convention the framework's other components share), so a label is
 * plain text or a template rendered inside the choice's link.
 */
export type ListRouteNavLabel = string | number | TemplateRef<unknown>

/** A named list view and its navigation label. */
export interface ListRouteNavItem extends ListRouteSelection {
  /** Translated label, optionally including an icon. */
  label: ListRouteNavLabel
  /** Path parameters for this destination; current route parameters are otherwise retained. */
  params?: RouteParams
  /** Keep the choice visible but prevent navigation. Authorization still belongs in the route. */
  disabled?: boolean
}

/** URL-derived state available to the app's link styling. */
export interface ListRouteNavItemState<Selection extends string = string> {
  /** The app-owned selection key. */
  selection: Selection
  /** Whether the current URL selects this view. */
  active: boolean
  /** Whether navigation is disabled for this choice. */
  disabled: boolean
}

/**
 * What a `children` template receives: the list result, under `$implicit` (so a template
 * reads it as `let-route`) and as `route`.
 *
 * @template Selection - The selection names.
 */
export interface ListRouteNavContext<Selection extends string = string> {
  /** The resolved list, as React's `children` function receives it. */
  $implicit: ListRouteResult<string, Selection>
  /** The resolved list under a readable name. */
  route: ListRouteResult<string, Selection>
}

/**
 * Props for URL-backed list navigation; local content panels use the UI package's Tabs
 * instead.
 *
 * In Angular these are the component's inputs; `aria-label` and every other native nav
 * attribute (`id`, `class`, `data-*`) are written on the host element itself, which IS the
 * `<nav>` — the same attributes React spreads onto its nav.
 */
export interface ListRouteNavProps<Selection extends string = string> {
  /** Accessible navigation name, translated by the app; set it on the host `<nav>`. */
  'aria-label': string
  /** Every declared view stays visible on every route; labels and targets share one declaration. */
  selections: Record<Selection, ListRouteNavItem>
  /** Tie-breaker or fallback, with the same meaning as useListRoute's defaultSelection. */
  defaultSelection?: NoInfer<Selection>
  /** Pagination query key to remove on selection, defaulting to page. */
  pageParam?: string
  /** Required for protected selections, with the same readiness rules as useListRoute. */
  auth?: ListRouteAuth
  /** Render links in a list, with optional classes for the list and its items. */
  list?: { className?: string; itemClassName?: string }
  /** App-owned styling, resolved from its class map. */
  linkClassName?: string | ((state: ListRouteNavItemState<Selection>) => string | undefined)
  /**
   * Render the list beside the nav using its exact URL state, including resolved item
   * params. Angular passes a template (`<ng-template let-route>`); it renders after the
   * `<nav>`, as React's fragment does.
   */
  children?: TemplateRef<ListRouteNavContext<Selection>>
}

/** One rendered choice, with every attribute its element carries. */
interface RenderedChoice<Selection extends string> {
  /** The app-owned selection key. */
  selection: Selection
  /** The label's text, emptied when the label is a template. */
  text: string
  /** The label's template, when the app renders a node. */
  labelTemplate: TemplateRef<unknown> | null
  /** Whether the choice is visible but not navigable. */
  disabled: boolean
  /** The app's link class for this state. */
  className: string | undefined
  /** `active` or `inactive`, for the app's CSS. */
  state: 'active' | 'inactive'
  /** The app-owned selection key as the element's `data-mol-id`. */
  molId: string
  /** `page` while this choice is selected; otherwise absent. */
  current: 'page' | null
  /** The href the native router's own link would write, or null when disabled. */
  href: string | null
  /** The in-app destination a click navigates to, or null when disabled. */
  to: string | null
  /** The `<li>`'s class when the app renders a list. */
  itemClassName: string | undefined
}

/**
 * The declared choices with their keys as the app's selection type. `Object.entries`
 * widens a record's keys to `string`; the keys ARE the selection names by construction.
 *
 * @param selections - The declared choices.
 * @returns The choices, keyed by the app's selection name.
 */
const selectionEntries = <Selection extends string>(
  selections: Record<Selection, ListRouteNavItem>,
): [Selection, ListRouteNavItem][] => Object.entries(selections) as [Selection, ListRouteNavItem][]

/**
 * The text a label renders when it is plain text (React renders a string or a number as
 * text and a node through its own renderer).
 *
 * @param label - The choice's label.
 * @returns The text, or the empty string for a template.
 */
const labelText = (label: ListRouteNavLabel): string =>
  typeof label === 'string' ? label : typeof label === 'number' ? String(label) : ''

/**
 * The template a label renders itself through, for a node-valued label.
 *
 * @param label - The choice's label.
 * @returns The template, or null for plain text.
 */
const labelTemplateOf = (label: ListRouteNavLabel): TemplateRef<unknown> | null =>
  label instanceof TemplateRef ? label : null

/**
 * The nav's template. It is a constant, not an inline literal: every character inside an
 * anchor has to match React's DOM exactly (no formatting whitespace around a label), and
 * a formatted inline template would add it.
 */
const LIST_ROUTE_NAV_TEMPLATE = `<ng-template #choiceTemplate let-choice>@if (choice.disabled) {<span [attr.class]="choice.className" [attr.data-state]="choice.state" [attr.data-mol-id]="choice.molId" role="link" aria-disabled="true">@if (choice.labelTemplate) {<ng-container [ngTemplateOutlet]="choice.labelTemplate" />} @else {{{ choice.text }}}</span>} @else {<a [attr.class]="choice.className" [attr.data-state]="choice.state" [attr.data-mol-id]="choice.molId" [attr.aria-current]="choice.current" [attr.href]="choice.href" (click)="onChoiceClick($event, choice)">@if (choice.labelTemplate) {<ng-container [ngTemplateOutlet]="choice.labelTemplate" />} @else {{{ choice.text }}}</a>}</ng-template>
@if (matched()) {@if (withList()) {<ul [attr.class]="listClassName()">@for (choice of choices(); track choice.selection) {<li [attr.class]="choice.itemClassName"><ng-container [ngTemplateOutlet]="choiceTemplate" [ngTemplateOutletContext]="{$implicit: choice}" /></li>}</ul>} @else {@for (choice of choices(); track choice.selection) {<ng-container [ngTemplateOutlet]="choiceTemplate" [ngTemplateOutletContext]="{$implicit: choice}" />}}}`

/**
 * Render every declared list view as a router link. The URL selects the active choice, and
 * selecting any view resets pagination through useListRoute. Native link behavior (new-tab
 * clicks, keyboard activation and history) is preserved. This is a navigation landmark,
 * not an ARIA tablist with local panels. No active-value state or change handler is needed.
 * When `children` is supplied, its template renders after the navigation landmark. Put
 * loading and empty results in that branch so a pending list never removes the filter
 * controls.
 *
 * The host element IS the `<nav>` (attribute selector `nav[mol-list-route-nav]`), so the
 * app's own attributes — `aria-label`, `id`, `class` — sit on it exactly as React's props
 * do on its nav. The links are this component's OWN anchors: each `href` is the molecule
 * router's `createHref` (the href the native router's own link writes, base path and hash
 * history included), and a click goes through `followRouterLink`, so a modified click, a
 * `target` other than `_self` or an external URL is left to the browser. The rendered
 * markup is exactly react-router's `ListRouteNav`: same elements, attributes and ARIA, and
 * no styles of its own.
 *
 * Works inside any Angular application whose injector has Angular's `Router`; no
 * molecule provider is needed. Angular creates the page before its router has matched the
 * URL (React renders only once its router resolved one), so the navigation appears with
 * the router's first navigation. Where React takes nodes and a render function, this port
 * takes a `TemplateRef`: `label` may be a template rendered inside the link, and
 * `children` is a template rendered with the resolved list as its context.
 *
 * @example
 * ```ts
 * @Component({
 *   selector: 'app-order-views',
 *   standalone: true,
 *   imports: [ListRouteNav],
 *   template: `
 *     <nav
 *       mol-list-route-nav
 *       aria-label="Order views"
 *       [selections]="views"
 *       [children]="results"
 *     ></nav>
 *     <ng-template #results let-route>
 *       <order-results [selection]="route.selection" [page]="route.page" />
 *     </ng-template>
 *   `,
 * })
 * export class OrderViewsComponent {
 *   readonly views = {
 *     all: { path: '/orders', query: { view: undefined }, label: 'All orders' },
 *     open: { path: '/orders', query: { view: 'open' }, label: 'Open orders' },
 *   }
 * }
 * ```
 *
 * @template Selection - The app's selection names.
 */
@Component({
  selector: 'nav[mol-list-route-nav]',
  standalone: true,
  imports: [NgTemplateOutlet],
  template: LIST_ROUTE_NAV_TEMPLATE,
})
export class ListRouteNav<Selection extends string = string> {
  private readonly router = useMoleculeRouter()
  private readonly selectionsInput = signal<Record<Selection, ListRouteNavItem> | undefined>(
    undefined,
  )
  private readonly defaultSelectionInput = signal<Selection | undefined>(undefined)
  private readonly pageParamInput = signal<string | undefined>(undefined)
  private readonly authInput = signal<ListRouteAuth | undefined>(undefined)
  private readonly listInput = signal<{ className?: string; itemClassName?: string } | undefined>(
    undefined,
  )
  private readonly linkClassNameInput = signal<
    string | ((state: ListRouteNavItemState<Selection>) => string | undefined) | undefined
  >(undefined)
  // The current route's params, the base every choice's destination is built on, as React
  // reads them from `useParams()` on every render.
  private readonly routeParams = signal<RouteParams>(this.router.getParams())
  // Angular creates the page before its router has matched the URL (React renders only
  // after its router resolved one), so the nav appears with the native router's first
  // navigation; until then a choice's `:params` cannot be resolved and nothing renders.
  private readonly nativeRouter = inject(AngularRouter)
  private readonly matched = signal(this.nativeRouter.navigated)
  private readonly destroyRef = inject(DestroyRef)
  private readonly stopParams = this.router.subscribe(() => {
    this.routeParams.set(this.router.getParams())
    this.matched.set(true)
  })
  // The same declaration drives the list rules and the links: item params are applied to
  // the destination path, and the current route's params fill the rest.
  private readonly options = computed<ListRouteOptions<string, Selection>>(() => {
    const current = this.routeParams()
    const destinations: Record<string, ListRouteNavItem> = {}
    const declared = this.selectionsInput()
    if (declared !== undefined) {
      for (const [selection, item] of selectionEntries(declared)) {
        destinations[selection] = item.params
          ? { ...item, path: generatePath(item.path, { ...current, ...item.params }) }
          : item
      }
    }
    return {
      selections: destinations,
      defaultSelection: this.defaultSelectionInput(),
      pageParam: this.pageParamInput(),
      auth: this.authInput(),
    }
  })
  private readonly listRoute: UseListRouteResult<string, Selection> = useListRoute<
    string,
    Selection
  >(this.options)
  // React's `children` function receives the plain resolved list; the hook's signals are
  // read here so a template renders the same object.
  private readonly result = computed<ListRouteResult<string, Selection>>(() => {
    const list = this.listRoute
    return {
      page: list.page(),
      pageSize: list.pageSize(),
      offset: list.offset(),
      filters: list.filters(),
      selection: list.selection(),
      params: list.params(),
      canLoad: list.canLoad(),
      status: list.status(),
      redirectTo: list.redirectTo(),
      href: list.href,
      navigate: list.navigate,
      setPage: list.setPage,
      setFilters: list.setFilters,
      select: list.select,
    }
  })
  private readonly vcr = inject(ViewContainerRef)
  private readonly childrenContext: ListRouteNavContext<Selection> = {
    $implicit: this.result(),
    route: this.result(),
  }
  private childrenTemplate: TemplateRef<ListRouteNavContext<Selection>> | null = null
  private childrenView?: EmbeddedViewRef<ListRouteNavContext<Selection>>
  private viewReady = false

  /**
   * The declared choices, in declaration order. Each link's destination is resolved from
   * its own path and params against the current route's params.
   *
   * @param value - The app's selections.
   */
  @Input() set selections(value: Record<Selection, ListRouteNavItem>) {
    this.selectionsInput.set(value)
  }

  /**
   * Tie-breaker when several choices match, or the fallback when none does.
   *
   * @param value - The default selection.
   */
  @Input() set defaultSelection(value: Selection | undefined) {
    this.defaultSelectionInput.set(value)
  }

  /**
   * The pagination query key to reset on selection, defaulting to `page`.
   *
   * @param value - The query key.
   */
  @Input() set pageParam(value: string | undefined) {
    this.pageParamInput.set(value)
  }

  /**
   * Authentication readiness for protected selections.
   *
   * @param value - The auth status and sign-in URL.
   */
  @Input() set auth(value: ListRouteAuth | undefined) {
    this.authInput.set(value)
  }

  /**
   * Render the links in a list, with optional classes for the list and its items.
   *
   * @param value - The list markup options.
   */
  @Input() set list(value: { className?: string; itemClassName?: string } | undefined) {
    this.listInput.set(value)
  }

  /**
   * App-owned link styling: one class, or a function of each choice's URL-derived state.
   *
   * @param value - The link class or its resolver.
   */
  @Input() set linkClassName(
    value: string | ((state: ListRouteNavItemState<Selection>) => string | undefined) | undefined,
  ) {
    this.linkClassNameInput.set(value)
  }

  /**
   * The template rendered after the navigation landmark, with the resolved list as its
   * context (React's `children` render function).
   *
   * @param value - The children template.
   */
  @Input() set children(value: TemplateRef<ListRouteNavContext<Selection>> | undefined) {
    const next = value ?? null
    if (next === this.childrenTemplate) return
    this.childrenTemplate = next
    if (this.viewReady) this.renderChildren()
  }

  constructor() {
    this.destroyRef.onDestroy(this.stopParams)
    // React re-renders `children` with the new route; an embedded view's context object is
    // updated in place so its view never has to be rebuilt.
    effect(() => {
      const route = this.result()
      this.childrenContext.$implicit = route
      this.childrenContext.route = route
      // The nav (and its children) appear with the native router's first navigation.
      this.matched()
      this.renderChildren()
      this.childrenView?.markForCheck()
    })
  }

  /**
   * Each declared choice with the attributes it renders, recomputed whenever the URL or a
   * declaration changes.
   *
   * @returns The choices, in declaration order.
   */
  protected readonly choices = computed<RenderedChoice<Selection>[]>(() => {
    const route = this.result()
    const linkClassName = this.linkClassNameInput()
    const itemClassName = this.listInput()?.itemClassName
    const declared = this.selectionsInput()
    if (declared === undefined) return []
    return selectionEntries(declared).map(([selection, item]) => {
      const active = route.selection === selection
      const disabled = item.disabled === true
      const to = disabled ? null : route.href({ selection })
      return {
        selection,
        text: labelText(item.label),
        labelTemplate: labelTemplateOf(item.label),
        disabled,
        className:
          typeof linkClassName === 'function'
            ? linkClassName({ selection, active, disabled })
            : linkClassName,
        state: active ? 'active' : 'inactive',
        molId: `list-route-${selection}`,
        current: active ? 'page' : null,
        href: to === null ? null : this.router.createHref(to),
        to,
        itemClassName,
      }
    })
  })

  /**
   * Whether the choices render inside a `<ul>` / `<li>` list.
   *
   * @returns True when `list` was supplied.
   */
  protected readonly withList: Signal<boolean> = computed(() => this.listInput() !== undefined)

  /**
   * The `<ul>`'s class, when the app renders a list.
   *
   * @returns The class, or undefined.
   */
  protected listClassName(): string | undefined {
    return this.listInput()?.className
  }

  /**
   * Handles a choice's click: a plain primary click navigates through the molecule router;
   * a modified click, another `target` or an external URL is left to the browser.
   *
   * @param event - The anchor's click event.
   * @param choice - The clicked choice.
   */
  protected onChoiceClick(event: MouseEvent, choice: RenderedChoice<Selection>): void {
    if (choice.to === null) return
    followRouterLink(event, choice.to, this.router)
  }

  /**
   * Renders the children template, once the component's own view exists.
   */
  ngAfterViewInit(): void {
    this.viewReady = true
    this.renderChildren()
  }

  /**
   * Instantiates the children template through this component's `ViewContainerRef`, which
   * places it after the host `<nav>` — the sibling React's fragment renders. Nothing
   * renders until the native router has matched the URL.
   */
  private renderChildren(): void {
    if (!this.viewReady || !this.matched() || this.childrenTemplate === null) {
      this.childrenView?.destroy()
      this.childrenView = undefined
      return
    }
    this.childrenView ??= this.vcr.createEmbeddedView(this.childrenTemplate, this.childrenContext)
  }
}
