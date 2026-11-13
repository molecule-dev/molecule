/**
 * Avatar component.
 *
 * @module
 */

import { type Component, createSignal, type JSX, Show, splitProps } from 'solid-js'

import { t } from '@molecule/app-i18n'
import type { AvatarProps } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { toStyleProps } from '../utilities/dom.js'
import { getInitials } from '../utilities/initials.js'
import { renderIcon } from '../utilities/renderIcon.jsx'

/**
 * Renders the Avatar component.
 * @param props - The component props.
 * @returns The rendered avatar JSX.
 */
export const Avatar: Component<AvatarProps> = (props) => {
  const [local] = splitProps(props, [
    'src',
    'alt',
    'name',
    'size',
    'rounded',
    'fallback',
    'className',
    'style',
    'testId',
  ])

  const [imageError, setImageError] = createSignal(false)

  const cm = getClassMap()
  const size = (): 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number => local.size ?? 'md'
  const rounded = (): boolean => local.rounded ?? true
  const showFallback = (): boolean => !local.src || imageError()

  const containerClasses = (): string =>
    cm.cn(
      cm.avatar({ size: typeof local.size === 'number' ? undefined : (local.size ?? 'md') }),
      !rounded() && cm.avatarSquare,
      local.className,
    )

  const customStyle = (): Record<string, string | number> | undefined =>
    typeof size() === 'number'
      ? ({ width: size() as number, height: size() as number } as const)
      : undefined

  return (
    <div
      class={containerClasses()}
      style={toStyleProps({ ...local.style, ...customStyle() })}
      data-testid={local.testId}
    >
      <Show
        when={!showFallback()}
        fallback={
          <div class={cm.avatarFallback}>
            <Show
              when={local.fallback}
              fallback={
                <Show when={local.name} fallback={renderIcon('user', cm.avatarFallbackIcon)}>
                  <span class={cm.avatarInitials}>{getInitials(local.name)}</span>
                </Show>
              }
            >
              {local.fallback as JSX.Element}
            </Show>
          </div>
        }
      >
        <img
          src={local.src}
          alt={local.alt || local.name || t('ui.avatar.alt', undefined, { defaultValue: 'Avatar' })}
          class={cm.avatarImage}
          onError={() => setImageError(true)}
        />
      </Show>
    </div>
  )
}
