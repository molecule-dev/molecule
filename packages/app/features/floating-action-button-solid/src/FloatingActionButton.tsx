import { type Component, Show } from 'solid-js'

import { useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'

import type { FloatingActionButtonProps } from './types.js'

/** Vertical square sizes in px, keyed by {@link FloatingActionButtonProps.size}. */
const SIZE_MAP = { sm: 10, md: 14, lg: 16 } as const

/** The corner's horizontal and vertical offsets, as React writes them. */
const CORNER = {
  'bottom-right': ['right', 'bottom'],
  'bottom-left': ['left', 'bottom'],
  'top-right': ['right', 'top'],
  'top-left': ['left', 'top'],
} as const

/**
 * The root's inline style, exactly as React writes it: the corner offsets,
 * then the square size, then the stacking level.
 *
 * @param dim - The square size in pixels.
 * @param position - The configured corner.
 * @returns The `style` attribute text.
 */
const rootStyle = (
  dim: number,
  position: NonNullable<FloatingActionButtonProps['position']>,
): string => {
  const [x, y] = CORNER[position]
  return `position: fixed; ${x}: 24px; ${y}: 24px; width: ${dim}px; height: ${dim}px; z-index: 40`
}

/**
 * Fixed-position circular action button. Renders either an anchor (when
 * `href` is set) or a button (when `onClick` is set). Positioning is
 * inline-style so the component works without extra CSS setup, and it ships
 * with a visible default surface (primary gradient + soft elevation, via the
 * `gradientPrimary`/`shadowLifted` ClassMap tokens). Pass `className` to
 * override the surface — caller classes are resolved last by `cm.cn`
 * (tailwind-merge).
 *
 * This is the Solid counterpart of `@molecule/app-floating-action-button-react`:
 * the same props (React names), the same ClassMap tokens, and the same DOM for
 * the same input.
 *
 * @param props - Component props (see {@link FloatingActionButtonProps}).
 * @returns The rendered floating action button.
 */
export const FloatingActionButton: Component<FloatingActionButtonProps> = (props) => {
  const cm = getClassMap()
  const { t } = useTranslation()

  const size = (): 'sm' | 'md' | 'lg' => props.size ?? 'md'
  const dim = (): number => SIZE_MAP[size()] * 4
  const position = (): NonNullable<FloatingActionButtonProps['position']> =>
    props.position ?? 'bottom-right'
  const ariaLabel = (): string => t(props.label, {}, { defaultValue: props.label })
  const title = (): string | undefined => ((props.showTooltip ?? true) ? ariaLabel() : undefined)
  const commonClass = (): string =>
    cm.cn(
      cm.flex({ align: 'center', justify: 'center' }),
      cm.roundedFull,
      cm.gradientPrimary,
      cm.shadowLifted,
      props.className,
    )
  const style = (): string => rootStyle(dim(), position())

  return (
    <Show
      when={props.href}
      fallback={
        <button
          type="button"
          onClick={(event) => props.onClick?.(event)}
          aria-label={ariaLabel()}
          title={title()}
          class={commonClass()}
          style={style()}
        >
          {props.icon}
        </button>
      }
    >
      {(href) => (
        <a
          href={href()}
          aria-label={ariaLabel()}
          title={title()}
          class={commonClass()}
          style={style()}
        >
          {props.icon}
        </a>
      )}
    </Show>
  )
}
