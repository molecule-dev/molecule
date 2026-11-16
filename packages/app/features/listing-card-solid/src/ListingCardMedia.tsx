import type { Component } from 'solid-js'

import { getClassMap } from '@molecule/app-ui'

import type { ListingCardMediaProps } from './types.js'

/**
 * The `<img>` fallback's inline style (React's
 * `{ width: '100%', height: '100%', objectFit: 'cover' }`).
 *
 * @returns The React-shaped style object (kebab-case keys, as Solid applies it).
 */
const imageStyle = (): Record<string, string> => ({
  width: '100%',
  height: '100%',
  'object-fit': 'cover',
})

/**
 * Media slot at the top of a `<ListingCard>`. Locks the aspect ratio via an
 * inline style, renders the caller's node instead of the `<img>` fallback, and
 * puts `overlay` in an absolutely-positioned inset-0 layer.
 *
 * This is the Solid counterpart of `@molecule/app-listing-card-react`'s
 * `ListingCardMedia`: the same props (React names), the same ClassMap tokens,
 * inline styles and DOM for the same input.
 *
 * @param props - Component props (see {@link ListingCardMediaProps}).
 * @returns The rendered media slot.
 */
export const ListingCardMedia: Component<ListingCardMediaProps> = (props) => {
  const cm = getClassMap()
  const aspectRatio = (): string => (props.aspect ?? '4/3').replace('/', ' / ')
  return (
    <div
      class={cm.cn(cm.position('relative'), props.className)}
      style={{ 'aspect-ratio': aspectRatio() }}
    >
      {props.children ??
        (props.src ? (
          <img src={props.src} alt={props.alt ?? ''} style={imageStyle()} />
        ) : undefined)}
      {props.overlay && (
        <div class={cm.cn(cm.position('absolute'), cm.inset0)}>{props.overlay}</div>
      )}
    </div>
  )
}
