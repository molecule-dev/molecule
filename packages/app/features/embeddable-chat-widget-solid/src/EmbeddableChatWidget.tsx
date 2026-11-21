/**
 * Drop-in floating chat widget for third-party sites. Solid counterpart of
 * `@molecule/app-embeddable-chat-widget`'s `EmbeddableChatWidget` — the same
 * props (React names), the same DOM.
 *
 * @module
 */

import { type Component, createSignal } from 'solid-js'

import { EmbeddableChatLauncher } from './EmbeddableChatLauncher.jsx'
import { EmbeddableChatPanel } from './EmbeddableChatPanel.jsx'
import type { EmbeddableChatWidgetConfig, EmbeddableChatWidgetPosition } from './types.js'

/** Props for {@link EmbeddableChatWidget}. */
export interface EmbeddableChatWidgetProps {
  /** Widget configuration. */
  config: EmbeddableChatWidgetConfig
  /** Optional initial expanded state (default: collapsed). */
  defaultOpen?: boolean
}

/**
 * Drop-in floating chat widget for third-party sites. Renders a
 * collapsed launcher in the configured corner; clicking expands a
 * 360x540px panel with a message list, typing indicator, and input.
 *
 * The widget is intentionally self-contained — all geometry, colors,
 * and shadows are inlined so the host site does not need to ship the
 * molecule stylesheet. Pair with `@molecule/app-locales-embeddable-chat-widget`
 * for translations.
 *
 * @param props - Component props (see {@link EmbeddableChatWidgetProps}).
 * @returns The rendered widget.
 */
export const EmbeddableChatWidget: Component<EmbeddableChatWidgetProps> = (props) => {
  const [open, setOpen] = createSignal(props.defaultOpen ?? false)
  const position = (): EmbeddableChatWidgetPosition => props.config.position ?? 'bottom-right'

  return (
    <>
      <EmbeddableChatLauncher
        visible={!open()}
        onOpen={() => setOpen(true)}
        position={position()}
        theme={props.config.theme}
      />
      <EmbeddableChatPanel
        visible={open()}
        onClose={() => setOpen(false)}
        position={position()}
        config={props.config}
      />
    </>
  )
}
