import { type Component, Index, type JSX } from 'solid-js'

import { useTranslation } from '@molecule/app-solid'
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
 * the same input. The separator renders once per gap; a caller's separator
 * node is cloned per gap, because a DOM node can only live in one place —
 * React renders the same element in every gap.
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

  /**
   * The separator rendered at ONE gap position, fresh each call: the
   * caller's node (cloned — a DOM node cannot be inserted twice), or the
   * default `/`.
   * @returns The separator of one gap.
   */
  const separatorAt = (): JSX.Element => {
    const given =
      typeof props.separator === 'function' ? (props.separator as () => unknown)() : props.separator
    const nodes = given == null ? [] : Array.isArray(given) ? given : [given]
    const first = nodes[0]
    if (first == null) return <span aria-hidden="true">/</span>
    if (isDomNode(first)) return first.cloneNode(true) as JSX.Element
    return first as JSX.Element
  }

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
              {!isLast() && <span>{separatorAt()}</span>}
            </span>
          )
        }}
      </Index>
    </nav>
  )
}
