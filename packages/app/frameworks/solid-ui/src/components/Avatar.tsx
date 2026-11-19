/**
 * Avatar component.
 *
 * @module
 */

import { createSignal, type JSX, Show, splitProps } from 'solid-js'

import { useTranslation } from '@molecule/app-solid'
import type { AvatarProps } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { reactDomProps, toStyleProps, type WithRef } from '../utilities/dom.js'
import { getInitials } from '../utilities/initials.js'
import { renderIcon } from '../utilities/renderIcon.jsx'
import { withDisplayName } from './displayName.js'

/**
 * Renders the Avatar component.
 * @param props - The component props.
 * @returns The rendered avatar JSX.
 */
export const Avatar = withDisplayName<WithRef<AvatarProps, HTMLDivElement>>((props) => {
  const [local, rest] = splitProps(props, [
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
  const { t } = useTranslation()
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
      {...reactDomProps(rest)}
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
}, 'Avatar')
