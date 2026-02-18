/**
 * Avatar component.
 *
 * @module
 */

import { type Component, createSignal,type JSX, Show, splitProps } from 'solid-js'

import { t } from '@molecule/app-i18n'
import type { AvatarProps } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { renderIcon } from '../utilities/renderIcon.js'

/**
 * Get initials from a name.
 * @param name - The full name to extract initials from.
 * @returns The uppercase initials string.
 */
function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

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

  const cm = getClassMap()
  const [imageError, setImageError] = createSignal(false)

  const showFallback = (): boolean => !local.src || imageError()
  const rounded = (): boolean => local.rounded ?? true

  const containerClasses = (): string =>
    cm.cn(
      cm.avatar({ size: typeof local.size === 'number' ? undefined : local.size }),
      !rounded() && cm.avatarSquare,
      local.className,
    )

  const customSize = (): { width: string; height: string } | undefined =>
    typeof local.size === 'number' ? { width: `${local.size}px`, height: `${local.size}px` } : undefined

  return (
    <div
      class={containerClasses()}
      style={{ ...local.style, ...customSize() }}
      data-testid={local.testId}
    >
      <Show
        when={!showFallback()}
        fallback={
          <div class={cm.avatarFallback}>
            <Show
              when={local.fallback}
              fallback={
                <Show
                  when={local.name}
                  fallback={renderIcon('user', cm.avatarFallbackIcon)}
                >
                  <span class={cm.avatarInitials}>{getInitials(local.name!)}</span>
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
