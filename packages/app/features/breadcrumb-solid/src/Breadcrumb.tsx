import { type Component, Index, type JSX, type ResolvedChildren, Show } from 'solid-js'

import { ResolveNode, useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'

import type { BreadcrumbItem, BreadcrumbProps } from './types.js'

/**
 * Whether a value is a DOM node (Solid renders JSX to real nodes, so a
 * caller's separator element arrives as one).
 * @param value - The prop value.
 * @returns True for a DOM node.
 */
const isDomNode = (value: unknown): value is Node =>
  typeof value === 'object' && value !== null && typeof (value as Node).nodeType === 'number'

/**
 * Breadcrumb navigation.
 *
 * Each item before the last is rendered as a link; the last item is
 * rendered as plain text (the "current page"). Pass `onNavigate` to
 * intercept clicks (e.g. hand off to a router's navigate). Without it,
 * crumbs render as plain `<a href>` anchors.
 *
 * This is the Solid counterpart of `@molecule/app-breadcrumb-react`: the
 * same props (React names), the same ClassMap tokens, and the same DOM for
 * the same input. The separator renders once per gap, and each gap reads the
 * `separator` prop itself, so JSX (`separator={<Icon />}`) and accessors
 * create one instance per gap, as React mounts one per gap. A node created
 * once and passed as a value (`separator={icon}`) can live in one place only:
 * the first gap shows it and the others show a DOM copy.
 *
 * @param props - Component props (see {@link BreadcrumbProps}).
 * @returns The rendered breadcrumb.
 */
export const Breadcrumb: Component<BreadcrumbProps> = (props) => {
  const cm = getClassMap()
  const { t } = useTranslation()
  const items = (): BreadcrumbItem[] => props.items ?? []

  /**
   * One crumb's icon + label, wrapped in the flex row React wraps them in.
   * The item arrives as an accessor: reading it inside the JSX keeps the
   * row current when the caller's array changes in place.
   */
  const content = (item: () => BreadcrumbItem): JSX.Element => (
    <span class={cm.flex({ align: 'center', gap: 'xs' })}>
      {item().icon}
      {item().label}
    </span>
  )

  /** The gap each separator node passed as a value was first shown in. */
  const shownIn = new WeakMap<Node, number>()

  /**
   * One gap's separator nodes: each as it is, unless an earlier gap already
   * shows that very node (a node created once and passed as a value), which
   * gets a DOM copy here.
   * @param given - The gap's resolved separator.
   * @param gap - The gap's index.
   * @returns The nodes to insert.
   */
  const ownNodes = (given: ResolvedChildren, gap: number): JSX.Element => {
    const nodes: unknown[] = Array.isArray(given) ? given : [given]
    return nodes.map((node) => {
      if (!isDomNode(node)) return node
      const owner = shownIn.get(node)
      if (owner === undefined || owner === gap) {
        shownIn.set(node, gap)
        return node
      }
      return node.cloneNode(true)
    }) as JSX.Element
  }

  /**
   * The separator of one gap: the caller's, read here so this gap gets its own
   * instance, or the default `/`. As React's `separator ?? <span>/</span>`,
   * only a separator that renders nothing gets the default.
   * @param gap - The gap's index.
   * @returns The separator of one gap.
   */
  const separatorAt = (gap: number): JSX.Element => (
    <ResolveNode node={props.separator}>
      {(separator, hasSeparator) => (
        <Show when={hasSeparator()} fallback={<span aria-hidden="true">/</span>}>
          {ownNodes(separator(), gap)}
        </Show>
      )}
    </ResolveNode>
  )

  return (
    <nav
      // The nav's accessible name: `t()` with the English default `'Breadcrumb'`,
      // so it follows the app's locale (React's source of truth).
      aria-label={t('breadcrumb.aria.breadcrumb', undefined, { defaultValue: 'Breadcrumb' })}
      data-mol-id={props.dataMolId}
      class={cm.cn(
        cm.flex({ align: 'center', gap: 'xs', wrap: 'wrap' }),
        cm.textSize('sm'),
        props.className,
      )}
    >
      <Index each={items()}>
        {(item, i) => {
          const isLast = (): boolean => i === items().length - 1
          return (
            <span class={cm.flex({ align: 'center', gap: 'xs' })}>
              {isLast() || !item().to ? (
                <span aria-current={isLast() ? 'page' : undefined}>{content(item)}</span>
              ) : props.onNavigate ? (
                <button
                  type="button"
                  class={cm.link}
                  onclick={() => props.onNavigate?.(item().to!)}
                >
                  {content(item)}
                </button>
              ) : (
                <a href={item().to} class={cm.link}>
                  {content(item)}
                </a>
              )}
              {!isLast() && <span>{separatorAt(i)}</span>}
            </span>
          )
        }}
      </Index>
    </nav>
  )
}
