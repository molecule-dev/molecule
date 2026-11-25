import { type Component, createSignal, type JSX, Show } from 'solid-js'

import { Link, ResolveNode, useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'

import type { HelpButtonProps } from './types.js'

/** Square sizes in pixels, keyed by {@link HelpButtonProps.size}. */
const SIZE_MAP = { sm: 40, md: 52, lg: 64 } as const

/**
 * The root's inline style, exactly as React writes it (`transform` only while
 * hovered).
 *
 * @param dim - The square size in pixels.
 * @param position - The configured position.
 * @param hovered - Whether the pointer is over the button.
 * @returns The `style` attribute text.
 */
const rootStyle = (
  dim: number,
  position: HelpButtonProps['position'],
  hovered: boolean,
): string => {
  const parts = [`width: ${dim}px`, `height: ${dim}px`]
  if (position === 'bottom-right') {
    parts.push('position: fixed', 'right: 24px', 'bottom: 24px', 'z-index: 40')
  } else if (position === 'bottom-left') {
    parts.push('position: fixed', 'left: 24px', 'bottom: 24px', 'z-index: 40')
  }
  if (hovered) parts.push('transform: scale(1.05)')
  parts.push('transition: transform 150ms ease')
  return parts.join('; ')
}

/**
 * Floating (or inline) help button — opens a support panel, chat
 * widget, or docs. Default icon is "?" but apps can swap in their own.
 *
 * Use `position="inline"` inside other UI to drop the fixed
 * positioning and render as a normal in-flow button.
 *
 * This is the Solid counterpart of `@molecule/app-help-button-react`: the
 * same props (React names), the same ClassMap tokens, and the same DOM for
 * the same input.
 *
 * @param props - Component props (see {@link HelpButtonProps}).
 * @returns The rendered help button.
 */
export const HelpButton: Component<HelpButtonProps> = (props) => {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [hovered, setHovered] = createSignal(false)

  const size = (): 'sm' | 'md' | 'lg' => props.size ?? 'md'
  const dim = (): number => SIZE_MAP[size()]
  const ariaLabel = (): string => props.label ?? t('helpButton.label', {}, { defaultValue: 'Help' })
  const style = (): string => rootStyle(dim(), props.position ?? 'bottom-right', hovered())
  const contentClasses = (): string =>
    cm.cn(cm.flex({ align: 'center', justify: 'center' }), cm.roundedFull, cm.position('relative'))

  const content = (): JSX.Element => (
    <span class={contentClasses()} style="width: 100%; height: 100%">
      <ResolveNode node={props.icon}>
        {(icon, hasIcon) => (
          <Show
            when={hasIcon()}
            fallback={
              <span aria-hidden="true" style={`font-size: ${dim() * 0.45}px; font-weight: 700`}>
                ?
              </span>
            }
          >
            {icon()}
          </Show>
        )}
      </ResolveNode>
      {props.hasNotification && (
        <span
          aria-hidden="true"
          style="position: absolute; top: 4px; right: 4px; width: 10px; height: 10px; border-radius: 50%; background: currentcolor"
        />
      )}
    </span>
  )

  return (
    <Show
      when={props.href}
      fallback={
        <button
          type="button"
          class={props.className}
          style={style()}
          aria-label={ariaLabel()}
          onClick={(event) => props.onClick?.(event)}
          onMouseOver={() => setHovered(true)}
          onMouseOut={() => setHovered(false)}
        >
          {content()}
        </button>
      }
    >
      {(href) => (
        <Link
          to={href()}
          class={props.className}
          style={style()}
          aria-label={ariaLabel()}
          onMouseOver={() => setHovered(true)}
          onMouseOut={() => setHovered(false)}
        >
          {content()}
        </Link>
      )}
    </Show>
  )
}
