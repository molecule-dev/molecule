import type { ReactElement, ReactNode } from 'react'

import { useTranslation } from '@molecule/app-react'
import { slot } from '@molecule/app-react/render'
import { getClassMap } from '@molecule/app-ui'
import { Anchor, Box, Pressable, Text } from '@molecule/app-ui-react/elements'

/** Describes a single crumb entry in a breadcrumb trail. */
export interface BreadcrumbItem {
  /** Display text or React node for the crumb. */
  label: ReactNode
  /**
   * Optional `to` target. When absent the crumb renders as plain text
   * (typically the current page).
   */
  to?: string
  /** Optional leading icon. */
  icon?: ReactNode
}

/** Props for {@link Breadcrumb}. */
export interface BreadcrumbProps {
  /** Ordered list of crumbs, last one usually the current page. */
  items: BreadcrumbItem[]
  /**
   * Click handler invoked with the target `to` when an item is clicked.
   * Useful when wiring to the app router's `useNavigate()`. When
   * omitted the component renders items with an anchor `<a href={to}>`.
   */
  onNavigate?: (to: string) => void
  /** Separator between crumbs — defaults to a `/`. Accepts any node. */
  separator?: ReactNode
  /** Extra classes on the `<nav>` element. */
  className?: string
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string
}

/**
 * Breadcrumb navigation.
 *
 * Each item before the last is rendered as a link; the last item is
 * rendered as plain text (the "current page"). Pass `onNavigate` to
 * intercept clicks (e.g. hand off to `useNavigate()` from `@molecule/app-react`).
 *
 * The nav's accessible name flows through `t()` with the English default
 * `'Breadcrumb'`, so it follows the app's locale.
 * @param props - Component props (see {@link BreadcrumbProps}).
 */
export function Breadcrumb({
  items,
  onNavigate,
  separator: separatorProp,
  className,
  dataMolId,
}: BreadcrumbProps): ReactElement {
  const separator = slot(separatorProp)
  const cm = getClassMap()
  const { t } = useTranslation()
  const sep = separator ?? (
    <Text as="span" aria-hidden>
      /
    </Text>
  )
  return (
    <Box
      as="nav"
      aria-label={t('breadcrumb.aria.breadcrumb', undefined, { defaultValue: 'Breadcrumb' })}
      data-mol-id={dataMolId}
      className={cm.cn(
        cm.flex({ align: 'center', gap: 'xs', wrap: 'wrap' }),
        cm.textSize('sm'),
        className,
      )}
    >
      {items.map((item, i) => {
        const isLast = i === items.length - 1
        const { to } = item
        const content = (
          <Box as="span" className={cm.flex({ align: 'center', gap: 'xs' })}>
            {item.icon}
            {item.label}
          </Box>
        )
        return (
          <Box as="span" key={i} className={cm.flex({ align: 'center', gap: 'xs' })}>
            {isLast || !to ? (
              <Box as="span" aria-current={isLast ? 'page' : undefined}>
                {content}
              </Box>
            ) : onNavigate ? (
              <Pressable
                as="button"
                type="button"
                onClick={() => onNavigate(to)}
                className={cm.link}
              >
                {content}
              </Pressable>
            ) : (
              <Anchor href={to} className={cm.link}>
                {content}
              </Anchor>
            )}
            {!isLast && <Box as="span">{sep}</Box>}
          </Box>
        )
      })}
    </Box>
  )
}
